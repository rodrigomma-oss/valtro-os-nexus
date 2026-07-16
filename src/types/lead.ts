/**
 * Domínio: CRM Comercial.
 * Tipos base para leads — utilizados a partir da Sprint 1.
 */

export type LeadStatus =
  | "novo"
  | "contato"
  | "qualificado"
  | "proposta"
  | "ganho"
  | "perdido";

export type LeadOrigem =
  | "instagram"
  | "indicacao"
  | "site"
  | "google"
  | "evento"
  | "outbound";

export interface Lead {
  id: string;
  nome: string;
  empresa: string;
  telefone: string;
  instagram: string;
  cidade: string;
  status: LeadStatus;
  responsavel: string;
  dataCriacao: string; // ISO-8601
  origem: LeadOrigem;
}
