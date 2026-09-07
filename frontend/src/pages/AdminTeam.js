import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Plus, X, UserCircle } from "lucide-react";

export default function AdminTeam() {
  const [couriers, setCouriers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

  const load = async () => { const { data } = await api.get("/users/couriers"); setCouriers(data); };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/couriers", form);
      toast.success("Entregador criado!"); setOpen(false); setForm({ name: "", email: "", password: "", phone: "" }); load();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-[#00D2FF] mb-2">Equipe</div>
          <h1 className="heading font-black text-3xl">Entregadores</h1>
        </div>
        <button data-testid="btn-new-courier" onClick={() => setOpen(true)} className="btn-volt px-4 py-2.5 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo entregador
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {couriers.map((c) => (
          <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-[#00D2FF]" />
            </div>
            <div className="flex-1">
              <div className="heading font-bold">{c.name}</div>
              <div className="text-xs text-slate-400">{c.email}</div>
              <div className="text-xs text-slate-400">{c.phone || "sem telefone"}</div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submit} className="glass-strong rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="heading font-bold text-lg">Novo entregador</h3>
              <button type="button" onClick={()=>setOpen(false)}><X className="w-5 h-5"/></button>
            </div>
            <input required placeholder="Nome" data-testid="courier-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
            <input required type="email" placeholder="Email" data-testid="courier-email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
            <input required minLength={6} type="password" placeholder="Senha" data-testid="courier-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
            <input placeholder="Telefone" data-testid="courier-phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10" />
            <button type="submit" data-testid="btn-save-courier" className="btn-volt w-full py-3 rounded-lg">Criar</button>
          </form>
        </div>
      )}
    </div>
  );
}
