# Plano de Implementação: AC-001.1 — Fundação da Apresentação Comercial

Este plano estabelece a base arquitetural para o módulo de Apresentação Comercial dentro do Valtro CRM, focando em isolamento visual, extensibilidade por nichos e personalização dinâmica.

## 1. Fundação e Configuração
- Criar a configuração centralizada de nichos em `src/modules/commercial/config.ts`.
- Registrar um nicho placeholder técnico ("Placeholder") para validação.
- Definir tipos TypeScript para metadados de nicho, temas e componentes.

## 2. Gerenciamento de Estado e Contexto
- Criar `src/modules/commercial/presentation-context.tsx`.
- Implementar o hook `usePresentationContext` para fornecer `empresa` e `cidade` via URL Search Params (efêmero).
- Implementar o componente `DynamicText` para substituição de variáveis `{{empresa}}` e `{{cidade}}` com fallbacks seguros.

## 3. Infraestrutura de Rotas (TanStack Start)
- **Admin:** Criar `src/routes/_authenticated.os.comercial.apresentacoes.index.tsx`.
  - Tela de seleção de nicho.
  - Formulário de contexto (Empresa - obrigatório, Cidade - opcional).
- **Viewer:** Criar `src/routes/_authenticated.os.apresentacao-viewer.$nicho.tsx`.
  - Rota fullscreen protegida por autenticação.
  - Carregamento dinâmico do template baseado no nicho.

## 4. Isolamento Visual e Layout
- Criar `src/layouts/presentation-layout.tsx`.
  - Layout limpo, sem sidebar ou topbar do CRM.
  - Suporte a classes de tema CSS específicas por nicho.
- Configurar o reset visual básico para garantir que estilos do CRM não "vazem" para o viewer.

## 5. Integração com Navegação
- Adicionar "Apresentação Comercial" ao menu lateral do CRM em `src/components/app/os-nav-config.ts`.

## Detalhes Técnicos
- **Persistência:** Zero (0) persistência em banco de dados para dados de contexto.
- **Segurança:** Acesso restrito a usuários autenticados via gate `_authenticated.os`.
- **Placeholder:** Componente neutro que exibe as variáveis injetadas para provar o funcionamento do motor.

## Plano de Testes
1. Validar obrigatoriedade do campo "Empresa".
2. Verificar se o Viewer oculta elementos administrativos do CRM.
3. Confirmar substituição de `{{empresa}}` e `{{cidade}}`.
4. Garantir que a navegação normal do CRM permanece inalterada.
