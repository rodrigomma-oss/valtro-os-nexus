import type { ReactNode } from "react";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Activity,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_TONE } from "@/types/client";
import { formatPhone } from "@/lib/formatters";

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

export function ClientInfoCard({ client }: { client: Client }) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" strokeWidth={1.75} />
          Dados do cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Row icon={Building2} label="Empresa" value={client.company_name} />
        <Row icon={User} label="Contato" value={client.contact_name} />
        <Row
          icon={Phone}
          label="Telefone"
          value={client.phone ? formatPhone(client.phone) : "—"}
        />
        <Row icon={Mail} label="E-mail" value={client.email ?? "—"} />
        <Row
          icon={MapPin}
          label="Localização"
          value={[client.city, client.state].filter(Boolean).join(" · ") || "—"}
        />
        <Row icon={Tag} label="Segmento" value={client.segment ?? "—"} />
        <Row icon={Briefcase} label="Responsável" value={client.owner_name ?? "—"} />
        <Row
          icon={Activity}
          label="Status"
          value={
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                CLIENT_STATUS_TONE[client.status],
              )}
            >
              {CLIENT_STATUS_LABEL[client.status]}
            </span>
          }
        />
      </CardContent>
    </Card>
  );
}
