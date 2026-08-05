"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { updateApplicationFn } from "@/lib/os/api/apps.functions";

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
  environment: z.enum(["development", "staging", "production"]),
  allowedScopes: z.array(z.string()).min(1, "Selecione pelo menos um escopo"),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAppDialogProps {
  application: {
    id: string;
    display_name: string;
    environment: "development" | "staging" | "production";
    allowed_scopes: string[];
  };
}

export function EditAppDialog({ application }: EditAppDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateApplicationFn);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: application.display_name,
      environment: application.environment,
      allowedScopes: application.allowed_scopes,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateFn({ 
        data: { 
          id: application.id,
          ...values 
        } 
      });
      toast.success("Aplicação atualizada com sucesso");
      
      queryClient.invalidateQueries({ queryKey: ["api-applications"] });
      
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar aplicação");
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Aplicação</DialogTitle>
          <DialogDescription>
            Altere as configurações da aplicação consumidora.
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
                  <FormDescription>
                    Nome identificador para uso administrativo.
                  </FormDescription>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ambiente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="production">Produção</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Sandbox</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <h4 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Escopos de Acesso
              </h4>
              <div className="grid grid-cols-1 gap-2 border rounded-md p-3 max-h-[200px] overflow-y-auto bg-muted/30">
                {ALLOWED_SCOPES.map((scope) => (
                  <FormField
                    key={scope}
                    control={form.control}
                    name="allowedScopes"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={scope}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(scope)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, scope])
                                  : field.onChange(
                                      field.value?.filter((value) => value !== scope)
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer text-sm">
                            {scope}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
