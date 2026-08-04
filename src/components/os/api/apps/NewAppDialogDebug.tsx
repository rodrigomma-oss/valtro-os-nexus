"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createApplicationFn } from "@/lib/os/api/apps.functions";

export function NewAppDialogDebug() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        Abrir Debug Binary
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Aplicação (Debug)</DialogTitle>
          <DialogDescription>
            Teste de depuração binária.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>Teste</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
