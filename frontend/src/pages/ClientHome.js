import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Battery, Zap, ShoppingCart } from "lucide-react";

export default function ClientHome() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/baterias").then(({ data }) => setItems(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="mono text-[10px] uppercase tracking-widest text-[#00D2FF] mb-2">Catálogo</div>
        <h1 className="heading font-black text-3xl sm:text-4xl">Escolha sua bateria</h1>
        <p className="text-slate-400 mt-2">Instalação inclusa. Pagamento na entrega.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-20">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => (
            <div key={b.id} data-testid={`bateria-card-${b.id}`} className="glass rounded-2xl overflow-hidden hover:electric-glow transition-shadow group">
              <div className="h-40 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #181D2A 0%, #0B0E15 100%)" }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Battery className="w-20 h-20 text-white/10" strokeWidth={1} />
                </div>
                <div className="absolute top-3 right-3 mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: b.estoque > 5 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: b.estoque > 5 ? "#34D399" : "#FBBF24", border: `1px solid ${b.estoque > 5 ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}` }}>
                  {b.estoque > 0 ? `${b.estoque} em estoque` : "Esgotada"}
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#FF4655]" />
                  <span className="mono text-[10px] uppercase tracking-widest text-slate-300">{b.tecnologia}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="mono text-[10px] uppercase tracking-widest text-slate-500 mb-1">{b.marca}</div>
                <div className="heading font-bold text-lg leading-tight mb-1">{b.modelo}</div>
                <div className="text-sm text-slate-400 mb-3">{b.capacidade_ah} Ah</div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-slate-500">Preço</div>
                    <div className="heading font-black text-2xl text-[#FF4655]">R$ {b.preco.toFixed(2)}</div>
                  </div>
                  <Link to={`/pedir/${b.id}`} data-testid={`btn-order-${b.id}`}
                    className="btn-volt px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Pedir
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
