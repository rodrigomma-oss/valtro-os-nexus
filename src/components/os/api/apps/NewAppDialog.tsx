"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createApplicationFn } from "@/lib/os/api/apps.functions";

const ALLOWED_SCOPES = [
  'support:tickets:create',
  'support:tickets:read',
  'support:bugs:create',
  'support:feedback:create',
  'support:suggestions:create',
  'support:attachments:create',
];

const formSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  environment: z.enum(["development", "production"]),
  allowedScopes: z.array(z.string()).min(1, "Selecione pelo menos um escopo"),
});

type FormValues = z.infer<typeof formSchema>;

export function NewAppDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const createFn = useServerFn(createApplicationFn);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      environment: "production",
      allowedScopes: ["support:tickets:read"],
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      // TanStack Start server functions expect the input in a 'data' object when called
      await createFn({ data: values });
      toast.success("Aplicação criada com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ['api-applications'] });
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("[NewAppDialog] Error creating application:", error);
      toast.error("Erro ao criar aplicação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Criar Aplicação
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Aplicação</DialogTitle>
          <DialogDescription>
            Configure uma nova aplicação consumidora da API Valtro OS.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Aplicação</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Dashboard Interno" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ambiente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ambiente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="production">Produção</SelectItem>
                      <SelectItem value="development">Desenvolvimento</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedScopes"
              render={() => (
                <FormItem>
                  <h4 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Escopos de Acesso
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {ALLOWED_SCOPES.map((scope) => (
                      <FormField
                        key={scope}
                        control={form.control}
                        name="allowedScopes"
                        render={({ field }) => {
                          return (
                            <FormItem
                                key={scope}
                                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-2"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(scope)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, scope])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value: string) => value !== scope
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-normal cursor-pointer">
                                  {scope}
                                </FormLabel>
                              </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  {form.formState.errors.allowedScopes && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.allowedScopes.message}
                    </p>
                  )}
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Aplicação"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
