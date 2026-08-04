"use client";

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { createApplicationFn } from "@/lib/os/api/apps.functions";

const schema = z.object({
  name: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function NewAppDialogDebug() {
  const [open, setOpen] = useState(false);
  
  const createApplication = useServerFn(createApplicationFn);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
    },
  });

  console.log("NewAppDialogDebug render - open:", open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        onClick={() => {
          console.log("Debug Button Clicked");
          setOpen(true);
        }}
      >
        Abrir Debug Binary
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teste de Depuração Binária - Etapa 5</DialogTitle>
          <DialogDescription>
            Este é um componente simplificado para isolar o problema.
            Dependências atuais: useServerFn + react-hook-form + Form + FormField.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <FormField
              control={form.control}
              name="name"
              render={() => (
                <div>Teste Field</div>
              )}
            />
          </Form>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
