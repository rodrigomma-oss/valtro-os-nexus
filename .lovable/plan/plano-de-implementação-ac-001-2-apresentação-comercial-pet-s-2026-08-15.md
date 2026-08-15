# Plano de Implementação: AC-001.2 — Apresentação Comercial Pet Shop

Implementação da primeira apresentação comercial nichada, focada no segmento de Pet Shops, seguindo o conceito "Modern Pet Boutique". A experiência será fullscreen, imersiva e personalizada via `PresentationContext`.

## 1. Definição Visual (Temas e Estilos)
Configurar a identidade visual do nicho Pet Shop no `src/styles.css` e `src/modules/commercial/config.ts`.

- **Cores:** Areia (#F5F5F4), Verde Sálvia (#86A789), Azul Petróleo (#1B3C58), Terracota (#C46647).
- **Tipografia:** Serif (headlines) + Sans-serif (body).
- **Isolamento:** Uso de classes CSS scoped ao tema `.theme-petshop`.

## 2. Componentes da Apresentação
Desenvolver os componentes das 8 seções da narrativa comercial em `src/components/commercial/petshop/`.

1. **Abertura:** Impacto visual com `{{empresa}}`.
2. **Oportunidade:** Provocação comercial sobre presença digital.
3. **Valor:** Foco em cuidado, confiança e profissionalismo.
4. **Estrutura:** Elementos essenciais (serviços, localização, contato).
5. **Demonstração:** Transição com botão placeholder "VER DEMONSTRAÇÃO".
6. **Presença Local:** Foco em `{{cidade}}` com fallback para "sua região".
7. **Conversão:** Redução de atrito e múltiplos caminhos (WhatsApp).
8. **Fechamento:** CTA de continuidade da conversa com `{{empresa}}`.

## 3. Integração e Roteamento
- Atualizar `src/modules/commercial/config.ts` para registrar o componente principal do Pet Shop.
- Refatorar `src/routes/_authenticated.apresentacao-viewer.$nicho.tsx` para carregar dinamicamente o componente do nicho com base na configuração.

## 4. UX e Refinamentos
- Implementar scroll snap e transições suaves.
- Indicador discreto de progresso da apresentação.
- Otimização de assets (lazy loading de imagens).
- Garantir responsividade total (desktop first, mobile funcional).

## Detalhes Técnicos
- **Estado:** Utilização do `usePresentationContext` para dados efêmeros (empresa/cidade).
- **Demonstração:** O botão na seção 5 será um placeholder inativo, preparado para o AC-001.4.
- **Segurança:** Acesso restrito a usuários autenticados (Admin/Operator).
- **Sem Persistência:** Dados do lead não serão salvos em banco nesta fase.

## Estimativa
**10 a 14 horas úteis.**
