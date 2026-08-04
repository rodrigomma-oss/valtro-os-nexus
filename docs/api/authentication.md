# Autenticação HMAC-SHA256 (`VALTRO-HMAC-SHA256-V1`)

[Início](README.md) · [Primeiros passos](getting-started.md) · [Pipeline](pipeline.md) · [Erros](errors.md)

Nenhum endpoint autenticado de negócio está publicado no contrato público. A autenticação HMAC está conectada ao pipeline compartilhado e à rota técnica interna `/api/v1/_internal/auth-check`, indisponível em produção. Cada rota declara explicitamente se exige HMAC e quais scopes são obrigatórios.

## Credenciais

O Key ID usa o prefixo `vlt_key_`. Exemplo:

```text
vlt_key_0123456789abcdef01234567
```

O Key Secret deve permanecer exclusivamente no backend seguro do consumidor e nunca deve ser enviado ao navegador.

## Headers requeridos

| Header                | Descrição                                                                           |
| --------------------- | ----------------------------------------------------------------------------------- |
| `X-Valtro-Key-ID`     | Identificador público da credencial.                                                |
| `X-Valtro-Timestamp`  | Timestamp Unix em milissegundos.                                                    |
| `X-Valtro-Nonce`      | Valor aleatório entre 16 e 64 caracteres.                                           |
| `X-Valtro-Signature`  | HMAC-SHA256 hexadecimal em minúsculas.                                              |
| `X-Valtro-Request-ID` | Correlação opcional do consumidor; não substitui o request ID gerado pelo servidor. |

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

## Controles implementados

- Janela de timestamp de 15 minutos.
- Nonce entre 16 e 64 caracteres.
- Consumo único do nonce por credencial no banco, depois da assinatura válida.
- Comparação da assinatura em tempo constante.
- Segredo armazenado com AES-256-GCM.
- Corpo bruto preservado para assinatura antes da validação Zod, sem leitura destrutiva duplicada.
- Autenticação, scopes e auditoria aplicados pelo pipeline conforme a configuração da rota.
- Auditoria best-effort sem corpo, segredo, assinatura ou ciphertext.

Rate limiting distribuído ainda não está ativo. Uma rota que habilite essa etapa sem provedor persistente falha fechada com `RATE_LIMIT_UNAVAILABLE`.

Consulte o [estado de implementação](implementation-status.md) antes de assumir que uma capacidade do protocolo está exposta por um endpoint público.
