# Sprint 15.2.3B — Reestruturação do Catálogo Comercial

## Contexto

Desde a Sprint 15.2.3A, `public.services` é a **única fonte oficial** do portfólio
comercial da Valtro Labs. Esta sprint completa a estrutura comercial da tabela.

## Estrutura resultante de `services`

| Campo | Significado |
| --- | --- |
| `name`, `description` | Identificação e descrição operacional (o que é entregue) |
| `objective` | **Novo.** Objetivo comercial (para que serve) — nunca reutiliza a descrição |
| `category` | Categoria (`service_type`) |
| `billing_type` + `billing_interval` | Pontual ou recorrente mensal |
| `pricing_mode` | **Novo.** `fixo` (possui valor) ou `sob_consulta` (orçamento) |
| `default_price_cents` | Valor padrão — obrigatório em `fixo`, sempre nulo em `sob_consulta` |
| `offer_type` | **Novo.** `principal`, `complementar` ou `recorrente` |
| `origin_service_id` | **Novo.** Serviço do qual a oferta costuma se originar (informativo) |
| `sort_order` | Ordem manual de apresentação |
| `default_limits` | Contrato fechado: `max_products`, `max_campaigns`, `max_users` |
| `onboarding_template_key` | Template de onboarding do serviço contratado |

### Garantias no banco

- `services_validate_pricing`: `sob_consulta` zera o preço; `fixo` sem preço é rejeitado;
  `origin_service_id` não pode apontar para o próprio serviço.
- `services_validate_default_limits`: recusa chaves fora do contrato e valores não numéricos
  ou negativos.

## Decisão arquitetural — `briefing_template_key`

**Adotada a Opção B: o campo foi removido.**

Justificativa:

1. Um briefing é emitido **antes** da escolha de um SKU: `briefing_tokens` guarda
   `service_type` (categoria) e o template é resolvido por
   `templateTypeForService(service_type)`. Não existe `service_id` no fluxo.
2. O campo estava `NULL` em 100% das linhas e sem nenhum consumidor no código.
3. Mantê-lo criaria uma segunda fonte de verdade para a resolução de template,
   com risco de divergir do mapeamento por categoria.

`onboarding_template_key` foi **preservado** justamente porque o caso é oposto:
o onboarding nasce de uma contratação (`client_services.service_id`), então a
configuração por serviço é resolvível e já é usada em `onboarding.functions.ts`.

Se no futuro o briefing passar a ser emitido a partir de um SKU específico, o
campo deve retornar junto com essa mudança de fluxo — e não antes.

## Impacto nos módulos

- **Propostas / Contratações / Onboarding / Briefings:** sem mudança de comportamento.
  `default_limits` continua sendo copiado para `scope_snapshot` na contratação.
- **Snapshots históricos:** intocados; nenhum campo novo é retroaplicado a propostas
  ou contratações já emitidas.
