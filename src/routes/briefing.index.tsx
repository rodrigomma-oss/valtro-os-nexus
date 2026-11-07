import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { DiagnosisLayout } from "@/components/diagnosis/DiagnosisLayout";

export const Route = createFileRoute("/briefing/")({
  component: BriefingIndexPage,
  head: () => ({
    meta: [
      { title: "Briefing — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function BriefingIndexPage() {
  return (
    <DiagnosisLayout>
      <div className="py-20 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
          <AlertCircle className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
          Link de briefing necessário
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Este portal é acessado por um link personalizado enviado pela equipe
          Valtro Labs. Verifique seu e-mail ou fale com seu contato.
        </p>
      </div>
    </DiagnosisLayout>
  );
}
