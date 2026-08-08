# OPS-INT-002A.1 — Auditoria do Provedor de API — Valtro OS

## CONTEXTO

Estamos iniciando a OPS-INT-002 — Integração Oficial do Valtro Pricing com o Valtro OS.

Este projeto é exclusivamente o Valtro OS.

O Valtro Pricing é um sistema separado, com código, infraestrutura e banco de dados próprios.

NÃO presuma acesso ao código, banco, schemas ou implementação interna do Valtro Pricing.

Nesta etapa devemos analisar exclusivamente o lado Valtro OS da futura integração.

## OBJETIVO

Auditar a implementação atual do Valtro OS para determinar quais capacidades operacionais podem ser expostas com segurança através da API v1 para um consumidor externo oficial, inicialmente o Valtro Pricing.

Esta etapa é somente de análise.

NÃO implementar alterações.

## ARQUITETURA OBRIGATÓRIA

Valtro Pricing

      ↓

API oficial do Valtro OS

      ↓

VALTRO-HMAC-SHA256-V1

      ↓

Serviços de domínio do Valtro OS

      ↓

Banco do Valtro OS

É proibido:

- acesso direto do Pricing ao banco do OS;
- acesso direto do OS ao banco do Pricing;
- compartilhamento de service_role;
- compartilhamento de credenciais Supabase;
- acoplamento entre os bancos.

## ESCOPO DA AUDITORIA

Analise exclusivamente a implementação existente neste projeto relacionada a:

- `/api/v1`;
- middleware HMAC;
- API Applications;
- API Credentials;
- scopes/capabilities;
- API versions;
- audit logs;
- request nonces;
- request ID;
- tickets;
- ticket_events;
- bugs;
- bug_events;
- feedback;
- feedback_events;
- attachments;
- beta participants;
- saas_products;
- beta_programs;
- serviços de domínio;
- server functions;
- schemas Zod;
- validações;
- RLS;
- funções auxiliares de autorização;
- documentação OpenAPI;
- documentação em `/api-docs`.

## CAPACIDADES A INVESTIGAR

Determine se a arquitetura atual do Valtro OS está preparada para que uma aplicação externa autenticada possa solicitar:

1. criação de chamado;
2. criação de reporte de bug;
3. criação de feedback/sugestão;
4. envio ou associação de anexos;
5. identificação do produto relacionado;
6. associação opcional a participante do beta.

📌 **Importante:**
Não presuma que o Valtro Pricing possui qualquer campo, tabela ou implementação específica.
Nesta etapa estamos definindo apenas:
"O que o Valtro OS consegue receber e sob quais condições?"
A implementação real do Valtro Pricing será auditada separadamente.

## PARA CADA CAPACIDADE

Informe:

1. entidade de destino;
2. tabelas envolvidas;
3. serviço de domínio existente;
4. regras de negócio existentes;
5. validações existentes;
6. autorização existente;
7. possibilidade de reutilização pela API;
8. endpoint que seria necessário;
9. método HTTP recomendado;
10. scope mínimo recomendado;
11. campos que o consumidor externo precisaria fornecer;
12. campos que obrigatoriamente devem ser gerados pelo OS;
13. campos que não devem ser controlados pelo consumidor;
14. resposta esperada;
15. possíveis erros;
16. lacunas para implementação futura.

## IDENTIDADE EXTERNA

Analise como a arquitetura do OS poderia representar com segurança uma entidade ou usuário proveniente de outro sistema.

Não assumir UUID compartilhado entre Supabase.

Avalie se a estrutura atual suporta ou precisaria futuramente suportar conceitos como:

- `external_user_id`;
- `external_reference`;
- `source/application`;
- vínculo opcional com beta participant.

Não implementar.

## IDEMPOTÊNCIA

Analise como futuras operações POST da API poderiam ser idempotentes.

Considere:

- retry;
- timeout;
- duplo envio;
- repetição da mesma requisição.

Verifique se já existe infraestrutura reutilizável.

Caso não exista, recomende a solução mínima.

Não implementar.

## SEGURANÇA

Confirme se o desenho pode preservar:

- VALTRO-HMAC-SHA256-V1;
- API Key;
- timestamp;
- nonce;
- proteção contra replay;
- scopes;
- isolamento por aplicação;
- request ID;
- audit log;
- princípio de menor privilégio.

## OPENAPI

Compare as capacidades encontradas com o contrato OpenAPI atual.

Informe:

- endpoints existentes;
- endpoints ausentes;
- schemas existentes reutilizáveis;
- schemas que futuramente seriam necessários;
- scopes existentes reutilizáveis;
- scopes novos eventualmente necessários.

## MVP

Com base SOMENTE no Valtro OS, recomende quais capacidades seriam mais simples e seguras para formar o primeiro MVP da integração.

Não assuma como o Pricing funciona.

A decisão final será tomada depois de uma auditoria separada do Valtro Pricing.

## REGRAS DE EXECUÇÃO

NÃO:
- editar código;
- criar arquivos;
- criar migration;
- alterar banco;
- alterar RLS;
- alterar grants;
- criar aplicação;
- criar credencial;
- criar secret;
- alterar OpenAPI;
- fazer deploy.

## ENTREGA

Produza:

**OPS-INT-002A.1 — Auditoria do Provedor Valtro OS**

Estrutura:
1. Resumo executivo
2. Arquitetura atual da API
3. Capacidades operacionais existentes
4. Chamados
5. Bugs
6. Feedback
7. Anexos
8. Produtos e beta programs
9. Identidade externa
10. Serviços reutilizáveis
11. Endpoints necessários
12. Scopes necessários
13. Idempotência
14. Segurança
15. Auditoria e rastreabilidade
16. Impactos futuros no OpenAPI
17. Lacunas encontradas
18. Riscos
19. MVP recomendado pelo lado do OS
20. Critérios de aceite
21. Informações que precisam ser obtidas do Valtro Pricing antes de fechar o contrato

## QUALITY GATE

Confirme explicitamente:
- nenhuma alteração de código;
- nenhum arquivo criado;
- nenhuma migration criada;
- nenhuma alteração de banco;
- nenhuma credencial criada;
- nenhum secret alterado;
- nenhum deploy executado.

Ao concluir, pare e aguarde homologação.
