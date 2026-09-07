import React, { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import StatusBadge from "../components/StatusBadge";
import LiveMap from "../components/LiveMap";
import { bufferPing, bufferCount, clearBuffered, drainPings } from "../lib/offlineBuffer";
import { Play, CheckCircle2, Wifi, WifiOff, Radio, MapPin, Navigation } from "lucide-react";

export default function DriverApp() {
  const [pedidos, setPedidos] = useState([]);
  const [active, setActive] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [pos, setPos] = useState(null);
  const [buffered, setBuffered] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [simOffline, setSimOffline] = useState(false);
  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const lastFlushRef = useRef(0);

  const load = async () => {
    try {
      const { data } = await api.get("/pedidos");
      setPedidos(data);
      const cur = data.find((p) => p.status === "em_rota");
      if (cur) setActive(cur);
    } catch {}
  };

  useEffect(() => {
    load();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    bufferCount().then(setBuffered);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); stopTracking(); };
  }, []);

  const effectiveOnline = online && !simOffline;

  const flushBuffer = async (pedidoId) => {
    if (!effectiveOnline) return;
    const pending = await drainPings(pedidoId);
    if (pending.length === 0) return;
    try {
      await api.post(`/pedidos/${pedidoId}/pings`, { pedido_id: pedidoId, pings: pending.map((r) => r.ping) });
      await clearBuffered(pending.map((r) => r.localId));
      setBuffered(await bufferCount());
      toast.success(`Sincronizados ${pending.length} pings`);
    } catch (e) { /* keep buffer */ }
  };

  const sendPing = async (pedidoId, coords) => {
    const ping = {
      lat: coords.latitude, lng: coords.longitude,
      accuracy: coords.accuracy, heading: coords.heading, speed: coords.speed,
      timestamp: new Date().toISOString(),
    };
    if (!effectiveOnline) {
      await bufferPing(pedidoId, ping); setBuffered(await bufferCount());
      return;
    }
    try {
      // flush old buffered first
      const now = Date.now();
      if (now - lastFlushRef.current > 5000) { lastFlushRef.current = now; await flushBuffer(pedidoId); }
      await api.post(`/pedidos/${pedidoId}/pings`, { pedido_id: pedidoId, pings: [ping] });
    } catch (e) {
      await bufferPing(pedidoId, ping); setBuffered(await bufferCount());
    }
  };

  const startTracking = async (pedido) => {
    try {
      if (pedido.status === "atribuido") { await api.post(`/pedidos/${pedido.id}/start`); toast.success("Entrega iniciada"); }
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); return; }

    setActive({ ...pedido, status: "em_rota" });
    setTracking(true);
    if (!("geolocation" in navigator)) { toast.error("GPS não disponível"); return; }

    watchRef.current = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, coords: p.coords }),
      () => toast.error("Falha ao obter GPS"),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    // send every 15s
    timerRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (p) => sendPing(pedido.id, p.coords),
        () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
      );
    }, 15000);
    // send immediately once
    navigator.geolocation.getCurrentPosition((p) => sendPing(pedido.id, p.coords), () => {}, { enableHighAccuracy: true });
    load();
  };

  const stopTracking = () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    watchRef.current = null; timerRef.current = null;
    setTracking(false);
  };

  const deliver = async () => {
    if (!active) return;
    try {
      // flush anything pending
      await flushBuffer(active.id);
      await api.post(`/pedidos/${active.id}/deliver`);
      toast.success("Entrega finalizada!");
      stopTracking(); setActive(null); load();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  useEffect(() => {
    if (effectiveOnline && active) flushBuffer(active.id);
  }, [effectiveOnline, active]);

  const upcoming = pedidos.filter((p) => ["atribuido","em_rota"].includes(p.status));
  const done = pedidos.filter((p) => p.status === "entregue").slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-[#00D2FF] mb-1">Entregador</div>
          <h1 className="heading font-black text-2xl">Minhas entregas</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`glass px-3 py-2 rounded-lg flex items-center gap-2 text-xs ${effectiveOnline ? "text-emerald-400" : "text-red-400"}`}>
            {effectiveOnline ? <Wifi className="w-4 h-4"/> : <WifiOff className="w-4 h-4"/>}
            {effectiveOnline ? "Online" : "Offline"}
          </div>
          <button data-testid="btn-sim-offline" onClick={() => setSimOffline(!simOffline)} className={`glass px-3 py-2 rounded-lg text-xs ${simOffline ? "text-red-400 border-red-400/40" : "text-slate-400"}`}>
            {simOffline ? "Voltar online" : "Simular offline"}
          </button>
        </div>
      </div>

      {buffered > 0 && (
        <div className="glass rounded-xl p-3 mb-3 flex items-center gap-2 text-sm">
          <Radio className="w-4 h-4 text-[#FBBF24] animate-pulse" />
          <span><span className="font-bold text-[#FBBF24]">{buffered}</span> pings guardados. {effectiveOnline ? "Sincronizando…" : "Aguardando conexão."}</span>
        </div>
      )}

      {active && (
        <div className="glass-strong rounded-2xl p-4 mb-4 electric-glow">
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={active.status}/>
            <span className="mono text-[10px] uppercase tracking-widest text-slate-500">#{active.id.slice(0,8)}</span>
          </div>
          <div className="heading font-bold text-lg">{active.bateria_snapshot.marca} {active.bateria_snapshot.modelo}</div>
          <div className="text-sm text-slate-300 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {active.endereco}</div>
          <div className="text-xs text-slate-400 mt-1">Cliente: {active.cliente_nome} · {active.cliente_telefone}</div>

          <div className="rounded-xl overflow-hidden mt-4" style={{ height: 280 }}>
            <LiveMap destination={{ lat: active.lat, lng: active.lng }}
              courier={pos ? { lat: pos.lat, lng: pos.lng } : (active.last_position || null)}
              className="w-full h-full" />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {active.status === "atribuido" && (
              <button data-testid="btn-start" onClick={() => startTracking(active)}
                className="col-span-2 btn-electric py-3.5 rounded-lg flex items-center justify-center gap-2">
                <Play className="w-4 h-4"/> Iniciar entrega (GPS 15s)
              </button>
            )}
            {active.status === "em_rota" && (
              <>
                <button data-testid="btn-nav" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${active.lat},${active.lng}`, "_blank")}
                  className="glass py-3.5 rounded-lg flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4"/> Navegar
                </button>
                <button data-testid="btn-deliver" onClick={deliver}
                  className="btn-volt py-3.5 rounded-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4"/> Finalizar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <h2 className="heading font-bold text-lg mt-6 mb-2">Fila</h2>
      <div className="space-y-2">
        {upcoming.filter(p => !active || p.id !== active.id).map((p) => (
          <div key={p.id} data-testid={`driver-pedido-${p.id}`} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <StatusBadge status={p.status}/>
              <span className="mono text-[10px] uppercase tracking-widest text-slate-500">#{p.id.slice(0,8)}</span>
            </div>
            <div className="heading font-bold text-sm">{p.bateria_snapshot.marca} {p.bateria_snapshot.modelo}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> {p.endereco}</div>
            {p.status === "atribuido" && (
              <button data-testid={`btn-select-${p.id}`} onClick={() => setActive(p)}
                className="btn-electric w-full py-2.5 rounded-lg mt-3 text-sm">Selecionar</button>
            )}
          </div>
        ))}
        {upcoming.length === 0 && <div className="glass rounded-xl p-6 text-center text-slate-500 text-sm">Sem entregas atribuídas.</div>}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="heading font-bold text-lg mt-6 mb-2">Concluídas</h2>
          <div className="space-y-2 opacity-80">
            {done.map((p) => (
              <div key={p.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.bateria_snapshot.marca} {p.bateria_snapshot.modelo}</div>
                  <div className="text-xs text-slate-500">{p.endereco}</div>
                </div>
                <StatusBadge status="entregue"/>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
