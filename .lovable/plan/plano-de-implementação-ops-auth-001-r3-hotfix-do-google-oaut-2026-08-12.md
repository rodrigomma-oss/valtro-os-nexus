# Plano de Implementação — OPS-AUTH-001 — R3 — HOTFIX DO GOOGLE OAUTH

Eliminar a race condition no fluxo de Google OAuth do Valtro OS, garantindo que a primeira tentativa de autenticação seja bem-sucedida através de um gerenciamento de ciclo de vida de sessão mais robusto.

## Estimativa de Tempo
- **Diagnóstico e Planejamento:** 15 min
- **Implementação (Refatoração de /auth):** 30 min
- **Testes de Unidade e E2E:** 45 min
- **Auditoria e Quality Gate:** 20 min
- **Total Estimado:** ~1h 50min

## Detalhes Técnicos
- **Causa Raiz:** O componente `AuthPage` utilizava `supabase.auth.getUser()` em um `useEffect` solitário que encerrava o estado `checking` imediatamente após uma resposta, sem aguardar a conclusão da hidratação assíncrona do Supabase após redirecionamentos OAuth.
- **Solução:** Implementar um listener de `onAuthStateChange` para capturar eventos `SIGNED_IN` e `INITIAL_SESSION` de forma reativa. O estado `checking` (loading) será mantido até que o Supabase confirme a presença ou ausência de uma sessão válida.
- **Tratamento de Erros:** Sanitização de erros `invalid_credentials` para mensagens amigáveis ao usuário, evitando exposição de logs internos.

## Escopo e Restrições
- **Não** realizar alterações em RLS, banco de dados, ou gestão de usuários.
- **Não** criar perfis ou conceder acesso automaticamente a novos usuários Google.
- **Foco exclusivo** no ciclo de vida da sessão e eliminação da race condition.

## Etapas de Execução

1. **Refatoração do Componente AuthPage (`src/routes/auth.tsx`):**
   - Substituir a lógica atual de `useEffect` por um listener `supabase.auth.onAuthStateChange`.
   - Gerenciar adequadamente os estados `SIGNED_IN`, `INITIAL_SESSION` e `SIGNED_OUT`.
   - Garantir cleanup da subscrição no unmount do componente.
   - Implementar fallback amigável para `invalid_credentials`.

2. **Testes Automatizados (Vitest):**
   - Criar `src/routes/__tests__/auth.test.tsx`.
   - Testar estados iniciais com e sem usuário.
   - Simular callback de `SIGNED_IN`.
   - Verificar se o redirect ocorre apenas uma vez.

3. **Teste E2E (Playwright):**
   - Validar fluxo Google partindo de sessão limpa.
   - Validar logout e novo login.

4. **Quality Gate:**
   - Typecheck, build e verificação de segurança (não vazamento de tokens/secrets).

5. **Deploy e Homologação:**
   - Publicar hotfix e validar em produção.
