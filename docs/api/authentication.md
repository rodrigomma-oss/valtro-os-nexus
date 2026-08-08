# Autenticação

Para garantir a integridade e segurança, a API do Valtro OS utiliza o protocolo `VALTRO-HMAC-SHA256-V1`. Todas as requisições de negócio devem ser assinadas.

## O que você precisa

Para assinar uma requisição, você utilizará dois componentes da sua credencial:

1.  `Key ID`: Identificador público da sua aplicação (enviado no header).
2.  `Key Secret`: Sua chave secreta usada para gerar a assinatura (nunca enviada).

> ⚠️ **Atenção**
> Nunca exponha seu `Key Secret` em ambientes client-side ou repositórios públicos. Utilize sempre variáveis de ambiente em seu servidor.

## Como funciona a assinatura

Você deve gerar um código HMAC-SHA256 usando seu `Key Secret` e enviá-lo no header `x-valtro-signature`.

### Headers obrigatórios

| Header | Valor Exemplo | Descrição |
| :--- | :--- | :--- |
| `x-valtro-key-id` | `vlt_key_...` | ID da sua credencial gerada no Console. |
| `x-valtro-timestamp` | `1723120000000` | Unix Timestamp em milissegundos. |
| `x-valtro-nonce` | `a1b2c3d4e5f6g...` | String aleatória única para evitar replicação. |
| `x-valtro-signature` | `hash_hexadecimal...` | O resultado da assinatura HMAC-SHA256. |

---

## Exemplo de Implementação (Node.js)

```javascript
const crypto = require('crypto');

function signRequest(secret, method, path, body, timestamp, nonce) {
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const canonicalString = [
    'VALTRO-HMAC-SHA256-V1',
    timestamp,
    nonce,
    method.toUpperCase(),
    path,
    '', // Query string (se houver)
    'application/json',
    bodyHash
  ].join('\n');

  return crypto.createHmac('sha256', secret)
    .update(canonicalString)
    .digest('hex');
}
```

> 📌 **Importante**
> A ordem dos campos na `canonicalString` é vital. Qualquer diferença resultará em `INVALID_SIGNATURE`.

---

## Regras de Validação

Para que sua requisição seja aceita, o servidor valida:

*   **Janela de Tempo**: O timestamp deve estar dentro de uma janela de 15 minutos em relação ao horário do servidor.
*   **Nonce Único**: O valor de `x-valtro-nonce` deve ser único para aquele `Key ID`. Se reutilizado, a requisição será bloqueada.

#### Próximo Passo

[→ OpenAPI Spec](openapi)
