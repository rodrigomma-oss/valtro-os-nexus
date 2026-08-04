# Ciclo de Vida e Versionamento

A API segue uma política rigorosa de versionamento para garantir a estabilidade das integrações.

## Path Versioning

A versão principal é incluída no path: `/api/v1/...`.

## Estados da Versão

| Estado | Descrição | Headers |
| :--- | :--- | :--- |
| `development` | Versão em desenvolvimento, instável. | - |
| `stable` | Versão recomendada para produção. | - |
| `deprecated` | Versão legada, uso desencorajado. | `Deprecation` |
| `sunset` | Versão com data de desligamento definida. | `Sunset` |
| `disabled` | Versão desligada. Retorna HTTP 503. | - |

## Headers de Controle

- `X-Valtro-API-Version`: Indica a versão que processou a requisição.
- `Deprecation`: Data UTC indicando quando a versão tornou-se obsoleta.
- `Sunset`: Data UTC indicando quando a versão deixará de funcionar.

## Alterações Breaking

Qualquer alteração que quebre a compatibilidade (remover campos, mudar tipos, alterar lógica de auth) resultará no incremento da versão principal (ex: `/api/v2`).
