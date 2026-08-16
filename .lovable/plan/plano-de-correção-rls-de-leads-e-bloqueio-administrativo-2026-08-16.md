# Plano de Correção — RLS de Leads e Bloqueio Administrativo

Este plano visa corrigir os dois pontos de falha detectados durante a validação do perfil Operador: a falha na criação de Leads via RLS e a ausência de bloqueio efetivo em páginas administrativas.

## Alterações Técnicas

### 1. Segurança e RLS (Banco de Dados)
*   **Correção da Policy de INSERT**: Ajustar a policy `leads_insert` para garantir que o Operador tenha permissão explícita de inserção quando o `owner_id` for o seu próprio `uid`.
*   **Refinamento da Função `can_access_lead`**: Garantir que a visibilidade (SELECT) não cause "race conditions" ou falhas de segurança durante o retorno do registro recém-criado.

### 2. Controle de Acesso (Frontend/Rotas)
*   **Bloqueio de Rotas Administrativas**: Implementar a verificação de papel (`isAdmin`) no hook `beforeLoad` das rotas `/os/admin/usuarios` e `/os/admin/integracoes`.
*   **Redirecionamento**: Usuários sem perfil de administrador serão redirecionados para o dashboard operacional (`/os`), prevenindo o acesso direto por URL.

### 3. Debug de Criação de Lead
*   **Investigação de Payload**: Verificar se o componente `new-lead-dialog.tsx` está enviando todos os campos obrigatórios conforme o esquema Zod, garantindo que o `auth.uid()` seja propagado corretamente pelo middleware de servidor.

## Critérios de Aceite
- [ ] Operador consegue criar Lead com sucesso (Toast de sucesso visível).
- [ ] Operador é redirecionado ao tentar acessar `/os/admin/integracoes`.
- [ ] Operador é redirecionado ao tentar acessar `/os/admin/usuarios`.
- [ ] O banco de dados registra `created_by` e `owner_id` corretamente para o Operador.
