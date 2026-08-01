import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBug } from "@/lib/os/bugs.functions";
import { listSaasProducts } from "@/lib/saas-products.functions";
import { listTickets } from "@/lib/tickets.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import {
  BUG_CATEGORY_LABEL,
  BUG_CATEGORY_ORDER,
  BUG_ENVIRONMENT_LABEL,
  BUG_ENVIRONMENT_ORDER,
  BUG_SEVERITY_LABEL,
  BUG_SEVERITY_ORDER,
  translateBugError,
} from "@/lib/os/bugs-ui";

const NONE = "__none__";

const bugFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Informe um título com pelo menos 5 caracteres.")
    .max(200, "O título deve ter no máximo 200 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "Descreva o problema com pelo menos 10 caracteres.")
    .max(5000, "A descrição deve ter no máximo 5000 caracteres."),
  saas_product_id: z.string().uuid("Selecione o produto afetado."),
  severity: z.enum(["low", "normal", "high", "critical"]),
  category: z.enum([
    "ui_ux",
    "backend",
    "frontend",
    "security",
    "performance",
    "localization",
    "data_integrity",
    "other",
  ]),
  environment: z.enum(["production", "staging", "development", "local"]),
  affected_version: z.string().trim().max(60, "Máximo de 60 caracteres.").optional(),
  owner_id: z.string(),
  ticket_id: z.string(),
  request_id: z.string().trim().max(120, "Máximo de 120 caracteres.").optional(),
  external_reference: z.string().trim().max(200, "Máximo de 200 caracteres.").optional(),
});

type BugFormValues = z.infer<typeof bugFormSchema>;

const DEFAULTS: BugFormValues = {
  title: "",
  description: "",
  saas_product_id: "",
  severity: "normal",
  category: "other",
  environment: "production",
  affected_version: "",
  owner_id: NONE,
  ticket_id: NONE,
  request_id: "",
  external_reference: "",
};

/**
 * Diálogo de cadastro de Bug (VOS-001D.2).
 * O código (BUG-000001) e `reported_by` são definidos exclusivamente no backend.
 */
export function NewBugDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createBug);
  const productsFn = useServerFn(listSaasProducts);
  const ticketsFn = useServerFn(listTickets);
  const usersFn = useServerFn(listAssignableUsers);

  const form = useForm<BugFormValues>({
    resolver: zodResolver(bugFormSchema),
    defaultValues: DEFAULTS,
    mode: "onSubmit",
  });

  useEffect(() => {
    if (open) form.reset(DEFAULTS);
  }, [open]);

  const products = useQuery({
    queryKey: ["saas-products", "active"],
    queryFn: () => productsFn({ data: { activeOnly: true } }),
    enabled: open,
    staleTime: 60_000,
  });
  const tickets = useQuery({
    queryKey: ["tickets", "for-bug"],
    queryFn: () => ticketsFn({ data: {} }),
    enabled: open,
    staleTime: 60_000,
  });
  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
    enabled: open,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (values: BugFormValues) =>
      createFn({
        data: {
          title: values.title,
          description: values.description,
          saas_product_id: values.saas_product_id,
          severity: values.severity,
          category: values.category,
          environment: values.environment,
          affected_version: values.affected_version ? values.affected_version : null,
          ticket_id: values.ticket_id === NONE ? null : values.ticket_id,
          request_id: values.request_id ? values.request_id : null,
          external_reference: values.external_reference ? values.external_reference : null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Bug ${res.code} registrado.`);
      qc.invalidateQueries({ queryKey: ["bugs"] });
      onOpenChange(false);
      form.reset(DEFAULTS);
      onCreated?.(res.id);
    },
    onError: (err: Error) => {
      toast.error("Não foi possível registrar o bug.", {
        description: translateBugError(err.message),
      });
    },
  });

  const submitting = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? undefined : onOpenChange(v))}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo bug</DialogTitle>
          <DialogDescription>
            Registre uma falha técnica. O código do bug é gerado automaticamente pelo sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              if (submitting) return;
              mutation.mutate(values);
            })}
            className="space-y-3"
            noValidate
          >
            <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Estoque negativo ao sincronizar SKU" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Descreva o comportamento esperado, o observado e como reproduzir."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="saas_product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(products.data ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severidade</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUG_SEVERITY_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              {BUG_SEVERITY_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUG_CATEGORY_ORDER.map((c) => (
                            <SelectItem key={c} value={c}>
                              {BUG_CATEGORY_LABEL[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUG_ENVIRONMENT_ORDER.map((e) => (
                            <SelectItem key={e} value={e}>
                              {BUG_ENVIRONMENT_LABEL[e]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="affected_version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Versão afetada (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: 1.4.2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável (opcional)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Não atribuído" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Não atribuído</SelectItem>
                          {(users.data ?? []).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name ?? "Sem nome"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticket_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chamado relacionado (opcional)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem chamado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Sem chamado</SelectItem>
                          {(tickets.data ?? []).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.protocol} — {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="request_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request ID (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Identificador da requisição" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="external_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referência externa (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: issue interna, link de suporte" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar bug
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
