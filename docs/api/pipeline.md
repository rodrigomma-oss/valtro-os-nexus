# Pipeline compartilhado da API v1

[Início](README.md) · [Primeiros passos](getting-started.md) · [Autenticação](authentication.md) · [Erros](errors.md)

`createApiHandler`, em `src/lib/os/api/pipeline.server.ts`, compõe as etapas comuns sem alterar rotas administrativas, callbacks OAuth, cron, SSR ou endpoints fora de `/api/v1`.

## Ordem real

1. gera um único request ID do servidor;
2. aplica o bloqueio de ambiente, quando configurado;
3. carrega e valida `api_versions`;
4. rejeita `Content-Length` acima do teto absoluto e faz a leitura não destrutiva do corpo bruto;
5. autentica HMAC, incluindo timestamp, nonce e replay protection;
6. exige todos os scopes declarados;
7. aplica o limite efetivo por aplicação e valida body, query e path com Zod;
8. consulta o rate limiter, quando habilitado;
9. executa o handler de domínio;
10. cria o envelope JSON;
11. tenta persistir exatamente um evento de auditoria.

O bloqueio de ambiente precede o versionamento apenas para ocultar a rota interna com 404 em produção. Nem toda rota habilita todas as etapas.

## Request ID e contexto

O request ID de servidor sempre é gerado no formato `req_` seguido de 16 caracteres hexadecimais. O header opcional `X-Valtro-Request-ID` enviado pelo consumidor continua sendo uma correlação separada (`clientRequestId`); ele não substitui o identificador confiável do servidor. O mesmo ID de servidor é usado no contexto, envelope, header e auditoria.

O contexto do handler expõe request, método, path, instante inicial, versão, identidade autenticada, scopes, IP, user agent e payload validado. Segredo HMAC, assinatura, ciphertext, IV, tag e corpo bruto não são expostos.

## Payload

O pipeline verifica primeiro um `Content-Length` válido, mas também mede os bytes efetivamente lidos. Para aplicações autenticadas, usa `technical_limits.max_payload_bytes`, com default de 1 MiB; existe ainda um teto absoluto de rota, por default 10 MiB. O corpo bruto é repassado ao autenticador para canonicalização e depois o valor parseado é validado com Zod.

Limitação conhecida: na ausência de `Content-Length`, a API Fetch disponível ao handler entrega `arrayBuffer()` somente após o buffering. O tamanho real é rejeitado com 413, mas o processo não consegue interromper incrementalmente um stream malicioso antes de terminar a leitura. Streaming com cancelamento antecipado exige uma evolução coordenada com a canonicalização HMAC.

## Auditoria

Sucessos e falhas geram uma única tentativa em `api_audit_logs`. A persistência é best-effort (fail open): uma falha de auditoria é registrada internamente e não altera a resposta ao consumidor. O evento não inclui body, assinatura, segredo ou material criptográfico.

## Rate limiting: proposta pendente de aprovação

Nenhuma rota atual habilita rate limiting. O pipeline possui contrato tipado, resposta 429, `Retry-After`, headers de limite e auditoria; se uma rota ativar a etapa sem provedor distribuído, ela falha fechada com 503 `RATE_LIMIT_UNAVAILABLE`.

A implementação de produção proposta exige uma migration ainda não criada:

- tabela `api_rate_limit_buckets` com `application_id`, `window_start`, `request_count`, `expires_at` e chave primária composta (`application_id`, `window_start`);
- RPC `consume_api_rate_limit(application_id, window_seconds, request_limit)` executada pelo `service_role`, usando o relógio do banco e `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` para incremento atômico;
- revogação de acesso de `PUBLIC`, `anon` e `authenticated`, RLS habilitado e permissões apenas para `service_role`;
- índice em `expires_at` para limpeza e a chave primária para o caminho crítico;
- limpeza periódica de buckets expirados, preferencialmente por job já homologado no ambiente, com retenção curta;
- janela fixa inicial de 60 segundos por aplicação, usando `rate_limit_config.requests_per_minute` e default persistido de 100.

Concorrência: o upsert atômico serializa incrementos do mesmo bucket e impede ultrapassagem silenciosa, mas uma aplicação de volume alto cria contenção em uma linha. A janela fixa também permite burst na fronteira; token bucket pode ser avaliado depois com dados reais.

Custo: uma chamada RPC e uma escrita/WAL por requisição autenticada, além da auditoria já existente. O desenho deve ser validado com carga antes de habilitar rotas de alto volume.

Rollback: desabilitar `rateLimit` nas configurações de rota, remover a RPC e depois remover tabela e índices. Como nenhuma migration foi criada nesta sprint, o estado atual não exige rollback.

Essa migration e a estratégia de limpeza precisam de homologação explícita antes da implementação.

O [estado de implementação](implementation-status.md) registra quais rotas usam o pipeline, e o [roadmap](roadmap.md) mantém o rate limiting persistente como capacidade planejada.
