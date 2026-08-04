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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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

// Definindo os escopos localmente para evitar dependências circulares com .server.ts
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
  console.log("[NewAppDialog] render, open state:", open);
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
      await createFn({ data: values });
      toast.success("Aplicação criada com sucesso");
      
      // Invalida o cache para atualizar as tabelas
      queryClient.invalidateQueries({ queryKey: ["api-applications"] });
      queryClient.invalidateQueries({ queryKey: ["api-audit-logs"] });
      
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Erro ao criar aplicação");
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      console.log("[NewAppDialog] onOpenChange triggered with:", val);
      setOpen(val);
    }}>
      <Button onClick={() => {
        console.log("BOTAO REAL");
        console.log("[NewAppDialog] Button onClick event");
        setOpen(true);
      }}>
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
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
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
            <DialogFooter>
              <Button type="submit" disabled={createFn.isPending}>
                {createFn.isPending ? "Criando..." : "Criar Aplicação"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
