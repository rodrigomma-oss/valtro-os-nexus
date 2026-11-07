import { SESSION_STORAGE_KEYS } from "@/config/session";

/**
 * Helpers de sessão compartilhados entre abas.
 * Toda a informação vive em localStorage para que o `storage` event
 * mantenha as abas coerentes sem canais adicionais.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readTimestamp(key: string): number | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeTimestamp(key: string, value: number): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* storage indisponível (modo privado) — degradação silenciosa */
  }
}

export function getLastActivity(): number | null {
  return readTimestamp(SESSION_STORAGE_KEYS.lastActivity);
}

export function setLastActivity(now: number = Date.now()): void {
  writeTimestamp(SESSION_STORAGE_KEYS.lastActivity, now);
}

export function getSessionStartedAt(): number | null {
  return readTimestamp(SESSION_STORAGE_KEYS.startedAt);
}

/** Define o início da sessão apenas se ainda não existir (idempotente entre abas). */
export function ensureSessionStartedAt(now: number = Date.now()): number {
  const existing = getSessionStartedAt();
  if (existing !== null) return existing;
  writeTimestamp(SESSION_STORAGE_KEYS.startedAt, now);
  return now;
}

export function clearSessionMarkers(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEYS.lastActivity);
    window.localStorage.removeItem(SESSION_STORAGE_KEYS.startedAt);
  } catch {
    /* noop */
  }
}
