# Autenticação HMAC-SHA256 (`VALTRO-HMAC-SHA256-V1`)

Este documento descreve a fundação de autenticação implementada para futuras rotas autenticadas da API v1.

Atualmente, nenhum endpoint autenticado de negócio está publicado no contrato público. A autenticação HMAC está conectada apenas à rota técnica interna `/api/v1/_internal/auth-check`, indisponível em produção. Sua adoção transversal pertence ao pipeline compartilhado de uma sprint futura.

## Credenciais

O prefixo implementado no código e exigido pelo banco é:

```text
vlt_key_
```

Exemplo de Key ID válido:

```text
vlt_key_0123456789abcdef01234567
```

O Key Secret deve permanecer exclusivamente no backend seguro do consumidor. Não deve ser enviado ao navegador.

## Headers requeridos

| Header                | Descrição                                 | Exemplo                            |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| `X-Valtro-Key-ID`     | Identificador público da credencial.      | `vlt_key_0123456789abcdef01234567` |
| `X-Valtro-Timestamp`  | Timestamp Unix em milissegundos.          | `1785812400000`                    |
| `X-Valtro-Nonce`      | Valor aleatório entre 16 e 64 caracteres. | `n_01k1wxyz89abcdef`               |
| `X-Valtro-Signature`  | HMAC-SHA256 hexadecimal em minúsculas.    | `a3f...2e1`                        |
| `X-Valtro-Request-ID` | Identificador opcional do consumidor.     | `consumer_req_001`                 |

## Requisição canônica

Os campos são separados por LF (`\n`), nesta ordem:

```text
VALTRO-HMAC-SHA256-V1
TIMESTAMP
NONCE
HTTP_METHOD
CANONICAL_PATH
CANONICAL_QUERY_STRING
CONTENT_TYPE
BODY_HASH
```

- O método é convertido para maiúsculas.
- O path preserva maiúsculas, minúsculas e barra final.
- A query é ordenada por nome e depois por valor.
- O content type é normalizado para minúsculas e sem espaços externos.
- `BODY_HASH` é o SHA-256 hexadecimal em minúsculas do corpo exato enviado.
- Para corpo vazio, o hash é `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

## Assinatura

```typescript
import { createHash, createHmac } from "node:crypto";

function signRequest(
  secret: string,
  params: {
    timestamp: string;
    nonce: string;
    method: string;
    path: string;
    canonicalQuery: string;
    contentType: string;
    body: string;
  },
) {
  const bodyHash = createHash("sha256").update(params.body).digest("hex");
  const canonical = [
    "VALTRO-HMAC-SHA256-V1",
    params.timestamp,
    params.nonce,
    params.method.toUpperCase(),
    params.path,
    params.canonicalQuery,
    params.contentType.trim().toLowerCase(),
    bodyHash,
  ].join("\n");

  return createHmac("sha256", secret).update(canonical).digest("hex");
}
```

## Controles implementados na fundação

- Janela de timestamp de 15 minutos.
- Nonce entre 16 e 64 caracteres.
- Consumo único do nonce por credencial no banco.
- Comparação da assinatura em tempo constante.
- Segredo armazenado com AES-256-GCM.
- Auditoria disponível para handlers que chamem explicitamente o módulo correspondente.

Rate limiting e aplicação automática de autenticação, autorização e auditoria ainda não fazem parte do runtime compartilhado.
