# Changelog da API pública

[Início](README.md) · [Estado de implementação](implementation-status.md) · [Roadmap](roadmap.md)

Este histórico acompanha entregas por sprint. Ele não atribui versões de produto que não existam no repositório.

## OPS-API-003A — Documentação oficial

- Organização da documentação técnica em uma estrutura oficial e navegável.
- Inclusão de índice, primeiros passos, roadmap, changelog e estratégia futura de SDK.
- Escolha documental do Scalar para futura publicação do OpenAPI, sem integração ao runtime nesta sprint.

## OPS-API-002C — Pipeline compartilhado da API pública v1

- Implementação do pipeline comum das rotas v1.
- Integração de versionamento, request ID, autenticação configurável, scopes, validação, limite de payload, envelopes e auditoria.
- Migração da rota de metadados e criação de uma rota técnica interna para testes de autenticação.
- Inclusão de testes unitários e de integração do pipeline.
- Rate limiting persistente permaneceu sem migration e desabilitado nas rotas atuais.

## OPS-API-002B — Alinhamento arquitetural

- Alinhamento do contrato OpenAPI e da documentação com o estado real da API v1.
- Consolidação das fundações de autenticação, respostas, versionamento e auditoria usadas pela etapa seguinte.
- Manutenção de `GET /api/v1/meta` como único endpoint público contratado.

## OPS-API-002A — Inventário técnico

- Inventário da estrutura relacionada à API pública.
- Mapeamento de rotas, autenticação, segurança, documentação, testes e componentes ausentes.
- Identificação das lacunas que orientaram o alinhamento arquitetural posterior.

## OPS-API-001 — Fundações da API

- Criação das fundações persistidas para aplicações, credenciais, capacidades, scopes e ciclo de vida da API.
- Inclusão da infraestrutura de autenticação e gestão de consumidores presente nas migrations OPS-API-001E, OPS-API-001F e OPS-API-001G.

Detalhes do contrato vigente devem ser consultados no [OpenAPI](openapi-v1.yaml), e não inferidos deste histórico.
