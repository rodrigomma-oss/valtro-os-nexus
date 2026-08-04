# Guia de Integração

Bem-vindo à API do Valtro OS. Este guia ajudará você a conectar seu produto aos nossos serviços de suporte e operações.

## Fluxo de Dados

A arquitetura recomendada para segurança máxima:

1. **Frontend do Seu Produto:** Coleta os dados do usuário.
2. **Seu Backend:**
   - Recebe os dados do frontend.
   - Valida a sessão do usuário.
   - Calcula a assinatura HMAC usando seu `Key Secret`.
   - Faz a chamada para `api.valtrolabs.pro/api/v1/...`.
3. **Valtro OS:** Processa e retorna a resposta.

**Nunca chame a API diretamente do navegador se a rota exigir autenticação.**

## Limites Técnicos (Defaults)

- **Payload Máximo:** 1 MB por requisição.
- **Rate Limit:** 120 requisições por minuto por aplicação.
- **Time Window:** Requisições devem chegar em até 15 minutos do timestamp gerado.

## Primeiros Passos

1. Obtenha seu `Key ID` e `Key Secret` no painel administrativo do Valtro OS.
2. Implemente o helper de assinatura no seu backend.
3. Teste a conectividade usando o endpoint `GET /api/v1/meta`.
