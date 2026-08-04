# Códigos de Erro e Status HTTP

A API do Valtro OS utiliza códigos de erro semânticos para facilitar a integração e o tratamento de falhas.

## Estrutura da Resposta de Erro

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Assinatura HMAC inválida.",
    "fields": {}
  },
  "requestId": "req_..."
}
```

## Tabela de Códigos

| Código | HTTP | Descrição | Retry? |
| :--- | :--- | :--- | :--- |
| `AUTHENTICATION_REQUIRED` | 401 | Headers de autenticação ausentes. | Não |
| `INVALID_CREDENTIAL` | 401 | Key ID não encontrado ou inativo. | Não |
| `INVALID_SIGNATURE` | 401 | Assinatura não confere com os dados. | Não |
| `INVALID_TIMESTAMP` | 401 | Timestamp fora da janela de 15 min. | Sim (corrigir relógio) |
| `REPLAY_ATTACK` | 401 | Nonce já utilizado anteriormente. | Não |
| `APPLICATION_SUSPENDED` | 403 | A aplicação foi desativada administrativamente. | Não |
| `INSUFFICIENT_SCOPE` | 403 | Credencial não possui escopo para a rota. | Não |
| `VALIDATION_ERROR` | 422 | Dados enviados não passam no schema. | Não |
| `RATE_LIMITED` | 429 | Limite de requisições excedido. | Sim (respeitar Retry-After) |
| `INTERNAL_ERROR` | 500 | Erro inesperado no processamento. | Não |
| `API_VERSION_DISABLED` | 503 | Esta versão da API foi desligada. | Não |

## Convenções

- **401 vs 403:** 401 é usado para falhas de identidade (HMAC, Token). 403 é usado para permissões de negócio (Escopos).
- **400 vs 422:** 400 é usado para JSON malformado. 422 é usado para dados válidos sintaticamente mas inválidos logicamente (Zod errors).
