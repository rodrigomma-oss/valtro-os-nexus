import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Send,
  Clock,
  Mail,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { LeadInfoCard } from "@/components/app/lead-info-card";
import { ActionCard } from "@/components/app/action-card";
import { TimelineCard, type TimelineItem } from "@/components/app/timeline-card";
import { Button } from "@/components/ui/button";
import { MOCK_LEADS } from "@/mocks/leads";

export const Route = createFileRoute("/crm/leads/$id")({
  loader: ({ params }) => {
    const lead = MOCK_LEADS.find((l) => l.id === params.id);
    if (!lead) throw notFound();
    return { lead };
  },
  component: CrmLeadDetail,
  notFoundComponent: LeadNotFound,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.lead.empresa} — Lead — Valtro Labs`
          : "Lead não encontrado",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function LeadNotFound() {
  return (
    <div className="p-6 md:p-10">
      <PageHeader
        title="Lead não encontrado"
        description="O lead solicitado não existe ou foi arquivado."
        actions={
          <Button asChild variant="outline">
            <Link to="/crm/leads">
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
              Voltar para leads
            </Link>
          </Button>
        }
      />
    </div>
  );
}

function buildTimeline(createdAt: string): TimelineItem[] {
  const base = new Date(createdAt);
  const fmt = (offsetDays: number) =>
    new Date(base.getTime() + offsetDays * 86400000).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return [
    {
      id: "criado",
      icon: Sparkles,
      title: "Lead criado",
      description: "Cadastro inicial registrado no CRM da Valtro Labs.",
      date: fmt(0),
      tone: "default",
    },
    {
      id: "contato",
      icon: MessageCircle,
      title: "Primeiro contato",
      description:
        "Contato inicial via WhatsApp — apresentação da Valtro Labs e da esteira Pricing.",
      date: fmt(1),
      tone: "default",
    },
    {
      id: "link",
      icon: Send,
      title: "Link enviado",
      description:
        "Enviado link do portal de briefing e materiais institucionais para o cliente.",
      date: fmt(2),
      tone: "success",
    },
    {
      id: "aguardando",
      icon: Clock,
      title: "Aguardando briefing",
      description:
        "Cliente sinalizou interesse — aguardando preenchimento do briefing técnico.",
      date: fmt(3),
      tone: "warning",
    },
  ];
}

function CrmLeadDetail() {
  const { lead } = Route.useLoaderData();
  const timeline = buildTimeline(lead.dataCriacao);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title={lead.empresa}
        description={`Detalhamento do lead — ${lead.nome} · ${lead.cidade}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/leads">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Mail className="h-4 w-4" strokeWidth={1.75} />
              Contatar
            </Button>
            <Button size="sm" className="gap-2">
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Editar lead
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <LeadInfoCard lead={lead} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ActionCard
            title="Observações"
            description="Anotações internas do time comercial sobre o lead."
          >
            <div className="rounded-lg bg-muted/40 p-4 text-sm text-foreground leading-relaxed">
              <p>
                Cliente demonstrou forte interesse na esteira{" "}
                <span className="font-semibold">Valtro Pricing</span>. Já
                possui operação estruturada em marketplace e busca
                automatizar a precificação dinâmica de SKUs.
              </p>
              <p className="mt-3">
                Preferência declarada por reuniões pela manhã. Decisor final é
                o próprio contato, sem necessidade de escalonamento. Ticket
                estimado compatível com plano Pro.
              </p>
              <p className="mt-3 text-muted-foreground italic">
                Próximo passo: aguardar retorno do briefing enviado por e-mail
                e agendar call de descoberta técnica.
              </p>
            </div>
          </ActionCard>

          <TimelineCard title="Linha do tempo" items={timeline} />
        </div>
      </div>
    </div>
  );
}
