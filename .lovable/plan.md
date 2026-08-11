---
name: OPS-INT-003 — R10 — Corrigir detalhe de Feedback
description: Corrigir a falha de carregamento da página de detalhes do feedback (FDB-XXXXXX) diagnosticando erros de fetch e RLS.
type: feature
---

## Objetivo
Diagnosticar e corrigir a falha de navegação/carregamento no detalhe de Feedback (FDB-000007).

## Análise (R10)
A navegação para `/os/atendimento/feedback/$id` ocorre corretamente via URL, mas a página permanece em estado de carregamento ou "não encontrado" devido a falhas no carregamento de dados (Server Function `getFeedback`).

## Implementação
1. **Auditoria de Erros**: Capturar logs detalhados na Server Function `getFeedback`.
2. **Hardening de Auth**: Verificar se o token de autenticação está sendo propagado corretamente para buscas individuais (Middleware).
3. **Correção de UI**: Garantir que o `id` (UUID) passado pela listagem seja exatamente o esperado pelo loader do detalhe.
4. **Resiliência**: Adicionar tratamento de erro amigável na UI de detalhe.

## Estimativa
- 30 minutos.

## Riscos
- Inconsistência entre cache do TanStack Query no client vs server.
- RLS bloqueando leitura de registros onde `created_by` é NULL (origem API) no contexto de busca individual.
