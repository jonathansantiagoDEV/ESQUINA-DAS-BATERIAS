import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Package, X, Save } from "lucide-react";

const empty = { marca: "", modelo: "", capacidade_ah: 60, tecnologia: "Chumbo-Ácido", preco: 0, estoque: 0, descricao: "" };

export default function AdminCatalog() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null = closed, {} for new, or existing obj
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); const { data } = await api.get("/baterias"); setItems(data); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing({ new: true }); };
  const openEdit = (b) => { setForm({ ...b }); setEditing(b); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing?.new) await api.post("/baterias", { ...form, preco: Number(form.preco), capacidade_ah: Number(form.capacidade_ah), estoque: Number(form.estoque) });
      else await api.put(`/baterias/${editing.id}`, { ...form, preco: Number(form.preco), capacidade_ah: Number(form.capacidade_ah), estoque: Number(form.estoque) });
      toast.success("Salvo!"); setEditing(null); load();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remover?")) return;
    try { await api.delete(`/baterias/${id}`); toast.success("Removido"); load(); }
    catch (e) { toast.error("Erro"); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-[#00D2FF] mb-2">Catálogo</div>
          <h1 className="heading font-black text-3xl">Baterias</h1>
        </div>
        <button data-testid="btn-new-bateria" onClick={openNew} className="btn-volt px-4 py-2.5 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((b) => (
          <div key={b.id} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-[#FF4655]" />
              </div>
              <div className="flex-1">
                <div className="mono text-[10px] uppercase tracking-widest text-slate-500">{b.marca}</div>
                <div className="heading font-bold text-base leading-tight">{b.modelo}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
              <div><div className="mono text-[10px] uppercase tracking-widest text-slate-500">Cap.</div><div className="font-semibold">{b.capacidade_ah}Ah</div></div>
              <div><div className="mono text-[10px] uppercase tracking-widest text-slate-500">Preço</div><div className="font-semibold text-[#FF4655]">R$ {b.preco.toFixed(2)}</div></div>
              <div><div className="mono text-[10px] uppercase tracking-widest text-slate-500">Estoque</div><div className="font-semibold">{b.estoque}</div></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(b)} data-testid={`btn-edit-${b.id}`} className="glass flex-1 py-2 rounded-lg text-xs">Editar</button>
              <button onClick={() => remove(b.id)} data-testid={`btn-del-${b.id}`} className="glass px-3 py-2 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submit} className="glass-strong rounded-2xl p-6 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="heading font-bold text-lg">{editing.new ? "Nova bateria" : "Editar"}</h3>
              <button type="button" onClick={()=>setEditing(null)}><X className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Marca" data-testid="form-marca" value={form.marca} onChange={e=>setForm({...form,marca:e.target.value})} className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
              <input required placeholder="Modelo" data-testid="form-modelo" value={form.modelo} onChange={e=>setForm({...form,modelo:e.target.value})} className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
              <input required type="number" placeholder="Capacidade Ah" data-testid="form-cap" value={form.capacidade_ah} onChange={e=>setForm({...form,capacidade_ah:e.target.value})} className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
              <select value={form.tecnologia} onChange={e=>setForm({...form,tecnologia:e.target.value})} className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
                <option>Chumbo-Ácido</option><option>EFB</option><option>AGM</option><option>Lítio</option>
              </select>
              <input required type="number" step="0.01" placeholder="Preço" data-testid="form-preco" value={form.preco} onChange={e=>setForm({...form,preco:e.target.value})} className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
              <input required type="number" placeholder="Estoque" data-testid="form-estoque" value={form.estoque} onChange={e=>setForm({...form,estoque:e.target.value})} className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
            </div>
            <textarea placeholder="Descrição" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} rows={2} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
            <button type="submit" data-testid="btn-save-bateria" className="btn-volt w-full py-3 rounded-lg flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Salvar</button>
          </form>
        </div>
      )}
    </div>
  );
}
