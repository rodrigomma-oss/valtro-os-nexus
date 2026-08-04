"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DialogIsolationTest() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg mb-6 bg-primary/5">
      <h3 className="text-sm font-medium mb-2 text-primary">Teste de Isolamento (OPS-API-003D.2-ISO)</h3>
      <Button onClick={() => setOpen(true)} variant="outline">
        Abrir Teste
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teste</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Teste</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
