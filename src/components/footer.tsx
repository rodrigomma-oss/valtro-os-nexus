import { Instagram } from "lucide-react";
import { Logo } from "./logo";

const FUTURE_LINKS = ["Política de Privacidade", "Termos de Uso", "Contato"];

export function Footer() {
  return (
    <footer id="contato" className="border-t border-border bg-surface">
      <div className="container-page py-16 md:py-20">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-5 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Desenvolvemos soluções inteligentes para simplificar decisões,
              automatizar processos e impulsionar negócios digitais.
            </p>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Produtos
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="https://pricing.valtrolabs.pro"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Valtro Pricing
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                Valtro Ads
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  Em breve
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                Valtro Analytics
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  Em breve
                </span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Institucional
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {FUTURE_LINKS.map((l) => (
                <li key={l} className="flex items-center gap-2 text-muted-foreground">
                  {l}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    Em breve
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Redes
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="https://instagram.com/valtro.labs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 Valtro Labs. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Feito com foco em clareza, simplicidade e evolução contínua.
          </p>
        </div>
      </div>
    </footer>
  );
}
