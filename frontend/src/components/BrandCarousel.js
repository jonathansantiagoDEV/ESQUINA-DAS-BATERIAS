import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BRANDS = [
  { name: "Tudor", img: "/brands/tudor-real.png", tag: "Revenda oficial", color: "#FF4655", fit: "contain" },
  { name: "Zetta", img: "/brands/zetta.jpg", tag: "Livre de manutenção", color: "#FBBF24", fit: "contain" },
  { name: "Cral", img: "/brands/cral.png", tag: "A bateria nota 10", color: "#F87171", fit: "contain" },
  { name: "Heliar", img: "/brands/heliar.webp", tag: "24 meses de garantia", color: "#34D399", fit: "contain" },
  { name: "Moura", img: "/brands/moura.png", tag: "Tradição nacional", color: "#38BDF8", fit: "contain" },
];

export default function BrandCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // preload all slides so transitions never show a blank frame
  useEffect(() => {
    BRANDS.forEach((b) => { const im = new Image(); im.src = b.img; });
  }, []);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => setIdx((i) => (i + 1) % BRANDS.length), 3000);
    return () => clearInterval(iv);
  }, [paused]);

  const go = (d) => setIdx((i) => (i + d + BRANDS.length) % BRANDS.length);
  const brand = BRANDS[idx];

  return (
    <div
      className="max-w-7xl mx-auto px-6 mt-24 mb-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="brand-carousel"
    >
      <div className="text-center mb-8">
        <div className="mono text-[10px] uppercase tracking-widest text-[#FF4655] mb-2">Trabalhamos com as melhores</div>
        <h2 className="heading font-black text-3xl sm:text-4xl">Marcas que você <span className="text-[#FF4655]">confia</span></h2>
      </div>

      <div className="relative glass rounded-3xl overflow-hidden volt-glow">
        <div className="relative h-[320px] sm:h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0" style={brand.fit === "contain" ? { background: "linear-gradient(160deg, #f1f5f9 0%, #cbd5e1 100%)" } : undefined}>
                <img src={brand.img} alt={`Bateria ${brand.name}`}
                  className={`w-full h-full ${brand.fit === "contain" ? "object-contain p-8 sm:p-14" : "object-cover"}`} />
              </div>
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,12,0.92) 0%, transparent 55%)" }} />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                <div>
                  <div className="heading font-black text-3xl sm:text-4xl" data-testid="carousel-brand-name">{brand.name}</div>
                  <div className="mono text-[11px] uppercase tracking-widest mt-1" style={{ color: brand.color }}>{brand.tag}</div>
                </div>
                <div className="mono text-[11px] uppercase tracking-widest text-slate-500">{idx + 1} / {BRANDS.length}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={() => go(-1)} data-testid="carousel-prev" aria-label="Anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass-strong flex items-center justify-center hover:border-white/30 transition-colors z-10">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => go(1)} data-testid="carousel-next" aria-label="Próxima"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass-strong flex items-center justify-center hover:border-white/30 transition-colors z-10">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {BRANDS.map((b, i) => (
            <button key={b.name} onClick={() => setIdx(i)} aria-label={b.name} data-testid={`carousel-dot-${b.name.toLowerCase()}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === idx ? 24 : 8, background: i === idx ? "#E30613" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
