# Plano de Implementação — OPS-AUTH-002 BLOCO 5

Implementar o fluxo de definição de credencial local (senha) para usuários autenticados via Google, garantindo que possam alternar entre os métodos de login no mesmo `auth.users.id`.

## 1. Arquitetura e Fluxo

- **Detecção:** Identificar na área autenticada se o usuário logado via Google não possui senha configurada. Como não é possível ler `encrypted_password` no cliente, utilizaremos uma tentativa silenciosa de redefinir a senha via `updateUser({ password })` ou uma verificação de metadados customizada se disponível.
- **Interface:** Criar uma nova rota protegida `/os/configuracoes/seguranca` com um card para "Estabelecer Senha de Acesso".
- **Ação:** Utilizar `supabase.auth.updateUser({ password })` para associar uma senha à sessão atual.

## 2. Mudanças Técnicas

### Frontend
- **Nova Rota:** `src/routes/_authenticated.os.configuracoes.seguranca.tsx` — Interface para definição de senha.
- **Topbar/Sidebar:** Adicionar link para a nova rota no menu do usuário e sidebar (seção de administração/configurações).
- **Notificação:** Adicionar um aviso (Banner ou Toast persistente) no Dashboard se o usuário Google ainda não tiver senha.

### Segurança
- Validar no cliente que `password === confirmPassword`.
- Senha mínima de 8 caracteres.
- Nenhuma alteração no Gate de Admissão ou RLS (autenticação != autorização).

## 3. Testes Automatizados

Criar `tests/unit/ops-auth/local-credential.test.tsx`:
- Validar fluxo de `updateUser` com sucesso.
- Validar erro de senhas divergentes.
- Garantir que o Gate de Admissão continua enviando usuários sem role para `/unauthorized`.

## 4. Passos de Implementação

1. Criar a estrutura de diretórios para a nova rota.
2. Implementar o componente `SecuritySettings` com formulário de senha.
3. Adicionar o link no `AppTopbar.tsx`.
4. Implementar o banner de aviso no `Dashboard.tsx`.
5. Executar testes e validação de build.

---
**PARE:** Este plano aguarda aprovação antes da execução.
