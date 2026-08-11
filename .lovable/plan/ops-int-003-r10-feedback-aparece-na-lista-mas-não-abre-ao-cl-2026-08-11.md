---
title: "OPS-INT-003 — R10 — Navegação Feedback"
description: "Corrigir a falha de navegação entre a listagem e o detalhamento de Feedback no Valtro OS."
type: "hotfix"
---

# OPS-INT-003 — R10 — FEEDBACK APARECE NA LISTA, MAS NÃO ABRE AO CLICAR

**Estimativa:** 15 minutos (Execução imediata).

## Causa Raiz
O componente `Link` na `DataTable` de feedback (`src/routes/_authenticated.os.atendimento.feedback.tsx`) está utilizando o componente `Link` do `@tanstack/react-router` mas o comportamento de clique pode estar sendo interceptado ou falhando devido ao estado de carregamento do TanStack Query no destino. Além disso, a `DataTable` possui um `onClick` no nível da linha ou ação que pode estar entrando em conflito com o `Link` interno, ou o parâmetro `$id` está perdendo a hidratação de auth no loader.

## Plano de Ação

### 1. Hardening do Link na Listagem
Simplificar o `render` da coluna "Código" para garantir que o `Link` seja o único responsável pela navegação, removendo `e.stopPropagation()` desnecessários que podem interferir no roteador em certos contextos de renderização.

### 2. Otimização do Detail Loader
Garantir que a rota de detalhe (`src/routes/_authenticated.os.atendimento.feedback.$id.tsx`) trate corretamente o estado de `error` e `isLoading` para evitar a "tela estática" reportada.

### 3. Validação
- Testar clique em `FDB-000007`.
- Verificar se a URL muda E o conteúdo carrega.
- Confirmar fallback "Sistema/API" no detalhe.

## Arquivos a serem modificados
- `src/routes/_authenticated.os.atendimento.feedback.tsx`
- `src/routes/_authenticated.os.atendimento.feedback.$id.tsx`
