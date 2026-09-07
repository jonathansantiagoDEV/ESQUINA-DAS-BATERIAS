import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientHome from "./pages/ClientHome";
import ClientOrder from "./pages/ClientOrder";
import ClientOrders from "./pages/ClientOrders";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCatalog from "./pages/AdminCatalog";
import AdminTeam from "./pages/AdminTeam";
import DriverApp from "./pages/DriverApp";
import PublicTracking from "./pages/PublicTracking";
import NavShell from "./components/NavShell";
import ErrorBoundary from "./components/ErrorBoundary";

function Guard({ roles, children }) {
  const { user, checked } = useAuth();
  if (!checked) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user, checked } = useAuth();
  if (!checked) return null;
  if (!user) return <Landing />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "courier") return <Navigate to="/entregador" replace />;
  return <Navigate to="/loja" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rastreio/:token" element={<PublicTracking />} />

            {/* Client */}
            <Route path="/loja" element={<Guard roles={["client"]}><NavShell><ClientHome /></NavShell></Guard>} />
            <Route path="/pedir/:bateriaId" element={<Guard roles={["client"]}><NavShell><ClientOrder /></NavShell></Guard>} />
            <Route path="/meus-pedidos" element={<Guard roles={["client"]}><NavShell><ClientOrders /></NavShell></Guard>} />

            {/* Admin */}
            <Route path="/admin" element={<Guard roles={["admin"]}><NavShell><AdminDashboard /></NavShell></Guard>} />
            <Route path="/admin/catalogo" element={<Guard roles={["admin"]}><NavShell><AdminCatalog /></NavShell></Guard>} />
            <Route path="/admin/equipe" element={<Guard roles={["admin"]}><NavShell><AdminTeam /></NavShell></Guard>} />

            {/* Courier */}
            <Route path="/entregador" element={<Guard roles={["courier"]}><NavShell><DriverApp /></NavShell></Guard>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
