import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Handshake,
  LineChart,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeader } from "@/components/shared/section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskPhoneInput } from "@/lib/formatters";

export const Route = createFileRoute("/contato")({
  component: ContatoPage,
  head: () => ({
    meta: [
      { title: "Contato | Valtro Labs" },
      {
        name: "description",
        content:
          "Entre em contato com a Valtro Labs para desenvolvimento de software, consultoria, análise de lojas e soluções para negócios digitais.",
      },
      { property: "og:title", content: "Contato | Valtro Labs" },
      {
        property: "og:description",
        content:
          "Fale com a Valtro Labs — desenvolvimento, consultoria, análise de lojas e produtos para negócios digitais.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://valtrolabs.pro/contato" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Contato | Valtro Labs" },
      {
        name: "twitter:description",
        content:
          "Fale com a Valtro Labs — desenvolvimento, consultoria, análise de lojas e produtos para negócios digitais.",
      },
    ],
    links: [{ rel: "canonical", href: "https://valtrolabs.pro/contato" }],
  }),
});

type InterestValue =
  | "desenvolvimento"
  | "analise_loja"
  | "valtro_pricing"
  | "parceria"
  | "outro";

interface HelpOption {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
}

const HELP_OPTIONS: HelpOption[] = [
  {
    icon: Building2,
    title: "Desenvolvimento de Sistemas",
    description: "Projetos sob medida para empresas, operações e negócios digitais.",
    ctaLabel: "Solicitar briefing",
    href: "#formulario",
  },
  {
    icon: LineChart,
    title: "Análise de Loja",
    description:
      "Diagnóstico completo com oportunidades de melhoria para marketplaces.",
    ctaLabel: "Solicitar análise",
    href: "/diagnostico",
  },
  {
    icon: Tag,
    title: "Valtro Pricing",
    description: "Conheça nossa plataforma de precificação inteligente.",
    ctaLabel: "Conhecer produto",
    href: "https://pricing.valtrolabs.pro",
    external: true,
  },
  {
    icon: Handshake,
    title: "Parcerias",
    description:
      "Empresas, agências e profissionais que desejam construir soluções em conjunto.",
    ctaLabel: "Entrar em contato",
    href: "#formulario",
  },
];

const FLOW_STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Contato", icon: MessageSquare },
  { label: "Entendimento", icon: Sparkles },
  { label: "Briefing", icon: ClipboardList },
  { label: "Proposta", icon: Mail },
  { label: "Execução", icon: ArrowRight },
];

const INTERESTS: { value: InterestValue; label: string }[] = [
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "analise_loja", label: "Análise de Loja" },
  { value: "valtro_pricing", label: "Valtro Pricing" },
  { value: "parceria", label: "Parceria" },
  { value: "outro", label: "Outro" },
];

const NEXT_STEPS = [
  "Recebemos sua solicitação.",
  "Analisamos a necessidade.",
  "Entramos em contato.",
  "Quando necessário, enviamos um briefing personalizado.",
  "Elaboramos a proposta.",
];

function ContatoPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Contato"
        title={
          <>
            Vamos conversar sobre o seu{" "}
            <span className="text-primary">próximo projeto</span>.
          </>
        }
        subtitle="Seja para desenvolver uma solução, otimizar um negócio digital ou conhecer nossos produtos, estamos prontos para entender sua necessidade e indicar o melhor caminho."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Contato" }]}
        cta={{ label: "Iniciar um briefing", href: "#formulario" }}
        secondaryCta={{
          label: "Conhecer o Valtro Pricing",
          href: "https://pricing.valtrolabs.pro",
          variant: "secondary",
        }}
      />

      {/* 2. Como podemos ajudar */}
      <section aria-labelledby="ajuda-title" className="section-y">
        <div className="container-page">
          <SectionHeader
            eyebrow="Como podemos ajudar"
            title={
              <span id="ajuda-title">
                Escolha o caminho que faz mais sentido pra você.
              </span>
            }
            description="Cada necessidade tem uma porta de entrada. Selecione a opção mais próxima do seu momento — nós conduzimos a partir daí."
          />

          <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 not-prose">
            {HELP_OPTIONS.map((opt) => (
              <li key={opt.title} className="flex">
                <HelpCard option={opt} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Como funciona */}
      <section
        aria-labelledby="fluxo-title"
        className="section-y bg-surface border-y border-border"
      >
        <div className="container-page">
          <SectionHeader
            eyebrow="Como funciona"
            title={<span id="fluxo-title">Do primeiro contato à execução.</span>}
            description="Cada projeto começa entendendo o problema antes de propor uma solução. É esse cuidado que garante propostas coerentes e resultados sustentáveis."
          />

          <ol className="mt-16 grid gap-4 md:grid-cols-5">
            {FLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <li key={step.label} className="relative flex">
                  <div className="flex w-full flex-col items-center rounded-2xl border border-border bg-background p-6 shadow-soft text-center">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <span className="mt-4 font-mono text-[11px] text-muted-foreground">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">
                      {step.label}
                    </h3>
                  </div>
                  {!isLast && (
                    <span
                      aria-hidden
                      className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-primary shadow-soft"
                    >
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 4. Formulário Inteligente */}
      <section id="formulario" aria-labelledby="form-title" className="section-y">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Fale com a gente"
                title={
                  <span id="form-title">Conte pra gente o que você precisa.</span>
                }
                description="Preencha os campos abaixo — quanto mais claro o contexto, mais assertiva será nossa resposta."
              />

              {/* Próximos passos */}
              <div className="mt-10 rounded-2xl border border-border bg-surface p-7 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Próximos passos
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                  O que acontece após o envio
                </h3>
                <ol className="mt-5 space-y-3">
                  {NEXT_STEPS.map((step, idx) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-primary">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* 6. CTA final */}
      <section aria-labelledby="cta-final-title" className="py-20 md:py-28">
        <div className="container-page">
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-16 md:px-16 md:py-24 text-center shadow-elevated"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-deep) 0%, var(--primary-hover) 60%, var(--primary) 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage:
                  "radial-gradient(ellipse at center, black 20%, transparent 70%)",
              }}
              aria-hidden
            />
            <div className="relative max-w-3xl mx-auto">
              <h2
                id="cta-final-title"
                className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-white text-balance"
              >
                Vamos construir algo juntos?
              </h2>
              <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
                Cada projeto começa com uma boa conversa.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#formulario"
                  className="group inline-flex items-center gap-2 rounded-lg bg-white text-brand-deep px-6 py-3.5 text-sm font-semibold hover:bg-white/95 transition-all duration-200 shadow-elevated hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Solicitar um briefing
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function HelpCard({ option }: { option: HelpOption }) {
  const { icon: Icon, title, description, ctaLabel, href, external } = option;
  const isInternal = href.startsWith("/") && !external;
  const isAnchor = href.startsWith("#");

  const ctaClasses =
    "mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group/link";

  return (
    <article className="group relative flex w-full flex-col rounded-2xl border border-border bg-background p-7 shadow-soft card-hover hover:border-primary/30">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-primary transition-transform group-hover:scale-105">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {isInternal ? (
        <Link to={href} className={ctaClasses}>
          {ctaLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : (
        <a
          href={href}
          className={ctaClasses}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          {...(isAnchor ? {} : {})}
        >
          {ctaLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5"
            aria-hidden
          />
        </a>
      )}
    </article>
  );
}

function ContactForm() {
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState<InterestValue | "">("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Sprint 6: apenas UI, sem integração
    setSubmitted(true);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-background p-7 md:p-8 shadow-soft space-y-5"
      aria-labelledby="form-title"
    >
      {submitted && (
        <div
          role="status"
          className="rounded-xl border border-primary/20 bg-brand-soft px-4 py-3 text-sm text-primary"
        >
          Obrigado! Recebemos sua solicitação (simulação). Em breve integraremos ao CRM.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-sm font-medium">
            Nome
          </Label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="nome"
              name="nome"
              required
              placeholder="Seu nome"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="empresa" className="text-sm font-medium">
            Empresa <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <div className="relative">
            <Building2
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="empresa"
              name="empresa"
              placeholder="Nome da empresa"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            E-mail
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="voce@empresa.com"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-sm font-medium">
            WhatsApp
          </Label>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="whatsapp"
              name="whatsapp"
              inputMode="tel"
              required
              placeholder="(11) 90000-0000"
              value={phone}
              onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de interesse</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de interesse">
          {INTERESTS.map((opt) => {
            const active = interest === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setInterest(opt.value)}
                className={
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                  (active
                    ? "border-primary bg-brand-soft text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40")
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="interesse" value={interest} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mensagem" className="text-sm font-medium">
          Conte-nos um pouco sobre sua necessidade
        </Label>
        <Textarea
          id="mensagem"
          name="mensagem"
          required
          rows={5}
          placeholder="Contexto do projeto, desafio atual, prazo esperado…"
        />
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary-hover transition-colors shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
      >
        <Send className="h-4 w-4" aria-hidden />
        Enviar solicitação
      </button>
      <p className="text-xs text-muted-foreground">
        Ao enviar, você concorda em ser contatado pela Valtro Labs sobre esta solicitação.
      </p>
    </form>
  );
}
