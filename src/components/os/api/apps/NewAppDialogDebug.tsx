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
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
          <DialogTitle>Teste de Depuração Binária - Etapa 6</DialogTitle>
          <DialogDescription>
            Dependências atuais: useServerFn + Form + FormField + FormItem + FormControl + Input.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Nome da aplicação" {...field} />
                  </FormControl>
                </FormItem>
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
