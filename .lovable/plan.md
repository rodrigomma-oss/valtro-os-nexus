# Relatório de Auditoria Técnica — SPRINT INB-CRM-001

## 1. Status Atual
O projeto possui um CRM funcional com gestão de Leads e um formulário de captação visual na página `/portfolio`. Atualmente, não há integração entre ambos; o formulário apenas simula a captura (console.log).

## 2. Formulário /portfolio
- **Componente:** `src/components/portfolio/commercial/contact-section.tsx`
- **Campos Atuais:** `name`, `business`, `whatsapp`, `email`, `segment`, `city`, `message` (opcional).
- **Validação:** Zod (client-side) com `react-hook-form`.
- **Fluxo:** Submissão local via `onSubmit`, aguarda 1s e exibe estado de sucesso.
- **Máscara:** WhatsApp possui máscara customizada `(xx) xxxxx-xxxx`.

## 3. CRM / Leads
- **Tabela:** `public.leads`
- **Schema Relevante:**
  - `company_name` (Empresa) - text
  - `contact_name` (Contato) - text
  - `phone` (Telefone) - text
  - `email` (Email) - text
  - `instagram` (Instagram) - text
  - `segment` (Segmento) - text
  - `city` (Cidade) - text
  - `state` (Estado) - text
  - `service_type` - enum (`service_type`)
  - `source` - enum (`lead_source`)
  - `status` - enum (`lead_status`)
- **Enums Encontrados:**
  - `service_type`: inclui `"desenvolvimento_projeto"`.
  - `lead_source`: inclui `"site"`.
  - `lead_status`: inclui `"novo"`.

## 4. Integração Existente
- **Server Function:** `createLead` em `src/lib/leads.functions.ts`.
- **Limitação:** Requer middleware `requireSupabaseAuth`. Para captação pública no `/portfolio`, será necessária uma nova função ou rota que utilize o `service_role` (via `supabaseAdmin`) ou uma política RLS que permita `INSERT` anônimo controlado.

## 5. RLS e Segurança
- **RLS Atual:** A tabela `leads` permite `INSERT` apenas para usuários `authenticated` com roles `admin` ou `operator` (se `owner_id = auth.uid()`).
- **Segurança:** Uma submissão pública **não deve** ter permissão direta de escrita via cliente. A criação deve ocorrer via Server Function segura que valide os dados e use privilégios administrativos para o bypass do RLS, ou através de uma rota de API pública.

## 6. Gaps Encontrados
- Falta o campo **Estado** no formulário atual.
- O campo **Instagram** é solicitado pelo CRM mas não existe no formulário.
- Necessidade de um mecanismo de criação de Lead que não exija autenticação do visitante.
- Padronização da lista de Estados (não há enum no DB, apenas texto livre no `leads.functions.ts`).

## 7. Mapeamento Proposto
| Formulário /portfolio | Campo CRM | Regra / Transformação |
| :--- | :--- | :--- |
| Nome | `contact_name` | Obrigatório |
| Nome do negócio | `company_name` | Obrigatório |
| WhatsApp | `phone` | Obrigatório (limpar máscara) |
| Email | `email` | Obrigatório |
| Instagram | `instagram` | Opcional (novo campo) |
| Segmento | `segment` | Obrigatório |
| Cidade | `city` | Obrigatório |
| Estado | `state` | Obrigatório (novo campo) |
| *Sistema* | `service_type` | Fixo: `"desenvolvimento_projeto"` |
| *Sistema* | `source` | Fixo: `"site"` |
| *Sistema* | `status` | Fixo: `"novo"` |

## 8. Plano de Implementação
1. **`src/integrations/supabase/client.server.ts`**: Verificar/garantir acesso ao `supabaseAdmin`.
2. **`src/lib/leads.functions.ts`**: Criar `capturePublicLead` (Server Fn sem `requireSupabaseAuth`) usando `supabaseAdmin`.
3. **`src/components/portfolio/commercial/contact-section.tsx`**:
   - Atualizar `formSchema` e `FormValues`.
   - Adicionar inputs para `Instagram` e `Estado`.
   - Integrar chamada à nova Server Function no `onSubmit`.
4. **Deduplicação**: Atualmente não existe regra de deduplicação no DB/Código. O plano é apenas registrar o Lead; regras de merge serão manuais no CRM por enquanto.

## 9. Riscos
- **Spam:** Formulário público sem captcha/rate-limit pode gerar lixo no CRM.
- **Segurança:** Exposição acidental de chaves admin se mal implementado (deve ficar estritamente no server).

## 10. Critérios de Aceite
- Formulário `/portfolio` valida todos os campos obrigatórios.
- Submissão cria registro na tabela `public.leads` com `source='site'`.
- Notificação de sucesso visual para o usuário.
- Registro aparece corretamente na listagem de Leads do CRM.

## 11. Estimativa
- **Total:** 4 a 6 horas (desenvolvimento, testes de RLS e validação de fluxo fim-a-fim).
