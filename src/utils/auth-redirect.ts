
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
      
      let isAllowedOrigin = false;
      try {
        if (typeof window !== 'undefined' && window.location) {
          isAllowedOrigin = url.origin === window.location.origin;
        } else {
          // Fallback para ambiente de teste/SSR
          isAllowedOrigin = url.host.includes('localhost:8080');
        }
      } catch (e) {
        isAllowedOrigin = url.host.includes('localhost:8080');
      }

      if (!isAllowedOrigin) {
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
