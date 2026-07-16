import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { Hero } from "@/components/marketing/hero";
import { About } from "@/components/marketing/about";
import { Solutions } from "@/components/marketing/solutions";
import { Values } from "@/components/marketing/values";
import { InstitutionalBanner } from "@/components/marketing/institutional-banner";
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
          logo: "https://valtrolabs.pro/favicon.ico",
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
    <PublicLayout>
      <Hero />
      <About />
      <Solutions />
      <Values />
      <InstitutionalBanner />
      <CTA />
    </PublicLayout>
  );
}
