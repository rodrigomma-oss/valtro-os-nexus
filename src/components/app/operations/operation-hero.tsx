import { motion } from "framer-motion";

interface OperationHeroProps {
  name?: string;
  summary: {
    diagnosticosPendentes: number;
    propostasPendentes: number;
    briefingsHoje: number;
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function OperationHero({ name = "Rodrigo", summary }: OperationHeroProps) {
  const parts: string[] = [];
  if (summary.diagnosticosPendentes) parts.push(`${summary.diagnosticosPendentes} diagnósticos aguardando análise`);
  if (summary.propostasPendentes) parts.push(`${summary.propostasPendentes} propostas pendentes`);
  if (summary.briefingsHoje) parts.push(`${summary.briefingsHoje} briefing recebido hoje`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-brand-soft/60 to-transparent p-6 md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Centro de operações</p>
      <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
        {greeting()}, {name}.
      </h1>
      {parts.length > 0 ? (
        <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-[720px]">
          Você possui{" "}
          {parts.map((p, i) => (
            <span key={p}>
              <span className="text-foreground font-medium">{p}</span>
              {i < parts.length - 1 ? (i === parts.length - 2 ? " e " : ", ") : "."}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-3 text-sm md:text-base text-muted-foreground">Nenhuma pendência crítica no momento.</p>
      )}
    </motion.div>
  );
}
