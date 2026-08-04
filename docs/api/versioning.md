# Ciclo de vida e versionamento

## Path versioning

A versão principal integra o path:

```text
/api/v1/...
```

Alterações incompatíveis deverão usar uma nova versão principal, como `/api/v2`.

## Estados persistidos

| Estado        | Significado                           |
| ------------- | ------------------------------------- |
| `development` | Versão ainda instável.                |
| `stable`      | Versão indicada para uso operacional. |
| `deprecated`  | Versão legada, ainda disponível.      |
| `sunset`      | Versão com desligamento programado.   |
| `disabled`    | Versão indisponível.                  |

Esses estados são persistidos em `api_versions`. A v1 é criada pelas migrations com estado inicial `stable`.

## Comportamento implementado em `/meta`

`GET /api/v1/meta` consulta o registro `v1` e:

- retorna HTTP 200 com os metadados quando a versão está disponível;
- retorna HTTP 404 com `VERSION_UNAVAILABLE` quando o registro não pode ser localizado;
- retorna HTTP 503 com `VERSION_UNAVAILABLE` quando o estado é `disabled`;
- adiciona `Deprecation` e `Sunset` quando as datas correspondentes estão configuradas;
- retorna `X-Valtro-API-Version` nas respostas de sucesso;
- retorna `X-Valtro-Request-ID` nas respostas JSON.

## Comportamento planejado

A verificação global de disponibilidade da versão ainda não existe. Portanto, o comportamento de `/meta` não deve ser interpretado como enforcement automático para todas as futuras rotas v1.

O pipeline compartilhado deverá aplicar versionamento, autenticação, autorização, limites e auditoria de maneira uniforme antes da publicação de endpoints de negócio.

## Decisões pendentes

- Política de antecedência para depreciação e sunset.
- Hostname público definitivo da API.
- Representação pública de `replacement_version_id` como código de versão ou identificador interno.
