# PRD — Esquina das Baterias

## Problema original
Web App responsivo (PWA mobile-first) para pedido, despacho e rastreio ao vivo de entregas de baterias da loja "Esquina das Baterias" (revenda Tudor, 24h, tel (83) 98860-4300 / (83) 99981-0385). React + FastAPI + MongoDB. Multi-empresa (SaaS com tenants).

## Personas
- **Cliente**: pede bateria no catálogo, acompanha entrega por link público com token
- **Entregador (courier)**: recebe entregas atribuídas, GPS 15s, buffer offline IndexedDB, finaliza entrega
- **Chefe (admin)**: fila de pedidos, atribui entregador, mapa da frota, CRUD catálogo/equipe

## Arquitetura
- Backend: FastAPI (`/app/backend/server.py`) — JWT (cookie httpOnly + Bearer fallback), bcrypt, multi-tenant (`tenant_id` em todas as coleções), WebSocket `/api/ws/track/{token}`, seed idempotente (admin + courier + cliente demo + catálogo Tudor)
- Frontend: React (`/app/frontend/src/`) — Leaflet com init manual via ref (`LiveMap.js`, imune a StrictMode), ícones custom gerados via Gemini Nano Banana (`/public/markers/`), buffer offline via idb (`lib/offlineBuffer.js`)
- DB: MongoDB — collections: tenants, users, baterias, pedidos, pings
- Identidade visual: vermelho Tudor #E30613/#FF4655 + azul elétrico #00D2FF (telemetria) sobre dark obsidian; fachada real em `/public/fachada.png`

## Implementado (2026-09-06)
- Auth JWT com 3 roles + registro público (cliente escolhe tenant; admin cria tenant) + isolamento multi-tenant
- Catálogo Tudor (5 baterias seed) com CRUD admin
- Fluxo de pedido completo: cliente → fila do chefe → atribuição → courier inicia (GPS 15s) → rastreio público `/rastreio/:token` com mapa fullscreen + ETA + WS ao vivo → entrega finaliza e token expira
- Buffer offline no courier (IndexedDB, botão "Simular offline", sincroniza em lote ao reconectar)
- Regra: cliente não cancela pedido em_rota; cancelamento repõe estoque
- Landing com identidade da loja real (badge 24h, telefones, fachada)
- Carrossel de marcas no fim da landing com fotos REAIS enviadas pelo usuário (Tudor, Zetta, Cral, Heliar, Moura em `/public/brands/`) — auto 3s, pausa no hover, setas e dots; fotos claras usam fundo claro + object-contain
- Testes: backend 21/21 pytest; E2E frontend validado (iteração 2, 100%)

## Credenciais
Ver `/app/memory/test_credentials.md` (admin: sant14101996@gmail.com / Volt@2026)

## Backlog priorizado
- **P0**: Mapbox (precisa token do usuário — substituir TileLayer do LiveMap), WhatsApp/Twilio nas transições de status (precisa credenciais)
- **P1**: Emergent Google Auth (login social), recuperação de senha por email (playbook pronto), ETA real por rota (OSRM), raio de entrega por tenant
- **P2**: PWA service worker com cache offline completo, pagamento online (Stripe/Pix), avaliação do cliente pós-entrega, dashboard de métricas do chefe

## Próximas tarefas
1. Receber token Mapbox + credenciais Twilio do usuário
2. Limpar registros TEST_* do MongoDB antes de produção
