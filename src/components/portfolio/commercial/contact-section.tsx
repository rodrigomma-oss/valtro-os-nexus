import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { useState } from "react";
import { ArrowUp, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  business: z.string().min(2, "Nome do negócio é obrigatório"),
  whatsapp: z.string().min(10, "WhatsApp é obrigatório"),
  email: z.string().email("E-mail inválido"),
  segment: z.string().min(2, "Segmento é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setValue("whatsapp", formatted, { shouldValidate: true });
  };

  const onSubmit = async (data: FormValues) => {
    // Simulando integração com CRM
    console.log("Lead captured:", data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitted(true);
  };

  return (
    <PresentationSection id="contact" index="07" eyebrow="Convite">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Quer ver como isso pode ficar?
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Podemos mostrar uma demonstração e conversar rapidamente sobre o que faria sentido para o seu negócio.
          </p>
          
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowUp className="h-4 w-4" /> Voltar ao início
          </button>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-semibold">Mensagem Enviada!</h3>
                <p className="mt-2 text-muted-foreground">
                  Recebemos seu contato. Em breve entraremos em contato para conhecer melhor o seu negócio.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Seu Nome</label>
                    <input
                      {...register("name")}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome do Negócio</label>
                    <input
                      {...register("business")}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.business && <span className="text-xs text-red-500">{errors.business.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">WhatsApp</label>
                    <input
                      {...register("whatsapp", {
                        onChange: handleWhatsAppChange
                      })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.whatsapp && <span className="text-xs text-red-500">{errors.whatsapp.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">E-mail</label>
                    <input
                      {...register("email")}
                      type="email"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Segmento</label>
                    <input
                      {...register("segment")}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.segment && <span className="text-xs text-red-500">{errors.segment.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cidade</label>
                    <input
                      {...register("city")}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.city && <span className="text-xs text-red-500">{errors.city.message}</span>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Enviando..." : "Quero conversar sobre meu negócio"}
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </PresentationSection>
  );
}
