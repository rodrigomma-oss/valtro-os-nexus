import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const INTEREST_VALUES = [
  "desenvolvimento",
  "analise_loja",
  "valtro_pricing",
  "parceria",
  "outro",
] as const;

type Interest = (typeof INTEREST_VALUES)[number];

const INTEREST_TO_SERVICE: Record<Interest, string> = {
  desenvolvimento: "desenvolvimento_projeto",
  analise_loja: "diagnostico",
  valtro_pricing: "outro",
  parceria: "outro",
  outro: "nao_definido",
};

const INTEREST_LABEL: Record<Interest, string> = {
  desenvolvimento: "Desenvolvimento",
  analise_loja: "Análise de Loja",
  valtro_pricing: "Valtro Pricing",
  parceria: "Parceria",
  outro: "Outro",
};

const sanitize = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim();

const contactSchema = z.object({
  nome: z.string().transform(sanitize).pipe(z.string().min(2).max(120)),
  empresa: z
    .string()
    .optional()
    .transform((v) => (v ? sanitize(v) : ""))
    .pipe(z.string().max(160)),
  email: z
    .string()
    .transform(sanitize)
    .pipe(z.string().email().max(200)),
  whatsapp: z
    .string()
    .transform((v) => sanitize(v).replace(/\D/g, ""))
    .pipe(z.string().min(10).max(15)),
  interesse: z.enum(INTEREST_VALUES),
  mensagem: z.string().transform(sanitize).pipe(z.string().min(10).max(2000)),
});

export type ContactPayload = z.infer<typeof contactSchema>;

export const submitContactRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const companyName = data.empresa.length > 0 ? data.empresa : data.nome;
      const serviceType = INTEREST_TO_SERVICE[data.interesse];

      const { data: lead, error: leadError } = await supabaseAdmin
        .from("leads")
        .insert({
          company_name: companyName,
          contact_name: data.nome,
          email: data.email,
          phone: data.whatsapp,
          source: "site",
          status: "novo",
          service_type: serviceType as never,
        })
        .select("id")
        .single();

      if (leadError || !lead) {
        console.error("[submitContactRequest] lead insert failed", leadError);
        throw new Error("insert_failed");
      }

      const interestLabel = INTEREST_LABEL[data.interesse];

      // Nota com a mensagem original (visível na tela do lead)
      const { error: noteError } = await supabaseAdmin
        .from("lead_notes")
        .insert({
          lead_id: lead.id,
          content: `Solicitação enviada pelo site (${interestLabel}):\n\n${data.mensagem}`,
        });

      if (noteError) {
        console.error("[submitContactRequest] note insert failed", noteError);
      }

      // Evento explícito de origem
      const { error: eventError } = await supabaseAdmin
        .from("lead_events")
        .insert({
          lead_id: lead.id,
          type: "observacao_adicionada",
          description: "Lead criado através da página Contato.",
          metadata: {
            origin: "site_contato",
            interest: data.interesse,
            interest_label: interestLabel,
            email: data.email,
            phone: data.whatsapp,
            company: data.empresa || null,
          } as never,
        });

      if (eventError) {
        console.error("[submitContactRequest] event insert failed", eventError);
      }

      return { ok: true as const };
    } catch (err) {
      console.error("[submitContactRequest] unexpected", err);
      throw new Error("submit_failed");
    }
  });
