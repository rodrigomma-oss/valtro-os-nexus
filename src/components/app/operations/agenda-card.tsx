import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export type AgendaBucket = "hoje" | "amanha" | "proximos";

export interface AgendaEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  bucket: AgendaBucket;
}

const bucketLabel: Record<AgendaBucket, string> = {
  hoje: "Hoje",
  amanha: "Amanhã",
  proximos: "Próximos dias",
};

export function AgendaCard({ events }: { events: AgendaEvent[] }) {
  const grouped: Record<AgendaBucket, AgendaEvent[]> = { hoje: [], amanha: [], proximos: [] };
  events.forEach((e) => grouped[e.bucket].push(e));

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-primary" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-foreground">Agenda</h3>
      </div>
      <div className="space-y-5">
        {(Object.keys(grouped) as AgendaBucket[]).map((b) => (
          <div key={b}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">
              {bucketLabel[b]}
            </p>
            {grouped[b].length === 0 ? (
              <p className="text-xs text-muted-foreground/70 italic">Sem compromissos</p>
            ) : (
              <ul className="space-y-2">
                {grouped[b].map((e, i) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="flex gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-xs font-medium text-primary tabular-nums shrink-0 w-20">{e.time}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.detail}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
