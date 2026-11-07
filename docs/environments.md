# Ambientes — Valtro Labs

Este documento formaliza a separação entre os ambientes gerenciados pelo
Lovable para o repositório `valtro-vision-forge`. Ele é a fonte da
verdade sobre quais dados vivem onde e como o CI interage com cada um.

## Matriz de ambientes

| Ambiente     | Projeto Lovable                | Banco (Supabase)                   | Uso                                  |
| ------------ | ------------------------------ | ---------------------------------- | ------------------------------------ |
| Produção     | `valtro-vision-forge`          | Projeto atual (produção real)      | Site institucional + CRM em uso real |
| Dev / E2E    | `valtro-vision-forge-dev`      | Novo projeto Supabase dedicado     | Suíte E2E do GitHub Actions          |

> **Regra inviolável:** produção e dev NÃO compartilham banco, storage,
> auth ou secrets. Cada projeto tem seu próprio conjunto isolado.

## Fluxo de dados

- **Produção → banco atual (produção).** Todo tráfego do site publicado
  e do CRM real permanece intocado.
- **Preview / dev → novo banco dev.** Toda execução do workflow E2E
  aponta para o projeto `valtro-vision-forge-dev` via
  `PLAYWRIGHT_BASE_URL`.

## Provisionamento do ambiente dev

O ambiente `valtro-vision-forge-dev` é um projeto Lovable criado a
partir deste repositório. Para configurá-lo:

1. **Criar o projeto** no Lovable com o nome `valtro-vision-forge-dev`
   apontando para este repositório.
2. **Aplicar migrations** — todas as migrations em `supabase/migrations/`
   são executadas automaticamente na primeira build.
3. **Rodar o seed E2E** — aplicar `supabase/seed/e2e_seed.sql` no banco
   dev (idempotente). Isso cria o lead permanente
   `00000000-0000-0000-0000-00000000e2e0`.
4. **Criar o usuário E2E** — via signup no ambiente dev com o e-mail
   `e2e@valtrolabs.dev` e a senha armazenada em GitHub Secrets. O
   trigger `handle_new_user` cria o profile automaticamente. Atribuir
   `role = 'operator'` na tabela `user_roles` manualmente após o signup.
5. **Coletar credenciais públicas** do projeto dev (URL, publishable key,
   project ID) e cadastrá-las como GitHub **Variables** (não Secrets).

## Secrets & Variables do GitHub

Configurar em **Settings → Secrets and variables → Actions**:

### Variables (públicas — seguras)

| Nome                            | Valor                                            |
| ------------------------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`             | URL do projeto **dev**                           |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key do projeto **dev**               |
| `VITE_SUPABASE_PROJECT_ID`      | Project ID do projeto **dev**                    |
| `TEST_LEAD_ID`                  | `00000000-0000-0000-0000-00000000e2e0`           |
| `PLAYWRIGHT_BASE_URL`           | URL pública `-dev` do projeto Lovable dev        |

### Secrets (privados)

| Nome                    | Origem                                          |
| ----------------------- | ----------------------------------------------- |
| `E2E_TEST_EMAIL_DEV`    | `e2e@valtrolabs.dev`                            |
| `E2E_TEST_PASSWORD_DEV` | Senha forte gerada manualmente                  |

> `SUPABASE_SERVICE_ROLE_KEY` **não deve ser cadastrada no GitHub**. Ela
> permanece exclusivamente no runtime gerenciado pelo Lovable.

## Guard de versão (`/api/public/version`)

Cada projeto expõe `GET /api/public/version` retornando
`{ commit, environment, builtAt }`. O workflow E2E compara `commit` com
`GITHUB_SHA` antes de executar a suíte. Se divergirem, o job falha
imediatamente — o preview alvo está desatualizado e os testes rodariam
contra código antigo.

## Política operacional

- **Nunca copiar dados reais** de produção para dev.
- **Nunca cadastrar `SUPABASE_SERVICE_ROLE_KEY`** no GitHub.
- **Nunca apontar o E2E para produção** — o `PLAYWRIGHT_BASE_URL` está
  amarrado ao projeto dev.
- Todo registro de teste no dev deve carregar o marcador `[E2E]` no
  nome/company para diferenciação visual imediata no CRM.
- E2E roda apenas em `push` para `main` e via `workflow_dispatch`,
  enquanto o Lovable não oferecer preview isolado por branch/commit.
