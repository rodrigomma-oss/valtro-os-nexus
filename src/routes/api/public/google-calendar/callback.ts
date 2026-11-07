/**
 * Sprint 14.1 — Callback público do OAuth Google.
 *
 * Está sob `/api/public/*` porque o Google chama esta URL sem sessão do
 * aplicativo. A autenticidade é garantida por:
 *   1. `state` assinado com HMAC (chave só existe no servidor);
 *   2. nonce persistido, com validade de 10 minutos e consumo único.
 *
 * O handler nunca devolve tokens, e-mails de erro do Google crus ou
 * qualquer segredo: apenas redireciona para a UI administrativa com um
 * código de status curto.
 */
import { createFileRoute } from "@tanstack/react-router";

import {
  exchangeCodeForTokens,
  readEmailFromIdToken,
  redirectUriOrigin,
  verifyState,
  TARGET_CALENDAR_SUMMARY,
} from "@/lib/google-calendar/oauth.server";

const ADMIN_PATH = "/os/admin/integracoes";

function back(origin: string, status: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location: `${origin}${ADMIN_PATH}?google=${encodeURIComponent(status)}` },
  });
}

export const Route = createFileRoute("/api/public/google-calendar/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;

        const error = url.searchParams.get("error");
        if (error) return back(origin, "negado");

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return back(origin, "invalido");

        const nonce = verifyState(state);
        if (!nonce) return back(origin, "state_invalido");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Consumo único do nonce: o UPDATE condicional serve de trava.
        const { data: consumed, error: consumeError } = await supabaseAdmin
          .from("calendar_oauth_states")
          .update({ consumed_at: new Date().toISOString() })
          .eq("nonce", nonce)
          .is("consumed_at", null)
          .gt("expires_at", new Date().toISOString())
          .select("id, created_by, redirect_uri")
          .maybeSingle();

        if (consumeError || !consumed) return back(origin, "state_expirado");

        const redirectUri = (consumed as { redirect_uri: string }).redirect_uri;
        const createdBy = (consumed as { created_by: string | null }).created_by;

        try {
          const tokens = await exchangeCodeForTokens(code, redirectUri);
          const { encryptToken } = await import("@/lib/google-calendar/crypto.server");
          const { listCalendars } = await import("@/lib/google-calendar/client.server");

          // Seleciona automaticamente a agenda operacional aprovada.
          let calendarId: string | null = null;
          let calendarSummary: string | null = null;
          try {
            const calendars = await listCalendars(tokens.access_token);
            const match =
              calendars.find((c) => c.summary?.trim() === TARGET_CALENDAR_SUMMARY) ??
              calendars.find((c) => c.summary?.toLowerCase().includes("valtro")) ??
              null;
            if (match) {
              calendarId = match.id;
              calendarSummary = match.summary;
            }
          } catch (listError) {
            console.error("[google-calendar] não foi possível listar agendas", listError);
          }

          const nowIso = new Date().toISOString();
          const payload = {
            provider: "google",
            calendar_scope: "empresa" as const,
            calendar_owner_id: null,
            calendar_id: calendarId,
            calendar_summary: calendarSummary,
            google_account_email: readEmailFromIdToken(tokens.id_token),
            granted_scopes: tokens.scope ?? null,
            access_token_ciphertext: encryptToken(tokens.access_token),
            ...(tokens.refresh_token
              ? { refresh_token_ciphertext: encryptToken(tokens.refresh_token) }
              : {}),
            access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            status: "conectado" as const,
            last_error: null,
            connected_by: createdBy,
            connected_at: nowIso,
            disconnected_at: null,
          };

          const { data: existing } = await supabaseAdmin
            .from("calendar_integrations")
            .select("id")
            .eq("provider", "google")
            .eq("calendar_scope", "empresa")
            .is("calendar_owner_id", null)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from("calendar_integrations")
              .update(payload)
              .eq("id", (existing as { id: string }).id);
          } else {
            await supabaseAdmin.from("calendar_integrations").insert(payload);
          }

          return back(redirectUriOrigin(redirectUri), calendarId ? "conectado" : "sem_agenda");
        } catch (err) {
          console.error("[google-calendar] falha no callback OAuth", err);
          return back(origin, "falha");
        }
      },
    },
  },
});
