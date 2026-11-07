import { motion } from "framer-motion";

export interface ActivityItem {
  id: string;
  who: string;
  action: string;
  time: string;
}

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="relative pl-5">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {items.map((it, i) => (
        <motion.li
          key={it.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="relative pb-5 last:pb-0"
        >
          <span className="absolute -left-5 top-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary" />
          <p className="text-sm text-foreground">
            <span className="font-medium">{it.who}</span>{" "}
            <span className="text-muted-foreground">{it.action}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{it.time}</p>
        </motion.li>
      ))}
    </ol>
  );
}
