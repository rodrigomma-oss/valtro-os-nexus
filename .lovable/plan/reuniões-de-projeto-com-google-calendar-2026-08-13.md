# Reuniões de Projeto com Google Calendar

Objetivo: agendar reuniões do Projeto (o campo "Próxima reunião") direto no Google Calendar, manter o histórico de todas as reuniões marcadas e permitir concluir cada uma.

O fluxo de follow-up do Lead não é alterado. A integração usa exatamente a mesma conta Google e a mesma agenda já cadastrada em Integrações.

## Como vai funcionar na tela do Projeto

Na página do Projeto (`/os/comercial/projetos/{id}`), o bloco "Próxima reunião" passa a ser um card de Reuniões:

- **Reunião agendada** (quando existe): data/hora, duração, responsável, pauta, link "Abrir no Google Calendar", e três ações: **Concluir**, **Reagendar**, **Cancelar**.
- **Sem reunião agendada**: botão **Agendar reunião** (data/hora, duração em minutos, pauta, responsável).
- **Histórico**: lista de todas as reuniões anteriores com status (Concluída, Cancelada, Reagendada), data original e as notas do resultado registradas ao concluir.
- Ao concluir, um campo opcional de "resultado da reunião" é gravado no histórico. Nada é apagado — a reunião apenas muda de status.
- A "Preferência de reunião" informada pelo cliente continua sendo um campo separado e não é tocada.

Regras de negócio (espelhando o Lead):
- No máximo uma reunião com status "agendado" por projeto; para mudar a data usa-se Reagendar, que preserva a reunião anterior encadeada à nova.
- O CRM é a fonte de verdade; o Google Calendar é apenas projeção. Concluir mantém o evento na agenda com título marcado como concluído; cancelar remove o evento.
- Se a integração Google estiver desconectada, o agendamento no CRM continua funcionando e a sincronização fica pendente na fila até reconectar.

## Detalhes técnicos

**Banco (uma migration)**
- Nova tabela `public.project_meetings` com a mesma forma de `follow_ups`, mas ancorada em `project_id` (FK para `projects`): `scheduled_at`, `duration_minutes`, `timezone`, `agenda` (equivalente a `reason`), `owner_id`, `status` (reutiliza o enum `follow_up_status`), `outcome_notes`, `cancel_reason`, `completed_at`, `cancelled_at`, `rescheduled_from`, `rescheduled_to`, `created_by`, `created_at`, `updated_at`.
- GRANTs para `authenticated` e `service_role`, RLS habilitada com políticas baseadas em `public.can_access_project(auth.uid(), project_id)` (mesmo padrão dos demais artefatos do Projeto); sem acesso `anon`.
- Índice parcial garantindo uma única reunião `agendado` por projeto; trigger de `updated_at`; trigger que bloqueia delete físico (histórico preservado).
- Trigger `enqueue_project_meeting_calendar_sync` análogo ao de follow-ups, inserindo/atualizando `calendar_sync_links` com `entity_type = 'project_meeting'` (a tabela já é genérica por `entity_type`/`entity_id`).
- Trigger que mantém `project_operations.next_meeting_at` sincronizado com a reunião agendada (ou `null` quando não houver), para que a Visão Geral e a fila de atenção continuem corretas sem duplicar regra na aplicação.
- Não altera nada de `follow_ups`, seus triggers ou o enum de eventos do Lead.

**Server functions** — novo `src/lib/project-meetings.functions.ts` espelhando `follow-ups.functions.ts`: `listProjectMeetings`, `createProjectMeeting`, `rescheduleProjectMeeting`, `completeProjectMeeting`, `cancelProjectMeeting`, todas com `requireSupabaseAuth` e validação Zod. Nenhuma chamada ao Google acontece no caminho de escrita.

**Worker de sincronização** — `src/lib/google-calendar/worker.server.ts` hoje assume que todo link da fila é follow-up. Ele passa a selecionar também `entity_type` e ramificar: `follow_up` mantém exatamente o comportamento atual (código intocado), `project_meeting` usa um novo builder que monta o evento como "Reunião · {cliente/projeto}" com link para `/os/comercial/projetos/{id}`. Mesmas credenciais, mesma `calendar_id`, mesmo backoff, mesmo id determinístico e mesma herança de evento em reagendamentos.

**UI** — novo componente `src/components/app/project-meetings-card.tsx` (agendar/reagendar/concluir/cancelar + histórico) usando TanStack Query, tokens semânticos e os componentes existentes de diálogo/tabela; `project-overview-card.tsx` passa a exibir a reunião agendada com link para o card. A tipagem entra em `src/types/project-meeting.ts`.

**Testes** — unitários para as transições de status e para o builder do evento de reunião, além de regressão garantindo que o builder de follow-up continua idêntico.
