# Estratégia futura de SDK

[Início](README.md) · [OpenAPI](openapi-v1.yaml) · [Versionamento](versioning.md) · [Roadmap](roadmap.md)

Nenhum SDK oficial do Valtro OS está implementado ou publicado. Este documento registra somente a organização prevista para uma sprint futura.

## Linguagens previstas

A ordem inicial de avaliação é:

1. TypeScript/JavaScript, para integrações Node.js e runtimes web compatíveis;
2. Python, para automação e integrações de backend;
3. outras linguagens apenas quando houver demanda e endpoints públicos de negócio suficientes para justificar manutenção.

Essa lista não representa disponibilidade nem compromisso de entrega.

## Fonte do contrato

O arquivo [`openapi-v1.yaml`](openapi-v1.yaml) deverá ser a única fonte para geração de modelos e operações. Código gerado não deve introduzir endpoints, schemas ou comportamentos ausentes do contrato.

Camadas manuais deverão se limitar a aspectos que a geração não resolva adequadamente, como assinatura HMAC, tratamento idiomático de erros e configuração do cliente.

## Versionamento

- Cada SDK deverá usar versionamento semântico próprio.
- A versão do pacote não deverá ser confundida com a versão principal da API no path.
- Mudanças incompatíveis no SDK exigirão nova versão principal do pacote.
- Suporte a uma nova versão da API poderá ser adicionado de forma compatível quando a linguagem permitir.
- A matriz de compatibilidade entre pacote e API deverá acompanhar cada release do SDK.

## Organização futura

Cada linguagem deverá possuir pacote e pipeline de release independentes, com:

- cliente gerado a partir do OpenAPI;
- módulo de autenticação HMAC;
- tipos e erros públicos;
- exemplos mínimos;
- testes contra fixtures do contrato;
- changelog e política de suporte próprios.

A decisão entre monorepo e repositórios separados fica adiada até a definição de ownership, distribuição e cadência de release. Nenhum pacote, scaffold ou automação de publicação foi criado nesta sprint.
