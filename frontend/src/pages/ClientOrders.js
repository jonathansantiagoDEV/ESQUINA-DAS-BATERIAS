import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { ExternalLink, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function ClientOrders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/pedidos"); setItems(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const copyTrack = (token) => {
    const url = `${window.location.origin}/rastreio/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de rastreio copiado!");
  };

  const cancel = async (id) => {
    if (!window.confirm("Cancelar este pedido?")) return;
    try { await api.post(`/pedidos/${id}/cancel`); toast.success("Pedido cancelado."); load(); }
    catch (e) { toast.error("Falha ao cancelar"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-[#00D2FF] mb-2">Meus pedidos</div>
          <h1 className="heading font-black text-3xl">Histórico</h1>
        </div>
        <button data-testid="btn-refresh" onClick={load} className="glass p-3 rounded-lg hover:electric-glow transition-shadow">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {items.length === 0 && !loading && (
        <div className="glass rounded-2xl p-10 text-center text-slate-400">Você ainda não fez nenhum pedido.</div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} data-testid={`pedido-${p.id}`} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
              <div>
                <div className="mono text-[10px] uppercase tracking-widest text-slate-500">#{p.id.slice(0, 8)}</div>
                <div className="heading font-bold text-lg">{p.bateria_snapshot.marca} {p.bateria_snapshot.modelo}</div>
                <div className="text-sm text-slate-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {p.endereco}</div>
              </div>
              <div className="text-right">
                <StatusBadge status={p.status} />
                <div className="heading font-black text-xl text-[#FF4655] mt-2">R$ {p.total.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {p.entregador_nome && <div className="text-xs text-slate-400">Entregador: <span className="text-white font-semibold">{p.entregador_nome}</span></div>}
              <div className="flex-1" />
              {p.track_token && (
                <>
                  <a data-testid={`link-track-${p.id}`} href={`/rastreio/${p.track_token}`} target="_blank" rel="noreferrer"
                    className="btn-electric px-3 py-2 rounded-lg text-xs flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir rastreio
                  </a>
                  <button onClick={() => copyTrack(p.track_token)} data-testid={`btn-copy-${p.id}`}
                    className="glass px-3 py-2 rounded-lg text-xs">Copiar link</button>
                </>
              )}
              {["pendente","atribuido"].includes(p.status) && (
                <button onClick={() => cancel(p.id)} data-testid={`btn-cancel-${p.id}`}
                  className="glass px-3 py-2 rounded-lg text-xs text-red-400 border-red-500/30">Cancelar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
