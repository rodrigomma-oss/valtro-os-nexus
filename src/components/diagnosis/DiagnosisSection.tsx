import { ReactNode } from "react";
import { motion } from "framer-motion";

interface DiagnosisSectionProps {
  children: ReactNode;
  keyId?: string;
}

export function DiagnosisSection({ children, keyId }: DiagnosisSectionProps) {
  return (
    <motion.section
      key={keyId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      {children}
    </motion.section>
  );
}
