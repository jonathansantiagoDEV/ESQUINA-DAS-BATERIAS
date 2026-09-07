import React from "react";
import { Link } from "react-router-dom";
import { Zap, MapPin, Battery, ShieldCheck, Truck, Radar, Clock, Phone } from "lucide-react";
import BrandCarousel from "../components/BrandCarousel";

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(227,6,19,0.25) 0%, transparent 60%)" }} />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,210,255,0.15) 0%, transparent 60%)" }} />

      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl btn-volt flex items-center justify-center"><Zap className="w-6 h-6" strokeWidth={3} /></div>
          <div>
            <div className="heading font-black text-lg leading-none">Esquina das Baterias</div>
            <div className="mono text-[9px] uppercase tracking-widest text-slate-500">Tudor · Mais tecnologia para seu carro</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" data-testid="header-btn-login" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5">Entrar</Link>
          <Link to="/register" data-testid="header-btn-register" className="btn-volt px-4 py-2 rounded-lg text-sm">Criar conta</Link>
        </div>
      </header>

      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass">
                <span className="w-2 h-2 rounded-full bg-emerald-400 relative pulse-dot" style={{ color: "#34D399" }}></span>
                <span className="mono text-[11px] uppercase tracking-widest text-slate-300">Rastreio ao vivo · 15s</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-white/90" style={{ background: "#E30613" }} data-testid="badge-24h">
                <Clock className="w-3.5 h-3.5" />
                <span className="mono text-[11px] font-black uppercase tracking-widest">24 horas</span>
              </div>
            </div>
            <h1 className="heading text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6">
              Bateria nova em <span className="text-[#FF4655]">45 minutos</span>.
              <br />Sem oficina. <span className="text-[#00D2FF]">Sem espera.</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8 max-w-lg">
              Peça sua bateria <span className="text-white font-semibold">Tudor</span>, acompanhe o entregador chegando em tempo real e instale onde você estiver. Pagamento na entrega, dinheiro ou Pix.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register?role=client" data-testid="hero-btn-order" className="btn-volt px-6 py-3.5 rounded-xl text-base flex items-center gap-2">
                <Battery className="w-5 h-5" /> Pedir bateria agora
              </Link>
              <a href="tel:+5583988604300" data-testid="hero-btn-call" className="glass px-6 py-3.5 rounded-xl text-base font-semibold text-white hover:volt-glow flex items-center gap-2 transition-shadow">
                <Phone className="w-5 h-5 text-[#FF4655]" /> (83) 98860-4300
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[{n:"24h", l:"Todo dia"},{n:"45min", l:"Tempo médio"},{n:"Tudor", l:"Original c/ nota"}].map((s) => (
                <div key={s.l} className="glass rounded-xl p-4">
                  <div className="heading font-black text-2xl text-white">{s.n}</div>
                  <div className="mono text-[10px] uppercase tracking-widest text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="glass-strong rounded-3xl p-6 electric-glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-[#00D2FF]" />
                  <span className="mono text-[11px] uppercase tracking-widest text-slate-300">Rastreio ao vivo</span>
                </div>
                <span className="mono text-[10px] uppercase tracking-widest text-emerald-400">● TRANSMITINDO</span>
              </div>
              <div className="rounded-2xl overflow-hidden mb-4">
                <img src="https://images.unsplash.com/photo-1612006567758-1846b36dd130?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMGNvdXJpZXIlMjBtb3RvcmN5Y2xlJTIwY2l0eXxlbnwwfHx8fDE3ODg2NjE0MjJ8MA&ixlib=rb-4.1.0&q=85" alt="Entregador" className="w-full h-56 object-cover" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">Marcos S.</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> 2,3 km de você</div>
                </div>
                <div className="text-right">
                  <div className="heading font-black text-2xl text-[#FF4655]">~7 min</div>
                  <div className="mono text-[10px] uppercase tracking-widest text-slate-500">ETA</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fachada da loja */}
        <div className="mt-24 grid md:grid-cols-2 gap-8 items-center">
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{ boxShadow: "0 24px 64px rgba(227,6,19,0.15)" }}>
            <img src="/fachada.png" alt="Fachada da Esquina das Baterias" className="w-full object-cover" data-testid="img-fachada" />
          </div>
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-[#FF4655] mb-2">Nossa loja</div>
            <h2 className="heading font-black text-3xl sm:text-4xl mb-4">Revenda oficial <span className="text-[#FF4655]">Tudor</span>, aberta 24 horas</h2>
            <p className="text-slate-400 mb-6">Quebrou na madrugada? A gente atende. Ligue ou peça pelo app — um entregador sai na hora com a bateria certa pro seu carro.</p>
            <div className="space-y-3">
              <a href="tel:+5583988604300" data-testid="footer-phone-1" className="glass rounded-xl p-4 flex items-center gap-3 hover:volt-glow transition-shadow">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#E30613" }}><Phone className="w-5 h-5" /></div>
                <div><div className="mono text-[10px] uppercase tracking-widest text-slate-500">Telefone / WhatsApp</div><div className="font-bold">(83) 98860-4300</div></div>
              </a>
              <a href="tel:+5583999810385" data-testid="footer-phone-2" className="glass rounded-xl p-4 flex items-center gap-3 hover:volt-glow transition-shadow">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#E30613" }}><Phone className="w-5 h-5" /></div>
                <div><div className="mono text-[10px] uppercase tracking-widest text-slate-500">Telefone 2</div><div className="font-bold">(83) 99981-0385</div></div>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-4">
          {[
            { icon: Battery, title: "Escolha", desc: "Encontre a bateria Tudor certa para seu carro em 30 segundos." },
            { icon: Radar, title: "Acompanhe", desc: "Veja o entregador se aproximando no mapa em tempo real." },
            { icon: ShieldCheck, title: "Instalado", desc: "Instalação inclusa. Pagamento na entrega em dinheiro ou Pix." },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover:volt-glow transition-shadow">
              <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(227,6,19,0.25), transparent)" }}>
                <f.icon className="w-6 h-6 text-[#FF4655]" />
              </div>
              <div className="heading font-bold text-xl mb-1">{f.title}</div>
              <div className="text-sm text-slate-400">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <BrandCarousel />

      <footer className="relative z-10 border-t border-white/5 py-6 mt-16 text-center text-xs text-slate-500 mono uppercase tracking-widest">
        Esquina das Baterias · Revenda Tudor · 24 horas · (83) 98860-4300
      </footer>
    </div>
  );
}
