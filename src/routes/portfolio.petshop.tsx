import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { PetshopHero } from "@/components/portfolio/petshop/hero";
import { DiscoverySection } from "@/components/portfolio/petshop/discovery-section";
import { QuestionsSection } from "@/components/portfolio/petshop/questions-section";
import { ProblemSection } from "@/components/portfolio/petshop/problem-section";
import { SolutionSection } from "@/components/portfolio/petshop/solution-section";
import { FeaturesSection } from "@/components/portfolio/petshop/features-section";
import { MobileExperienceSection } from "@/components/portfolio/petshop/mobile-experience-section";
import { PersonalizationSection } from "@/components/portfolio/petshop/personalization-section";
import { DemoTransitionSection } from "@/components/portfolio/petshop/demo-transition-section";
import { ProcessSection } from "@/components/portfolio/petshop/process-section";
import { FinalCtaSection } from "@/components/portfolio/petshop/final-cta-section";
import {
  PresentationNav,
  type NavStep,
} from "@/components/portfolio/petshop/presentation-nav";

const TITLE = "Presença digital para Pet Shops | Valtro Labs";
const DESCRIPTION =
  "Apresentação da Valtro Labs sobre como um site profissional organiza a presença digital de um Pet Shop: serviços, localização, horários e contato em um único lugar.";

export const Route = createFileRoute("/portfolio/petshop")({
  component: PetshopPresentationPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://valtrolabs.pro/portfolio/petshop" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://valtrolabs.pro/portfolio/petshop" }],
  }),
});

const STEPS: NavStep[] = [
  { id: "inicio", label: "Início" },
  { id: "descoberta", label: "Como seu cliente encontra você" },
  { id: "duvidas", label: "Quando ele quer saber mais" },
  { id: "problema", label: "Informação espalhada" },
  { id: "solucao", label: "A oportunidade" },
  { id: "estrutura", label: "O que pode existir no site" },
  { id: "mobile", label: "Experiência no celular" },
  { id: "personalizacao", label: "Personalização" },
  { id: "demonstracao", label: "Demonstração" },
  { id: "processo", label: "Como funciona o projeto" },
  { id: "conversa", label: "Vamos conversar" },
];

function PetshopPresentationPage() {
  return (
    <PublicLayout>
      <div className="overflow-x-hidden pb-20">
        <PetshopHero />
        <DiscoverySection />
        <QuestionsSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <MobileExperienceSection />
        <PersonalizationSection />
        <DemoTransitionSection />
        <ProcessSection />
        <FinalCtaSection />
      </div>
      <PresentationNav steps={STEPS} />
    </PublicLayout>
  );
}
