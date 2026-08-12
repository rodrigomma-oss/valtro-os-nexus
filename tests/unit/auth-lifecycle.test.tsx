import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthPage } from "../auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import React from "react";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => () => ({
    useSearch: () => ({ redirect: "/" }),
  }),
  useNavigate: vi.fn(),
  Link: ({ children }: any) => <a>{children}</a>,
}));

// Mock utilities
vi.mock("@/utils/auth-redirect", () => ({
  sanitizeAuthRedirect: (t: any) => t || "/os/dashboard",
}));

describe("AuthPage - Google OAuth Lifecycle", () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  it("deve manter loading (checking) enquanto a sessão está sendo hidratada", async () => {
    // onAuthStateChange não chama o callback imediatamente neste teste
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    
    render(<AuthPage />);
    expect(screen.getByTestId("loader")).toBeDefined();
  });

  it("deve redirecionar quando INITIAL_SESSION contém um usuário", async () => {
    let authCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
    render(<AuthPage />);
    
    // Simula Supabase terminando a hidratação com usuário
    await waitFor(() => {
      authCallback("INITIAL_SESSION", { user: { id: "123", email: "test@valtro.com" } });
    });

    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/os/dashboard", replace: true }));
  });

  it("deve mostrar formulário quando INITIAL_SESSION não contém usuário", async () => {
    let authCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
    render(<AuthPage />);
    
    // Simula Supabase terminando a hidratação sem usuário
    authCallback("INITIAL_SESSION", null);

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
      expect(screen.getByText("Entrar")).toBeDefined();
    });
  });

  it("deve redirecionar em SIGNED_IN após Google Callback", async () => {
    let authCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
    render(<AuthPage />);
    
    // Primeiro INITIAL_SESSION nulo (ainda carregando callback)
    authCallback("INITIAL_SESSION", null);
    
    // Depois o evento SIGNED_IN do callback bem sucedido
    authCallback("SIGNED_IN", { user: { id: "123" } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/os/dashboard", replace: true }));
    });
  });

  it("deve limpar a subscrição ao desmontar o componente", () => {
    const unsubscribe = vi.fn();
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
    
    const { unmount } = render(<AuthPage />);
    unmount();
    
    expect(unsubscribe).toHaveBeenCalled();
  });
});
