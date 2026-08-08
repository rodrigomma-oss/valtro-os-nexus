# Autenticação

Para garantir a integridade e segurança, a API do Valtro OS utiliza o protocolo `VALTRO-HMAC-SHA256-V1`. Todas as requisições de negócio devem ser assinadas.

## O que você precisa

1.  `Key ID`: Identificador público da sua aplicação.
2.  `Key Secret`: Sua chave secreta (nunca a envie no header ou no corpo).

## Como funciona a assinatura

Você deve gerar um código HMAC-SHA256 usando seu `Key Secret` e enviá-lo no header `x-valtro-signature`.

### Headers obrigatórios

| Header                | Valor Exemplo              | Descrição                                 |
| --------------------- | -------------------------- | ----------------------------------------- |
| `x-valtro-key-id`     | `vlt_key_...`              | ID da sua credencial.                     |
| `x-valtro-timestamp`  | `1723120000000`            | Unix Timestamp em milissegundos.          |
| `x-valtro-nonce`      | `a1b2c3d4e5f6g7h8`         | String aleatória (min 16 chars).          |
| `x-valtro-signature`  | `hash_hexadecimal...`      | O resultado da sua assinatura.            |

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

## Dicas de Segurança

*   **Janela de Tempo**: Requisições com `x-valtro-timestamp` com mais de 15 minutos de diferença do servidor serão rejeitadas.
*   **Nonce Único**: Cada `x-valtro-nonce` só pode ser usado uma vez. Isso impede ataques de repetição.
*   **Armazenamento**: Guarde seu Secret em variáveis de ambiente protegidas, nunca no código-fonte ou no frontend.

Para ver os códigos de erro relacionados à autenticação, consulte o **[Catálogo de Erros](errors)**.
