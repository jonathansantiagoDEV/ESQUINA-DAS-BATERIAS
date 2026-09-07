"""End-to-end backend tests for Esquina das Baterias API."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://live-track-16.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "sant14101996@gmail.com", "password": "Volt@2026"}
COURIER = {"email": "entregador@esquinadasbaterias.com", "password": "Volt@2026"}
CLIENT = {"email": "cliente@esquinadasbaterias.com", "password": "Volt@2026"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json()["token"], r.json()["user"]


def _s(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# ---------- health / basic ----------
def test_root_alive():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_tenants_public():
    r = requests.get(f"{API}/tenants", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1
    assert any(t.get("name") == "Esquina das Baterias" for t in data)


# ---------- auth ----------
def test_login_admin():
    token, user = _login(ADMIN)
    assert user["role"] == "admin"
    assert user["email"] == ADMIN["email"]


def test_login_courier():
    _, user = _login(COURIER)
    assert user["role"] == "courier"


def test_login_client():
    _, user = _login(CLIENT)
    assert user["role"] == "client"


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_auth_me():
    token, _ = _login(CLIENT)
    r = _s(token).get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["email"] == CLIENT["email"]


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------- catalog ----------
def test_list_baterias_client():
    token, _ = _login(CLIENT)
    r = _s(token).get(f"{API}/baterias", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 5, f"expected >=5 batteries, got {len(items)}"


def test_admin_catalog_crud():
    token, _ = _login(ADMIN)
    s = _s(token)
    payload = {
        "marca": "TEST_Brand", "modelo": f"TEST_{uuid.uuid4().hex[:6]}",
        "capacidade_ah": 55, "tecnologia": "AGM", "preco": 599.90, "estoque": 3,
        "descricao": "TEST bateria",
    }
    r = s.post(f"{API}/baterias", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    bat = r.json()
    assert bat["marca"] == "TEST_Brand"
    bat_id = bat["id"]

    # Update
    payload["estoque"] = 9
    r = s.put(f"{API}/baterias/{bat_id}", json=payload, timeout=15)
    assert r.status_code == 200
    # Verify via list
    r = s.get(f"{API}/baterias", timeout=15)
    found = [b for b in r.json() if b["id"] == bat_id]
    assert found and found[0]["estoque"] == 9

    # Delete
    r = s.delete(f"{API}/baterias/{bat_id}", timeout=15)
    assert r.status_code == 200
    r = s.get(f"{API}/baterias", timeout=15)
    assert not any(b["id"] == bat_id for b in r.json())


def test_client_cannot_create_bateria():
    token, _ = _login(CLIENT)
    r = _s(token).post(f"{API}/baterias", json={
        "marca": "X", "modelo": "Y", "capacidade_ah": 10, "preco": 1, "estoque": 1
    }, timeout=15)
    assert r.status_code == 403


# ---------- couriers listing ----------
def test_admin_list_couriers():
    token, _ = _login(ADMIN)
    r = _s(token).get(f"{API}/users/couriers", timeout=15)
    assert r.status_code == 200
    couriers = r.json()
    assert any(c["email"] == COURIER["email"] for c in couriers)


# ---------- E2E order flow ----------
@pytest.fixture(scope="module")
def e2e_flow():
    """Create → assign → start → ping → track → deliver → track invalid."""
    admin_token, _ = _login(ADMIN)
    courier_token, courier_user = _login(COURIER)
    client_token, _ = _login(CLIENT)

    cs = _s(client_token)
    ads = _s(admin_token)
    ds = _s(courier_token)

    baterias = cs.get(f"{API}/baterias", timeout=15).json()
    bat = next(b for b in baterias if b["estoque"] > 0)

    order_payload = {
        "bateria_id": bat["id"], "quantidade": 1,
        "endereco": "Av. Paulista, 1000 - TEST", "cidade": "São Paulo",
        "lat": -23.5505, "lng": -46.6333,
        "telefone_contato": "+55 11 90000-0000",
        "observacoes": "TEST order", "pagamento": "pix",
    }
    r = cs.post(f"{API}/pedidos", json=order_payload, timeout=15)
    assert r.status_code == 200, r.text
    pedido = r.json()
    assert pedido["status"] == "pendente"
    assert pedido["track_token"]

    return {
        "admin_s": ads, "client_s": cs, "driver_s": ds,
        "courier_user": courier_user, "pedido": pedido,
    }


def test_e2e_1_pedido_appears_in_client_list(e2e_flow):
    pid = e2e_flow["pedido"]["id"]
    r = e2e_flow["client_s"].get(f"{API}/pedidos", timeout=15)
    assert r.status_code == 200
    assert any(p["id"] == pid for p in r.json())


def test_e2e_2_public_track_before_assign(e2e_flow):
    token = e2e_flow["pedido"]["track_token"]
    r = requests.get(f"{API}/track/{token}", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "pendente"
    assert data["destino"]["lat"] == -23.5505


def test_e2e_3_assign(e2e_flow):
    pid = e2e_flow["pedido"]["id"]
    courier_id = e2e_flow["courier_user"]["id"]
    r = e2e_flow["admin_s"].post(f"{API}/pedidos/{pid}/assign", json={"entregador_id": courier_id}, timeout=15)
    assert r.status_code == 200, r.text
    # verify
    r = e2e_flow["admin_s"].get(f"{API}/pedidos/{pid}", timeout=15)
    assert r.json()["status"] == "atribuido"
    assert r.json()["entregador_id"] == courier_id


def test_e2e_4_driver_sees_order(e2e_flow):
    pid = e2e_flow["pedido"]["id"]
    r = e2e_flow["driver_s"].get(f"{API}/pedidos", timeout=15)
    assert r.status_code == 200
    assert any(p["id"] == pid for p in r.json())


def test_e2e_5_start_and_ping(e2e_flow):
    pid = e2e_flow["pedido"]["id"]
    r = e2e_flow["driver_s"].post(f"{API}/pedidos/{pid}/start", json={}, timeout=15)
    assert r.status_code == 200, r.text
    # ping batch
    payload = {"pedido_id": pid, "pings": [
        {"lat": -23.5506, "lng": -46.6334, "accuracy": 10.0},
        {"lat": -23.5507, "lng": -46.6335, "accuracy": 12.0},
    ]}
    r = e2e_flow["driver_s"].post(f"{API}/pedidos/{pid}/pings", json=payload, timeout=15)
    assert r.status_code == 200
    assert r.json()["stored"] == 2

    # verify last_position via public track
    token = e2e_flow["pedido"]["track_token"]
    r = requests.get(f"{API}/track/{token}", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "em_rota"
    assert d["last_position"] is not None
    assert abs(d["last_position"]["lat"] - (-23.5507)) < 1e-4
    assert len(d["trail"]) >= 2


def test_e2e_6_deliver_and_track_invalid(e2e_flow):
    pid = e2e_flow["pedido"]["id"]
    token = e2e_flow["pedido"]["track_token"]
    r = e2e_flow["driver_s"].post(f"{API}/pedidos/{pid}/deliver", json={}, timeout=15)
    assert r.status_code == 200

    # track token should be invalidated
    r = requests.get(f"{API}/track/{token}", timeout=15)
    assert r.status_code == 404


# ---------- Cancel flow ----------
def test_cancel_restores_stock():
    admin_token, _ = _login(ADMIN)
    client_token, _ = _login(CLIENT)
    cs = _s(client_token)
    ads = _s(admin_token)

    baterias = cs.get(f"{API}/baterias", timeout=15).json()
    bat = next(b for b in baterias if b["estoque"] > 0)
    before = bat["estoque"]

    r = cs.post(f"{API}/pedidos", json={
        "bateria_id": bat["id"], "quantidade": 1,
        "endereco": "TEST cancel", "lat": -23.55, "lng": -46.63,
        "telefone_contato": "+55 11 90000-1111",
    }, timeout=15)
    assert r.status_code == 200
    pid = r.json()["id"]

    # stock decremented
    after_order = next(b for b in cs.get(f"{API}/baterias").json() if b["id"] == bat["id"])
    assert after_order["estoque"] == before - 1

    # cancel by client
    r = cs.post(f"{API}/pedidos/{pid}/cancel", json={}, timeout=15)
    assert r.status_code == 200

    # stock restored
    after_cancel = next(b for b in cs.get(f"{API}/baterias").json() if b["id"] == bat["id"])
    assert after_cancel["estoque"] == before

    # not in admin's active queue (status = cancelado)
    r = ads.get(f"{API}/pedidos/{pid}", timeout=15)
    assert r.json()["status"] == "cancelado"


# ---------- Tenant isolation ----------
def test_tenant_isolation_new_admin():
    email = f"TEST_admin_{uuid.uuid4().hex[:6]}@test.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Volt@2026", "name": "TEST Admin",
        "role": "admin", "tenant_name": f"TEST Empresa {uuid.uuid4().hex[:4]}",
    }, timeout=15)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    s = _s(token)
    r = s.get(f"{API}/baterias", timeout=15)
    assert r.status_code == 200
    assert r.json() == [], f"new tenant should have empty catalog, got {r.json()}"


# ---------- Create courier ----------
def test_admin_create_courier():
    token, _ = _login(ADMIN)
    s = _s(token)
    email = f"TEST_courier_{uuid.uuid4().hex[:6]}@test.com"
    r = s.post(f"{API}/users/couriers", json={
        "email": email, "password": "Volt@2026", "name": "TEST Courier"
    }, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == email.lower()
    # verify appears in list
    r = s.get(f"{API}/users/couriers", timeout=15)
    assert any(c["email"] == email.lower() for c in r.json())
