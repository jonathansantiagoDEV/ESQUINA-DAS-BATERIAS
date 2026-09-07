import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Zap, Building2, User } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "admin" ? "admin" : "client");
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", tenant_id: "", tenant_name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/tenants").then(({ data }) => {
      setTenants(data);
      if (data.length && !form.tenant_id) setForm((f) => ({ ...f, tenant_id: data[0].id }));
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role, phone: form.phone };
      if (role === "admin") payload.tenant_name = form.tenant_name;
      else payload.tenant_id = form.tenant_id;
      const u = await register(payload);
      toast.success(`Conta criada, ${u.name}!`);
      nav(u.role === "admin" ? "/admin" : "/loja");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl btn-volt flex items-center justify-center"><Zap className="w-6 h-6" strokeWidth={3} /></div>
          <div className="heading font-black text-xl">Esquina das Baterias</div>
        </Link>
        <div className="glass-strong rounded-2xl p-6 sm:p-8">
          <h1 className="heading font-black text-2xl mb-1">Criar conta</h1>
          <p className="text-sm text-slate-400 mb-6">Escolha seu perfil.</p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button data-testid="role-client" onClick={() => setRole("client")} type="button"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${role==="client" ? "border-[#FF4655] bg-[#FF4655]/10" : "border-white/10 hover:border-white/20"}`}>
              <User className={`w-6 h-6 ${role==="client" ? "text-[#FF4655]" : "text-slate-400"}`} />
              <div className="text-sm font-semibold">Cliente</div>
              <div className="text-[10px] mono uppercase tracking-widest text-slate-500">Pedir bateria</div>
            </button>
            <button data-testid="role-admin" onClick={() => setRole("admin")} type="button"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${role==="admin" ? "border-[#00D2FF] bg-[#00D2FF]/10" : "border-white/10 hover:border-white/20"}`}>
              <Building2 className={`w-6 h-6 ${role==="admin" ? "text-[#00D2FF]" : "text-slate-400"}`} />
              <div className="text-sm font-semibold">Chefe / Frota</div>
              <div className="text-[10px] mono uppercase tracking-widest text-slate-500">Nova empresa</div>
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input data-testid="register-name" required placeholder="Seu nome" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
            <input data-testid="register-email" type="email" required placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
            <input data-testid="register-password" type="password" required minLength={6} placeholder="Senha (min. 6)" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
            <input data-testid="register-phone" placeholder="Telefone" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
            {role === "admin" ? (
              <input data-testid="register-tenant-name" required placeholder="Nome da sua empresa" value={form.tenant_name} onChange={(e)=>setForm({...form,tenant_name:e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" />
            ) : (
              <select data-testid="register-tenant-select" value={form.tenant_id} onChange={(e)=>setForm({...form,tenant_id:e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none">
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <button data-testid="register-submit" disabled={loading} type="submit"
              className="btn-volt w-full py-3 rounded-lg disabled:opacity-50">{loading ? "Criando..." : "Criar conta"}</button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-400">
            Já tem conta? <Link to="/login" className="text-[#FF4655] font-semibold" data-testid="link-login">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
