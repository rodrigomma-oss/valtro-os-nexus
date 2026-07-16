import type { ReactNode } from "react";
import {
  Building2,
  User,
  Phone,
  Instagram,
  MapPin,
  Compass,
  UserCog,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { Lead } from "@/types/lead";

const ORIGEM_LABEL: Record<Lead["origem"], string> = {
  instagram: "Instagram",
  indicacao: "Indicação",
  site: "Site",
  google: "Google",
  evento: "Evento",
  outbound: "Outbound",
};

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: ReactNode;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

export interface LeadInfoCardProps {
  lead: Lead;
}

/**
 * Card com todos os dados institucionais do lead.
 * Utilizado na coluna esquerda da tela de detalhe.
 */
export function LeadInfoCard({ lead }: LeadInfoCardProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Informações da empresa</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <InfoRow icon={User} label="Nome" value={lead.nome} />
        <InfoRow icon={Building2} label="Empresa" value={lead.empresa} />
        <InfoRow icon={Phone} label="Telefone" value={lead.telefone} />
        <InfoRow icon={Instagram} label="Instagram" value={lead.instagram} />
        <InfoRow icon={MapPin} label="Cidade" value={lead.cidade} />
        <InfoRow
          icon={Compass}
          label="Origem"
          value={ORIGEM_LABEL[lead.origem]}
        />
        <InfoRow icon={UserCog} label="Responsável" value={lead.responsavel} />
        <InfoRow
          icon={Activity}
          label="Status"
          value={<StatusBadge status={lead.status} />}
        />
      </CardContent>
    </Card>
  );
}
