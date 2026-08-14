import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Clock, MapPin, MessageCircle, Menu, Scissors } from "lucide-react";
import { PresentationSection, Reveal } from "./motion";

const SCREEN_ROWS = [
  { icon: Scissors, label: "Banho e tosa" },
  { icon: Clock, label: "Seg a Sáb · 08h às 18h" },
  { icon: MapPin, label: "Como chegar" },
] as const;

/** Seção 07 — mockup de celular que entra na tela durante o scroll. */
export function MobileExperienceSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 80, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -6, 0]);

  return (
    <PresentationSection
      id="mobile"
      index="07"
      eyebrow="Experiência no celular"
      className="bg-secondary/40"
    >
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Uma experiência pensada para o <span className="text-primary">celular</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
              A maior parte das pessoas vai acessar pelo telefone, muitas vezes na rua ou já com o
              pet no colo. Por isso a experiência começa pelo mobile: leitura fácil, botões grandes
              e o contato sempre à mão.
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              {[
                "Menu simples e direto",
                "Informações essenciais no primeiro toque",
                "Serviços em blocos fáceis de percorrer",
                "Botão de WhatsApp sempre visível",
                "Localização com um toque para abrir o mapa",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div ref={ref} className="flex justify-center" aria-hidden>
          <motion.div
            style={{ y, rotate }}
            className="w-[260px] rounded-[2rem] border border-border bg-surface p-3 shadow-elevated"
          >
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-xs font-semibold text-foreground">Seu Pet Shop</span>
                <Menu className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-lg bg-accent px-3 py-6 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Cuidado completo para o seu pet
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Estrutura conceitual de demonstração
                  </p>
                </div>
                {SCREEN_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-[11px] font-medium text-foreground"
                  >
                    <row.icon className="h-3.5 w-3.5 text-primary" />
                    {row.label}
                  </div>
                ))}
                <div className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-[11px] font-semibold text-primary-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Falar no WhatsApp
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PresentationSection>
  );
}
