/**
 * Portal Público do Valtro Briefing Engine (VBE) — Sprint 2B.3.3
 *
 * Rota anônima: `/briefing/$token`. Valida o Token no servidor,
 * carrega o Template correspondente e persiste o progresso em Supabase.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Ban,
  Clock,
  AlertCircle,
  ClipboardList,
  Search,
  Handshake,
  FileText,
  Check,
  Save,
} from "lucide-react";

import { DiagnosisLayout } from "@/components/diagnosis/DiagnosisLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import {
  validateBriefingToken,
  saveBriefingProgress,
  completeBriefing,
  type PortalPayload,
  type PortalTokenState,
} from "@/lib/briefing.functions";
import {
  getTemplate,
  validateTemplateStep,
  type BriefingTemplate,
  type TemplateQuestion,
  type TemplateStep,
} from "@/config/briefing-templates";
import { SERVICE_TYPE_LABEL } from "@/types/briefing";
import type { ServiceType } from "@/types/briefing";

export const Route = createFileRoute("/briefing/$token")({
  component: BriefingPortalPage,
  head: () => ({
    meta: [
      { title: "Briefing — Valtro Labs" },
      {
        name: "description",
        content: "Portal exclusivo de briefing consultivo Valtro Labs.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Screen = "welcome" | "how" | "step" | "success";

function BriefingPortalPage() {
  const { token } = Route.useParams();
  const validateFn = useServerFn(validateBriefingToken);

  const query = useQuery<PortalPayload>({
    queryKey: ["briefing", "portal", token],
    queryFn: () => validateFn({ data: { token } }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (query.isLoading) return <PortalLoading />;
  if (query.isError || !query.data)
    return <PortalError message={(query.error as Error)?.message} />;

  const { state, response, token: t } = query.data;

  if (state !== "valido" || !t) {
    return <PortalNonValid state={state} />;
  }

  // Fonte da verdade: template e serviço fixados no token pelo operador.
  // Nenhuma resposta do cliente altera esses valores — o Portal apenas
  // renderiza o template vinculado ao `template_type` do token.
  const template = getTemplate(t.template_type, t.service_type as ServiceType);
  const briefingLabel = SERVICE_TYPE_LABEL[t.service_type as ServiceType];

  return (
    <PortalRunner
      token={token}
      template={template}
      briefingLabel={briefingLabel}
      serviceType={t.service_type as ServiceType}
      initialData={response?.data ?? {}}
      initialStep={response?.current_step ?? 0}
    />
  );
}

// ---------------------------------------------------------------------------
// Runner — Welcome → How → Steps → Success
// ---------------------------------------------------------------------------
interface PortalRunnerProps {
  token: string;
  template: BriefingTemplate;
  briefingLabel: string;
  serviceType: ServiceType;
  initialData: Record<string, any>;
  initialStep: number;
}

function PortalRunner({
  token,
  template,
  briefingLabel,
  serviceType,
  initialData,
  initialStep,
}: PortalRunnerProps) {
  const [screen, setScreen] = useState<Screen>(() => {
    // Se cliente já tem progresso, pular direto para etapas
    if (Object.keys(initialData).length > 0) return "step";
    return "welcome";
  });
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(Math.max(initialStep, 0), template.steps.length),
  );
  const [data, setData] = useState<Record<string, any>>(initialData);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const isReview = stepIndex === template.steps.length;

  const saveFn = useServerFn(saveBriefingProgress);
  const completeFn = useServerFn(completeBriefing);

  const saveMutation = useMutation({
    mutationFn: (input: {
      data: Record<string, any>;
      current_step: number;
    }) => saveFn({ data: { token, ...input } }),
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1600);
    },
    onError: (err: Error) => {
      setSaveState("idle");
      toast.error("Não foi possível salvar.", { description: err.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeFn({ data: { token, data } }),
    onSuccess: () => setScreen("success"),
    onError: (err: Error) =>
      toast.error("Não foi possível enviar o briefing.", {
        description: err.message,
      }),
  });

  // Auto Save (debounced) — dispara sempre que `data` ou `stepIndex` mudam
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      return;
    }
    if (screen !== "step" || isReview) return;
    const handle = setTimeout(() => {
      saveMutation.mutate({ data, current_step: stepIndex });
    }, 900);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, stepIndex, screen]);

  const updateField = (id: string, value: any) => {
    setData((prev) => ({ ...prev, [id]: value }));
  };

  const currentStep: TemplateStep | undefined = template.steps[stepIndex];

  const goNext = () => {
    if (!isReview && currentStep) {
      const err = validateTemplateStep(currentStep, data);
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (stepIndex < template.steps.length) {
      setStepIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else setScreen("how");
  };

  return (
    <DiagnosisLayout
      topSlot={
        screen === "step" ? (
          <PortalProgress
            template={template}
            briefingLabel={briefingLabel}
            serviceType={serviceType}
            stepIndex={stepIndex}
            isReview={isReview}
          />
        ) : null
      }
    >
      <AnimatePresence mode="wait">
        {screen === "welcome" && (
          <ScreenWrap key="welcome">
            <WelcomeScreen
              template={template}
              briefingLabel={briefingLabel}
              serviceType={serviceType}
              onStart={() => setScreen("how")}
            />
          </ScreenWrap>
        )}
        {screen === "how" && (
          <ScreenWrap key="how">
            <HowItWorksScreen
              onBack={() => setScreen("welcome")}
              onStart={() => setScreen("step")}
            />
          </ScreenWrap>
        )}
        {screen === "step" && !isReview && currentStep && (
          <ScreenWrap key={`step-${stepIndex}`}>
            <StepScreen
              step={currentStep}
              data={data}
              onChange={updateField}
              onNext={goNext}
              onPrev={goPrev}
              saveState={saveState}
              isFirst={stepIndex === 0}
            />
          </ScreenWrap>
        )}
        {screen === "step" && isReview && (
          <ScreenWrap key="review">
            <ReviewScreen
              template={template}
              data={data}
              onEdit={(i) => setStepIndex(i)}
              onSubmit={() => completeMutation.mutate()}
              submitting={completeMutation.isPending}
              onPrev={() => setStepIndex(template.steps.length - 1)}
            />
          </ScreenWrap>
        )}
        {screen === "success" && (
          <ScreenWrap key="success">
            <SuccessScreen template={template} briefingLabel={briefingLabel} />
          </ScreenWrap>
        )}
      </AnimatePresence>
    </DiagnosisLayout>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function WelcomeScreen({
  template,
  briefingLabel,
  serviceType,
  onStart,
}: {
  template: BriefingTemplate;
  briefingLabel: string;
  serviceType: ServiceType;
  onStart: () => void;
}) {
  return (
    <div className="text-center py-8" data-testid="portal-welcome">
      <PortalTemplateBadge
        briefingLabel={briefingLabel}
        serviceType={serviceType}
        templateKey={template.key}
        className="mb-4"
      />
      <div className="text-xs text-muted-foreground mb-8">
        {template.intro.eyebrow}
      </div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
        {template.intro.title}
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
        {template.intro.description}
      </p>
      <Button size="lg" onClick={onStart} className="gap-2">
        Começar briefing
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
      </Button>
      <p className="mt-6 text-xs text-muted-foreground">
        Seu progresso é salvo automaticamente. Você pode voltar quando quiser.
      </p>
    </div>
  );
}

function HowItWorksScreen({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: () => void;
}) {
  const items = [
    {
      icon: ClipboardList,
      title: "Você compartilha o essencial",
      description:
        "Perguntas objetivas sobre sua operação, objetivos e momento atual.",
    },
    {
      icon: Search,
      title: "Nossa equipe analisa",
      description:
        "Cruzamos suas respostas com padrões que vemos em operações similares.",
    },
    {
      icon: FileText,
      title: "Você recebe um retorno consultivo",
      description: "Direção clara, sem promessa vazia, sem venda agressiva.",
    },
    {
      icon: Handshake,
      title: "Decide o próximo passo",
      description:
        "Se fizer sentido, seguimos juntos. Se não, o retorno ainda é seu.",
    },
  ];
  return (
    <div className="py-8">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
        Como este briefing funciona
      </h2>
      <p className="text-muted-foreground mb-10">
        Quatro passos simples. Sem burocracia.
      </p>
      <ol className="space-y-6">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Voltar
        </Button>
        <Button onClick={onStart} className="gap-2">
          Iniciar
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}

function StepScreen({
  step,
  data,
  onChange,
  onNext,
  onPrev,
  isFirst,
  saveState,
}: {
  step: TemplateStep;
  data: Record<string, any>;
  onChange: (id: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  saveState: "idle" | "saving" | "saved";
}) {
  return (
    <div className="py-4" data-testid="portal-step">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
          {step.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </header>
      <div className="space-y-6">
        {step.questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={data[q.id]}
            onChange={(v) => onChange(q.id, v)}
          />
        ))}
      </div>
      <div className="mt-10 flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onPrev}
          className="gap-2"
          disabled={isFirst}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Voltar
        </Button>
        <div className="flex items-center gap-4">
          <SaveIndicator state={saveState} />
          <Button onClick={onNext} className="gap-2">
            Continuar
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewScreen({
  template,
  data,
  onEdit,
  onSubmit,
  submitting,
  onPrev,
}: {
  template: BriefingTemplate;
  data: Record<string, any>;
  onEdit: (stepIndex: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  onPrev: () => void;
}) {
  return (
    <div className="py-4" data-testid="portal-step">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
          Revise antes de enviar
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Confira suas respostas. Você pode editar qualquer etapa.
        </p>
      </header>
      <div className="space-y-4">
        {template.steps.map((step, i) => (
          <section
            key={step.id}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {step.title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => onEdit(i)}
              >
                Editar
              </Button>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {step.questions.map((q) => (
                <div key={q.id}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {q.label}
                  </dt>
                  <dd className="text-sm text-foreground mt-0.5 break-words">
                    {formatAnswer(q, data[q.id])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onPrev} className="gap-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Voltar
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting}
          size="lg"
          className="gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Check className="h-4 w-4" strokeWidth={1.75} />
          )}
          Enviar briefing
        </Button>
      </div>
    </div>
  );
}

function SuccessScreen({
  template,
  briefingLabel,
}: {
  template: BriefingTemplate;
  briefingLabel: string;
}) {
  void template;
  return (
    <div className="text-center py-16" data-testid="portal-success">
      <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} />
      </div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
        Briefing enviado.
      </h1>
      <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
        Recebemos suas respostas e nossa equipe entrará em contato em até dois
        dias úteis com o retorno consultivo do seu briefing de {briefingLabel}.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question rendering
// ---------------------------------------------------------------------------
function QuestionField({
  question,
  value,
  onChange,
}: {
  question: TemplateQuestion;
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">
        {question.label}
        {!question.optional && (
          <span className="text-primary ml-1" aria-hidden>
            *
          </span>
        )}
      </Label>
      {question.hint && (
        <p className="text-xs text-muted-foreground mb-2">{question.hint}</p>
      )}
      {question.kind === "text" && (
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
        />
      )}
      {question.kind === "textarea" && (
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
        />
      )}
      {question.kind === "select" && (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {question.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {question.kind === "multiselect" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {question.options?.map((o) => {
            const arr: string[] = Array.isArray(value) ? value : [];
            const checked = arr.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) onChange([...arr, o.value]);
                    else onChange(arr.filter((v) => v !== o.value));
                  }}
                />
                <span className="text-sm text-foreground">{o.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatAnswer(q: TemplateQuestion, value: any): string {
  if (value === undefined || value === null || value === "") return "—";
  if (q.kind === "multiselect") {
    const arr: string[] = Array.isArray(value) ? value : [];
    if (arr.length === 0) return "—";
    return arr
      .map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  if (q.kind === "select") {
    return q.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Support UI
// ---------------------------------------------------------------------------
function PortalProgress({
  template,
  briefingLabel,
  serviceType,
  stepIndex,
  isReview,
}: {
  template: BriefingTemplate;
  briefingLabel: string;
  serviceType: ServiceType;
  stepIndex: number;
  isReview: boolean;
}) {
  const total = template.steps.length + 1; // + review
  const current = isReview ? total : stepIndex + 1;
  const pct = Math.round((current / total) * 100);
  const label = isReview ? "Revisão" : template.steps[stepIndex]?.label ?? "";

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 pb-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        <PortalTemplateBadge
          briefingLabel={briefingLabel}
          serviceType={serviceType}
          templateKey={template.key}
          compact
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span className="font-medium tracking-wide">
          Etapa {current} de {total} · {label}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function PortalTemplateBadge({
  briefingLabel,
  serviceType,
  templateKey,
  compact = false,
  className,
}: {
  briefingLabel: string;
  serviceType: ServiceType;
  templateKey: BriefingTemplate["key"];
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={
        compact
          ? `inline-flex items-center gap-1.5 font-semibold text-primary ${className ?? ""}`
          : `inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary ${className ?? ""}`
      }
      data-testid="portal-template-badge"
      data-service-type={serviceType}
      data-template-key={templateKey}
    >
      <Sparkles className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={compact ? 2 : 1.75} />
      Briefing · {briefingLabel}
    </span>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {state === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
          Salvando...
        </>
      ) : (
        <>
          <Save className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} />
          Salvo
        </>
      )}
    </span>
  );
}

function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Fallback states
// ---------------------------------------------------------------------------
function PortalLoading() {
  return (
    <DiagnosisLayout>
      <div
        className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground"
        data-testid="portal-validating"
      >
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
        <span className="text-sm">Validando seu acesso...</span>
      </div>
    </DiagnosisLayout>
  );
}

function PortalError({ message }: { message?: string }) {
  return (
    <DiagnosisLayout>
      <StateMessage
        icon={AlertCircle}
        tone="destructive"
        testId="portal-error-invalid"
        title="Não foi possível carregar o briefing"
        description={
          message ??
          "Ocorreu um erro ao validar o link. Tente novamente em instantes."
        }
      />
    </DiagnosisLayout>
  );
}

function PortalNonValid({ state }: { state: PortalTokenState }) {
  const config: Record<
    PortalTokenState,
    {
      icon: typeof Ban;
      tone: "muted" | "destructive" | "warning" | "success";
      title: string;
      description: string;
    }
  > = {
    valido: {
      icon: Sparkles,
      tone: "success",
      title: "Tudo certo",
      description: "Recarregue a página para continuar.",
    },
    expirado: {
      icon: Clock,
      tone: "warning",
      title: "Este link expirou",
      description:
        "Fale com seu contato na Valtro Labs para receber um novo link de briefing.",
    },
    revogado: {
      icon: Ban,
      tone: "muted",
      title: "Este acesso foi desativado",
      description:
        "O link não está mais disponível. Entre em contato conosco para reabrir o briefing.",
    },
    concluido: {
      icon: CheckCircle2,
      tone: "success",
      title: "Briefing já concluído",
      description:
        "Recebemos suas respostas e nossa equipe entrará em contato com o retorno consultivo.",
    },
    invalido: {
      icon: AlertCircle,
      tone: "destructive",
      title: "Link inválido",
      description:
        "Verifique se o link foi copiado corretamente ou fale com seu contato na Valtro Labs.",
    },
  };
  const c = config[state];
  const testIdByState: Record<PortalTokenState, string> = {
    valido: "portal-error-invalid",
    expirado: "portal-error-expired",
    revogado: "portal-error-revoked",
    concluido: "portal-error-completed",
    invalido: "portal-error-invalid",
  };
  return (
    <DiagnosisLayout>
      <StateMessage
        icon={c.icon}
        tone={c.tone}
        testId={testIdByState[state]}
        title={c.title}
        description={c.description}
      />
    </DiagnosisLayout>
  );
}

function StateMessage({
  icon: Icon,
  tone,
  title,
  description,
  testId,
}: {
  icon: typeof Ban;
  tone: "muted" | "destructive" | "warning" | "success";
  title: string;
  description: string;
  testId?: string;
}) {
  const toneBg = {
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
  }[tone];
  return (
    <div className="py-20 text-center" data-testid={testId}>
      <div
        className={`mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full ${toneBg}`}
      >
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}
