import { motion } from "framer-motion";
import { Check, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  onFinish: () => void;
  nome?: string;
}

export function SuccessScreen({ onFinish, nome }: SuccessScreenProps) {
  return (
    <div className="text-center py-8">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto h-20 w-20 rounded-full bg-primary/10 grid place-items-center mb-8 relative"
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <Check className="h-10 w-10 text-primary relative" strokeWidth={2.5} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
      >
        Recebemos seu diagnóstico{nome ? `, ${nome.split(" ")[0]}` : ""}.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-4 text-base md:text-lg text-muted-foreground max-w-[560px] mx-auto leading-relaxed"
      >
        Nossa equipe irá analisar cuidadosamente as informações que você compartilhou e preparar um retorno personalizado para o seu negócio.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left"
      >
        <div className="rounded-xl border border-border bg-card p-5">
          <Clock className="h-5 w-5 text-primary mb-3" />
          <p className="text-sm font-medium text-foreground">Retorno em 24 a 48 horas</p>
          <p className="text-xs text-muted-foreground mt-1">Você receberá o diagnóstico e a proposta personalizada.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Mail className="h-5 w-5 text-primary mb-3" />
          <p className="text-sm font-medium text-foreground">Acompanhamento por e-mail</p>
          <p className="text-xs text-muted-foreground mt-1">Envio das próximas etapas diretamente no seu contato.</p>
        </div>
      </motion.div>

      <Button onClick={onFinish} className="mt-10 min-w-[180px]">Concluir</Button>
    </div>
  );
}
