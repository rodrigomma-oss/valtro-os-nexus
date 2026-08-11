import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { 
  FeedbackType, 
  FeedbackSource, 
  FeedbackStatus, 
  FeedbackPerceivedValue, 
  FeedbackSubscriptionInterest 
} from "@/types/feedback";

/**
 * Módulo de Gestão de Feedback do Beta Fechado (VOS-001E).
 */

const feedbackSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  saas_product_id: z.string().uuid("Produto é obrigatório"),
  type: z.enum(["praise", "suggestion", "complaint", "question", "usability", "feature_request", "pricing", "other"]),
  source: z.enum(["internal", "beta_portal", "support", "interview", "email", "whatsapp", "other"]),
  perceived_value: z.enum(["very_low", "low", "medium", "high", "very_high", "not_informed"]).default("not_informed"),
  subscription_interest: z.enum(["no", "maybe", "yes", "already_subscribed", "not_informed"]).default("not_informed"),
  desired_feature: z.string().optional().nullable(),
  participant_name: z.string().optional().nullable(),
  participant_email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  owner_id: z.string().uuid().optional().nullable(),
  ticket_id: z.string().uuid().optional().nullable(),
  bug_id: z.string().uuid().optional().nullable(),
});

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    text: z.string().optional(),
    code: z.string().optional(),
    participant_email: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    saas_product_id: z.string().optional(),
    owner_id: z.string().optional(),
    page: z.number().default(1),
    pageSize: z.number().default(20),
  }).parse(data))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("feedback")
      .select(`
        *,
        saas_products(name),
        profiles:owner_id(full_name),
        creator:created_by!left(full_name),
        tickets:ticket_id(protocol),
        bugs:bug_id(code)
      `, { count: "exact" });

    if (data.code) query = query.ilike("code", `%${data.code}%`);
    if (data.participant_email) query = query.ilike("participant_email", `%${data.participant_email}%`);
    if (data.status) query = query.eq("status", data.status as FeedbackStatus);
    if (data.type) query = query.eq("type", data.type as FeedbackType);
    if (data.saas_product_id) query = query.eq("saas_product_id", data.saas_product_id);
    if (data.owner_id) query = query.eq("owner_id", data.owner_id);
    
    if (data.text) {
      query = query.or(`title.ilike.%${data.text}%,description.ilike.%${data.text}%,desired_feature.ilike.%${data.text}%`);
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: items, count, error } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return {
      items: (items || []).map(item => ({
        ...item,
        product_name: (item.saas_products as any)?.name,
        owner_name: (item.profiles as any)?.full_name,
        created_by_name: (item.creator as any)?.full_name,
        ticket_protocol: (item.tickets as any)?.protocol,
        bug_code: (item.bugs as any)?.code,
      })),
      total: count || 0
    };
  });

export const getFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    console.log(`[getFeedback] Buscando ID: ${data.id} (User: ${context.userId})`);
    
    const { data: feedback, error } = await context.supabase
      .from("feedback")
      .select(`
        *,
        saas_products(name),
        profiles:owner_id(full_name),
        creator:created_by!left(full_name),
        tickets:ticket_id(protocol),
        bugs:bug_id(code)
      `)
      .eq("id", data.id)
      .maybeSingle();
    
    if (error) {
      console.error(`[getFeedback] Erro DB: ${error.message}`, error);
      throw new Error(error.message);
    }
    
    if (!feedback) {
      console.warn(`[getFeedback] Registro não encontrado: ${data.id}`);
      return { feedback: null, events: [] };
    }
    
    const { data: events, error: eventsError } = await context.supabase
      .from("feedback_events")
      .select(`
        *,
        profiles:actor_id(full_name)
      `)
      .eq("feedback_id", data.id)
      .order("created_at", { ascending: false });

    if (eventsError) throw new Error(eventsError.message);

    return {
      feedback: {
        ...feedback,
        product_name: (feedback.saas_products as any)?.name,
        owner_name: (feedback.profiles as any)?.full_name,
        created_by_name: (feedback.creator as any)?.full_name,
        ticket_protocol: (feedback.tickets as any)?.protocol,
        bug_code: (feedback.bugs as any)?.code,
      },
      events: (events || []).map(e => ({
        ...e,
        actor_name: (e.profiles as any)?.full_name
      }))
    };
  });

export const createFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => feedbackSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: feedback, error } = await context.supabase
      .from("feedback")
      .insert([{
        ...data,
        created_by: context.userId,
        status: "new" as FeedbackStatus,
        code: "AUTO" 
      } as any])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { feedback };
  });

export const updateFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    id: z.string().uuid(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    type: z.string().optional(),
    perceived_value: z.string().optional(),
    subscription_interest: z.string().optional(),
    desired_feature: z.string().optional().nullable(),
    ticket_id: z.string().uuid().optional().nullable(),
    bug_id: z.string().uuid().optional().nullable(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("feedback")
      .update({
        ...patch,
        type: patch.type as FeedbackType,
        perceived_value: patch.perceived_value as FeedbackPerceivedValue,
        subscription_interest: patch.subscription_interest as FeedbackSubscriptionInterest,
      } as any)
      .eq("id", id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const assignFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    id: z.string().uuid(),
    owner_id: z.string().uuid().nullable(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback")
      .update({ owner_id: data.owner_id })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const changeFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "under_review", "accepted", "planned", "implemented", "dismissed", "closed"]),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback")
      .update({ status: data.status as FeedbackStatus })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const closeFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback")
      .update({ status: "closed" as FeedbackStatus })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const reopenFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback")
      .update({ status: "under_review" as FeedbackStatus })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
