import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { ArrowRight, Sparkles, Layout, Globe, Smartphone, Palette } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/portfolio/petshop/motion";

const TITLE = "Portfólio | Valtro Labs";
const DESCRIPTION = "Explore o portfólio de soluções digitais e apresentações comerciais da Valtro Labs.";

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
      <div className="container-page pt-32 pb-24 md:pt-40 md:pb-32 min-h-[80vh]">
        <Reveal>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance">
              Nosso <span className="text-primary">Portfólio</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Explore como ajudamos empresas a construir uma presença digital sólida, 
              profissional e focada em resultados.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Reveal delay={100}>
            <Link
              to="/portfolio/petshop"
              className="group relative flex flex-col h-full rounded-2xl border border-border bg-surface/50 p-8 transition-all hover:border-primary/50 hover:shadow-glow overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="h-24 w-24 text-primary" />
              </div>
              
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layout className="h-6 w-6" />
                </div>
                
                <h2 className="text-2xl font-semibold text-foreground">Apresentação Pet Shop</h2>
                <p className="text-muted-foreground">
                  Uma jornada imersiva que demonstra como transformamos a fragmentação digital de um Pet Shop 
                  em uma central de autoridade profissional.
                </p>
                
                <ul className="flex flex-wrap gap-2 pt-2">
                  {['Storytelling', 'Mobile First', 'Framer Motion', 'Conversion Focus'].map(tag => (
                    <li key={tag} className="px-2 py-1 rounded-md bg-accent text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {tag}
                    </li>
                  ))}
                </ul>

                <div className="pt-4 flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                  Ver Apresentação <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={200}>
            <div className="group relative flex flex-col h-full rounded-2xl border border-border bg-surface/20 p-8 opacity-60 grayscale cursor-not-allowed">
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Globe className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Em breve</h2>
                <p className="text-muted-foreground">
                  Novos cases de sucesso e apresentações interativas estão sendo preparados para nosso ecossistema.
                </p>
                <div className="flex gap-4 opacity-50">
                  <Smartphone className="h-5 w-5" />
                  <Palette className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </PublicLayout>
  );
}
