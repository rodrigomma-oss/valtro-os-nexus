# Versionamento

Trabalhamos para que a API do Valtro OS seja estável e previsível. No entanto, evoluções são necessárias e aqui explicamos como as gerenciamos.

## Como identificar a versão

A versão da API está presente diretamente na URL:
`https://valtro-vision-forge.lovable.app/api/v1/...`

## Ciclo de Vida

Cada versão passa pelos seguintes estados:

1.  **Stable**: Versão atual recomendada para produção (Ex: `v1`).
2.  **Deprecated**: Uma nova versão principal foi lançada. A versão antiga continua funcionando, mas não recebe novos recursos.
3.  **Sunset**: Data programada para o desligamento da versão. Avisaremos com antecedência mínima de 6 meses.

## Mudanças que NÃO quebram (Non-breaking)

Poderemos adicionar os seguintes itens à `v1` sem criar uma nova versão:
*   Novos endpoints.
*   Novos campos opcionais na resposta.
*   Novos campos opcionais na requisição.

## Mudanças que quebram (Breaking)

Caso precisemos remover campos, alterar tipos de dados existentes ou mudar a lógica de autenticação, lançaremos uma nova versão principal (ex: `v2`).

Consulte o **[Changelog](changelog)** para acompanhar o histórico de evoluções.
