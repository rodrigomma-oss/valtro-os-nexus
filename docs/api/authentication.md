# Autenticação HMAC-SHA256 (VALTRO-HMAC-SHA256-V1)

Este documento descreve como assinar requisições para a API do Valtro OS.

## Segurança

1. **Backend-only:** A assinatura deve ser gerada exclusivamente no seu servidor. Nunca coloque o `Key Secret` no código frontend.
2. **Replay Protection:** O uso de `Nonce` e `Timestamp` impede que uma requisição capturada seja reenviada.
3. **Imutabilidade:** Qualquer alteração no corpo, path ou query da requisição invalidará a assinatura.

## Headers Requeridos

| Header | Descrição | Exemplo |
| :--- | :--- | :--- |
| `X-Valtro-Key-ID` | ID público da sua credencial. | `key_550e8400...` |
| `X-Valtro-Timestamp` | Timestamp Unix em milissegundos. | `1722744000000` |
| `X-Valtro-Nonce` | String aleatória (16-64 chars). | `abc123...xyz` |
| `X-Valtro-Signature` | Assinatura HMAC-SHA256 calculada. | `a3f...2e1` |
| `X-Valtro-Request-ID` | (Opcional) Seu identificador de rastreio. | `my_req_001` |

## Passo a Passo para Assinatura

### 1. Criar a String Canônica

A string canônica é composta pelos seguintes campos, separados por `\n` (LF):

```text
PROTOCOL (VALTRO-HMAC-SHA256-V1)
TIMESTAMP (em milissegundos)
NONCE
HTTP_METHOD (em maiúsculas)
CANONICAL_PATH (ex: /api/v1/meta)
CANONICAL_QUERY_STRING (ordenada alfabeticamente)
CONTENT_TYPE (em minúsculas, sem espaços extras)
BODY_HASH (SHA-256 do corpo em hexadecimal lowercase)
```

**Nota sobre o Body Hash:** Se o corpo estiver vazio, use o hash SHA-256 de uma string vazia: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

### 2. Calcular o HMAC

Use seu `Key Secret` como chave para calcular o HMAC-SHA256 da String Canônica. O resultado deve ser em formato hexadecimal minúsculo.

### 3. Pseudocódigo (TypeScript)

```typescript
import { createHmac, createHash } from 'node:crypto';

function signRequest(secret: string, params: any) {
  const { timestamp, nonce, method, path, query, contentType, body } = params;
  
  const bodyHash = createHash('sha256')
    .update(body || '')
    .digest('hex');

  const canonical = [
    'VALTRO-HMAC-SHA256-V1',
    timestamp,
    nonce,
    method.toUpperCase(),
    path,
    query, // Ordenada: a=1&b=2
    contentType.toLowerCase(),
    bodyHash
  ].join('\n');

  return createHmac('sha256', secret)
    .update(canonical)
    .digest('hex');
}
```
