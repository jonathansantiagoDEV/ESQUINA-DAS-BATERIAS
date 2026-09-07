import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, BACKEND_URL } from "../lib/api";
import LiveMap from "../components/LiveMap";
import StatusBadge from "../components/StatusBadge";
import { MapPin, Phone, Zap, Battery } from "lucide-react";

export default function PublicTracking() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [live, setLive] = useState(null); // last position live
  const wsRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try { const r = await api.get(`/track/${token}`); setData(r.data); setLive(r.data.last_position); }
      catch (e) { setErr(e.response?.data?.detail || "Rastreio inválido"); }
    };
    load();
    const iv = setInterval(load, 20000);

    // websocket
    try {
      const url = BACKEND_URL.replace(/^https?:/, BACKEND_URL.startsWith("https") ? "wss:" : "ws:") + `/api/ws/track/${token}`;
      const ws = new WebSocket(url); wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === "ping" || m.type === "snapshot") {
            if (m.lat && m.lng) setLive({ lat: m.lat, lng: m.lng, ts: m.ts });
            else if (m.last_position) setLive(m.last_position);
          }
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}

    return () => { clearInterval(iv); wsRef.current?.close(); };
  }, [token]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-8 max-w-md text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center mb-4">
          <Zap className="w-7 h-7 text-red-400"/>
        </div>
        <h1 className="heading font-bold text-xl mb-2">Rastreio indisponível</h1>
        <p className="text-slate-400 text-sm">{err}. Este link pode ter expirado após a entrega.</p>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando rastreio…</div>;

  const courier = live && live.lat ? { lat: live.lat, lng: live.lng } : null;
  const distanceKm = courier ? haversine(courier.lat, courier.lng, data.destino.lat, data.destino.lng) : null;
  const etaMin = distanceKm ? Math.max(3, Math.round((distanceKm / 25) * 60)) : null;

  return (
    <div className="min-h-screen relative">
      <div className="map-fullscreen">
        <LiveMap
          destination={data.destino}
          courier={courier}
          trail={data.trail || []}
          className="w-full h-full"
        />
      </div>

      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
        <div className="glass-strong rounded-xl px-3 py-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg btn-volt flex items-center justify-center"><Zap className="w-4 h-4" strokeWidth={3}/></div>
          <div>
            <div className="heading font-black text-sm leading-none">Esquina das Baterias</div>
            <div className="mono text-[9px] uppercase tracking-widest text-slate-400">Rastreio ao vivo</div>
          </div>
        </div>
        <StatusBadge status={data.status}/>
      </div>

      <div className="telemetry-card glass-strong rounded-2xl p-5 electric-glow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00D2FF" }}></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#00D2FF" }}></span>
            </span>
            <span className="mono text-[10px] uppercase tracking-widest text-slate-300">Entregador transmitindo</span>
          </div>
          {etaMin && (
            <div className="text-right">
              <div className="mono text-[9px] uppercase tracking-widest text-slate-500">ETA</div>
              <div className="heading font-black text-lg text-[#FF4655]">~{etaMin} min</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 flex items-center justify-center text-lg">🏍</div>
          <div className="flex-1">
            <div className="heading font-bold">{data.entregador_nome || "Aguardando entregador"}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3"/> {distanceKm ? `${distanceKm.toFixed(1)} km` : "—"}
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-1"><Battery className="w-4 h-4 text-[#FF4655]"/><span className="mono text-[10px] uppercase tracking-widest text-slate-400">Sua bateria</span></div>
          <div className="text-sm font-semibold">{data.bateria.marca} {data.bateria.modelo} · {data.bateria.capacidade_ah}Ah</div>
          <div className="text-xs text-slate-400">Entrega em: {data.endereco}</div>
        </div>

        {data.entregador_nome && (
          <button data-testid="btn-call" onClick={() => window.location.href = "tel:+5583988604300"} className="btn-volt w-full py-3 rounded-lg flex items-center justify-center gap-2">
            <Phone className="w-4 h-4"/> Ligar para a loja · (83) 98860-4300
          </button>
        )}
      </div>
    </div>
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
