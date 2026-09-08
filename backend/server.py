from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import uuid
import bcrypt
import jwt
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient

# ---------- Setup ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voltexpress")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

def _parse_cors_origins() -> List[str]:
    raw = os.environ.get("CORS_ORIGINS", FRONTEND_URL)
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    return origins

CORS_ORIGINS = _parse_cors_origins()

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Esquina das Baterias API")
api = APIRouter(prefix="/api")

# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str, tenant_id: str, kind: str = "access", ttl_min: int = 60 * 24 * 7) -> str:
    payload = {
        "sub": user_id, "role": role, "tenant_id": tenant_id,
        "type": kind, "exp": now_utc() + timedelta(minutes=ttl_min),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

def public_user(u: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"],
        "tenant_id": u["tenant_id"], "tenant_name": u.get("tenant_name", ""),
        "phone": u.get("phone", ""), "created_at": u.get("created_at"),
    }

# ---------- Models ----------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: str = Field(default="client")  # client | admin
    tenant_name: Optional[str] = None    # required if role==admin (new tenant)
    tenant_id: Optional[str] = None      # required if role==client (join existing)
    phone: Optional[str] = ""

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class BateriaInput(BaseModel):
    marca: str
    modelo: str
    capacidade_ah: int
    tecnologia: str = "Chumbo-Ácido"  # EFB, AGM, Lítio, etc
    preco: float
    estoque: int = 0
    imagem_url: Optional[str] = ""
    descricao: Optional[str] = ""

class PedidoInput(BaseModel):
    bateria_id: str
    quantidade: int = 1
    endereco: str
    cidade: str = ""
    referencia: Optional[str] = ""
    lat: float
    lng: float
    telefone_contato: str
    observacoes: Optional[str] = ""
    pagamento: str = "dinheiro"  # dinheiro | pix

class AssignInput(BaseModel):
    entregador_id: str

class PingInput(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    timestamp: Optional[str] = None  # ISO from client (for offline buffered)

class PingBatch(BaseModel):
    pedido_id: str
    pings: List[PingInput]

class InviteCourierInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = ""

# ---------- Auth deps ----------
async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expirado")
    except Exception:
        raise HTTPException(401, "Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user

def require_roles(*roles: str):
    async def wrapper(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Requer papel: {', '.join(roles)}")
        return user
    return wrapper

def set_auth_cookies(response: Response, access: str):
    response.set_cookie(
        "access_token", access, httponly=True, secure=True, samesite="none",
        max_age=60 * 60 * 24 * 7, path="/",
    )

# ---------- Auth routes ----------
@api.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já cadastrado")

    tenant_id = None
    tenant_name = ""
    if data.role == "admin":
        # create tenant
        if not data.tenant_name:
            raise HTTPException(400, "Nome da empresa é obrigatório para chefe")
        tenant_id = str(uuid.uuid4())
        tenant_name = data.tenant_name.strip()
        await db.tenants.insert_one({
            "id": tenant_id, "name": tenant_name,
            "owner_email": email, "created_at": iso(now_utc()),
        })
    elif data.role == "client":
        # join existing tenant
        if not data.tenant_id:
            # fallback: first tenant
            first = await db.tenants.find_one({}, sort=[("created_at", 1)])
            if not first:
                raise HTTPException(400, "Nenhuma empresa disponível para cadastro")
            tenant_id = first["id"]; tenant_name = first["name"]
        else:
            t = await db.tenants.find_one({"id": data.tenant_id})
            if not t:
                raise HTTPException(400, "Empresa não encontrada")
            tenant_id = t["id"]; tenant_name = t["name"]
    else:
        raise HTTPException(400, "Papel inválido para registro público")

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_pw(data.password),
        "name": data.name.strip(),
        "role": data.role,
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "phone": (data.phone or "").strip(),
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user_doc)
    token = make_token(user_doc["id"], user_doc["role"], user_doc["tenant_id"])
    set_auth_cookies(response, token)
    return {"user": public_user(user_doc), "token": token}

@api.post("/auth/login")
async def login(data: LoginInput, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(401, "Credenciais inválidas")
    token = make_token(user["id"], user["role"], user["tenant_id"])
    set_auth_cookies(response, token)
    return {"user": public_user(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": public_user(user)}

@api.get("/tenants")
async def list_tenants():
    """Public list so clients can pick company at registration."""
    items = await db.tenants.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(200)
    return items

# ---------- Baterias (catálogo) ----------
@api.get("/baterias")
async def list_baterias(user=Depends(get_current_user)):
    items = await db.baterias.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(500)
    return items

@api.post("/baterias")
async def create_bateria(data: BateriaInput, user=Depends(require_roles("admin"))):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["tenant_id"] = user["tenant_id"]
    doc["created_at"] = iso(now_utc())
    await db.baterias.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/baterias/{bat_id}")
async def update_bateria(bat_id: str, data: BateriaInput, user=Depends(require_roles("admin"))):
    r = await db.baterias.update_one(
        {"id": bat_id, "tenant_id": user["tenant_id"]},
        {"$set": data.model_dump()},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Bateria não encontrada")
    return {"ok": True}

@api.delete("/baterias/{bat_id}")
async def delete_bateria(bat_id: str, user=Depends(require_roles("admin"))):
    await db.baterias.delete_one({"id": bat_id, "tenant_id": user["tenant_id"]})
    return {"ok": True}

# ---------- Users / equipe ----------
@api.get("/users/couriers")
async def list_couriers(user=Depends(require_roles("admin"))):
    items = await db.users.find(
        {"tenant_id": user["tenant_id"], "role": "courier"},
        {"_id": 0, "password_hash": 0}
    ).to_list(200)
    return items

@api.post("/users/couriers")
async def create_courier(data: InviteCourierInput, user=Depends(require_roles("admin"))):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já cadastrado")
    doc = {
        "id": str(uuid.uuid4()), "email": email, "password_hash": hash_pw(data.password),
        "name": data.name, "role": "courier",
        "tenant_id": user["tenant_id"], "tenant_name": user["tenant_name"],
        "phone": data.phone or "", "created_at": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    return public_user(doc)

# ---------- Pedidos ----------
async def _resolve_bateria(bat_id: str, tenant_id: str) -> Dict[str, Any]:
    b = await db.baterias.find_one({"id": bat_id, "tenant_id": tenant_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Bateria não encontrada")
    return b

@api.post("/pedidos")
async def create_pedido(data: PedidoInput, user=Depends(require_roles("client"))):
    b = await _resolve_bateria(data.bateria_id, user["tenant_id"])
    if b.get("estoque", 0) < data.quantidade:
        raise HTTPException(400, "Estoque insuficiente")
    pedido = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "cliente_id": user["id"],
        "cliente_nome": user["name"],
        "cliente_telefone": data.telefone_contato,
        "bateria_id": b["id"],
        "bateria_snapshot": {"marca": b["marca"], "modelo": b["modelo"], "capacidade_ah": b["capacidade_ah"], "preco": b["preco"]},
        "quantidade": data.quantidade,
        "total": round(b["preco"] * data.quantidade, 2),
        "endereco": data.endereco,
        "cidade": data.cidade,
        "referencia": data.referencia,
        "lat": data.lat, "lng": data.lng,
        "observacoes": data.observacoes,
        "pagamento": data.pagamento,
        "status": "pendente",  # pendente | atribuido | em_rota | entregue | cancelado
        "entregador_id": None,
        "entregador_nome": None,
        "track_token": str(uuid.uuid4()),
        "created_at": iso(now_utc()),
        "started_at": None,
        "delivered_at": None,
        "last_position": None,
    }
    await db.pedidos.insert_one(pedido)
    await db.baterias.update_one({"id": b["id"]}, {"$inc": {"estoque": -data.quantidade}})
    pedido.pop("_id", None)
    return pedido

@api.get("/pedidos")
async def list_pedidos(user=Depends(get_current_user), status: Optional[str] = None):
    q: Dict[str, Any] = {"tenant_id": user["tenant_id"]}
    if user["role"] == "client":
        q["cliente_id"] = user["id"]
    elif user["role"] == "courier":
        q["entregador_id"] = user["id"]
    if status:
        q["status"] = status
    items = await db.pedidos.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.get("/pedidos/{pid}")
async def get_pedido(pid: str, user=Depends(get_current_user)):
    p = await db.pedidos.find_one({"id": pid, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Pedido não encontrado")
    # authorization
    if user["role"] == "client" and p["cliente_id"] != user["id"]:
        raise HTTPException(403, "Sem acesso")
    if user["role"] == "courier" and p.get("entregador_id") != user["id"]:
        raise HTTPException(403, "Sem acesso")
    return p

@api.post("/pedidos/{pid}/assign")
async def assign_pedido(pid: str, data: AssignInput, user=Depends(require_roles("admin"))):
    p = await db.pedidos.find_one({"id": pid, "tenant_id": user["tenant_id"]})
    if not p:
        raise HTTPException(404, "Pedido não encontrado")
    if p["status"] not in ("pendente", "atribuido"):
        raise HTTPException(400, "Pedido não pode ser atribuído neste estado")
    ent = await db.users.find_one({"id": data.entregador_id, "role": "courier", "tenant_id": user["tenant_id"]})
    if not ent:
        raise HTTPException(404, "Entregador não encontrado")
    await db.pedidos.update_one(
        {"id": pid},
        {"$set": {"status": "atribuido", "entregador_id": ent["id"], "entregador_nome": ent["name"]}},
    )
    return {"ok": True}

@api.post("/pedidos/{pid}/start")
async def start_pedido(pid: str, user=Depends(require_roles("courier"))):
    p = await db.pedidos.find_one({"id": pid, "tenant_id": user["tenant_id"]})
    if not p or p.get("entregador_id") != user["id"]:
        raise HTTPException(404, "Pedido não encontrado")
    if p["status"] != "atribuido":
        raise HTTPException(400, "Pedido não pode ser iniciado")
    await db.pedidos.update_one(
        {"id": pid}, {"$set": {"status": "em_rota", "started_at": iso(now_utc())}}
    )
    return {"ok": True}

@api.post("/pedidos/{pid}/deliver")
async def deliver_pedido(pid: str, user=Depends(require_roles("courier"))):
    p = await db.pedidos.find_one({"id": pid, "tenant_id": user["tenant_id"]})
    if not p or p.get("entregador_id") != user["id"]:
        raise HTTPException(404, "Pedido não encontrado")
    if p["status"] != "em_rota":
        raise HTTPException(400, "Pedido não está em rota")
    # invalidate tracking token
    await db.pedidos.update_one(
        {"id": pid},
        {"$set": {"status": "entregue", "delivered_at": iso(now_utc()), "track_token": None}},
    )
    return {"ok": True}

@api.post("/pedidos/{pid}/cancel")
async def cancel_pedido(pid: str, user=Depends(get_current_user)):
    p = await db.pedidos.find_one({"id": pid, "tenant_id": user["tenant_id"]})
    if not p:
        raise HTTPException(404, "Pedido não encontrado")
    if user["role"] == "client" and p["cliente_id"] != user["id"]:
        raise HTTPException(403, "Sem acesso")
    if user["role"] == "courier":
        raise HTTPException(403, "Entregadores não cancelam pedidos")
    if p["status"] in ("entregue", "cancelado"):
        raise HTTPException(400, "Pedido já finalizado")
    if user["role"] == "client" and p["status"] == "em_rota":
        raise HTTPException(400, "Pedido já está em rota — fale com a loja para cancelar")
    await db.pedidos.update_one(
        {"id": pid},
        {"$set": {"status": "cancelado", "track_token": None}},
    )
    # restock
    await db.baterias.update_one({"id": p["bateria_id"]}, {"$inc": {"estoque": p["quantidade"]}})
    return {"ok": True}

# ---------- Pings de GPS ----------
@api.post("/pedidos/{pid}/pings")
async def push_pings(pid: str, batch: PingBatch, user=Depends(require_roles("courier"))):
    p = await db.pedidos.find_one({"id": pid, "tenant_id": user["tenant_id"]})
    if not p or p.get("entregador_id") != user["id"]:
        raise HTTPException(404, "Pedido não encontrado")
    if p["status"] not in ("em_rota", "atribuido"):
        raise HTTPException(400, "Pedido não está ativo")

    docs = []
    last = None
    for ping in batch.pings:
        d = {
            "id": str(uuid.uuid4()), "pedido_id": pid, "tenant_id": user["tenant_id"],
            "entregador_id": user["id"],
            "lat": ping.lat, "lng": ping.lng,
            "accuracy": ping.accuracy, "heading": ping.heading, "speed": ping.speed,
            "ts": ping.timestamp or iso(now_utc()),
            "received_at": iso(now_utc()),
        }
        docs.append(d)
        last = d
    if docs:
        await db.pings.insert_many(docs)
        await db.pedidos.update_one(
            {"id": pid},
            {"$set": {"last_position": {"lat": last["lat"], "lng": last["lng"], "ts": last["ts"], "heading": last["heading"]}}},
        )
        # broadcast via ws — public tracking link (client) and the admin fleet map
        await ws_manager.broadcast_track(p["track_token"], {
            "type": "ping", "lat": last["lat"], "lng": last["lng"],
            "ts": last["ts"], "heading": last["heading"], "speed": last["speed"],
        })
        await ws_manager.broadcast_fleet(user["tenant_id"], {
            "type": "fleet_ping", "pedido_id": pid,
            "entregador_nome": p.get("entregador_nome") or user.get("name"),
            "lat": last["lat"], "lng": last["lng"], "ts": last["ts"],
        })
    return {"stored": len(docs)}

# ---------- Tracking público ----------
@api.get("/track/{token}")
async def public_track(token: str):
    p = await db.pedidos.find_one({"track_token": token}, {"_id": 0, "cliente_telefone": 0})
    if not p or not p.get("track_token"):
        raise HTTPException(404, "Rastreio expirado ou inválido")
    # last 30 pings
    trail = await db.pings.find({"pedido_id": p["id"]}, {"_id": 0, "lat": 1, "lng": 1, "ts": 1}).sort("received_at", -1).limit(30).to_list(30)
    return {
        "pedido_id": p["id"],
        "status": p["status"],
        "entregador_nome": p.get("entregador_nome"),
        "endereco": p["endereco"],
        "destino": {"lat": p["lat"], "lng": p["lng"]},
        "bateria": p["bateria_snapshot"],
        "last_position": p.get("last_position"),
        "trail": list(reversed(trail)),
        "created_at": p["created_at"],
        "started_at": p.get("started_at"),
    }

# ---------- WebSocket ----------
class WSManager:
    def __init__(self):
        self.track_rooms: Dict[str, List[WebSocket]] = {}
        self.fleet_rooms: Dict[str, List[WebSocket]] = {}  # tenant_id -> sockets

    async def join_track(self, token: str, ws: WebSocket):
        await ws.accept()
        self.track_rooms.setdefault(token, []).append(ws)

    async def join_fleet(self, tenant_id: str, ws: WebSocket):
        await ws.accept()
        self.fleet_rooms.setdefault(tenant_id, []).append(ws)

    def leave(self, ws: WebSocket):
        for room in list(self.track_rooms.values()) + list(self.fleet_rooms.values()):
            if ws in room:
                room.remove(ws)

    async def broadcast_track(self, token: Optional[str], data: dict):
        if not token:
            return
        for ws in list(self.track_rooms.get(token, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.leave(ws)

    async def broadcast_fleet(self, tenant_id: str, data: dict):
        for ws in list(self.fleet_rooms.get(tenant_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.leave(ws)

ws_manager = WSManager()

@app.websocket("/api/ws/track/{token}")
async def ws_track(ws: WebSocket, token: str):
    p = await db.pedidos.find_one({"track_token": token})
    if not p:
        await ws.close(code=4404)
        return
    await ws_manager.join_track(token, ws)
    try:
        # send initial snapshot
        await ws.send_json({"type": "snapshot", "last_position": p.get("last_position"), "status": p["status"]})
        while True:
            await ws.receive_text()  # keepalive
    except WebSocketDisconnect:
        ws_manager.leave(ws)
    except Exception:
        ws_manager.leave(ws)

async def ws_authenticate(ws: WebSocket) -> Optional[Dict[str, Any]]:
    token = ws.cookies.get("access_token") or ws.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_token(token)
    except Exception:
        return None
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    return user

@app.websocket("/api/ws/fleet")
async def ws_fleet(ws: WebSocket):
    user = await ws_authenticate(ws)
    if not user or user["role"] != "admin":
        await ws.close(code=4401)
        return
    await ws_manager.join_fleet(user["tenant_id"], ws)
    try:
        while True:
            await ws.receive_text()  # keepalive
    except WebSocketDisconnect:
        ws_manager.leave(ws)
    except Exception:
        ws_manager.leave(ws)

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("tenant_id")
    await db.tenants.create_index("id", unique=True)
    await db.baterias.create_index([("tenant_id", 1), ("id", 1)])
    await db.pedidos.create_index([("tenant_id", 1), ("status", 1)])
    await db.pedidos.create_index("track_token")
    await db.pings.create_index([("pedido_id", 1), ("received_at", -1)])

    # seed admin + demo tenant + sample batteries
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    tenant_name = os.environ.get("ADMIN_TENANT", "Esquina das Baterias")
    tenant = await db.tenants.find_one({"owner_email": admin_email})
    if not tenant:
        tenant = {"id": str(uuid.uuid4()), "name": tenant_name, "owner_email": admin_email, "created_at": iso(now_utc())}
        await db.tenants.insert_one(tenant)
    if tenant["name"] != tenant_name:
        await db.tenants.update_one({"id": tenant["id"]}, {"$set": {"name": tenant_name}})
        await db.users.update_many({"tenant_id": tenant["id"]}, {"$set": {"tenant_name": tenant_name}})
        tenant["name"] = tenant_name
    admin = await db.users.find_one({"email": admin_email})
    admin_pw = os.environ["ADMIN_PASSWORD"]
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()), "email": admin_email, "password_hash": hash_pw(admin_pw),
            "name": os.environ.get("ADMIN_NAME", "Chefe"), "role": "admin",
            "tenant_id": tenant["id"], "tenant_name": tenant["name"],
            "phone": "", "created_at": iso(now_utc()),
        }
        await db.users.insert_one(admin_doc)
    elif not verify_pw(admin_pw, admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_pw(admin_pw)}})

    # demo courier
    courier_email = "entregador@esquinadasbaterias.com"
    if not await db.users.find_one({"email": courier_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": courier_email,
            "password_hash": hash_pw("Volt@2026"),
            "name": "Marcos Silva", "role": "courier",
            "tenant_id": tenant["id"], "tenant_name": tenant["name"],
            "phone": "+55 11 98765-4321", "created_at": iso(now_utc()),
        })

    # demo client
    client_email = "cliente@esquinadasbaterias.com"
    if not await db.users.find_one({"email": client_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": client_email,
            "password_hash": hash_pw("Volt@2026"),
            "name": "Ana Costa", "role": "client",
            "tenant_id": tenant["id"], "tenant_name": tenant["name"],
            "phone": "+55 11 91234-5678", "created_at": iso(now_utc()),
        })

    # sample batteries
    if await db.baterias.count_documents({"tenant_id": tenant["id"]}) == 0:
        sample = [
            {"marca": "Tudor", "modelo": "TX60BD", "capacidade_ah": 60, "tecnologia": "Chumbo-Ácido", "preco": 499.90, "estoque": 12, "descricao": "A mais vendida. Ideal para carros 1.0 a 2.0, alta partida a frio."},
            {"marca": "Tudor", "modelo": "TX45FD", "capacidade_ah": 45, "tecnologia": "Chumbo-Ácido", "preco": 389.00, "estoque": 20, "descricao": "Compacta para carros populares e motos de alta cilindrada."},
            {"marca": "Tudor", "modelo": "TX70LD EFB", "capacidade_ah": 70, "tecnologia": "EFB", "preco": 699.00, "estoque": 8, "descricao": "Tecnologia Start-Stop, maior durabilidade em trânsito pesado."},
            {"marca": "Tudor", "modelo": "TX75LD", "capacidade_ah": 75, "tecnologia": "Chumbo-Ácido", "preco": 749.00, "estoque": 10, "descricao": "Para SUVs e sedãs médios com muitos acessórios elétricos."},
            {"marca": "Tudor", "modelo": "TX90CD AGM", "capacidade_ah": 90, "tecnologia": "AGM", "preco": 1099.00, "estoque": 4, "descricao": "AGM premium para caminhonetes e veículos Start-Stop avançado."},
        ]
        for s in sample:
            s.update({"id": str(uuid.uuid4()), "tenant_id": tenant["id"], "imagem_url": "", "created_at": iso(now_utc())})
        await db.baterias.insert_many(sample)

    logger.info(f"Esquina das Baterias ready. Admin={admin_email} tenant={tenant['name']}")

@app.on_event("shutdown")
async def shutdown():
    client.close()

@api.get("/")
async def root():
    return {"service": "Esquina das Baterias API", "ok": True}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
