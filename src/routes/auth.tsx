import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Mode = "signin" | "signup" | "forgot";

function isSafeRedirect(target: string | undefined): target is string {
  if (!target) return false;
  try {
    const url = new URL(target, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const safeRedirect = isSafeRedirect(redirect) ? redirect : "/crm/dashboard";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: safeRedirect, replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate, safeRedirect]);

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.", {
        description: result.error.message,
      });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: safeRedirect, replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safeRedirect, replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada.", {
          description: "Você já pode acessar a plataforma.",
        });
        navigate({ to: safeRedirect, replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("E-mail enviado.", {
          description: "Verifique sua caixa para redefinir a senha.",
        });
        setMode("signin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao autenticar.";
      toast.error("Não foi possível continuar.", { description: message });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const titles: Record<Mode, { title: string; sub: string; cta: string }> = {
    signin: { title: "Entrar", sub: "Acesse a plataforma comercial da Valtro Labs.", cta: "Entrar" },
    signup: { title: "Criar conta", sub: "Cadastre-se para acessar o CRM.", cta: "Criar conta" },
    forgot: { title: "Recuperar acesso", sub: "Enviaremos um link para redefinir sua senha.", cta: "Enviar link" },
  };
  const t = titles[mode];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="hidden md:flex md:w-1/2 bg-institutional text-white p-12 flex-col justify-between">
        <Link to="/" className="inline-flex">
          <Logo variant="compact" className="[&_span]:text-white [&_svg]:text-white" />
        </Link>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Consultoria e tecnologia em um só lugar.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Plataforma proprietária da Valtro Labs para gestão comercial, diagnóstico e crescimento de negócios digitais.
          </p>
        </div>
        <p className="text-xs text-white/60">© {new Date().getFullYear()} Valtro Labs</p>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden mb-2">
            <Logo variant="compact" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.sub}</p>
          </div>

          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09A6.987 6.987 0 0 1 5.47 12c0-.73.13-1.43.36-2.09V7.07H2.18A11.002 11.002 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Continuar com Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setMode("forgot")}
                    >
                      Esqueci
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.cta}
            </Button>
          </form>

          <div className="text-sm text-center text-muted-foreground">
            {mode === "signin" && (
              <>
                Não tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  Criar agora
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Já tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                  Entrar
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                Voltar para o login
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
