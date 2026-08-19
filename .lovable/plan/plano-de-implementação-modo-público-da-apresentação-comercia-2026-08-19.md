# Plano de Implementação — Modo Público da Apresentação Comercial (AC-001.8)

Implementar a rota pública `/share/$nicho` para compartilhamento de apresentações comerciais com prospects, garantindo isolamento total do ambiente administrativo (CRM).

## Alterações Técnicas

### 1. Nova Rota Pública: `/share/$nicho`
- **Arquivo**: `src/routes/share.$nicho.tsx`
- **Funcionalidade**: 
  - Rota não autenticada (fora do gate `_authenticated`).
  - Validação de `searchParams` (`company`, `city`) usando Zod.
  - Renderização do componente de apresentação correspondente ao nicho.
  - Reutilização do `PresentationProvider` e `PresentationLayout`.

### 2. Refatoração do `PresentationLayout`
- **Arquivo**: `src/layouts/presentation-layout.tsx`
- **Alteração**: Adicionar uma prop opcional `isPublic` (boolean). Se `true`, o layout deve garantir que nenhum elemento administrativo ou de navegação do CRM seja exibido acidentalmente (embora atualmente o arquivo esteja limpo, isso serve como defesa em profundidade).

### 3. Ajustes no `PresentationViewerPage` (Rota Autenticada)
- **Arquivo**: `src/routes/apresentacao-viewer.$nicho.tsx`
- **Garantia**: Manter o `beforeLoad` intacto, exigindo login e roles.

### 4. Segurança e Isolamento
- Verificar se os componentes de apresentação (`PetShopPresentation`, `BarbeariaPresentation`) possuem dependências de estado global de usuário ou chamadas a `createServerFn` protegidas.
- Garantir que links de "Sair" ou "Encerrar" não existam na rota `/share`.

## Plano de Testes (Checklist Obrigatório)

1. **Acesso Público**: Abrir `/share/petshop?company=Teste` em guia anônima (deve carregar).
2. **Isolamento Auth**: Abrir `/apresentacao-viewer/petshop` sem login (deve redirecionar para `/auth`).
3. **Persistência**: Pressionar F5 na rota pública (deve manter os dados).
4. **Dinamicidade**: Alterar `company` na URL e verificar o texto na tela.
5. **CTAs**: Clicar em "VER DEMONSTRAÇÃO" e confirmar abertura de `/demo/petshop` em nova aba.
6. **Mobile**: Validar visualização em 375px.

## Estimativa de Tempo
- 45-60 minutos para implementação e validação automatizada.
