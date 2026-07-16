import { useEffect, useState } from "react";
import { Instagram, Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const NAV = [
  { label: "Soluções", href: "#solucoes" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-background/85 border-b border-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <a href="#top" className="flex items-center shrink-0" aria-label="Valtro Labs">
          <Logo />
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://instagram.com/valtro.labs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Valtro Labs"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://pricing.valtrolabs.pro"
            className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Conheça o Valtro Pricing
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground"
          aria-label="Abrir menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="container-page py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <a
                href="https://pricing.valtrolabs.pro"
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium"
              >
                Conheça o Valtro Pricing
              </a>
              <a
                href="https://instagram.com/valtro.labs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
