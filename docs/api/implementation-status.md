# Estado de implementação da API

Esta matriz separa o contrato público v1 das rotas internas, operacionais e planejadas.

| Componente                                 | Status       | Contrato público v1 | Observação                                                  |
| ------------------------------------------ | ------------ | ------------------- | ----------------------------------------------------------- |
| `GET /api/v1/meta`                         | Implementado | Sim                 | Único endpoint público v1 atualmente contratado.            |
| `POST /api/v1/_internal/auth-check`        | Interno      | Não                 | Diagnóstico HMAC; retorna 404 em produção.                  |
| `GET /api/public/version`                  | Operacional  | Não                 | Guard de versão usado pelo CI.                              |
| `GET /api/public/google-calendar/callback` | Operacional  | Não                 | Callback OAuth com segurança própria.                       |
| `POST /api/public/google-calendar/sync`    | Operacional  | Não                 | Cron autenticado por Bearer secret.                         |
| HMAC `VALTRO-HMAC-SHA256-V1`               | Parcial      | Ainda não           | Fundação implementada, sem endpoint autenticado de negócio. |
| Autorização por scopes                     | Parcial      | Ainda não           | Helper existente, sem aplicação em handler público.         |
| Auditoria de API                           | Parcial      | Ainda não           | Módulo existente, conectado apenas ao diagnóstico interno.  |
| Rate limiting                              | Planejado    | Não                 | Default persistido em 100 rpm, sem enforcement.             |
| Limite de payload                          | Planejado    | Não                 | Defaults persistidos, sem enforcement.                      |
| `POST /api/v1/support/tickets`             | Planejado    | Não                 | Sem handler; removido temporariamente do OpenAPI público.   |
| `POST /api/v1/support/bugs`                | Planejado    | Não                 | Sem handler; removido temporariamente do OpenAPI público.   |
| Feedback, sugestões e anexos               | Planejado    | Não                 | Capacidades/scopes existem, endpoints não.                  |

## Infraestrutura pendente

- Pipeline compartilhado para autenticação, versão, scopes, limites, erros e auditoria.
- Hostname público definitivo.
- Rate limiting e limites de payload em runtime.
- Testes de integração dos handlers e conformidade entre runtime e OpenAPI.

## Migrations duplicadas

O histórico contém pares duplicados para OPS-API-001E e OPS-API-001G. As migrations posteriores tentam recriar triggers e, no caso de 001G, policy já criada. Elas não foram removidas nem alteradas nesta sprint porque podem fazer parte de histórico publicado. Um plano corretivo deve ser homologado antes de qualquer mudança estrutural.
