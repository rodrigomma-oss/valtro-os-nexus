/**
 * Portal Público de Onboarding pós-venda — Sprint 13.5.
 *
 * Rota anônima `/onboarding/$token`. Reaproveita o layout e o renderer de
 * perguntas do VBE, mas é um fluxo próprio: o cliente sabe explicitamente
 * que está preenchendo o ONBOARDING do serviço contratado.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
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
  completeOnboarding,
  saveOnboardingProgress,
  validateOnboardingToken,
} from "@/lib/onboarding.functions";
import {
  getOnboardingTemplate,
  validateOnboardingStep,
  type OnboardingTemplate,
} from "@/config/onboarding-templates";
import type { TemplateQuestion, TemplateStep } from "@/config/briefing-templates";
import type { OnboardingPortalPayload, OnboardingPortalState } from "@/types/onboarding";

export const Route = createFileRoute("/onboarding/$token")({
  component: OnboardingPortalPage,
  head: () => ({
    meta: [
      { title: "Onboarding — Valtro Labs" },
      {
        name: "description",
        content:
          "Portal de onboarding operacional do serviço contratado na Valtro Labs.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function OnboardingPortalPage() {
  const { token } = Route.useParams();
  const validateFn = useServerFn(validateOnboardingToken);

  const query = useQuery<OnboardingPortalPayload>({
    queryKey: ["onboarding", "portal", token],
    queryFn: () => validateFn({ data: { token } }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (query.isLoading) return <PortalLoading />;
  if (query.isError || !query.data)
    return <PortalError message={(query.error as Error)?.message} />;

  const { state, onboarding, response } = query.data;
  if (state !== "valido" || !onboarding) return <PortalNonValid state={state} />;

  const template = getOnboardingTemplate(onboarding.template_key);
  if (!template) return <PortalError message="Template de onboarding indisponível." />;

  return (
    <OnboardingRunner
      token={token}
      template={template}
      serviceName={onboarding.service_name}
      initialData={response?.data ?? {}}
      initialStep={response?.current_step ?? 0}
    />
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
function OnboardingRunner({
  token,
  template,
  serviceName,
  initialData,
  initialStep,
}: {
  token: string;
  template: OnboardingTemplate;
  serviceName: string;
  initialData: Record<string, any>;
  initialStep: number;
}) {
  const total = template.steps.length;
  const [screen, setScreen] = useState<"welcome" | "step" | "success">("welcome");
  const [stepIndex, setStepIndex] = useState(Math.min(initialStep, total - 1));
  const [isReview, setIsReview] = useState(false);
  const [data, setData] = useState<Record<string, any>>(initialData);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const saveFn = useServerFn(saveOnboardingProgress);
  const completeFn = useServerFn(completeOnboarding);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: (payload: { data: Record<string, any>; current_step: number }) =>
      saveFn({ data: { token, ...payload } }),
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    },
    onError: (err: Error) => {
      setSaveState("idle");
      toast.error(err.message || "Não foi possível salvar o progresso.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeFn({ data: { token, data } }),
    onSuccess: () => setScreen("success"),
    onError: (err: Error) =>
      toast.error(err.message || "Não foi possível concluir o onboarding."),
  });

  // Autosave com debounce — o cliente pode retomar depois.
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveMutation.mutate({ data, current_step: stepIndex });
    }, 1200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, stepIndex]);

  const setValue = (id: string, value: unknown) => {
    dirtyRef.current = true;
    setData((prev) => ({ ...prev, [id]: value }));
  };

  const step: TemplateStep | undefined = template.steps[stepIndex];

  const progress = useMemo(() => {
    const steps = total + 1;
    const current = isReview ? steps : stepIndex + 1;
    return {
      current,
      steps,
      pct: Math.round((current / steps) * 100),
      label: isReview ? "Revisão" : (step?.label ?? ""),
    };
  }, [isReview, stepIndex, step, total]);

  function goNext() {
    if (isReview) return;
    if (step) {
      const error = validateOnboardingStep(step, data);
      if (error) {
        toast.error(error);
        return;
      }
    }
    if (stepIndex + 1 < total) {
      setStepIndex((i) => i + 1);
    } else {
      setIsReview(true);
    }
  }

  function goBack() {
    if (isReview) {
      setIsReview(false);
      return;
    }
    if (stepIndex === 0) {
      setScreen("welcome");
      return;
    }
    setStepIndex((i) => i - 1);
  }

  if (screen === "welcome") {
    return (
      <DiagnosisLayout>
        <div className="mx-auto w-full max-w-[820px] px-6 py-16" data-testid="onboarding-welcome">
          <OnboardingBadge serviceName={serviceName} templateKey={template.key} />
          <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            {template.intro.title}
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
            {template.intro.description}
          </p>
          <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
            {template.steps.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" strokeWidth={1.75} />
                {s.title}
              </li>
            ))}
          </ul>
          <Button className="mt-10" onClick={() => setScreen("step")} data-testid="onboarding-start">
            Começar onboarding
            <ArrowRight className="h-4 w-4 ml-2" strokeWidth={1.75} />
          </Button>
        </div>
      </DiagnosisLayout>
    );
  }

  if (screen === "success") {
    return (
      <DiagnosisLayout>
        <div className="py-20 text-center" data-testid="onboarding-success">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
            Onboarding concluído
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Recebemos as informações operacionais de {serviceName}. Nossa equipe
            inicia a execução e entra em contato com os próximos passos.
          </p>
        </div>
      </DiagnosisLayout>
    );
  }

  return (
    <DiagnosisLayout
      topSlot={
        <div className="mx-auto w-full max-w-[820px] px-6 pb-4">
          <OnboardingBadge serviceName={serviceName} templateKey={template.key} compact />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium tracking-wide">
              Etapa {progress.current} de {progress.steps} · {progress.label}
            </span>
            <span className="tabular-nums">{progress.pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={false}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[820px] px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={isReview ? "review" : stepIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {isReview ? (
              <div data-testid="onboarding-review">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Revise antes de enviar
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Confira as informações operacionais do serviço contratado.
                </p>
                <div className="mt-6 space-y-6">
                  {template.steps.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                      <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                      <dl className="mt-3 space-y-2">
                        {s.questions.map((q) => (
                          <div key={q.id} className="grid gap-0.5">
                            <dt className="text-xs text-muted-foreground">{q.label}</dt>
                            <dd className="text-sm text-foreground whitespace-pre-line">
                              {formatAnswer(q, data[q.id])}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              step && (
                <div data-testid="onboarding-step" data-step-id={step.id}>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  <div className="mt-8 space-y-6">
                    {step.questions.map((q) => (
                      <QuestionField
                        key={q.id}
                        question={q}
                        value={data[q.id]}
                        onChange={(v) => setValue(q.id, v)}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" onClick={goBack} data-testid="onboarding-back">
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            {isReview ? (
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                data-testid="onboarding-submit"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Check className="h-4 w-4 mr-2" strokeWidth={1.75} />
                )}
                Enviar onboarding
              </Button>
            ) : (
              <Button onClick={goNext} data-testid="onboarding-next">
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" strokeWidth={1.75} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </DiagnosisLayout>
  );
}

// ---------------------------------------------------------------------------
// Renderer de perguntas (mesmo contrato visual do VBE)
// ---------------------------------------------------------------------------
function QuestionField({
  question,
  value,
  onChange,
}: {
  question: TemplateQuestion;
  value: any;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {question.label}
        {question.optional && (
          <span className="ml-2 text-xs text-muted-foreground">(opcional)</span>
        )}
      </Label>
      {question.hint && <p className="text-xs text-muted-foreground">{question.hint}</p>}
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

export function formatAnswer(q: TemplateQuestion, value: any): string {
  if (value === undefined || value === null || value === "") return "—";
  if (q.kind === "multiselect") {
    const arr: string[] = Array.isArray(value) ? value : [];
    if (arr.length === 0) return "—";
    return arr.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  if (q.kind === "select") {
    return q.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Suporte
// ---------------------------------------------------------------------------
function OnboardingBadge({
  serviceName,
  templateKey,
  compact = false,
}: {
  serviceName: string;
  templateKey: string;
  compact?: boolean;
}) {
  return (
    <span
      data-testid="onboarding-badge"
      data-template-key={templateKey}
      className={
        compact
          ? "inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
          : "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
      }
    >
      <PackageCheck className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.75} />
      Onboarding · {serviceName}
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
          Salvando…
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

function PortalLoading() {
  return (
    <DiagnosisLayout>
      <div
        className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground"
        data-testid="onboarding-validating"
      >
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
        <span className="text-sm">Validando seu acesso…</span>
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
        testId="onboarding-error"
        title="Não foi possível carregar o onboarding"
        description={message ?? "Ocorreu um erro ao validar o link. Tente novamente."}
      />
    </DiagnosisLayout>
  );
}

function PortalNonValid({ state }: { state: OnboardingPortalState }) {
  const config: Record<
    OnboardingPortalState,
    {
      icon: typeof Ban;
      tone: "muted" | "destructive" | "warning" | "success";
      title: string;
      description: string;
      testId: string;
    }
  > = {
    valido: {
      icon: PackageCheck,
      tone: "success",
      title: "Tudo certo",
      description: "Recarregue a página para continuar.",
      testId: "onboarding-error-invalid",
    },
    expirado: {
      icon: Clock,
      tone: "warning",
      title: "Este link expirou",
      description:
        "Fale com seu contato na Valtro Labs para receber um novo link de onboarding.",
      testId: "onboarding-error-expired",
    },
    revogado: {
      icon: Ban,
      tone: "muted",
      title: "Este acesso foi desativado",
      description:
        "O link não está mais disponível. Entre em contato para reabrir o onboarding.",
      testId: "onboarding-error-revoked",
    },
    concluido: {
      icon: CheckCircle2,
      tone: "success",
      title: "Onboarding já concluído",
      description:
        "Recebemos as informações operacionais e a execução do serviço já está em andamento.",
      testId: "onboarding-error-completed",
    },
    invalido: {
      icon: AlertCircle,
      tone: "destructive",
      title: "Link inválido",
      description:
        "Verifique se o link foi copiado corretamente ou fale com seu contato na Valtro Labs.",
      testId: "onboarding-error-invalid",
    },
  };
  const c = config[state];
  return (
    <DiagnosisLayout>
      <StateMessage
        icon={c.icon}
        tone={c.tone}
        testId={c.testId}
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
      <div className={`mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full ${toneBg}`}>
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</p>
    </div>
  );
}
