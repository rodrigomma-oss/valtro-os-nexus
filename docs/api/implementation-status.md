# Estado de implementação da API

[Início](README.md) · [Roadmap](roadmap.md) · [Changelog](changelog.md) · [OpenAPI](openapi-v1.yaml)

Esta matriz separa o contrato público v1 das rotas internas, operacionais e planejadas.

| Componente                                 | Status       | Contrato público v1 | Observação                                                                                          |
| ------------------------------------------ | ------------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /api/v1/meta`                         | Implementado | Sim                 | Único endpoint público v1 atualmente contratado; usa o pipeline compartilhado.                      |
| `POST /api/v1/_internal/auth-check`        | Interno      | Não                 | Diagnóstico HMAC pelo pipeline; retorna 404 em produção.                                            |
| `GET /api/public/version`                  | Operacional  | Não                 | Guard de versão usado pelo CI; fora do pipeline v1.                                                 |
| `GET /api/public/google-calendar/callback` | Operacional  | Não                 | Callback OAuth com segurança própria.                                                               |
| `POST /api/public/google-calendar/sync`    | Operacional  | Não                 | Cron autenticado por Bearer secret.                                                                 |
| Pipeline compartilhado v1                  | Implementado | Infraestrutura      | Ordem comum de versão, HMAC, scopes, validação, limites, handler, auditoria e envelope.             |
| HMAC `VALTRO-HMAC-SHA256-V1`               | Implementado | Ainda não           | Integrado ao pipeline; nenhum endpoint autenticado de negócio foi publicado.                        |
| Autorização por scopes                     | Implementado | Ainda não           | Política “todos obrigatórios” disponível; nenhuma rota atual exige scope.                           |
| Auditoria de API                           | Implementado | Infraestrutura      | Transversal nas duas rotas v1, com persistência best-effort.                                        |
| Rate limiting                              | Parcial      | Não                 | Contrato fail-closed e respostas existem; enforcement distribuído aguarda migration homologada.     |
| Limite de payload                          | Implementado | Infraestrutura      | Valida bytes reais e limite por aplicação; streaming incremental permanece limitado pelo framework. |
| `POST /api/v1/support/tickets`             | Planejado    | Não                 | Sem handler; não consta no OpenAPI público.                                                         |
| `POST /api/v1/support/bugs`                | Planejado    | Não                 | Sem handler; não consta no OpenAPI público.                                                         |
| Feedback, sugestões e anexos               | Planejado    | Não                 | Capacidades/scopes existem, endpoints não.                                                          |

## Infraestrutura pendente

- Hostname público definitivo.
- Persistência atômica e distribuída para rate limiting.
- Endpoints autenticados de negócio para exercitar scopes, schemas e rate limiting em produção.

## Migrations duplicadas

O histórico contém pares duplicados para OPS-API-001E e OPS-API-001G. As migrations posteriores tentam recriar triggers e, no caso de 001G, policy já criada. Elas não foram removidas nem alteradas nesta sprint porque podem fazer parte de histórico publicado. Um plano corretivo deve ser homologado antes de qualquer mudança estrutural.

Para a separação temporal entre capacidades presentes e futuras, consulte o [roadmap](roadmap.md).
