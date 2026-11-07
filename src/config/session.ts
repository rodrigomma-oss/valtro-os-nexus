/**
 * Configuração central de gestão de sessão (Sprint 15.2.2C).
 * Nenhum tempo deve ser hardcoded fora deste arquivo.
 */

/** Minutos de inatividade até o encerramento automático da sessão. */
export const SESSION_IDLE_TIMEOUT_MINUTES = 30;

/** Segundos de antecedência do aviso "sessão prestes a expirar". */
export const SESSION_WARNING_SECONDS = 60;

/** Duração máxima absoluta da sessão, mesmo com atividade contínua. */
export const SESSION_MAX_DURATION_HOURS = 8;

/** Intervalo do tick de verificação (ms). */
export const SESSION_TICK_INTERVAL_MS = 1_000;

/** Throttle de escrita de atividade em localStorage (ms) — evita I/O excessivo. */
export const SESSION_ACTIVITY_WRITE_THROTTLE_MS = 5_000;

/** Chaves compartilhadas entre abas (localStorage). */
export const SESSION_STORAGE_KEYS = {
  lastActivity: "valtro.session.last_activity",
  startedAt: "valtro.session.started_at",
} as const;

export const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_MINUTES * 60_000;
export const SESSION_WARNING_MS = SESSION_WARNING_SECONDS * 1_000;
export const SESSION_MAX_DURATION_MS = SESSION_MAX_DURATION_HOURS * 60 * 60_000;
