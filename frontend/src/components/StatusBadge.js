import React from "react";

const STATUS = {
  pendente:  { label: "Pendente",  bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.35)", color: "#FBBF24" },
  atribuido: { label: "Atribuído", bg: "rgba(147,197,253,0.12)", border: "rgba(147,197,253,0.35)", color: "#93C5FD" },
  em_rota:   { label: "Em Rota",   bg: "rgba(0,210,255,0.15)",   border: "rgba(0,210,255,0.4)",   color: "#38BDF8" },
  entregue:  { label: "Entregue",  bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.35)", color: "#34D399" },
  cancelado: { label: "Cancelado", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.35)", color: "#F87171" },
};

export default function StatusBadge({ status, className = "" }) {
  const s = STATUS[status] || STATUS.pendente;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mono px-2.5 py-1 rounded-full ${className}`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
      {s.label}
    </span>
  );
}
