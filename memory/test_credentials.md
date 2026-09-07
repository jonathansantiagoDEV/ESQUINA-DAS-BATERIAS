# Esquina das Baterias — Test Credentials

## Admin / Chefe (proprietário)
- Email: sant14101996@gmail.com
- Senha: Volt@2026
- Papel: admin
- Empresa/tenant: Esquina das Baterias (auto-criada no startup)

## Entregador demo
- Email: entregador@esquinadasbaterias.com
- Senha: Volt@2026
- Papel: courier
- Nome: Marcos Silva

## Cliente demo
- Email: cliente@esquinadasbaterias.com
- Senha: Volt@2026
- Papel: client
- Nome: Ana Costa

## Endpoints
- POST /api/auth/register  (client cria conta em um tenant existente; admin cria novo tenant)
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- GET  /api/tenants  (público, para escolher no registro)
- GET/POST/PUT/DELETE /api/baterias
- GET/POST /api/pedidos
- POST /api/pedidos/{id}/assign  (admin)
- POST /api/pedidos/{id}/start   (courier)
- POST /api/pedidos/{id}/deliver (courier)
- POST /api/pedidos/{id}/cancel  (client/admin)
- POST /api/pedidos/{id}/pings   (courier — batch de pings, aceita offline buffered)
- GET  /api/track/{token}        (público)
- WS   /api/ws/track/{token}     (público, atualização ao vivo)
