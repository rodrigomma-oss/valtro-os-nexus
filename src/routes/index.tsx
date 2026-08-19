import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { Hero } from "@/components/marketing/hero";
import { About } from "@/components/marketing/about";
import { Solutions } from "@/components/marketing/solutions";
import { Values } from "@/components/marketing/values";
import { CTA } from "@/components/marketing/cta";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Valtro Labs",
          url: "https://valtrolabs.pro",
          logo: "https://valtrolabs.pro/favicon.png",
          sameAs: ["https://instagram.com/valtro.labs"],
          description:
            "Valtro Labs desenvolve soluções SaaS proprietárias para simplificar decisões, automatizar processos e impulsionar negócios digitais.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Valtro Labs",
          url: "https://valtrolabs.pro",
        }),
      },
    ],
  }),
});

function Home() {
  return (
    <div className="p-8 max-w-4xl mx-auto font-sans leading-relaxed text-foreground space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">
        AC-001.9 — AUDITORIA VISUAL E ESTRUTURAL DA APRESENTAÇÃO COMERCIAL PET SHOP
      </h1>

      <div className="bg-muted p-6 rounded-2xl space-y-4">
        <p className="font-medium">
          Antes de realizar qualquer alteração, faça uma auditoria completa da apresentação comercial Pet Shop atualmente disponível em:
        </p>
        <code className="block bg-background p-3 rounded-lg border">/apresentacao-viewer/petshop</code>
        <p className="text-sm text-muted-foreground italic">Não altere nenhum código nesta etapa.</p>
        <p>
          O objetivo é produzir um diagnóstico técnico e visual que servirá de base para uma futura reformulação estética da apresentação.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">1. AUDITORIA DA ESTRUTURA</h2>
        <p>Identifique e descreva:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>quantidade de seções;</li>
          <li>ordem das seções;</li>
          <li>função comercial de cada seção;</li>
          <li>componente responsável por cada seção;</li>
          <li>estrutura de navegação;</li>
          <li>indicador lateral de progresso;</li>
          <li>sistema de scroll/snap;</li>
          <li>componentes compartilhados;</li>
          <li>tema/estilos específicos do Pet Shop;</li>
          <li>fontes utilizadas;</li>
          <li>sistema de espaçamento;</li>
          <li>backgrounds;</li>
          <li>cards;</li>
          <li>ícones;</li>
          <li>elementos gráficos;</li>
          <li>animações e microinterações.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">2. AUDITORIA DA IDENTIDADE VISUAL ATUAL</h2>
        <p>Levante exatamente:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>cores principais em HEX;</li>
          <li>cores secundárias;</li>
          <li>cor de fundo;</li>
          <li>cor de texto;</li>
          <li>cor de destaque/CTA;</li>
          <li>tipografia;</li>
          <li>pesos tipográficos;</li>
          <li>bordas;</li>
          <li>sombras;</li>
          <li>radius;</li>
          <li>tratamentos de imagens;</li>
          <li>estilo geral percebido.</li>
        </ul>
        <p className="bg-accent/10 p-4 rounded-xl">
          Classifique a identidade atual em termos de: <strong>Premium / Institucional / Editorial / Orgânico / Pet / Tecnológico / Minimalista</strong> e explique quais características fazem a apresentação parecer ou não especificamente voltada para Pet Shop.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">3. AUDITORIA DE IMAGENS E ELEMENTOS VISUAIS</h2>
        <p>Liste todas as imagens atualmente utilizadas na apresentação. Para cada seção, informe:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>se existe imagem;</li>
          <li>quantidade de imagens;</li>
          <li>tipo de imagem;</li>
          <li>origem;</li>
          <li>posição;</li>
          <li>importância visual;</li>
          <li>se transmite claramente o universo Pet Shop;</li>
          <li>se poderia ser substituída por uma imagem mais aderente ao nicho.</li>
        </ul>
        <p>Avalie especificamente se a apresentação atual possui quantidade suficiente de imagens relacionadas a pets.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">4. REFERÊNCIA VISUAL PARA FUTURA EVOLUÇÃO</h2>
        <p>A equipe comercial deseja aproximar visualmente a apresentação da linguagem contemporânea de sites premium de Pet Shop. A referência visual enviada apresenta características como:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>verde/azul-petróleo ou teal;</li>
          <li>coral/laranja suave;</li>
          <li>fundos claros;</li>
          <li>elementos orgânicos;</li>
          <li>fotografias grandes de cães e gatos;</li>
          <li>composição mais rica visualmente;</li>
          <li>cards com produtos/serviços;</li>
          <li>sensação amigável, moderna e especializada em pets.</li>
        </ul>
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
          <p className="font-bold text-yellow-700">Importante: não copiar o layout da referência.</p>
          <p className="text-sm">Queremos apenas identificar quais princípios visuais poderiam ser incorporados à apresentação atual sem destruir sua narrativa comercial.</p>
        </div>
        <p>Avalie quais elementos combinam com a Valtro, quais aumentam a percepção de valor e o que deve ser evitado.</p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">5. IMPACTO COMERCIAL</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-bold">A. Dono de Pet Shop</h3>
            <p className="text-sm text-muted-foreground">Parece específico? Transmite confiança e carinho? Justifica a contratação?</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">B. Vendedor</h3>
            <p className="text-sm text-muted-foreground">Fácil de conduzir? Pontos de pausa claros? Risco de o design atrapalhar?</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">C. Diretor Comercial</h3>
            <p className="text-sm text-muted-foreground">Posicionamento? Coerência com /demo/petshop e estratégia do nicho?</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">6. COMPARAÇÃO COM O SITE DEMONSTRATIVO</h2>
        <p>Compare <code>/apresentacao-viewer/petshop</code> com <code>/demo/petshop</code>.</p>
        <p>Avalie se existe coerência suficiente entre Apresentação → Demonstração e identifique oportunidades para que a nova identidade prepare melhor o prospect.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">7. RECOMENDAÇÃO DE DIREÇÃO</h2>
        <p>Sem implementar nada, proponha uma direção visual (Paleta sugerida, Fotografia e Direção estética).</p>
      </section>

      <section className="space-y-4 bg-muted p-6 rounded-2xl border-l-4 border-primary">
        <h2 className="text-xl font-bold">8. REGRAS DE PRESERVAÇÃO</h2>
        <p className="text-sm">A futura alteração não poderá remover ou prejudicar: narrativa comercial, personalização dinâmica, indicador de progresso, scroll/snap, transição para demo, responsividade, segurança e modos vendedor/público.</p>
      </section>

      <div className="pt-12 border-t text-center space-y-4">
        <p className="font-bold text-xl">NÃO REALIZAR NENHUMA ALTERAÇÃO DE CÓDIGO.</p>
        <p className="text-muted-foreground italic">Esta é exclusivamente uma etapa de auditoria e recomendação.</p>
      </div>
    </div>
  );
}
