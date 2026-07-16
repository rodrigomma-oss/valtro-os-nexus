import type { ReactNode } from "react";
import {
  Building2,
  User,
  Phone,
  Mail,
  Instagram,
  MapPin,
  Compass,
  UserCog,
  Activity,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { Lead } from "@/types/lead";
import { SOURCE_LABEL } from "@/types/lead";

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

export function LeadInfoCard({ lead }: LeadInfoCardProps) {
  const dash = <span className="text-muted-foreground">—</span>;
  const location = [lead.city, lead.state].filter(Boolean).join(" / ") || null;
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Informações da empresa</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <InfoRow icon={User} label="Contato" value={lead.contact_name} />
        <InfoRow icon={Building2} label="Empresa" value={lead.company_name} />
        <InfoRow icon={Phone} label="Telefone" value={lead.phone ?? dash} />
        <InfoRow icon={Mail} label="E-mail" value={lead.email ?? dash} />
        <InfoRow icon={Instagram} label="Instagram" value={lead.instagram ?? dash} />
        <InfoRow icon={MapPin} label="Localização" value={location ?? dash} />
        <InfoRow icon={Tag} label="Segmento" value={lead.segment ?? dash} />
        <InfoRow icon={Compass} label="Origem" value={SOURCE_LABEL[lead.source]} />
        <InfoRow icon={UserCog} label="Responsável" value={lead.owner_name ?? dash} />
        <InfoRow
          icon={Activity}
          label="Status"
          value={<StatusBadge status={lead.status} />}
        />
      </CardContent>
    </Card>
  );
}
