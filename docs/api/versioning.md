# Ciclo de vida e versionamento

[Início](README.md) · [Primeiros passos](getting-started.md) · [OpenAPI](openapi-v1.yaml) · [Changelog](changelog.md)

## Path versioning

A versão principal integra o path: `/api/v1/...`. Alterações incompatíveis deverão usar uma nova versão principal, como `/api/v2`.

## Estados persistidos

| Estado        | Significado                           |
| ------------- | ------------------------------------- |
| `development` | Versão ainda instável.                |
| `stable`      | Versão indicada para uso operacional. |
| `deprecated`  | Versão legada, ainda disponível.      |
| `sunset`      | Versão com desligamento programado.   |
| `disabled`    | Versão indisponível.                  |

Esses estados são persistidos em `api_versions`. A v1 é criada pelas migrations com estado inicial `stable`.

## Comportamento transversal implementado

O pipeline das rotas v1 consulta o registro `v1` e:

- prossegue para as demais etapas da rota quando a versão está disponível;
- retorna HTTP 404 com `VERSION_UNAVAILABLE` quando o registro não pode ser localizado;
- retorna HTTP 503 com `VERSION_UNAVAILABLE` quando o estado é `disabled`;
- retorna HTTP 503 com `VERSION_UNAVAILABLE` quando `sunset_at` já passou;
- adiciona `Deprecation` e `Sunset` quando as datas correspondentes estão configuradas;
- retorna `X-Valtro-API-Version` quando a versão foi localizada;
- retorna `X-Valtro-Request-ID` nas respostas JSON.

`GET /api/v1/meta` usa esse mesmo pipeline e reflete o estado carregado por ele. Futuras rotas v1 criadas com `createApiHandler` herdarão a verificação; rotas legadas fora de `/api/v1` não são afetadas.

## Decisões pendentes

- Política de antecedência para depreciação e sunset.
- Hostname público definitivo da API.
- Representação pública de `replacement_version_id` como código de versão ou identificador interno.

A situação dessas decisões acompanha o [roadmap](roadmap.md). O contrato público vigente permanece no [OpenAPI](openapi-v1.yaml).
