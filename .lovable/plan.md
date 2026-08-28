# Análise — "new row violates row-level security policy for table leads"

## O que foi verificado no banco (fatos)

- A policy de INSERT em `leads` (`leads_insert`, role `authenticated`) exige:
  `has_role(uid,'admin') OR (has_role(uid,'operator') AND owner_id = uid)`.
- Os GRANTs da tabela existem (`authenticated` tem a/r/w/d), então o erro não é falta de permissão de tabela.
- Não há trigger BEFORE INSERT em `leads` que altere `owner_id`.
- `createLead` (`src/lib/leads.functions.ts`) envia `owner_id = context.userId` e usa o cliente autenticado do middleware — o payload está correto.
- Usuários com papel hoje: 1 admin, 1 operator, 1 usuário de teste sem papel nenhum.

Conclusão: o payload e a policy são compatíveis **quando** o banco enxerga um usuário com papel admin/operator. Logo a falha é de identidade/papel na requisição, não do formulário. Qual das duas causas abaixo é a real ainda **não está confirmada** — o primeiro passo do plano é confirmá-la.

## Causas possíveis (em ordem de probabilidade)

1. **A conta usada não tem papel admin/operator** (papel `viewer` ou nenhum papel). O gate de rota só exige "ter algum papel", então a tela abre normalmente e a falha só aparece no INSERT. Resultado exato: esta mensagem de RLS.
2. **`auth.uid()` chega nulo no PostgREST**: o token é validado no middleware, mas se o header `Authorization` não for propagado na chamada de dados, as duas condições da policy retornam falso e o INSERT é negado com a mesma mensagem.
3. Efeito colateral do endurecimento recente de `has_role` (ela só responde sobre o próprio usuário, exceto admin) — inofensivo no fluxo atual, mas entra na verificação por segurança.

## Plano de correção

1. **Diagnóstico determinístico (primeiro)**: em `createLead`, antes do INSERT, ler no banco a identidade efetiva da requisição (`auth.uid()`, `auth.role()` e os papéis do usuário) e registrar em log. Isso separa a causa 1 da causa 2 em uma única tentativa real de cadastro.
2. **Se for a causa 1 (papel ausente/insuficiente)**: atribuir o papel correto ao usuário em Administração > Usuários e, na UI, bloquear/ocultar o botão "Novo lead" para quem não tem papel de escrita, evitando um erro técnico no lugar de uma mensagem clara.
3. **Se for a causa 2 (token não propagado)**: corrigir a propagação do bearer na chamada de dados do middleware autenticado, de modo que a requisição PostgREST chegue como `authenticated` com `auth.uid()` preenchido.
4. **Mensagem de erro amigável**: traduzir a falha de RLS no `NewLeadDialog` para "Seu perfil não tem permissão para criar leads" em vez de expor o texto do Postgres.
5. **Validação**: criar um lead com a conta operator e com a conta admin, confirmar a linha persistida com `owner_id`/`created_by` corretos, e confirmar que uma conta sem papel de escrita recebe a mensagem amigável (e não a tela quebrada).

## Notas técnicas

- Arquivos envolvidos: `src/lib/leads.functions.ts` (diagnóstico + erro tratado), `src/components/app/new-lead-dialog.tsx` (mensagem/UI), `src/integrations/supabase/auth-middleware.ts` (somente se o passo 1 apontar token não propagado).
- Nenhuma alteração de policy é proposta antes do diagnóstico: as regras atuais (admin cria qualquer lead; operator cria como dono) refletem a regra de negócio já aprovada.
