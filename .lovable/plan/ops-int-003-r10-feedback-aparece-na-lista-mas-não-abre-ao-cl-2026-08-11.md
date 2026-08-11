# OPS-INT-003 — R10 — FEEDBACK APARECE NA LISTA, MAS NÃO ABRE AO CLICAR

Estimativa: 30 minutos (Diagnóstico + Fix + Validação).

## 1. Contexto e Diagnóstico
A listagem de Feedback agora exibe os registros da API (FDB-000003, FDB-000004, FDB-000007), mas a navegação para a rota de detalhe (`/os/atendimento/feedback/$id`) falha ao ser acionada via clique ou botão "Abrir".

### Causas Prováveis (Hipóteses)
- **H1: Incompatibilidade de Tipo**: O parâmetro `$id` na rota espera um UUID, mas o `f.id` retornado pela listagem pode estar ausente ou mal formatado.
- **H2: Blocker de Evento**: `e.stopPropagation()` ou handlers de clique no `DataTable` ou `Link` estão impedindo a propagação correta do evento de navegação.
- **H3: Rota Inexistente**: A rota `/_authenticated.os.atendimento.feedback.$id.tsx` pode não estar corretamente registrada no `routeTree.gen.ts`.
- **H4: Loader Failure**: O loader da rota de detalhe falha silenciosamente ao receber o ID.

## 2. Ações Planejadas

### Fase 1: Reprodução Técnica (Playwright)
- Criar script `/tmp/browser/ops_int_003_r10_diag.py` para:
  - Navegar até `/os/atendimento/feedback`.
  - Capturar o `href` do link `FDB-000007`.
  - Tentar clicar e observar a URL final.
  - Verificar erros de console/rede durante a transição.

### Fase 2: Inspeção de Código
- Validar `src/routes/_authenticated.os.atendimento.feedback.tsx`:
  - Verificar a função `openFeedback` e o `render` da coluna `code`.
  - Garantir que `f.id` está sendo extraído corretamente.
- Validar `src/routes/_authenticated.os.atendimento.feedback.$id.tsx`:
  - Confirmar se o parâmetro `id` é extraído via `Route.useParams()`.
  - Verificar se o loader `getFeedback` é executado com o ID correto.

### Fase 3: Correção Mínima
- Ajustar handlers de navegação se necessário.
- Adicionar fallbacks de dados no detalhe para registros de API (NULL `created_by`).
- Corrigir qualquer desalinhamento entre `protocol/code` vs `id` (UUID).

### Fase 4: Validação
- Testar clique em `FDB-000007`.
- Verificar se a rota de detalhe carrega os dados e a timeline.
- Confirmar retorno seguro para a listagem.

## 3. Aspectos Técnicos
- **Frontend**: TanStack Router + React Start Server Functions.
- **Navegação**: Uso de `Link` com `params` e `useNavigate`.
- **Backend**: `getFeedback` Server Function.
- **Dados**: `feedback.id` (UUID) como chave de navegação.
