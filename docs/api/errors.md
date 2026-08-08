# Erros & Status

Nossa API utiliza códigos de status HTTP padrão combinados com mensagens de erro claras no corpo da resposta para facilitar o debug.

## Formato de Erro

Sempre que algo der errado (`success: false`), você receberá este objeto:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "A assinatura HMAC enviada não coincide com a esperada pelo servidor."
  },
  "requestId": "req_..."
}
```

## Códigos Comuns

| Código               | HTTP | O que fazer?                                                                  |
| -------------------- | ---- | ----------------------------------------------------------------------------- |
| `INVALID_CREDENTIAL` | 401  | Verifique se seu `Key ID` está correto e se a credencial está ativa no Console. |
| `INVALID_SIGNATURE`  | 401  | Revise sua lógica de geração de HMAC. Verifique a ordem dos campos.            |
| `INVALID_TIMESTAMP`  | 401  | Sincronize o relógio do seu servidor. A janela máxima é de 15 minutos.         |
| `REPLAY_ATTACK`      | 401  | Você tentou reutilizar um `nonce`. Gere um novo valor aleatório.               |
| `INSUFFICIENT_SCOPE` | 403  | Sua aplicação não tem permissão para este recurso. Verifique as configurações. |
| `VALIDATION_ERROR`   | 422  | O corpo da requisição está fora do formato esperado pelo contrato OpenAPI.     |

## Como obter ajuda

Ao entrar em contato com o suporte da Valtro Labs, **sempre forneça o `requestId`** da chamada que falhou. Isso nos permite localizar o log exato da sua requisição e resolver o problema muito mais rápido.
