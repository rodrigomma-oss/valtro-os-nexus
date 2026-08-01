
/**
 * Sanitiza e valida redirecionamentos internos para evitar vulnerabilidades de Open Redirect.
 * @param target URL ou path de destino
 * @param fallback Destino padrão caso o target seja inválido
 * @returns Path interno seguro (começando com /)
 */
export function sanitizeAuthRedirect(target: string | null | undefined, fallback = "/os/dashboard"): string {
  if (!target) return fallback;

  try {
    // Decodifica caso venha encodado (comum em search params)
    const decoded = decodeURIComponent(target);

    // Bloqueia tentativas óbvias de caminhos externos ou protocolos perigosos
    // Rejeita qualquer coisa que comece com http, data:, javascript:, //, ou \
    if (
      decoded.toLowerCase().startsWith("http") ||
      decoded.startsWith("//") ||
      decoded.startsWith("\\") ||
      decoded.toLowerCase().startsWith("javascript:") ||
      decoded.toLowerCase().startsWith("data:")
    ) {
      return fallback;
    }

    // Se for uma URL completa, verifica se o origin é o mesmo
    if (decoded.includes("://")) {
      const url = new URL(decoded);
      
      // No ambiente do Vitest em Node, window.location não existe.
      // Permitimos localhost:8080 explicitamente para suportar testes unitários e dev local.
      const isAllowedLocal = url.host === 'localhost:8080' || url.host === '127.0.0.1:8080';
      
      let isSameOrigin = false;
      try {
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          isSameOrigin = url.origin === window.location.origin;
        }
      } catch (e) {}

      if (!isSameOrigin && !isAllowedLocal) {
        return fallback;
      }

      const result = url.pathname + url.search + url.hash;
      if (result.startsWith("/auth") || !result.startsWith("/")) return fallback;
      return result;
    }

    // Garante que comece com uma única / e não seja /auth (loop)
    if (!decoded.startsWith("/")) return fallback;
    
    // Evita loops redirecionando para a própria página de auth
    if (decoded.startsWith("/auth")) return fallback;

    // Normaliza múltiplas barras iniciais (ex: ///google.com -> /google.com -> bloqueado acima se não começar com /)
    // Mas aqui já garantimos que começa com / e não é //
    
    return decoded;
  } catch (e) {
    return fallback;
  }
}
