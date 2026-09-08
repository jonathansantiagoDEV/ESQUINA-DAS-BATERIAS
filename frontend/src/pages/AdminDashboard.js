import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import LiveMap from "../components/LiveMap";
import { toast } from "sonner";
import { RefreshCw, Truck, X, MapPin, Zap } from "lucide-react";

export default function AdminDashboard() {
  const [pedidos, setPedidos] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [livePos, setLivePos] = useState({}); // pedido_id -> { lat, lng, ts }
  const wsRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.get("/pedidos"), api.get("/users/couriers")]);
      setPedidos(p.data); setCouriers(c.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); const iv = setInterval(load, 3000); return () => clearInterval(iv); }, []);

  // Live fleet positions via WebSocket — the 3s poll above still handles
  // status changes (new pedidos, assignments), but courier movement now
  // arrives instantly instead of waiting up to 3s.
  useEffect(() => {
    const tok = localStorage.getItem("volt_token");
    const wsUrl = BACKEND_URL.replace(/^https?:/, BACKEND_URL.startsWith("https") ? "wss:" : "ws:")
      + `/api/ws/fleet${tok ? `?token=${encodeURIComponent(tok)}` : ""}`;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === "fleet_ping" && m.pedido_id) {
            setLivePos((prev) => ({ ...prev, [m.pedido_id]: { lat: m.lat, lng: m.lng, ts: m.ts } }));
          }
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, []);

  const buckets = useMemo(() => ({
    pendente: pedidos.filter((p) => p.status === "pendente"),
    atribuido: pedidos.filter((p) => p.status === "atribuido"),
    em_rota: pedidos.filter((p) => p.status === "em_rota"),
    entregue: pedidos.filter((p) => p.status === "entregue"),
  }), [pedidos]);

  const fleet = pedidos
    .filter((p) => p.status === "em_rota" && (livePos[p.id] || p.last_position))
    .map((p) => {
      const pos = livePos[p.id] || p.last_position;
      return { id: p.id, name: p.entregador_nome || "Entregador", lat: pos.lat, lng: pos.lng };
    });

  const doAssign = async () => {
    if (!selectedCourier || !assignFor) return;
    try {
      await api.post(`/pedidos/${assignFor.id}/assign`, { entregador_id: selectedCourier });
      toast.success("Entregador atribuído!");
      setAssignFor(null); setSelectedCourier(""); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-[#00D2FF] mb-2">Central de Despacho</div>
          <h1 className="heading font-black text-3xl">Dispatch</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass rounded-lg px-4 py-2.5 text-sm">
            <span className="mono text-[10px] uppercase tracking-widest text-slate-500 block">Frota ativa</span>
            <span className="heading font-black text-lg text-[#00D2FF]">{fleet.length}</span>
          </div>
          <button data-testid="btn-refresh" onClick={load} className="glass p-3 rounded-lg hover:electric-glow transition-shadow">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { k: "pendente", label: "Pendente", color: "#FBBF24" },
          { k: "atribuido", label: "Atribuído", color: "#93C5FD" },
          { k: "em_rota", label: "Em Rota", color: "#38BDF8" },
          { k: "entregue", label: "Entregue", color: "#34D399" },
        ].map((b) => (
          <div key={b.k} className="glass rounded-xl p-4">
            <div className="mono text-[10px] uppercase tracking-widest text-slate-500">{b.label}</div>
            <div className="heading font-black text-3xl mt-1" style={{ color: b.color }}>{buckets[b.k].length}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="heading font-bold text-lg flex items-center gap-2"><Zap className="w-4 h-4 text-[#FF4655]" /> Fila de pedidos</h2>
          <div className="max-h-[520px] overflow-y-auto pr-2 space-y-2">
            {[...buckets.pendente, ...buckets.atribuido, ...buckets.em_rota].map((p) => (
              <div key={p.id} data-testid={`admin-pedido-${p.id}`} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-slate-500">#{p.id.slice(0,8)}</div>
                    <div className="heading font-bold text-sm">{p.bateria_snapshot.marca} {p.bateria_snapshot.modelo}</div>
                    <div className="text-xs text-slate-400 mt-1"><MapPin className="w-3 h-3 inline" /> {p.cliente_nome} · {p.endereco}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-[#FF4655] heading font-black">R$ {p.total.toFixed(2)}</div>
                  {p.status === "pendente" && (
                    <button onClick={() => setAssignFor(p)} data-testid={`btn-assign-${p.id}`}
                      className="btn-electric px-3 py-2 rounded-lg text-xs flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Atribuir
                    </button>
                  )}
                  {p.status === "atribuido" && <span className="text-xs text-slate-400">→ {p.entregador_nome}</span>}
                  {p.status === "em_rota" && <span className="text-xs text-[#38BDF8]">Em rota · {p.entregador_nome}</span>}
                </div>
              </div>
            ))}
            {buckets.pendente.length + buckets.atribuido.length + buckets.em_rota.length === 0 && (
              <div className="glass rounded-xl p-6 text-center text-slate-500 text-sm">Nenhum pedido ativo.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl overflow-hidden" style={{ height: 560 }}>
          <LiveMap fleet={fleet} className="w-full h-full" />
        </div>
      </div>

      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading font-bold text-lg">Atribuir entregador</h3>
              <button onClick={()=>{setAssignFor(null);setSelectedCourier("");}}><X className="w-5 h-5"/></button>
            </div>
            <div className="text-sm text-slate-400 mb-3">Pedido #{assignFor.id.slice(0,8)} · {assignFor.endereco}</div>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {couriers.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Nenhum entregador cadastrado. Vá em Equipe.</div>}
              {couriers.map((c) => (
                <button key={c.id} data-testid={`select-courier-${c.id}`} onClick={()=>setSelectedCourier(c.id)}
                  className={`w-full text-left rounded-xl p-3 border transition ${selectedCourier===c.id ? "border-[#00D2FF] bg-[#00D2FF]/10" : "border-white/10 hover:border-white/20"}`}>
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.email} · {c.phone}</div>
                </button>
              ))}
            </div>
            <button onClick={doAssign} data-testid="btn-confirm-assign" disabled={!selectedCourier} className="btn-volt w-full py-3 rounded-lg disabled:opacity-40">Confirmar</button>
          </div>
        </div>
      )}
    </div>
  );
}
