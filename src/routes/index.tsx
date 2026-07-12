import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { About } from "@/components/about";
import { Solutions } from "@/components/solutions";
import { Values } from "@/components/values";
import { InstitutionalBanner } from "@/components/institutional-banner";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";

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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <About />
        <Solutions />
        <Values />
        <InstitutionalBanner />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
