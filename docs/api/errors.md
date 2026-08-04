# Respostas e códigos de erro

[Início](README.md) · [Primeiros passos](getting-started.md) · [OpenAPI](openapi-v1.yaml) · [Pipeline](pipeline.md)

As rotas da API v1 usam um envelope JSON estável:

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

O header `X-Valtro-Request-ID` repete o `requestId` gerado pelo Valtro OS. Detalhes internos, credenciais, assinaturas, valores de payload e corpos não são incluídos nas mensagens.

## Catálogo do runtime compartilhado

| Código                   |       HTTP | Situação                                                      |
| ------------------------ | ---------: | ------------------------------------------------------------- |
| `VERSION_UNAVAILABLE`    | 404 ou 503 | Registro ausente, versão desabilitada ou sunset transcorrido. |
| `INTERNAL_ERROR`         |        500 | Falha inesperada, sem exposição de detalhes.                  |
| `MISSING_HEADERS`        |        401 | Headers HMAC obrigatórios ausentes.                           |
| `INVALID_TIMESTAMP`      |        401 | Timestamp inválido ou fora da janela.                         |
| `INVALID_NONCE`          |        401 | Nonce fora do formato permitido.                              |
| `INVALID_CREDENTIAL`     |        401 | Credencial ausente, inativa, expirada ou revogada.            |
| `INVALID_SIGNATURE`      |        401 | Assinatura HMAC inválida.                                     |
| `REPLAY_ATTACK`          |        401 | Nonce já consumido pela credencial.                           |
| `APPLICATION_SUSPENDED`  |        403 | Aplicação não está ativa.                                     |
| `INSUFFICIENT_SCOPE`     |        403 | Falta ao menos um scope obrigatório.                          |
| `PAYLOAD_TOO_LARGE`      |        413 | Corpo ultrapassa o limite efetivo.                            |
| `VALIDATION_ERROR`       |        422 | Body, query ou path não atende ao schema.                     |
| `RATE_LIMITED`           |        429 | Contrato disponível; nenhuma rota atual ativa o limitador.    |
| `RATE_LIMIT_UNAVAILABLE` |        503 | Falha fechada sem enforcement persistente disponível.         |

`NOT_FOUND` é usado para ocultar a rota técnica interna em produção e não integra o catálogo público. `INVALID_KEY_ID` e `CREDENTIAL_REVOKED` continuam consolidados em `INVALID_CREDENTIAL`.

O subconjunto normativo de erros exposto pelo endpoint público atual está no [contrato OpenAPI](openapi-v1.yaml). A disponibilidade das demais etapas está descrita no [estado de implementação](implementation-status.md).
