import { Camera } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared/logo";

const LEGAL_LINKS = [
  { label: "Política de Privacidade", to: "/privacidade" },
  { label: "Termos de Uso", to: "/termos" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer id="contato" className="border-t border-border bg-surface" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Rodapé Valtro Labs
      </h2>
      <div className="container-page py-16 md:py-20">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Desenvolvemos soluções inteligentes para simplificar decisões,
              automatizar processos e impulsionar negócios digitais de vendedores em marketplaces.
            </p>
          </div>

          <nav aria-label="Produtos" className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Produtos
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href="https://pricing.valtrolabs.pro"
                  className="text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Valtro Pricing
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                Valtro Ads
                <span className="rounded-full bg-brand-soft text-primary px-2 py-0.5 text-[10px] font-medium">
                  Em breve
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                Valtro Analytics
                <span className="rounded-full bg-brand-soft text-primary px-2 py-0.5 text-[10px] font-medium">
                  Em breve
                </span>
              </li>
            </ul>
          </nav>

          <nav aria-label="Institucional" className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Institucional
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href="/contato"
                  className="text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Contato
                </a>
              </li>
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Redes sociais" className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Redes
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href="https://instagram.com/valtro.labs"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram Valtro Labs (abre em nova aba)"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <Instagram className="h-4 w-4" aria-hidden />
                  Instagram
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {CURRENT_YEAR} Valtro Labs. Todos os direitos reservados.
          </p>
          <nav aria-label="Legal" className="flex items-center gap-4 text-xs text-muted-foreground">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
