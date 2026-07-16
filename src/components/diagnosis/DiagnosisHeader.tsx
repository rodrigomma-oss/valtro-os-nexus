import { motion } from "framer-motion";

interface DiagnosisHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function DiagnosisHeader({ eyebrow, title, description }: DiagnosisHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-10"
    >
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">{eyebrow}</p>
      )}
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="mt-3 text-base md:text-lg text-muted-foreground leading-relaxed max-w-[640px]">
          {description}
        </p>
      )}
    </motion.div>
  );
}
