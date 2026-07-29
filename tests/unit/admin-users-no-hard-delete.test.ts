/**
 * Sprint 15.2.2B — Guarda de regressão.
 *
 * Requisito aprovado: usuários NUNCA são excluídos fisicamente. A remoção de
 * acesso ocorre apenas por bloqueio (ban) via Supabase Auth. Estes testes falham
 * caso alguém reintroduza um caminho de exclusão física no servidor ou na UI.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const SERVER_FILE = "src/lib/admin-users.functions.ts";
const UI_FILE = "src/routes/_authenticated.crm.admin.usuarios.tsx";

/** Remove comentários de linha e de bloco para não gerar falso positivo em documentação. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("Administração de usuários — ausência de exclusão física", () => {
  it("não chama auth.admin.deleteUser em nenhuma server function", () => {
    const code = stripComments(readSource(SERVER_FILE));
    expect(code).not.toMatch(/deleteUser\s*\(/);
    expect(code).not.toMatch(/admin\.deleteUser/);
  });

  it("não exporta uma server function de exclusão de usuário", () => {
    const code = stripComments(readSource(SERVER_FILE));
    expect(code).not.toMatch(/export\s+const\s+deleteUser\b/);
  });

  it("mantém o bloqueio via ban_duration como único caminho de remoção de acesso", () => {
    const code = stripComments(readSource(SERVER_FILE));
    expect(code).toMatch(/export\s+const\s+toggleUserBlock\b/);
    expect(code).toMatch(/ban_duration/);
    expect(code).toMatch(/"infinite"/);
  });

  it("não expõe ação de exclusão na interface administrativa", () => {
    const ui = stripComments(readSource(UI_FILE));
    expect(ui).not.toMatch(/deleteUser/);
    expect(ui).not.toMatch(/Trash2/);
    expect(ui).not.toMatch(/type:\s*"delete"/);
    expect(ui).not.toMatch(/Excluir/);
  });

  it("não executa DELETE em profiles nem na trilha de auditoria", () => {
    const code = stripComments(readSource(SERVER_FILE));
    expect(code).not.toMatch(/from\("profiles"\)\s*\.delete\(/);
    expect(code).not.toMatch(/from\("user_admin_audit_events"\)\s*\.delete\(/);
  });
});
