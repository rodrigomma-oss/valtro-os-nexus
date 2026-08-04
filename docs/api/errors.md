# Respostas e códigos de erro

As rotas da API v1 usam o envelope JSON abaixo:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Assinatura HMAC inválida."
  },
  "requestId": "req_a1b2c3d4e5f60708"
}
```

O header `X-Valtro-Request-ID` repete o `requestId` gerado pelo Valtro OS. Detalhes internos, credenciais, assinaturas e corpos não são incluídos nas mensagens.

## Códigos atualmente retornados

| Código                  |       HTTP | Origem atual            | Retry?                                                               |
| ----------------------- | ---------: | ----------------------- | -------------------------------------------------------------------- |
| `VERSION_UNAVAILABLE`   | 404 ou 503 | `GET /api/v1/meta`      | Depende do estado da versão.                                         |
| `INTERNAL_ERROR`        |        500 | `/meta` e fundação HMAC | Não automaticamente.                                                 |
| `MISSING_HEADERS`       |        401 | Fundação HMAC           | Não.                                                                 |
| `INVALID_TIMESTAMP`     |        401 | Fundação HMAC           | Sim, após corrigir o relógio.                                        |
| `INVALID_NONCE`         |        401 | Fundação HMAC           | Não; gere outro nonce válido.                                        |
| `INVALID_CREDENTIAL`    |        401 | Fundação HMAC           | Não. Abrange Key ID ausente no banco, inativo, expirado ou revogado. |
| `INVALID_SIGNATURE`     |        401 | Fundação HMAC           | Não, sem corrigir a assinatura.                                      |
| `REPLAY_ATTACK`         |        401 | Fundação HMAC           | Não; gere outro nonce.                                               |
| `APPLICATION_SUSPENDED` |        403 | Fundação HMAC           | Não.                                                                 |

Os códigos da fundação HMAC são hoje exercitados somente pela rota técnica interna fora de produção. Eles passam a integrar o contrato público quando existir um endpoint autenticado operacional.

## Códigos planejados

| Código               | HTTP esperado | Situação                                                                        |
| -------------------- | ------------: | ------------------------------------------------------------------------------- |
| `INVALID_KEY_ID`     |           401 | Planejado; hoje consolidado em `INVALID_CREDENTIAL`.                            |
| `CREDENTIAL_REVOKED` |           401 | Planejado; hoje consolidado em `INVALID_CREDENTIAL`.                            |
| `INSUFFICIENT_SCOPE` |           403 | Planejado; o helper de autorização existe, mas nenhum handler público o aplica. |
| `VALIDATION_ERROR`   |           422 | Planejado para endpoints de negócio.                                            |
| `RATE_LIMITED`       |           429 | Planejado; rate limiting não é aplicado no runtime atual.                       |

`NOT_FOUND` é usado somente para ocultar a rota técnica interna em produção e não integra o catálogo público.
