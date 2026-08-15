import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { CommercialHero } from "@/components/portfolio/commercial/hero";
import { DiscoverySection } from "@/components/portfolio/commercial/discovery-section";
import { ProblemSection } from "@/components/portfolio/commercial/problem-section";
import { SolutionSection } from "@/components/portfolio/commercial/solution-section";
import { PerceptionSection } from "@/components/portfolio/commercial/perception-section";
import { FeaturesSection } from "@/components/portfolio/commercial/features-section";
import { ProcessSection } from "@/components/portfolio/commercial/process-section";
import { ContactSection } from "@/components/portfolio/commercial/contact-section";
import { PresentationNav } from "@/components/portfolio/commercial/presentation-nav";

const TITLE = "Apresentação Comercial | Valtro Labs";
const DESCRIPTION = "Seu negócio merece uma presença digital à altura. Criamos sites profissionais que apresentam sua empresa e facilitam o contato.";

const STEPS = [
  { id: "hero", label: "Início" },
  { id: "discovery", label: "Presença" },
  { id: "problem", label: "O Problema" },
  { id: "solution", label: "A Solução" },
  { id: "perception", label: "Valor" },
  { id: "features", label: "Recursos" },
  { id: "process", label: "Processo" },
  { id: "contact", label: "Convite" },
];

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://valtrolabs.pro/portfolio" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://valtrolabs.pro/portfolio" }],
  }),
});

function PortfolioPage() {
  return (
    <PublicLayout>
      <div className="relative bg-background text-foreground">
        <CommercialHero />
        <DiscoverySection />
        <ProblemSection />
        <SolutionSection />
        <PerceptionSection />
        <FeaturesSection />
        <ProcessSection />
        <ContactSection />
        
        <PresentationNav steps={STEPS} />
      </div>
    </PublicLayout>
  );
}
