import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LayoutDashboard, Package, Users, Store, ShoppingBag, ClipboardList, LogOut, Zap, MapPin, Menu, X } from "lucide-react";

export default function NavShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const items = user?.role === "admin"
    ? [
        { to: "/admin", label: "Dispatch", icon: LayoutDashboard },
        { to: "/admin/catalogo", label: "Catálogo", icon: Package },
        { to: "/admin/equipe", label: "Equipe", icon: Users },
      ]
    : user?.role === "courier"
    ? [{ to: "/entregador", label: "Minhas Entregas", icon: MapPin }]
    : [
        { to: "/loja", label: "Catálogo", icon: Store },
        { to: "/meus-pedidos", label: "Meus Pedidos", icon: ClipboardList },
      ];

  const handleLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass sticky top-0 z-40 border-b border-white/5" data-testid="nav-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-select" data-testid="nav-logo">
            <div className="w-9 h-9 rounded-xl btn-volt flex items-center justify-center">
              <Zap className="w-5 h-5" strokeWidth={3} />
            </div>
            <div>
              <div className="heading font-black text-lg leading-none">Esquina das Baterias</div>
              <div className="text-[10px] mono uppercase tracking-widest text-slate-500">{user?.tenant_name}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {items.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link key={to} to={to} data-testid={`nav-${label.toLowerCase().replace(/\s+/g,'-')}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-white/8 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-[10px] mono uppercase tracking-wider text-slate-500">{user?.role === "admin" ? "Chefe" : user?.role === "courier" ? "Entregador" : "Cliente"}</div>
            </div>
            <button onClick={handleLogout} data-testid="btn-logout" className="p-2 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
            <button className="md:hidden p-2 rounded-lg hover:bg-white/8" onClick={() => setOpen(!open)} data-testid="btn-menu-toggle">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/5 px-4 py-2 flex flex-col gap-1">
            {items.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-sm hover:bg-white/5">
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
