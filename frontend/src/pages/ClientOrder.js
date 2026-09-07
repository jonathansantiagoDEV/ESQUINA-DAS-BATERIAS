import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { MapPin, Battery, Zap, CreditCard, Loader2 } from "lucide-react";

export default function ClientOrder() {
  const { bateriaId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [bateria, setBateria] = useState(null);
  const [form, setForm] = useState({
    endereco: "", cidade: "São Paulo", referencia: "",
    telefone_contato: user?.phone || "",
    observacoes: "", pagamento: "dinheiro",
    quantidade: 1, lat: -23.5505, lng: -46.6333,
  });
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    api.get("/baterias").then(({ data }) => {
      const b = data.find((x) => x.id === bateriaId);
      if (!b) { toast.error("Bateria não encontrada"); nav("/loja"); return; }
      setBateria(b);
    });
  }, [bateriaId]);

  const useMyLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast.success("Localização capturada");
        setGeoLoading(false);
      },
      () => { toast.error("Não foi possível obter GPS. Digite o endereço manualmente."); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/pedidos", { ...form, bateria_id: bateriaId, quantidade: Number(form.quantidade) });
      toast.success("Pedido criado! O chefe vai atribuir um entregador.");
      nav("/meus-pedidos");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  if (!bateria) return <div className="max-w-3xl mx-auto p-8 text-slate-400">Carregando…</div>;
  const total = (bateria.preco * form.quantidade).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Battery className="w-8 h-8 text-[#FF4655]" />
        </div>
        <div className="flex-1">
          <div className="mono text-[10px] uppercase tracking-widest text-slate-500">{bateria.marca}</div>
          <div className="heading font-bold text-lg">{bateria.modelo} · {bateria.capacidade_ah}Ah</div>
          <div className="text-sm text-slate-400">{bateria.tecnologia}</div>
        </div>
        <div className="text-right">
          <div className="mono text-[10px] uppercase tracking-widest text-slate-500">Unitário</div>
          <div className="heading font-black text-xl text-[#FF4655]">R$ {bateria.preco.toFixed(2)}</div>
        </div>
      </div>

      <form onSubmit={submit} className="glass-strong rounded-2xl p-6 space-y-4">
        <h2 className="heading font-bold text-xl mb-2">Endereço de entrega</h2>

        <div>
          <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Endereço completo</label>
          <input data-testid="order-endereco" required value={form.endereco} onChange={(e)=>setForm({...form,endereco:e.target.value})}
            placeholder="Rua, número, bairro" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Cidade</label>
            <input data-testid="order-cidade" value={form.cidade} onChange={(e)=>setForm({...form,cidade:e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Referência</label>
            <input data-testid="order-referencia" value={form.referencia} onChange={(e)=>setForm({...form,referencia:e.target.value})}
              placeholder="Ponto de referência" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Latitude</label>
            <input data-testid="order-lat" type="number" step="any" required value={form.lat} onChange={(e)=>setForm({...form,lat:parseFloat(e.target.value)})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Longitude</label>
            <input data-testid="order-lng" type="number" step="any" required value={form.lng} onChange={(e)=>setForm({...form,lng:parseFloat(e.target.value)})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
          </div>
        </div>

        <button type="button" onClick={useMyLocation} data-testid="btn-geo"
          className="w-full py-2.5 rounded-lg glass border border-[#00D2FF]/40 text-[#00D2FF] font-semibold flex items-center justify-center gap-2 hover:electric-glow transition-shadow">
          {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} Usar minha localização
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Telefone</label>
            <input data-testid="order-telefone" required value={form.telefone_contato} onChange={(e)=>setForm({...form,telefone_contato:e.target.value})}
              placeholder="(11) 91234-5678" className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Quantidade</label>
            <input data-testid="order-quantidade" type="number" min="1" max={bateria.estoque} value={form.quantidade} onChange={(e)=>setForm({...form,quantidade:e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Observações</label>
          <textarea data-testid="order-obs" value={form.observacoes} onChange={(e)=>setForm({...form,observacoes:e.target.value})}
            placeholder="Instruções para o entregador" rows={2}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
        </div>

        <div>
          <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-2 block">Pagamento</label>
          <div className="grid grid-cols-2 gap-2">
            {["dinheiro","pix"].map((p) => (
              <button type="button" key={p} data-testid={`pay-${p}`} onClick={()=>setForm({...form,pagamento:p})}
                className={`py-3 rounded-lg border flex items-center justify-center gap-2 uppercase mono text-xs tracking-widest ${form.pagamento===p ? "border-[#FF4655] bg-[#FF4655]/10 text-[#FF4655]" : "border-white/10 text-slate-400 hover:text-white"}`}>
                <CreditCard className="w-4 h-4" /> {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#FF4655]/10 border border-[#FF4655]/30">
          <span className="heading font-bold">Total</span>
          <span className="heading font-black text-2xl text-[#FF4655]">R$ {total}</span>
        </div>

        <button data-testid="btn-submit-order" disabled={loading} type="submit" className="btn-volt w-full py-3.5 rounded-lg disabled:opacity-50">
          {loading ? "Enviando..." : "Confirmar pedido"}
        </button>
      </form>
    </div>
  );
}
