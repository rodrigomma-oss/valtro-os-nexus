/**
 * BriefingViewerDrawer — Sprint 2B.3.4
 *
 * Visualização somente-leitura do Briefing pelo operador. Reutilizado
 * no futuro pelo VDA. Renderiza as respostas agrupadas por seção,
 * usando o mesmo Template que o cliente respondeu.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { getBriefingResponseForOperator } from "@/lib/briefing.functions";
import {
  getTemplate,
  type TemplateQuestion,
} from "@/config/briefing-templates";
import {
  TEMPLATE_TYPE_LABEL,
  TOKEN_STATUS_LABEL,
  type BriefingToken,
} from "@/types/briefing";
import { cn } from "@/lib/utils";

interface BriefingViewerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: BriefingToken;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAnswer(q: TemplateQuestion, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (q.kind === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    if (arr.length === 0) return "—";
    return arr
      .map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  if (q.kind === "select") {
    return (
      q.options?.find((o) => o.value === value)?.label ?? String(value)
    );
  }
  return String(value);
}

export function BriefingViewerDrawer({
  open,
  onOpenChange,
  token,
}: BriefingViewerDrawerProps) {
  const getFn = useServerFn(getBriefingResponseForOperator);
  const query = useQuery({
    queryKey: ["briefing", "response", token.id],
    queryFn: () => getFn({ data: { token_id: token.id } }),
    enabled: open,
  });

  const template = getTemplate(token.template_type);
  const responseData = query.data?.response?.data ?? {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-left pb-6 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
            {TEMPLATE_TYPE_LABEL[token.template_type]}
            <span>·</span>
            <span>{TOKEN_STATUS_LABEL[token.status]}</span>
          </div>
          <SheetTitle className="text-xl">
            {template.name}
          </SheetTitle>
          <SheetDescription>
            Resumo das respostas fornecidas pelo cliente. Visualização somente
            leitura.
          </SheetDescription>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-4 text-xs">
            <MetaItem label="Criado em" value={formatDate(token.created_at)} />
            <MetaItem
              label="Última atualização"
              value={formatDate(
                query.data?.response?.updated_at ?? token.updated_at,
              )}
            />
            <MetaItem
              label="Último acesso"
              value={formatDate(token.last_access_at)}
            />
            <MetaItem
              label="Concluído em"
              value={formatDate(token.completed_at)}
            />
          </dl>
        </SheetHeader>

        {query.isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando briefing…
          </div>
        ) : query.isError ? (
          <div className="py-16 text-center text-sm text-destructive">
            Não foi possível carregar o briefing.
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {template.steps.map((step) => (
              <section
                key={step.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                  {step.title}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {step.questions.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        q.kind === "textarea" && "sm:col-span-2",
                      )}
                    >
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        {q.label}
                      </dt>
                      <dd className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {formatAnswer(q, responseData[q.id])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            {!query.data?.response?.completed_at && (
              <p className="text-xs text-muted-foreground text-center italic">
                Este briefing ainda não foi concluído pelo cliente. As respostas
                acima refletem o progresso atual.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </dt>
      <dd className="text-foreground mt-0.5">{value}</dd>
    </div>
  );
}
