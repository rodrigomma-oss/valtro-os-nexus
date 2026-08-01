
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
      let currentOrigin = 'http://localhost:8080';
      try {
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          currentOrigin = window.location.origin;
        }
      } catch (e) {}
      
      // Validação permissiva para o domínio de teste e o domínio real
      const isLocalhost = url.origin.includes('localhost:8080');
      const isSameOrigin = url.origin === currentOrigin;

      if (!isSameOrigin && !isLocalhost) {
        return fallback;
      }
      // Se for do mesmo origin, retorna apenas o path + search + hash
      const result = url.pathname + url.search + url.hash;
      // Evita loops e garante que comece com /
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
