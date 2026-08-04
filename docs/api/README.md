# API pública do Valtro OS

Esta é a documentação técnica oficial da API pública do Valtro OS. Ela descreve somente o contrato e as capacidades presentes neste repositório. No estado atual, o único endpoint público da API v1 é `GET /api/v1/meta`.

O hostname definitivo da API ainda não foi homologado. Consulte o [guia de integração](integration-guide.md) antes de escolher uma URL de ambiente.

## Comece aqui

1. Siga os [primeiros passos](getting-started.md) para realizar a primeira chamada.
2. Consulte o [contrato OpenAPI 3.1](openapi-v1.yaml) para o formato exato da API.
3. Leia [autenticação](authentication.md) antes de preparar integrações HMAC futuras.
4. Use o [catálogo de erros](errors.md) e o [guia de versionamento](versioning.md) para implementar o cliente.

## Índice

| Documento                                           | Responsabilidade                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| [Primeiros passos](getting-started.md)              | Visão geral, arquitetura, primeira chamada e leitura da resposta.       |
| [Guia de integração](integration-guide.md)          | Ambientes, exemplo HTTP e limites técnicos atuais.                      |
| [Autenticação](authentication.md)                   | Protocolo HMAC-SHA256, headers e controles implementados.               |
| [Contrato OpenAPI 3.1](openapi-v1.yaml)             | Contrato legível por ferramentas do endpoint público v1.                |
| [Versionamento](versioning.md)                      | Path versioning e ciclo de vida das versões.                            |
| [Pipeline](pipeline.md)                             | Ordem e responsabilidades do runtime compartilhado da API v1.           |
| [Catálogo de erros](errors.md)                      | Envelope de resposta e códigos do runtime.                              |
| [Estado de implementação](implementation-status.md) | Separação entre recursos públicos, internos, operacionais e planejados. |
| [Roadmap](roadmap.md)                               | Capacidades implementadas, em desenvolvimento e planejadas.             |
| [Estratégia futura de SDK](sdk-strategy.md)         | Linguagens previstas, versionamento e organização futura dos SDKs.      |
| [Changelog](changelog.md)                           | Histórico documental das sprints da API.                                |

## OpenAPI navegável

Quando houver uma superfície oficial de publicação, a solução escolhida para renderizar o contrato será **Scalar**. A escolha considera o suporte a OpenAPI 3.1, a experiência de navegação e a possibilidade de integração direta a partir de um único arquivo de contrato.

Scalar não foi incorporado nesta sprint. Adicionar uma interface agora exigiria uma dependência e uma rota ou hospedagem pública antes da definição do domínio e da infraestrutura de publicação. Isso alteraria a aplicação sem benefício operacional imediato. O arquivo [`openapi-v1.yaml`](openapi-v1.yaml) permanece como fonte única do contrato; não há documentação gerada ou duplicada no repositório.

### Comparação técnica

| Critério     | Scalar                                                                             | Redoc                                                                                          |
| ------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Manutenção   | Configuração enxuta e foco em uma experiência moderna de API.                      | Ecossistema maduro, mas uma UI publicada também exigiria integração própria.                   |
| Integração   | Pode consumir diretamente o único `openapi-v1.yaml` em uma futura página dedicada. | Também consumiria o contrato, mas uma UI é adicional ao CLI de validação já existente.         |
| OpenAPI 3.1  | Adequado ao contrato atual em OpenAPI 3.1.                                         | Compatível, inclusive por ferramentas Redocly já usadas somente para lint.                     |
| Performance  | Carregamento de uma única especificação; deve ser medido quando houver publicação. | Também depende do tamanho do bundle e da especificação; sem vantagem comprovada neste projeto. |
| Simplicidade | Melhor opção futura para uma página técnica única e navegável.                     | O CLI existente valida o contrato, mas não oferece por si só uma página publicada.             |

## Escopo atual

- API pública contratada: `GET /api/v1/meta`.
- Autenticação HMAC e autorização por scopes: implementadas no pipeline, ainda sem endpoint público autenticado de negócio.
- Rate limiting distribuído: não implementado e não habilitado em nenhuma rota.
- SDK, playground e Portal do Desenvolvedor: não implementados.

Consulte o [estado de implementação](implementation-status.md) para a matriz completa e o [roadmap](roadmap.md) para a separação explícita entre presente e futuro.
