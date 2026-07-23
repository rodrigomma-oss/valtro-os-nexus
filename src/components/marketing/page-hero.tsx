import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeroBreadcrumbItem {
  label: string;
  /** Rota interna (TanStack). Se ausente, item é renderizado como texto (página atual). */
  to?: string;
}

export interface PageHeroCTA {
  label: string;
  /** Link externo (http/https) OU rota interna. */
  href: string;
  variant?: "primary" | "secondary";
}

export interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: PageHeroBreadcrumbItem[];
  cta?: PageHeroCTA;
  secondaryCta?: PageHeroCTA;
  align?: "left" | "center";
  className?: string;
  /** Slot visual opcional exibido à direita do conteúdo (desktop). */
  visual?: ReactNode;
}

/**
 * Hero reutilizável para páginas internas (Sobre, Soluções, Contato, Políticas, etc.).
 * Preserva o Design System institucional (paleta, tipografia, espaçamentos).
 *
 * Uso:
 * ```tsx
 * <PageHero
 *   eyebrow="Sobre"
 *   title="Tecnologia com propósito"
 *   subtitle="Simplificamos negócios digitais..."
 *   breadcrumb={[{ label: "Home", to: "/" }, { label: "Sobre" }]}
 *   cta={{ label: "Conheça o Valtro Pricing", href: "https://pricing.valtrolabs.pro" }}
 * />
 * ```
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  cta,
  secondaryCta,
  align = "left",
  className,
  visual,
}: PageHeroProps) {
  const hasVisual = Boolean(visual) && align !== "center";
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border bg-gradient-to-b from-accent/40 via-background to-background",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/12),transparent_60%)]"
      />
      <div className="container-page relative pt-32 md:pt-36 pb-14 md:pb-20">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="Trilha de navegação"
            className={cn("mb-4", align === "center" && "flex justify-center")}
          >
            <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {breadcrumb.map((item, idx) => {
                const isLast = idx === breadcrumb.length - 1;
                return (
                  <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
                    {item.to && !isLast ? (
                      <Link
                        to={item.to}
                        className="hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(isLast && "text-foreground")}
                        aria-current={isLast ? "page" : undefined}
                      >
                        {item.label}
                      </span>
                    )}
                    {!isLast && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div
          className={cn(
            hasVisual
              ? "grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center"
              : "",
          )}
        >
          <div
            className={cn(
              "max-w-3xl",
              align === "center" && "mx-auto text-center",
            )}
          >
            {eyebrow && (
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-3 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
                {subtitle}
              </p>
            )}

            {(cta || secondaryCta) && (
              <div
                className={cn(
                  "mt-8 flex flex-wrap items-center gap-3",
                  align === "center" && "justify-center",
                )}
              >
                {cta && <PageHeroButton {...cta} />}
                {secondaryCta && <PageHeroButton {...secondaryCta} variant={secondaryCta.variant ?? "secondary"} />}
              </div>
            )}
          </div>

          {hasVisual && (
            <div className="hidden lg:block" aria-hidden>
              {visual}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PageHeroButton({ label, href, variant = "primary" }: PageHeroCTA) {
  const isInternal = href.startsWith("/");
  const className = cn(
    "inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft"
      : "border border-border text-foreground hover:bg-accent",
  );
  if (isInternal) {
    return (
      <Link to={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className={className} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
      {label}
    </a>
  );
}
