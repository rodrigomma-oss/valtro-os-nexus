# Plano de Ação - AC-001.4: Conexão Apresentação → Site Demonstrativo

## Objetivo
Implementar o fluxo de navegação entre a Apresentação Comercial Pet Shop e o Site Demonstrativo da Pata & Cia.

## Estimativa de Tempo
- **Análise e Preparação:** 5 minutos
- **Implementação:** 10 minutos
- **Testes e Validação:** 15 minutos
- **Total:** 30 minutos

## Decisões Técnicas
- **Navegação:** Será utilizada a abertura em **Nova Aba** (`target="_blank"`).
- **Justificativa:** Durante uma reunião de vendas, o vendedor frequentemente precisa alternar entre o discurso teórico da apresentação e a demonstração prática. Abrir em uma nova aba permite que o site seja explorado sem perder o estado atual (scroll, animações) da apresentação original, permitindo um retorno imediato e fluido para o fechamento da venda.
- **Ferramenta:** Utilizaremos o componente `Link` do `@tanstack/react-router` ou um `<a>` padrão com as propriedades de segurança necessárias.

## Etapas de Implementação
1.  **Identificação do CTA:** Localizado na Seção 05 de `src/components/commercial/petshop/petshop-presentation.tsx`.
2.  **Configuração do Link:** Apontar para a rota `/demo/petshop`.
3.  **Preservação de Contexto:** Embora não seja requisito dinâmico para o AC-001.3, o link será estruturado de forma limpa.
4.  **Verificação de Rota:** Garantir que a rota `/demo/petshop` responda corretamente em produção.

## Critérios de Aceite
- Clique em "VER DEMONSTRAÇÃO" abre `/demo/petshop` em nova aba.
- Nenhuma alteração visual na apresentação.
- Nenhuma alteração no conteúdo do site demonstrativo.
- Funcionamento garantido em Desktop e Mobile.
