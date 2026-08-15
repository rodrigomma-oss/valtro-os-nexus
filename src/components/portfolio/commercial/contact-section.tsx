import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { useState } from "react";
import { ArrowUp, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useServerFn } from "@tanstack/react-start";
import { capturePublicLead } from "@/lib/leads.functions";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  business: z.string().min(2, "Nome do negócio é obrigatório"),
  whatsapp: z.string().min(10, "WhatsApp é obrigatório"),
  email: z.string().email("E-mail inválido"),
  instagram: z.string().optional(),
  segment: z.string().min(2, "Segmento é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado (UF) é obrigatório"),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const BRAZIL_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const capturePublicLeadFn = useServerFn(capturePublicLead);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      state: "",
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await capturePublicLeadFn({
        data: {
          name: data.name,
          business: data.business,
          phone: data.whatsapp,
          email: data.email,
          instagram: data.instagram,
          segment: data.segment,
          city: data.city,
          state: data.state,
          message: data.message,
        },
      });
      setSubmitted(true);
      reset();
    } catch (error) {
      console.error("Error capturing lead:", error);
      toast.error("Houve um problema ao enviar seus dados. Por favor, tente novamente.");
    }
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
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                      {...register("whatsapp")}
                      onInput={(e) => {
                        const input = e.target as HTMLInputElement;
                        let value = input.value.replace(/\D/g, "");
                        if (value.length > 11) value = value.slice(0, 11);
                        
                        let formatted = "";
                        if (value.length > 0) {
                          formatted = "(" + value.slice(0, 2);
                          if (value.length > 2) {
                            formatted += ") " + value.slice(2, 7);
                            if (value.length > 7) {
                              formatted += "-" + value.slice(7, 11);
                            }
                          }
                        }
                        input.value = formatted;
                      }}
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
                    <label className="text-sm font-medium">Instagram (opcional)</label>
                    <input
                      {...register("instagram")}
                      placeholder="@seuusuario"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cidade</label>
                    <input
                      {...register("city")}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none"
                    />
                    {errors.city && <span className="text-xs text-red-500">{errors.city.message}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Estado</label>
                    <select
                      {...register("state")}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none appearance-none"
                    >
                      <option value="" disabled>Selecione</option>
                      {BRAZIL_STATES.map((uf) => (
                        <option key={uf.value} value={uf.value}>{uf.label}</option>
                      ))}
                    </select>
                    {errors.state && <span className="text-xs text-red-500">{errors.state.message}</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Mensagem (opcional)</label>
                  <textarea
                    {...register("message")}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-primary focus:outline-none resize-none"
                  />
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
