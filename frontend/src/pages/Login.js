import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Zap, Mail, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bem-vindo, ${u.name}!`);
      if (u.role === "admin") nav("/admin");
      else if (u.role === "courier") nav("/entregador");
      else nav("/loja");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (em, pw) => { setEmail(em); setPassword(pw); };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl btn-volt flex items-center justify-center"><Zap className="w-6 h-6" strokeWidth={3} /></div>
          <div className="heading font-black text-xl">Esquina das Baterias</div>
        </Link>
        <div className="glass-strong rounded-2xl p-6 sm:p-8">
          <h1 className="heading font-black text-2xl mb-1">Entrar</h1>
          <p className="text-sm text-slate-400 mb-6">Acesse sua conta Esquina das Baterias.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" placeholder="seu@email.com" />
              </div>
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-widest text-slate-400 mb-1 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-[#00D2FF] focus:outline-none" placeholder="••••••••" />
              </div>
            </div>
            <button data-testid="login-submit" disabled={loading} type="submit"
              className="btn-volt w-full py-3 rounded-lg disabled:opacity-50">{loading ? "Entrando..." : "Entrar"}</button>
          </form>
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Contas demo (clique para preencher)</div>
            <div className="grid grid-cols-1 gap-2">
              <button data-testid="quick-admin" onClick={() => quickLogin("sant14101996@gmail.com", "Volt@2026")} className="glass rounded-lg px-3 py-2 text-left text-sm hover:electric-glow transition-shadow">
                <span className="text-[#FF4655] font-bold">Chefe</span> <span className="text-slate-400">· sant14101996@gmail.com</span>
              </button>
              <button data-testid="quick-courier" onClick={() => quickLogin("entregador@esquinadasbaterias.com", "Volt@2026")} className="glass rounded-lg px-3 py-2 text-left text-sm hover:electric-glow transition-shadow">
                <span className="text-[#00D2FF] font-bold">Entregador</span> <span className="text-slate-400">· entregador@esquinadasbaterias.com</span>
              </button>
              <button data-testid="quick-client" onClick={() => quickLogin("cliente@esquinadasbaterias.com", "Volt@2026")} className="glass rounded-lg px-3 py-2 text-left text-sm hover:electric-glow transition-shadow">
                <span className="text-emerald-400 font-bold">Cliente</span> <span className="text-slate-400">· cliente@esquinadasbaterias.com</span>
              </button>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-slate-400">
            Não tem conta? <Link to="/register" className="text-[#FF4655] font-semibold" data-testid="link-register">Cadastre-se</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
