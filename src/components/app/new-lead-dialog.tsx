import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLead } from "@/lib/leads.functions";
import { SOURCE_LABEL, type LeadSource } from "@/types/lead";
import { listServices } from "@/lib/services.functions";
import { serviceCategoryOptions } from "@/lib/service-catalog";
import type { ServiceType } from "@/types/briefing";
import { maskPhoneInput, onlyDigits } from "@/lib/formatters";

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCES: LeadSource[] = [
  "instagram",
  "indicacao",
  "site",
  "google",
  "evento",
  "outbound",
  "diagnostico",
  "manual",
];

const INITIAL = {
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  instagram: "",
  city: "",
  state: "",
  segment: "",
  source: "manual" as LeadSource,
  service_type: "" as ServiceType | "",
};

export function NewLeadDialog({ open, onOpenChange }: NewLeadDialogProps) {
  const [form, setForm] = useState(INITIAL);

  const qc = useQueryClient();
  const createLeadFn = useServerFn(createLead);
  const listServicesFn = useServerFn(listServices);

  // Sprint 15.2.3A — o tipo de serviço é derivado exclusivamente do catálogo
  // oficial (`services`). Nenhuma lista fixa local.
  const servicesQuery = useQuery({
    queryKey: ["services-catalog", "active"],
    queryFn: () => listServicesFn(),
    enabled: open,
    staleTime: 60_000,
  });
  const serviceOptions = useMemo(
    () => serviceCategoryOptions(servicesQuery.data ?? []),
    [servicesQuery.data],
  );
  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      createLeadFn({
        data: {
          company_name: payload.company_name,
          contact_name: payload.contact_name,
          phone: onlyDigits(payload.phone),
          email: payload.email,
          instagram: payload.instagram,
          city: payload.city,
          state: payload.state,
          segment: payload.segment,
          source: payload.source,
          service_type: (payload.service_type || "nao_definido") as ServiceType,
        },
      }),
    onSuccess: () => {
      toast.success("Lead criado com sucesso.");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-kpis"] });
      onOpenChange(false);
      setForm(INITIAL);
    },
    onError: (err: Error) => {
      toast.error("Não foi possível criar o lead.", { description: err.message });
    },
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.contact_name.trim()) {
      toast.error("Empresa e contato são obrigatórios.");
      return;
    }
    if (!form.service_type) {
      toast.error("Selecione o tipo de serviço.");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>
            Cadastre uma nova oportunidade no funil consultivo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="company_name">Empresa *</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="contact_name">Contato *</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => update("contact_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => update("phone", maskPhoneInput(e.target.value))}
                inputMode="tel"
                placeholder="(00) 00000-0000"
                maxLength={16}
              />

            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={form.instagram}
                onChange={(e) => update("instagram", e.target.value)}
                placeholder="@empresa"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="segment">Segmento</Label>
              <Input
                id="segment"
                value={form.segment}
                onChange={(e) => update("segment", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="service_type">Tipo de serviço *</Label>
              <Select
                value={form.service_type}
                onValueChange={(v) => update("service_type", v)}
              >
                <SelectTrigger id="service_type">
                  <SelectValue
                    placeholder={
                      servicesQuery.isLoading
                        ? "Carregando catálogo…"
                        : "Selecione o tipo de serviço"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="source">Origem</Label>
              <Select
                value={form.source}
                onValueChange={(v) => update("source", v)}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Criar lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
