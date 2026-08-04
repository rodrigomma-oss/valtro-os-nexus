# Roadmap da API pública

[Início](README.md) · [Estado de implementação](implementation-status.md) · [Changelog](changelog.md)

Este roadmap registra o estado observado no repositório. Ele não constitui promessa de prazo, disponibilidade ou compatibilidade futura.

## Implementado

- Contrato OpenAPI 3.1 de `GET /api/v1/meta`.
- Pipeline compartilhado para rotas `/api/v1`.
- Request ID gerado pelo servidor e envelopes JSON de sucesso e erro.
- Consulta do ciclo de vida da versão v1.
- Fundação HMAC `VALTRO-HMAC-SHA256-V1`, incluindo timestamp, nonce e proteção persistente contra replay.
- Autorização por scopes configurável por rota.
- Validação Zod configurável para body, query e path.
- Limite de payload no pipeline.
- Auditoria best-effort das rotas v1.
- Testes unitários e de integração do pipeline e dos handlers atuais.

Implementado não significa necessariamente exposto no contrato público. A matriz que faz essa distinção está em [Estado de implementação](implementation-status.md).

## Em desenvolvimento

Não há, nesta sprint, componente de runtime da API marcado como em desenvolvimento. O rate limiting possui contrato no pipeline e uma proposta técnica, mas a persistência distribuída ainda não foi implementada; por isso ele permanece classificado como planejado.

## Planejado

- Persistência atômica e distribuída para rate limiting, após homologação específica.
- Hostname público definitivo para a API.
- Endpoints públicos autenticados de negócio.
- Endpoints de suporte para tickets e bugs.
- Capacidades públicas de feedback, sugestões e anexos.
- Política formal de antecedência para depreciação e sunset.
- Publicação navegável do OpenAPI com Scalar, quando houver infraestrutura aprovada.
- SDKs oficiais, conforme a [estratégia futura de SDK](sdk-strategy.md).
- Portal do Desenvolvedor e playground, sujeitos a sprints próprias.

Nenhum item planejado está documentado como disponível para integração.
