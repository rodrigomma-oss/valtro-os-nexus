/**
 * Playwright global-setup — autentica o usuário de testes via
 * signInWithPassword usando SOMENTE a chave publishable e escreve um
 * storageState temporário que o Playwright injeta em cada teste.
 *
 * Nunca imprime senha, tokens, cookies ou payload da sessão.
 * O arquivo gerado (tests/e2e/.auth/state.json) é ignorado pelo git
 * e não é anexado como artefato do CI.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const STATE_PATH = resolve(process.cwd(), "tests/e2e/.auth/state.json");

function emptyState() {
  return { cookies: [], origins: [] as unknown[] };
}

export default async function globalSetup() {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId =
    process.env.VITE_SUPABASE_PROJECT_ID ??
    process.env.SUPABASE_PROJECT_ID ??
    (supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : undefined);
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

  await mkdir(dirname(STATE_PATH), { recursive: true });

  if (!email || !password || !supabaseUrl || !publishableKey || !projectId) {
    // Escreve um state vazio para que os testes rodem (e pulem gracefully)
    // sem exigir que o CI tenha os secrets configurados (ex.: forks).
    await writeFile(STATE_PATH, JSON.stringify(emptyState()), "utf8");
    // eslint-disable-next-line no-console
    console.log(
      "[e2e] E2E_TEST_EMAIL/PASSWORD ausentes — pulando login e usando storageState vazio.",
    );
    return;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    // Mensagem genérica — nunca vazar detalhes do provedor de auth.
    throw new Error("[e2e] Falha ao autenticar usuário de testes.");
  }

  const storageKey = `sb-${projectId}-auth-token`;
  const origin = new URL(baseURL).origin;

  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: storageKey, value: JSON.stringify(data.session) },
        ],
      },
    ],
  };

  await writeFile(STATE_PATH, JSON.stringify(state), "utf8");
  // eslint-disable-next-line no-console
  console.log("[e2e] storageState gerado para o usuário de testes.");
}

export { STATE_PATH };
