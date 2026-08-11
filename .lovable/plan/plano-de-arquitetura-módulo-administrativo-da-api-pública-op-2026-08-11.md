# Plano de Arquitetura: Módulo Administrativo da API Pública (OPS-API-003D)

Este documento descreve a arquitetura, o fluxo de dados e os padrões de segurança para o módulo administrativo da API Pública no Valtro OS.

## 1. Arquitetura das Rotas

As rotas são organizadas sob o gate `/_authenticated/os/admin/api` para garantir que apenas administradores autenticados com MFA (AAL2 em produção) acessem o módulo.

| Rota | Descrição | Justificativa |
| :--- | :--- | :--- |
| `/os/admin/api` | Layout Pai / Dashboard | Centraliza a navegação entre os submódulos e fornece o contexto comum. |
| `/os/admin/api/applications` | Listagem de Aplicações | Visão geral de todos os clientes registrados (IDs de cliente, ambientes, status). |
| `/os/admin/api/applications/:id` | Detalhes da Aplicação | Gerenciamento granular: edição de escopos, limites técnicos e capacidades. |
| `/os/admin/api/credentials` | Gestão de Chaves | Central de controle para todas as chaves HMAC (IDs de chave, datas de rotação). |
| `/os/admin/api/audit` | Timeline de Auditoria | Rastreabilidade total: logs de acesso, falhas de assinatura e alterações administrativas. |

---

## 2. Estrutura de Componentes

Organizados por responsabilidade única para facilitar a manutenção e testes.

### Layouts e Containers
- `ApiAdminLayout`: Container principal com navegação por abas (Tabs).
- `ApplicationsPage`: Orquestrador da listagem de aplicações.
- `CredentialsPage`: Orquestrador da gestão de credenciais.
- `AuditPage`: Orquestrador da visualização de logs.

### Componentes de Interface (UI)
- `ApplicationsTable`: Tabela otimizada com `DataTable` para exibir clientes e status.
- `NewAppDialog`: Formulário Zod + React Hook Form para registro inicial.
- `AppDetailCard`: Visualização dos metadados da aplicação (Capabilities, Scopes).
- `CredentialTable`: Tabela com ações de rotação e revogação.
- `SecretDisplayDialog`: Modal crítico que exibe o segredo HMAC **uma única vez**.
- `AuditTimeline`: Lista cronológica de eventos com filtros por aplicação e método.

---

## 3. Fluxo de Dados

O fluxo segue o padrão TanStack para garantir SSR-safety e performance:

1.  **UI (React)**: Dispara interações via `useQuery` (leitura) ou `useMutation` (escrita).
2.  **TanStack Router**: Resolve a rota e gerencia o estado da URL (filtros, paginação).
3.  **TanStack Query**: Gerencia cache, estados de loading e invalidação.
4.  **Server Function (`.functions.ts`)**: Ponto de entrada no servidor. Executa validação de input (Zod) e extração de contexto.
5.  **Service (`services.server.ts`)**: Camada de lógica de negócio pura. Executa `enforceAdminAAL2`.
6.  **Database (Supabase)**: Persistência via `supabaseAdmin` para bypassar RLS em operações administrativas complexas, mantendo auditoria via triggers.

---

## 4. Separação Client x Server

### No Client (Browser)
- Definição de formulários (`react-hook-form`).
- Componentes Shadcn/UI e Lucide Icons.
- Hooks de estado local e `useQuery` / `useMutation`.

### No Server (Worker)
- Validação de segurança (`enforceAdminAAL2`).
- Criptografia/Descriptografia de segredos HMAC (`crypto.server.ts`).
- Acesso direto ao banco de dados via `service_role`.

### Proibido no Client (Security Barrier)
- Importação de `crypto.server.ts` ou `services.server.ts`.
- Manuseio de chaves mestras de criptografia.
- Lógica de geração de segredos (deve ser feita exclusivamente no handler do servidor).

---

## 5. Fluxo: Criar Aplicação

1.  **Clique**: Usuário clica em "Criar Aplicação".
2.  **Formulário**: Preenche Nome, Ambiente e Escopos.
3.  **Submit**: `useMutation` chama `createApplicationFn`.
4.  **Backend**: `createApplication` gera um `client_id` seguro e persiste.
5.  **Resposta**: Sucesso retorna os dados da aplicação.
6.  **Update**: `invalidateQueries(['api-applications'])` atualiza a tabela instantaneamente.

---

## 6. Fluxo: Criar Credencial

1.  **Ação**: Usuário solicita nova credencial para uma aplicação específica.
2.  **Segurança**: `generateCredential` (Server) gera `key_id` e `rawSecret`.
3.  **Persistência**: O segredo é criptografado (AES-256-GCM) antes de salvar no banco.
4.  **Exibição Única**: A `Server Function` retorna o segredo puro no corpo da resposta.
5.  **UI**: O `SecretDisplayDialog` captura o segredo, exibe-o e, **ao fechar, limpa o estado da memória do React**.

---

## 7. Fluxo: Rotacionar Credencial

1.  Usuário clica em "Rotacionar".
2.  `rotateCredentialFn` é chamada.
3.  **Atômico**: A credencial antiga é marcada como `revoked` com motivo "Rotacionada".
4.  Uma nova credencial é gerada e o novo segredo é exibido conforme o fluxo anterior.

---

## 8. Fluxo: Revogar Credencial

1.  Usuário clica em "Revogar".
2.  `revokeCredentialFn` atualiza o status para `revoked` e preenche `revoked_at`.
3.  **Irreversível**: O status `revoked` impede qualquer uso futuro no pipeline HMAC.

---

## 9. Fluxo: Auditoria

1.  Cada request na API Pública (pipeline) gera uma linha em `api_audit_logs` via Trigger ou Middleware.
2.  Alterações administrativas geram logs manuais via `services.server.ts`.
3.  A `AuditTimeline` consome `getAuditLogs` realizando um **Join Manual** no servidor para evitar erros de cache do PostgREST entre o banco `auth` e `public`.

---

## 10. Gerenciamento de Estado

-   **Loader**: Usado para prefetch de dados críticos durante a transição de rota.
-   **Suspense**: Envolve tabelas para exibir skeletons durante o carregamento.
-   **useQuery**: Cache padrão para listagens (Apps, Credentials).
-   **useMutation**: Para todas as ações de escrita (Criar, Revogar, Rotacionar).
-   **InvalidateQueries**: Acionado no `onSuccess` das mutações para manter a UI sincronizada.

---

## 11. Tratamento de Erros

-   **401/403**: Redirecionamento automático para `/auth` ou exibição de "Acesso Negado" via `ErrorComponent`.
-   **409 (Conflict)**: Notificação via Toast indicando que o Nome da Aplicação já existe.
-   **Timeout/Network**: Retry automático do TanStack Query com feedback visual de "Reconectando".

---

## 12. Segurança

Validações obrigatórias em toda operação de escrita:
-   **MFA (AAL2)**: Verificação de `session.user.app_metadata.aal === 'aal2'`.
-   **Roles**: Verificação de `role === 'admin'` na tabela `user_roles`.
-   **Inputs**: Zod Schema em todas as `Server Functions`.
-   **Secrets**: Nunca trafegam no log do servidor; criptografia em repouso.
-   **Request IDs**: Extração de `x-valtro-request-id` para correlação em auditoria.

---

## 13. Dependências

-   `@tanstack/react-query`: Gestão de estado assíncrono.
-   `react-hook-form` + `@hookform/resolvers/zod`: Validação de formulários.
-   `sonner`: Notificações Toast.
-   `lucide-react`: Iconografia técnica.

---

## 14. Checklist de Implementação

- [ ] Refatorar `ApiAdminLayout` para remover códigos de diagnóstico.
- [ ] Implementar `ApplicationsTable` com suporte a estados vazio e erro.
- [ ] Criar `NewAppDialog` isolado de dependências `.server.ts`.
- [ ] Implementar `SecretDisplayDialog` com lógica de limpeza de estado.
- [ ] Ajustar `AuditTimeline` para realizar join manual de perfis/apps.
- [ ] Validar gatilho de MFA AAL2 no `enforceAdminAAL2`.

---

## 15. Checklist de Homologação (Preview)

1. [ ] A página `/os/admin/api` carrega sem erros de "Relationship cache".
2. [ ] O modal de "Criar Aplicação" abre e valida campos obrigatórios.
3. [ ] Ao criar, a nova aplicação aparece na lista sem refresh manual.
4. [ ] Ao gerar credencial, o segredo é exibido e desaparece após fechar o modal.
5. [ ] A revogação muda o status para "Revogada" e desabilita botões de ação.
6. [ ] A timeline de auditoria mostra o evento de criação com o nome do administrador.
