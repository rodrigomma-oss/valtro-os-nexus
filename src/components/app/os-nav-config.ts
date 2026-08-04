import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Layers,
  LifeBuoy,
  Bug,
  MessageSquareHeart,
  FlaskConical,
  Shield,
  Plug,
  Code2,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Abre em nova aba (portais públicos). */
  external?: boolean;
  /** Visível apenas para administradores. */
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navegação modular do Valtro OS (VOS-001B.1).
 * Módulos futuros não aparecem aqui — serão adicionados quando existirem.
 */
export const OS_NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [{ label: "Dashboard", to: "/os/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    items: [
      { label: "Leads", to: "/os/comercial/leads", icon: Users },
      { label: "Clientes", to: "/os/comercial/clientes", icon: Building2 },
      { label: "Projetos", to: "/os/comercial/projetos", icon: FolderKanban },
      { label: "Serviços", to: "/os/comercial/servicos", icon: Layers },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { label: "Chamados", to: "/os/atendimento/chamados", icon: LifeBuoy },
      { label: "Bugs", to: "/os/atendimento/bugs", icon: Bug },
      { label: "Feedback", to: "/os/atendimento/feedback", icon: MessageSquareHeart },
    ],
  },
  {
    label: "Produtos",
    items: [
      {
        label: "Valtro Pricing · Beta Fechado",
        to: "/os/produtos/valtro-pricing/beta",
        icon: FlaskConical,
      },
    ],
  },
  {
    label: "Administração",
    items: [
      { label: "Usuários", to: "/os/admin/usuarios", icon: Shield, adminOnly: true },
      { label: "Integrações", to: "/os/admin/integracoes", icon: Plug, adminOnly: true },
    ],
  },
  {
    label: "Portais Públicos",
    items: [
      {
        label: "Portal de Diagnóstico",
        to: "/diagnostico",
        icon: ClipboardList,
        external: true,
      },
      {
        label: "Portal do Desenvolvedor",
        to: "/api-docs",
        icon: Code2,
        external: false,
      },
    ],
  },
];
