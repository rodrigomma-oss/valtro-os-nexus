import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthPage } from "../../src/routes/auth";
import { supabase } from "../../src/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import React from "react";

// Mock Supabase
vi.mock("../../src/integrations/supabase/client", () => ({
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
const { mockUseSearch } = vi.hoisted(() => ({ mockUseSearch: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => () => ({
    useSearch: mockUseSearch,
  }),
  useNavigate: vi.fn(),
  Link: ({ children }: any) => <a>{children}</a>,
}));

// Mock utilities
vi.mock("../../src/utils/auth-redirect", () => ({
  sanitizeAuthRedirect: (t: any) => t || "/os/dashboard",
}));

describe("AuthPage - Google OAuth Lifecycle", () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    mockUseSearch.mockReturnValue({ redirect: "/os/dashboard" });
  });

  it("deve manter loading (checking) enquanto a sessão está sendo hidratada", async () => {
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
    
    await act(async () => {
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
    
    await act(async () => {
      authCallback("INITIAL_SESSION", null);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
      // Usamos getByRole heading para evitar ambiguidade
      expect(screen.getByRole("heading", { name: "Entrar" })).toBeDefined();
    });
  });

  it("deve redirecionar em SIGNED_IN após Google Callback", async () => {
    let authCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
    render(<AuthPage />);
    
    await act(async () => {
      authCallback("INITIAL_SESSION", null);
    });
    
    await act(async () => {
      authCallback("SIGNED_IN", { user: { id: "123" } });
    });

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
