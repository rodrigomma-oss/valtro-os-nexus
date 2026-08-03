/**
 * Definições e Schemas para a Gestão de Consumidores da API.
 */
import { z } from 'zod';

export const API_CAPABILITIES = [
  'support.tickets',
  'support.bugs',
  'support.feedback',
  'support.suggestions',
  'support.attachments',
  'support.ticket_status',
] as const;

export type ApiCapability = typeof API_CAPABILITIES[number];

export const API_VERSION_STATUS = [
  'development',
  'stable',
  'deprecated',
  'sunset',
  'disabled',
] as const;

export type ApiVersionStatus = typeof API_VERSION_STATUS[number];

export const TechnicalLimitsSchema = z.object({
  max_payload_bytes: z.number().int().positive().default(1048576), // 1MB
  max_attachment_bytes: z.number().int().positive().default(10485760), // 10MB
  max_attachments_per_entity: z.number().int().positive().default(5),
  global_requests_per_minute: z.number().int().positive().optional(),
});

export type TechnicalLimits = z.infer<typeof TechnicalLimitsSchema>;

export const FeatureFlagsSchema = z.record(z.string(), z.union([z.boolean(), z.string(), z.number(), z.record(z.string(), z.any())]));

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export interface ApiVersion {
  id: string;
  version_code: string;
  display_name: string;
  status: ApiVersionStatus;
  released_at: string | null;
  deprecated_at: string | null;
  sunset_at: string | null;
  replacement_version_id: string | null;
  documentation_url: string | null;
  public_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiApplicationSettings {
  capabilities: ApiCapability[];
  feature_flags: FeatureFlags;
  min_api_version_id: string | null;
  max_api_version_id: string | null;
  preferred_api_version_id: string | null;
  technical_limits: TechnicalLimits;
  activation_at: string | null;
  deprecation_at: string | null;
  sunset_at: string | null;
  admin_message: string | null;
}
