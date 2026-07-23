/**
 * Helpers de renderização de placeholders para a Biblioteca de Mensagens.
 * Placeholders suportados: {{nome}}, {{empresa}}, {{tipo_interesse}},
 * {{link_briefing}}, {{responsavel}}, {{data}}.
 *
 * Regras:
 * - Valores ausentes → substituídos por "—".
 * - Renderização é texto puro (sem HTML) — o consumo é sempre em <Textarea>/<pre>.
 */

export interface TemplateVars {
  nome?: string | null;
  empresa?: string | null;
  tipo_interesse?: string | null;
  link_briefing?: string | null;
  responsavel?: string | null;
  data?: string | null;
}

const DASH = "—";

export function renderTemplate(body: string, vars: TemplateVars): string {
  const map: Record<string, string> = {
    nome: vars.nome?.trim() || DASH,
    empresa: vars.empresa?.trim() || DASH,
    tipo_interesse: vars.tipo_interesse?.trim() || DASH,
    link_briefing: vars.link_briefing?.trim() || DASH,
    responsavel: vars.responsavel?.trim() || DASH,
    data: vars.data?.trim() || DASH,
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : `{{${key}}}`;
  });
}

/** Extrai o primeiro nome do contact_name para saudações personalizadas. */
export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0] ?? "";
}
