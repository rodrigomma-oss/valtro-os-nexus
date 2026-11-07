# Sprint 2A — Arquitetura da Plataforma Valtro Labs

> Documento técnico de arquitetura. **Nenhum código, SQL, migration ou provisionamento é executado nesta sprint.** O objetivo é fechar todas as decisões estruturais antes da implementação (Sprint 2B).

**Versão:** 1.0
**Data:** 16 de Julho de 2026
**Status:** Proposta para aprovação
**Autor:** Valtro Labs — Engineering

---

## Sumário Executivo

A Valtro Labs precisa evoluir de um MVP visual (institucional + CRM/Portal com mocks) para uma **plataforma comercial real**, sustentando:

- Captura de leads via Portal de Diagnóstico público.
- Gestão comercial (CRM) por operadores internos autenticados.
- Painel administrativo (Admin) para gestão de usuários, papéis e configurações.
- Futuros módulos (Briefing, Marketing, Financeiro) sem retrabalho estrutural.

A arquitetura proposta prioriza, nesta ordem: **Segurança → Escalabilidade → Baixo acoplamento → Manutenibilidade → Crescimento.**

Escolha de stack backend: **Lovable Cloud (Supabase gerenciado)** + **TanStack Start Server Functions**. Justificativa detalhada abaixo.

---

## 1. Arquitetura Geral

### 1.1 Visão em camadas

```text
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE (Browser)                                          │
│  React 19 + TanStack Router + Tailwind + shadcn/ui          │
│  - Público:  /, /diagnostico                                │
│  - Privado:  /_authenticated/crm/*, /_authenticated/admin   │
└─────────────────────────────────────────────────────────────┘
                │  HTTPS
                ▼
┌─────────────────────────────────────────────────────────────┐
│  EDGE RUNTIME (Cloudflare Workers via TanStack Start)       │
│  - createServerFn: RPC tipado cliente → servidor            │
│  - Server Routes (/api/public/*): webhooks e APIs públicas  │
│  - Middleware: requireSupabaseAuth (bearer + RLS)           │
└─────────────────────────────────────────────────────────────┘
                │
       ┌────────┴────────────────┐
       ▼                         ▼
┌──────────────────┐    ┌──────────────────────────┐
│  LOVABLE CLOUD   │    │  SERVIÇOS EXTERNOS       │
│  (Supabase)      │    │  - Lovable AI Gateway    │
│  - Postgres+RLS  │    │  - E-mail (Resend)       │
│  - Auth (JWT)    │    │  - Analytics             │
│  - Storage       │    │  - (futuro) WhatsApp API │
│  - Realtime      │    │                          │
└──────────────────┘    └──────────────────────────┘
```

### 1.2 Decisões-chave e justificativas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Backend principal | Lovable Cloud (Supabase) | Postgres + Auth + Storage + RLS nativos, zero-ops, RLS resolve autorização no banco reduzindo superfície de erro. |
| Camada de servidor | TanStack Start Server Functions | Já é o runtime do app; evita Edge Functions Supabase para lógica interna; latência menor (mesmo runtime que SSR); tipagem end-to-end. |
| Edge Functions Supabase | Apenas para casos específicos | Webhooks que precisam estar dentro da rede Supabase, cron jobs disparados pelo `pg_cron`, e trabalhos que exigem `service_role` fora do request/response cycle. |
| Autenticação | Supabase Auth (email/senha + Google OAuth) | Cobre 100% dos casos internos; Google reduz fricção; JWT compatível com RLS. |
| Autorização | RLS + tabela `user_roles` + função `has_role` (SECURITY DEFINER) | Nunca armazenar `role` na tabela `profiles` (evita escalonamento de privilégios). Função SECURITY DEFINER evita recursão em policies. |
| Storage | Supabase Storage com buckets por finalidade | Isolamento por bucket + RLS por objeto; URLs assinadas para privados. |
| Notificações | Tabela `notifications` + Realtime + e-mail transacional | Baixo acoplamento; consumidores múltiplos (in-app, push futuro, e-mail). |
| Observabilidade | Logs nativos (Cloud + Workers) + tabela `audit_log` | Auditoria imutável de operações sensíveis. |

### 1.3 Princípios não-negociáveis

1. **RLS em 100%** das tabelas do schema `public`.
2. **`service_role` nunca no browser.** Uso apenas em `client.server.ts` ou webhooks verificados.
3. **Roles em tabela separada** (`user_roles`), nunca em `profiles`.
4. **Server functions autenticadas** via `requireSupabaseAuth` para toda operação de usuário logado.
5. **`/api/public/*`** somente para chamadores externos com verificação de assinatura/segredo.
6. **Sem lógica interna em Edge Functions Supabase** — usar `createServerFn`.

---

## 2. Modelo ERD

### 2.1 Diagrama lógico

```text
auth.users (Supabase gerenciado)
    │ 1:1
    ▼
profiles ──────────────┐
    │ 1:N              │ 1:N
    ▼                  ▼
user_roles         audit_log
    │
    │ (roles: admin | operator | viewer)
    │
    ▼ referenciado por policies via has_role()

leads ──────────────┬──────────────┬──────────────┐
  │ 1:N             │ 1:N          │ 1:N          │ 1:N
  ▼                 ▼              ▼              ▼
lead_activities  lead_notes    lead_tasks    diagnoses
                                                 │ 1:N
                                                 ▼
                                             diagnosis_answers

pipelines ── 1:N ── pipeline_stages ── 1:N ── leads.stage_id

notifications (user_id → auth.users)
attachments  (owner_id → auth.users, polymorphic: entity_type + entity_id)
settings     (chave/valor por tenant/global)
```

### 2.2 Entidades (visão de alto nível — sem SQL)

| Tabela | Finalidade | Campos-chave (conceito) | Observações |
|---|---|---|---|
| `profiles` | Dados públicos do usuário logado | id (=auth.users.id), full_name, avatar_url, phone, timezone | Criado por trigger `on_auth_user_created`. **Sem role.** |
| `user_roles` | Vínculo usuário ↔ papel | user_id, role (enum) | Única fonte de verdade de autorização. |
| `leads` | Lead comercial | id, name, company, email, phone, source, stage_id, owner_id, score, status, created_at | `source` inclui `diagnostico`, `manual`, `import`, `api`. |
| `lead_activities` | Timeline (chamada, e-mail, reunião, nota do sistema) | lead_id, type, payload (jsonb), actor_id, created_at | Somente inserção; imutável. |
| `lead_notes` | Notas manuais editáveis | lead_id, author_id, body, created_at, updated_at | Editável pelo autor. |
| `lead_tasks` | Tarefas/follow-ups | lead_id, assignee_id, title, due_at, status | Feed do "Centro de Operações". |
| `pipelines` / `pipeline_stages` | Funil comercial configurável | pipeline_id, name, order, probability | Permite múltiplos funis (ex.: Diagnóstico vs. Outbound). |
| `diagnoses` | Envio do Portal de Diagnóstico | id, lead_id (nullable até vincular), payload (jsonb), status, submitted_at | `payload` versionado por `schema_version`. |
| `diagnosis_answers` | Normalização opcional para BI | diagnosis_id, question_key, answer_value | Preenchido por trigger a partir do jsonb. |
| `notifications` | Notificações in-app | user_id, kind, title, body, url, read_at, created_at | Consumida por Realtime. |
| `attachments` | Arquivos ligados a entidades | id, entity_type, entity_id, storage_path, uploaded_by | Chaveia bucket + path do Storage. |
| `audit_log` | Auditoria imutável de ações sensíveis | actor_id, action, entity_type, entity_id, diff (jsonb), created_at | Somente inserção; RLS restrito a admins. |
| `settings` | Configurações globais / por workspace | key, value (jsonb), updated_by | Acessível apenas por admin. |

### 2.3 Regras de integridade

- **PK** sempre `uuid` com `gen_random_uuid()`.
- **Timestamps** `created_at`/`updated_at` obrigatórios (`timestamptz`, default `now()`).
- **Soft delete** via `deleted_at` nas entidades comerciais (`leads`, `lead_notes`, `lead_tasks`).
- **FKs** com `ON DELETE`:
  - `CASCADE` para dependentes puros (`lead_activities` → `leads`).
  - `RESTRICT` para relações estruturais (`leads.stage_id` → `pipeline_stages`).
  - `SET NULL` para vínculos opcionais (`leads.owner_id` → `auth.users`).
- **Índices** obrigatórios em toda FK e em colunas usadas em `WHERE` frequentes (`status`, `stage_id`, `owner_id`, `created_at DESC`).
- **Constraints** via `CHECK` para enums textuais quando o valor for volátil; `CREATE TYPE` (enum) quando estável.

---

## 3. Fluxo Comercial

### 3.1 Do lead ao fechamento

```text
[Portal Público /diagnostico]
       │ submit (server route público /api/public/diagnosis)
       ▼
[diagnoses.insert]  ── trigger ─▶ [leads.upsert por e-mail]
       │
       │ notification para operadores (Realtime + e-mail)
       ▼
[Inbox do Operador — Centro de Operações]
       │ atribuição (owner_id) manual ou round-robin
       ▼
[Pipeline "Diagnóstico" → stage: Novo → Qualificação → Proposta → Fechado]
       │
       ├─▶ lead_activities (cada mudança de stage vira evento)
       ├─▶ lead_tasks (follow-ups automáticos por SLA)
       └─▶ attachments (proposta em PDF, contratos)

[Fechamento]
       │ status: won | lost | archived
       ▼
[audit_log] + notificação para admin
```

### 3.2 SLAs e automações previstas (Sprint 2B+)

- **T+15min:** notificação ao operador de plantão sobre novo diagnóstico.
- **T+24h sem contato:** task automática "Realizar 1º contato" (via trigger + `pg_cron`).
- **T+7d sem movimentação:** lead marcado como "frio" e reatribuído.
- **Mudança de stage:** dispara evento em `lead_activities` e recalcula `score`.

### 3.3 Vinculação diagnóstico → lead

- Chave primária de deduplicação: **e-mail normalizado** (lowercase + trim).
- Se e-mail existir, `diagnoses.lead_id` aponta para o lead existente e é criada uma atividade "Novo diagnóstico enviado".
- Se não, cria-se novo lead com `source = 'diagnostico'` e `stage_id` = primeira etapa do pipeline "Diagnóstico".

---

## 4. Fluxo de Autenticação

### 4.1 Métodos suportados

1. **E-mail + senha** (padrão para operadores internos).
2. **Google OAuth** (via broker Lovable, `lovable.auth.signInWithOAuth('google')`).
3. **Reset de senha** por e-mail com rota pública `/reset-password`.
4. **HIBP** (leaked password protection) **habilitado**.

### 4.2 Rota pública vs. protegida

- **Rota pública `/auth`**: hospeda sign-in/sign-up/forgot-password. É a única rota de autenticação.
- **Callback OAuth**: retorna sempre para rota pública (`/auth/callback`) — nunca para `_authenticated/*` para evitar loop antes da hidratação da sessão.
- **Subtree protegida `_authenticated/*`**: gate gerenciado pela integração (`ssr: false` + `supabase.auth.getUser()` + redirect `/auth`). **Não recriar manualmente.**

### 4.3 Ciclo de sessão

```text
1. Login → supabase.auth.signInWithPassword (ou OAuth broker)
2. onAuthStateChange (root único listener):
   - SIGNED_IN | USER_UPDATED  → router.invalidate() + queryClient.invalidateQueries()
   - SIGNED_OUT                → router.invalidate() (gate redireciona) + NÃO refetch
3. Server functions recebem bearer via functionMiddleware (attachSupabaseAuth)
4. requireSupabaseAuth valida token → injeta { supabase, userId, claims }
5. Todas as queries respeitam RLS como o próprio usuário
```

### 4.4 Sign-out disciplinado

Ordem obrigatória: `queryClient.cancelQueries()` → `queryClient.clear()` → `supabase.auth.signOut()` → `navigate({ to: '/auth', replace: true })`.

---

## 5. Papéis (Roles)

### 5.1 Enum de papéis

| Role | Descrição | Rotas |
|---|---|---|
| `admin` | Acesso total. Gerencia usuários, papéis, configurações, vê audit_log. | `/admin/*` + tudo abaixo |
| `operator` | Time comercial. Gerencia leads próprios e do time. | `/crm/*` |
| `viewer` | Somente leitura para stakeholders (ex.: sócios, gestor). | `/crm/*` (read-only) |

> **Regra:** todo usuário criado recebe `viewer` por padrão. Elevação para `operator` ou `admin` é feita por um `admin` via `/admin/users`.

### 5.2 Padrão de verificação

- **Banco:** função `public.has_role(user_id, role)` `SECURITY DEFINER` `STABLE`, `search_path = public`.
- **Cliente:** hook `useHasRole(role)` que lê de `user_roles` via server function autenticada, com cache TanStack Query.
- **Roteamento:** layout aninhado `_authenticated/_admin` com `beforeLoad` chamando `context.auth.hasRole('admin')`.
- **Nunca** confiar em `localStorage` ou claims não-verificados no cliente para decisões de segurança — apenas para UX (esconder botões).

### 5.3 Anti-padrões proibidos

- ❌ Coluna `role` em `profiles` ou `auth.users`.
- ❌ Policy que faça `SELECT role FROM profiles WHERE id = auth.uid()` (recursão).
- ❌ Verificar admin no cliente e chamar `supabaseAdmin` a partir de server function não-autenticada.

---

## 6. Políticas RLS

### 6.1 Princípios gerais

1. **Toda tabela em `public` tem RLS habilitado.** Sem exceção.
2. **Grants explícitos** (`SELECT/INSERT/UPDATE/DELETE`) ao role apropriado (`authenticated`, `anon`, `service_role`) na mesma migration que cria a tabela.
3. **`anon` só recebe grant** em tabelas com política pública explícita (nenhuma nesta versão — ver 6.3).
4. **`service_role`** contorna RLS; usar apenas em webhooks verificados e jobs administrativos.
5. **Sempre** usar `has_role(auth.uid(), 'x')` em vez de subqueries à própria tabela.

### 6.2 Matriz de políticas (resumo conceitual)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | próprio OU admin | trigger (não via API) | próprio OU admin | admin |
| `user_roles` | próprio OU admin | admin | admin | admin |
| `leads` | operator/viewer/admin | operator/admin | owner OU admin | admin |
| `lead_activities` | mesmos que leads | operator/admin (só insert) | ❌ imutável | admin |
| `lead_notes` | mesmos que leads | operator/admin | autor OU admin | autor OU admin |
| `lead_tasks` | mesmos que leads | operator/admin | assignee OU admin | admin |
| `pipelines` / `stages` | authenticated | admin | admin | admin |
| `diagnoses` | operator/admin | via server route público (service_role) | operator/admin | admin |
| `notifications` | próprio | service_role (server) | próprio (marcar lido) | próprio |
| `attachments` | conforme entidade pai | conforme entidade pai | uploader OU admin | uploader OU admin |
| `audit_log` | admin | service_role | ❌ | ❌ |
| `settings` | admin | admin | admin | admin |

### 6.3 Superfície pública

A única entrada anônima é o **submit do diagnóstico**, e ela **não usa RLS `anon`**: passa por `POST /api/public/diagnosis` que valida input com Zod, aplica rate-limit, e escreve com `supabaseAdmin` após verificação. Assim `diagnoses` permanece 100% privado do ponto de vista de RLS.

### 6.4 Padrões de policy

- **Isolamento por usuário:** `USING (auth.uid() = user_id)` + `WITH CHECK (auth.uid() = user_id)`.
- **Permissão por role:** `USING (public.has_role(auth.uid(), 'admin'))`.
- **Combinado:** `USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))`.

---

## 7. Edge Functions previstas

> Preferência: **`createServerFn` no TanStack Start** para lógica interna. Edge Functions Supabase apenas para os casos abaixo.

| Nome | Tipo | Motivo | Trigger |
|---|---|---|---|
| `email-transactional` | Edge Function Supabase | Envio de e-mail com template + retry, precisa rodar independente do request cycle. | Chamada por trigger `pg_net` após insert em `notifications` marcadas para e-mail. |
| `lead-sla-tick` | Edge Function + `pg_cron` | Job periódico (a cada 15 min) que gera tasks/notifications baseados em SLA. | Cron. |
| `stripe-webhook` (futuro) | Server route `/api/public/stripe` | Precisa verificar assinatura HMAC; recebe do Stripe. | Externo. |
| `whatsapp-inbound` (futuro) | Server route `/api/public/whatsapp` | Webhook do provedor com verificação de segredo. | Externo. |
| `diagnosis-submit` | Server route `/api/public/diagnosis` | Entrada anônima do Portal com validação + rate-limit. | Cliente público. |

Server functions internas (não são Edge Functions, mas fazem parte da API):

- `getLeads`, `getLeadById`, `updateLead`, `moveLeadStage`, `assignLead`
- `createNote`, `updateNote`, `deleteNote`
- `createTask`, `completeTask`
- `listNotifications`, `markNotificationRead`, `markAllRead`
- `listUsers`, `updateUserRole` (admin)
- `getOperationsSummary`, `getInbox`, `getPipelineBoard`, `getActivityFeed`, `getAgenda`, `getMetrics`

Todas protegidas por `requireSupabaseAuth` + verificação de role quando aplicável.

---

## 8. Estrutura de Storage

### 8.1 Buckets

| Bucket | Visibilidade | Conteúdo | RLS |
|---|---|---|---|
| `avatars` | Público (URL direta) | Foto de perfil do usuário | Upload/delete: dono; leitura: todos autenticados. |
| `lead-attachments` | Privado | Documentos comerciais anexados a leads | Acesso via URL assinada; RLS baseada no `owner_id` do lead + role. |
| `diagnosis-uploads` | Privado | Anexos opcionais do portal (screenshots de loja) | Escrita anônima via server route (service_role); leitura só operator/admin. |
| `system-assets` | Público | Logos, templates de e-mail, imagens estáticas versionadas | Escrita apenas admin. |

### 8.2 Convenção de path

```text
avatars/{user_id}/{uuid}.{ext}
lead-attachments/{lead_id}/{uuid}-{original_name}
diagnosis-uploads/{diagnosis_id}/{uuid}-{original_name}
system-assets/{category}/{filename}
```

### 8.3 Regras

- Sempre gerar nome com `uuid` para evitar colisão e enumeração.
- Limite de tamanho por bucket (ex.: 5MB avatar, 25MB anexo).
- MIME types permitidos declarados no bucket.
- URLs assinadas com TTL curto (5min) para downloads privados.

---

## 9. Sistema de Notificações

### 9.1 Canais

1. **In-app** (obrigatório): tabela `notifications` + Supabase Realtime. Badge no `AppTopbar`.
2. **E-mail transacional** (opcional por tipo): via Edge Function `email-transactional`.
3. **Futuros:** push (web), WhatsApp, Slack.

### 9.2 Tipos previstos (`kind`)

- `lead.new` — novo lead criado (via diagnóstico ou manual).
- `lead.assigned` — lead atribuído ao usuário.
- `lead.stage_changed` — mudança de etapa em lead atribuído ao usuário.
- `task.due_soon` — tarefa vence em <2h.
- `task.overdue` — tarefa vencida.
- `diagnosis.submitted` — novo diagnóstico enviado (para operadores).
- `system.announcement` — mensagem do admin para todos.

### 9.3 Fluxo

```text
[Evento no banco: INSERT/UPDATE]
   │ trigger
   ▼
[Função enqueue_notification()]
   │ INSERT em notifications (por usuário destinatário)
   ▼
[Realtime subscription no cliente] ─▶ atualiza badge/lista
   │
   └─ se kind.email = true → chama Edge Function via pg_net
```

### 9.4 Preferências

Tabela `notification_preferences (user_id, kind, in_app, email)` — usuário controla quais tipos recebe por qual canal.

---

## 10. Convenções de Banco

### 10.1 Nomenclatura

- **Tabelas:** `snake_case`, **plural** (`leads`, `lead_activities`).
- **Colunas:** `snake_case`, singular. FKs no formato `{entidade_singular}_id`.
- **Enums (types):** `snake_case` singular (`app_role`, `lead_status`).
- **Índices:** `idx_{tabela}_{colunas}`.
- **Constraints:** `chk_{tabela}_{regra}`, `uq_{tabela}_{colunas}`.
- **Funções:** `verbo_substantivo` em `snake_case` (`has_role`, `enqueue_notification`).
- **Triggers:** `trg_{tabela}_{evento}` (ex.: `trg_leads_updated_at`).

### 10.2 Campos padrão

Toda tabela de domínio deve ter:

- `id uuid pk default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` (mantido por trigger)
- `deleted_at timestamptz` (quando soft delete se aplicar)

### 10.3 Migrations

- **Uma migration = uma mudança lógica.** Nomeadas com timestamp + descrição curta.
- **Ordem obrigatória em migration de nova tabela:**
  1. `CREATE TABLE`
  2. `GRANT` explícitos
  3. `ENABLE ROW LEVEL SECURITY`
  4. `CREATE POLICY`
  5. Índices
  6. Triggers
- Seed determinístico (pipelines, stages iniciais, admin bootstrap) na mesma migration que cria as tabelas correspondentes.

### 10.4 Padrões proibidos

- ❌ `TEXT` sem `CHECK` para valores enumerados.
- ❌ Tabela sem RLS.
- ❌ `role` fora de `user_roles`.
- ❌ Query em policy que referencia a própria tabela sem `SECURITY DEFINER`.
- ❌ Delete físico em `leads`, `lead_notes`, `lead_tasks` (usar soft delete).

---

## 11. Convenções de Código

### 11.1 Organização de pastas (já refatorada na Sprint 0)

```text
src/
├── components/
│   ├── marketing/       # site institucional
│   ├── app/             # UI do produto autenticado
│   ├── diagnosis/       # portal público
│   ├── shared/          # transversal
│   └── ui/              # shadcn/ui
├── modules/
│   ├── crm/             # regras de negócio comercial
│   ├── admin/
│   ├── briefing/
│   └── marketing/
├── layouts/             # public-layout, app-layout
├── routes/              # file-based (TanStack)
│   └── api/public/*     # webhooks / entradas anônimas
├── lib/                 # utils + *.functions.ts
├── services/            # clientes de APIs externas
├── integrations/supabase/  # client, client.server, auth-middleware
├── mocks/               # removido gradualmente na 2B
└── types/
```

### 11.2 Server functions

- Arquivo: `src/lib/{dominio}.functions.ts` (ex.: `leads.functions.ts`).
- Sempre com `.inputValidator(zod)` + `.handler()`.
- `requireSupabaseAuth` em toda função autenticada.
- Verificação de role dentro do handler quando aplicável (`has_role` via `context.supabase`).
- Nunca importar `client.server` em topo de módulo — `await import(...)` dentro do handler.

### 11.3 Data fetching

- Sempre TanStack Query + `queryOptions()`.
- Padrão: `loader` faz `context.queryClient.ensureQueryData(qo)`; componente lê com `useSuspenseQuery(qo)`.
- `staleTime` padrão 30s; realtime invalida o cache por chave.
- Nenhum `useEffect + fetch` para dados iniciais.

### 11.4 UI

- **Tokens semânticos** somente (`bg-background`, `text-foreground`, `brand-*`). Sem cores hard-coded.
- Componentes < 150 linhas; extrair subcomponentes.
- `cn()` para composição de classes.
- Mobile-first: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Loading via skeleton com altura fixa (evita CLS).
- Erros via `errorComponent` da rota + `Error Boundary` em widgets isolados.

### 11.5 Segurança

- **Zod** valida input em toda server function e server route.
- **Rate limit** em endpoints públicos (`/api/public/*`) via chave IP + janela deslizante em `settings`/Redis futuro.
- **Audit log** em toda operação sensível: mudança de role, delete de lead, alteração de settings.
- **Secrets** apenas via `process.env` dentro do handler; `VITE_*` só para valores públicos.

### 11.6 Qualidade

- TypeScript `strict: true`, zero `any`.
- Sem `console.log` em produção (lint bloqueia).
- Testes P1 obrigatórios: auth, RLS, CRUD principal, submit do diagnóstico.
- CI: typecheck + lint + testes antes de merge.

---

## 12. Roadmap de implementação — Sprint 2B

> Ordem estrita. Cada bloco fecha antes do próximo abrir.

### Bloco 1 — Fundação (dia 1–2)

1. Ativar Lovable Cloud.
2. Criar enum `app_role` e tabela `user_roles` + função `has_role` + grants + RLS.
3. Criar tabela `profiles` + trigger `handle_new_user`.
4. Configurar Supabase Auth: email/senha, Google OAuth, HIBP on, redirect URLs.
5. Bootstrap admin: seed do primeiro usuário admin via migration (idempotente).
6. Registrar `functionMiddleware` de bearer no `src/start.ts` (já existe se integração gerenciada).

**Critério de aceite:** login funciona; `useHasRole('admin')` retorna verdadeiro para o admin bootstrapped.

### Bloco 2 — Domínio comercial (dia 3–5)

1. Tabelas `pipelines`, `pipeline_stages` + seed do pipeline "Diagnóstico".
2. Tabela `leads` + policies + índices.
3. Tabelas `lead_activities`, `lead_notes`, `lead_tasks`.
4. Triggers de `updated_at` e de `lead_activities` para mudanças de stage.
5. Server functions: `listLeads`, `getLead`, `updateLead`, `moveLeadStage`, `assignLead`, notes/tasks CRUD.
6. Migrar `/crm/leads` e `/crm/leads/:id` para dados reais (remover `MOCK_LEADS`).

**Critério de aceite:** operador logado cria/lista/atualiza leads; viewer só lê; admin faz tudo. RLS testada por 3 usuários.

### Bloco 3 — Portal de Diagnóstico persistente (dia 6–7)

1. Tabelas `diagnoses` e `diagnosis_answers` + trigger de normalização.
2. Server route público `POST /api/public/diagnosis` com Zod + rate-limit + `supabaseAdmin`.
3. Trigger `on_diagnosis_insert` → upsert em `leads` + `notifications`.
4. Migrar `/diagnostico` para enviar ao backend (mantém `localStorage` como rascunho até submit).
5. Tela `/crm/leads/:id` mostra diagnóstico vinculado (aba nova).

**Critério de aceite:** submit anônimo cria lead; operador vê o diagnóstico completo; e-mail duplicado atualiza lead existente.

### Bloco 4 — Centro de Operações real (dia 8–9)

1. Server functions: `getOperationsSummary`, `getInbox`, `getPipelineBoard`, `getActivityFeed`, `getAgenda`, `getMetrics`.
2. Substituir mocks em `/crm/dashboard`.
3. Assinatura Realtime para inbox e notifications no `AppTopbar`.

**Critério de aceite:** dashboard reflete dados reais; novo lead aparece em <2s via Realtime.

### Bloco 5 — Admin (dia 10)

1. Layout `_authenticated/_admin` com gate por `has_role('admin')`.
2. `/admin/users`: listar usuários, alterar role, desativar.
3. `/admin/settings`: configurações globais.
4. `/admin/audit`: leitura do `audit_log` com filtros.

**Critério de aceite:** admin altera papel de outro usuário; audit log registra a mudança; não-admin recebe 403.

### Bloco 6 — Notificações + E-mail (dia 11)

1. Tabela `notifications` + `notification_preferences`.
2. Edge Function `email-transactional` + provider (Resend) via secret.
3. Triggers de notificação em eventos-chave.
4. UI: dropdown de notificações no Topbar, tela `/notifications`.

**Critério de aceite:** novo diagnóstico gera notificação in-app + e-mail ao operador de plantão.

### Bloco 7 — Storage + Anexos (dia 12)

1. Buckets criados com policies.
2. Tabela `attachments` + server functions de upload/download com URL assinada.
3. Aba "Arquivos" em `/crm/leads/:id`.

**Critério de aceite:** operador anexa PDF; viewer visualiza; usuário sem acesso ao lead recebe 403.

### Bloco 8 — Endurecimento (dia 13–14)

1. Testes E2E dos fluxos críticos (login, submit diagnóstico, CRUD lead, escalonamento de role).
2. Testes de RLS com 3 personas.
3. Auditoria de segurança (Code Auditor): `service_role` fora do frontend, RLS 100%, grants corretos.
4. Auditoria SEO das rotas públicas (`/`, `/diagnostico`).
5. Rate-limit em `/api/public/*`.
6. Logs e observabilidade validados.

**Critério de aceite:** relatório de auditoria aprova para produção; checklist de deploy 17/17.

### Fora do escopo da 2B (backlog 2C+)

- Integração WhatsApp inbound/outbound.
- Stripe/Paddle (assinaturas de clientes).
- Módulo Briefing completo.
- Marketing (campanhas, tracking UTM avançado).
- BI/relatórios com views materializadas.
- Multi-tenant (workspaces).

---

## Anexo A — Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Escalonamento de privilégio via `profiles.role` | Crítico | Roles em `user_roles` isolada + `has_role` SECURITY DEFINER. |
| Recursão em policies | Alto | Sempre usar função SECURITY DEFINER; nunca subquery na própria tabela. |
| Vazamento de `service_role` | Crítico | Apenas em `client.server.ts` + `await import` dentro de handlers; nunca em rotas/componentes. |
| Submit anônimo abusivo | Médio | Rate-limit por IP + captcha invisível (futuro) + validação Zod estrita. |
| Perda de rascunho no Portal | Baixo | `localStorage` mantido; ao submit com sucesso, limpar. |
| Notificações em loop | Médio | `onAuthStateChange` filtrado por eventos de identidade; sem `invalidate` em `SIGNED_OUT`. |
| Custo de Realtime | Baixo | Subscrições por usuário (`user_id = auth.uid()`) apenas onde necessário. |

---

## Anexo B — Glossário

- **RLS:** Row Level Security — políticas de acesso a nível de linha no Postgres.
- **SECURITY DEFINER:** função executada com privilégios do dono; usada para evitar recursão em RLS.
- **Server Function:** `createServerFn` do TanStack Start; RPC tipado cliente→servidor.
- **Server Route:** rota HTTP em `routes/api/*`; usada para webhooks e APIs públicas.
- **Bearer middleware:** middleware cliente que anexa `Authorization` do usuário a toda chamada de server function.
- **Realtime:** canal WebSocket do Supabase que emite mudanças de linha respeitando RLS.

---

**FIM DO DOCUMENTO — Sprint 2A**

Aprovação necessária antes de iniciar a Sprint 2B (implementação).
