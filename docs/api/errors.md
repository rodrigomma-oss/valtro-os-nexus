# Erros & Status

Nossa API utiliza códigos de status HTTP padrão combinados com mensagens de erro estruturadas para facilitar o diagnóstico de problemas.

## Formato de Erro

Sempre que uma operação falhar (`success: false`), a API retornará o seguinte objeto:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "A assinatura HMAC enviada não coincide com a esperada pelo servidor."
  },
  "requestId": "req_987654321"
}
```

### Resultado esperado em caso de sucesso
Em contrapartida, operações bem-sucedidas sempre retornam `success: true`.

---

## Catálogo de Códigos

| Código | HTTP | Descrição / O que fazer? |
| :--- | :--- | :--- |
| `INVALID_CREDENTIAL` | 401 | Credencial não encontrada ou suspensa. Verifique o Console. |
| `INVALID_SIGNATURE` | 401 | Falha na validação HMAC. Revise a `canonicalString`. |
| `INVALID_TIMESTAMP` | 401 | Relógio do cliente dessincronizado (fora da janela de 15min). |
| `REPLAY_ATTACK` | 401 | Nonce já utilizado anteriormente. Gere um novo UUID/String. |
| `INSUFFICIENT_SCOPE` | 403 | A aplicação não tem permissão para acessar este recurso. |
| `VALIDATION_ERROR` | 422 | Erro nos dados enviados (ex: campo obrigatório ausente). |

> 💡 **Dica**
> Ao abrir um chamado de suporte, sempre anexe o `requestId`. Isso reduz o tempo de resolução em até 80%.

#### Próximo Passo

[→ Versionamento](versioning)
