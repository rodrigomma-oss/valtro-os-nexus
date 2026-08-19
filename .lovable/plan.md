# Relatório de Auditoria: Apresentação Comercial Pet Shop (AC-001.9)

## 1. Estimativa para a futura alteração
A reformulação estética da apresentação Pet Shop é estimada em **12 a 16 horas de desenvolvimento**, focando na substituição de assets, ajuste de paleta cromática, e refinamento de microinterações para alinhar com a nova referência visual premium.

## 2. Arquitetura atual
A apresentação é construída de forma modular e dinâmica:
- **Rota:** `/apresentacao-viewer/petshop` (protegida) e `/share/petshop` (pública).
- **Layout:** `PresentationLayout` (shell isolada do CRM).
- **Componente Base:** `PetShopPresentation` (em `src/components/commercial/petshop/petshop-presentation.tsx`).
- **Navegação:** Snap-scroll vertical nativo com `h-screen overflow-y-auto` e um `IntersectionObserver` para controle de progresso lateral.
- **Dinamismo:** Utiliza `PresentationProvider` para injetar `{{empresa}}` e `{{cidade}}` via `DynamicText`.

## 3. Identidade visual atual
- **Estilo:** Premium / Minimalista / Tecnológico.
- **Paleta HEX:**
  - Background: `#F5F5F4` (Sand/Areia)
  - Foreground: `#1B3C58` (Azul Petróleo)
  - Primary: `#86A789` (Verde Sálvia)
  - Accent: `#C46647` (Terracota)
- **Tipografia:** Serifada nos títulos (`font-serif`), Sans-serif no corpo.
- **Características Pet:** O uso de cores "terrosas" e orgânicas tenta aproximar do nicho, mas a falta de iconografia e fotografia específica de animais torna a experiência excessivamente "corporativa" ou "software-first".

## 4. Inventário de imagens
- **Seção 01 (Hero):** Nenhuma imagem real; apenas gradientes e formas abstratas.
- **Seção 02 (Oportunidade):** Ícones genéricos (Heart, Shield, etc.).
- **Seção 04 (Estrutura):** Ícones funcionais.
- **Seção 05 (Demo):** Link para a demo (que possui imagens).
- **Seção 06 (Mobile):** Iframe do Google Maps.
- **Veredito:** A apresentação carece drasticamente de imagens de pets (cães, gatos, banho e tosa) para gerar conexão emocional imediata.

## 5. Pontos fortes atuais
- **Estrutura Narrativa:** A sequência de "Problema -> Solução -> Estrutura -> Demo" é comercialmente sólida.
- **Dinamismo:** A personalização da empresa e cidade funciona perfeitamente.
- **Navegação:** O indicador lateral e o snap-scroll proporcionam uma experiência fluida.
- **Isolamento:** A arquitetura permite alterar o visual sem afetar a lógica do CRM.

## 6. Pontos que precisam evoluir
- **Conexão Visual Pet:** Substituir formas abstratas por fotografias de alta qualidade de pets.
- **Contraste e Leitura:** A paleta atual (Sálvia/Areia) pode ter baixo contraste em ambientes com muita luz (comum em reuniões presenciais).
- **Iconografia:** Trocar ícones genéricos do Lucide por versões mais "pet-friendly" ou ilustrações personalizadas.
- **Seção Mobile:** O mockup de celular é muito técnico; poderia mostrar o site real do pet shop renderizado.

## 7. Comparação com a referência visual
A referência sugere uma linguagem mais "editorial" e "viva" (Teal/Coral).
- **Compatível:** O uso de grandes espaços em branco e tipografia elegante.
- **Oportunidade:** Integrar formas orgânicas (curvas que lembram patas ou movimento animal) e fotos "hero" de animais felizes.

## 8. Comparação com /demo/petshop
Existe uma lacuna visual:
- A apresentação (`/apresentacao-viewer`) é sóbria e corporativa.
- A demonstração (`/demo/petshop`) é quente, colorida e cheia de fotos de animais.
**Recomendação:** A nova identidade da apresentação deve ser o "trailer" visual da demonstração.

## 9. Paleta recomendada
- **Background:** `#FDFCFB` (Off-white quente)
- **Superfície:** `#FFFFFF` (Branco puro)
- **Primary (Pet Shop):** `#0D9488` (Teal/Verde Petróleo profundo)
- **Secondary (Ação):** `#F97316` (Laranja/Coral vibrante para CTAs)
- **Text:** `#1F2937` (Grafite para leitura confortável)

## 10. Direção fotográfica recomendada
- **Hero:** Cão e Gato juntos, olhando para a câmera com "expressão feliz".
- **Valor/Cuidado:** Foto em close de mãos cuidando de um pet (conexão humana).
- **Serviços:** Fotos de banho/tosa com espuma (transmite limpeza e cuidado).
- **Mobile:** Mockup contextualizado com um pet ao lado do celular.

## 11. Direção de layout recomendada
Seguir uma linha **Premium Orgânica**:
- Bordas muito arredondadas (`rounded-3xl` ou superior).
- Uso de máscaras em formato de "mancha" ou "pata" para fotos.
- Microinterações que simulem "atenção" (como o balançar de uma cauda ou o piscar de ícones).

## 12. Impacto comercial esperado
- **Aumento da Taxa de Conversão:** Maior identificação imediata do dono de pet shop com o produto.
- **Percepção de Especialização:** A Valtro deixa de ser "uma empresa de software" e passa a ser "especialista no meu nicho".

## 13. Riscos de alteração
- **Performance:** O excesso de imagens de alta resolução pode tornar o scroll pesado se não houver lazy-loading e otimização.
- **Legibilidade:** Garantir que o texto dinâmico (nome da empresa) continue legível sobre fundos fotográficos.

## 14. Arquivos que deverão ser alterados na próxima etapa
- `src/styles/themes/petshop.css` (Cores)
- `src/components/commercial/petshop/petshop-presentation.tsx` (Estrutura e Assets)
- `src/layouts/presentation-layout.tsx` (Se necessário para grids de background)

## 15. Veredito
**EVOLUIR.** A base técnica é excelente, mas o "vestuário" visual precisa sair do genérico-premium para o nicho-específico-emocional.

---
*Relatório gerado em conformidade com AC-001.9.*
