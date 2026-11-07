# Hotfix: Roteamento da Apresentação Comercial

Este plano visa corrigir o erro 404 ao tentar acessar a rota dinâmica de visualização da apresentação comercial no ambiente de produção.

## Auditoria e Causa Raiz (Hipótese Principal)

O TanStack Router utiliza um sistema de arquivos para gerar a árvore de rotas. No ambiente de desenvolvimento, a resolução de arquivos pode ser mais permissiva. Em produção, caracteres especiais ou estruturas de arquivos mal interpretadas podem causar falhas na resolução da rota.

Identificamos que a rota está definida como `src/routes/_authenticated.apresentacao-viewer.$nicho.tsx`. 
O `.` (ponto) no nome do arquivo é interpretado pelo TanStack Router como um separador de hierarquia (similar a uma pasta).

A URL esperada pelo usuário é `/_authenticated/apresentacao-viewer/petshop`.
No `routeTree.gen.ts`, a rota está registrada com `path: '/apresentacao-viewer/$nicho'`.

**Problema Detectado:** 
O TanStack Router gera rotas baseadas na estrutura de arquivos. Se o arquivo estiver na raiz de `src/routes/` com pontos, ele cria uma hierarquia virtual. 
No entanto, o uso de `_authenticated` (pathless layout) seguido de um ponto e depois o restante do path pode estar sendo interpretado de forma ambígua pelo servidor de produção ou pelo próprio mecanismo de matching do Router quando há parâmetros dinâmicos misturados com pontos.

**Correção Proposta:**
Padronizar a estrutura de arquivos para utilizar pastas reais em vez de pontos no nome do arquivo, garantindo uma hierarquia física clara que o compilador e o servidor de produção resolvam sem ambiguidades.

## Etapas Técnicas

### 1. Reorganização de Arquivos
- Mover `src/routes/_authenticated.apresentacao-viewer.$nicho.tsx` para `src/routes/_authenticated/apresentacao-viewer/$nicho.tsx`.
- Isso cria uma estrutura física idêntica à lógica esperada:
  - `_authenticated/` (pasta layout)
  - `apresentacao-viewer/` (pasta)
  - `$nicho.tsx` (arquivo dinâmico)

### 2. Atualização de Código
- Ajustar a definição da rota dentro do arquivo `$nicho.tsx` para refletir o novo caminho relativo ao parent.
- Garantir que `getParentRoute` aponte corretamente para o layout `_authenticated`.

### 3. Sincronização e Build
- O TanStack Router regenerará o `src/routeTree.gen.ts` automaticamente.
- Validar se a nova estrutura de `fullPath` no `routeTree.gen.ts` corresponde exatamente a `/apresentacao-viewer/petshop`.

### 4. Validação
- Testar navegação via botão "Iniciar Apresentação".
- Testar acesso direto via URL.
- Testar persistência ao atualizar a página (F5).
- Testar parâmetros de busca (`company` e `city`).
- Verificar se a autenticação continua sendo exigida (AuthGate).

## Detalhes Técnicos

| Ação | Arquivo Original | Arquivo Destino |
| :--- | :--- | :--- |
| Mover Rota | `src/routes/_authenticated.apresentacao-viewer.$nicho.tsx` | `src/routes/_authenticated/apresentacao-viewer/$nicho.tsx` |
| Ajustar Rota | `src/routes/_authenticated/apresentacao-viewer/$nicho.tsx` | N/A |

### Rota Esperada
`/_authenticated/apresentacao-viewer/$nicho`

---
*Este plano foca exclusivamente no hotfix de roteamento sem alterar design ou conteúdo.*
