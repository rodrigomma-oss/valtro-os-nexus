import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, MapPin, MessageCircle, Scissors, Star } from "lucide-react";

const ORBIT = [
  { icon: MapPin, label: "Localização", pos: "left-0 top-8" },
  { icon: Scissors, label: "Banho e tosa", pos: "right-0 top-0" },
  { icon: Star, label: "Avaliações", pos: "left-6 bottom-6" },
  { icon: MessageCircle, label: "WhatsApp", pos: "right-4 bottom-12" },
] as const;

/**
 * Abertura da apresentação. Reage ao scroll com parallax discreto
 * (desativado quando o usuário prefere menos movimento).
 */
export function PetshopHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, reduce ? 1 : 0]);

  return (
    <section
      ref={ref}
      id="inicio"
      data-presentation-section="inicio"
      aria-labelledby="petshop-hero-title"
      className="relative min-h-[92vh] overflow-hidden pt-32 pb-20 md:pt-40"
    >
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
      <div
        className="absolute inset-0 bg-grid-subtle opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] pointer-events-none"
        aria-hidden
      />

      <motion.div style={{ y, scale, opacity }} className="container-page relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.65, 0.25, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-primary shadow-soft"
            >
              Apresentação comercial · Segmento Pet Shop
            </motion.div>

            <motion.h1
              id="petshop-hero-title"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.2, 0.65, 0.25, 1] }}
              className="mt-8 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
            >
              Seu Pet Shop merece uma{" "}
              <span className="text-primary">presença digital à altura do seu negócio</span>.
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.2, 0.65, 0.25, 1] }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              A Valtro Labs cria experiências digitais profissionais para negócios locais —
              organizando informações, facilitando o contato e transmitindo credibilidade para
              quem encontra a sua empresa na internet.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.2, 0.65, 0.25, 1] }}
              className="mt-10"
            >
              <a
                href="#descoberta"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:bg-primary-hover hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Começar apresentação
                <ArrowDown
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5"
                  aria-hidden
                />
              </a>
            </motion.div>
          </div>

          <div className="relative mx-auto w-full max-w-md" aria-hidden>
            <div className="relative aspect-square">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.65, 0.25, 1] }}
                className="absolute inset-[18%] rounded-3xl border border-border bg-surface shadow-elevated"
              >
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    seupetshop.com.br
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    Um endereço só seu
                  </span>
                  <div className="mt-3 h-1.5 w-24 rounded-full bg-primary/20">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                </div>
              </motion.div>

              {ORBIT.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.4 + i * 0.1,
                    ease: [0.2, 0.65, 0.25, 1],
                  }}
                  className={`absolute ${item.pos} flex items-center gap-2 rounded-xl border border-border bg-surface/90 px-3 py-2 text-xs font-medium text-foreground shadow-soft backdrop-blur`}
                >
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  {item.label}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
