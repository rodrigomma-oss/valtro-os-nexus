# Introdução

Bem-vindo ao Portal do Desenvolvedor do Valtro OS. Nossa API foi projetada para que você possa integrar o **Valtro Pricing** ao seu sistema de forma simples, segura e em poucos minutos.

Esta documentação foca no que você precisa para realizar a integração, priorizando exemplos práticos e uma experiência fluida para o desenvolvedor.

## O que é a API do Valtro OS?

A API permite que sistemas externos interajam com o ecossistema Valtro. Atualmente, o foco principal é o fornecimento de metadados e infraestrutura para o **Valtro Pricing**, garantindo que seus cálculos de precificação estejam sempre alinhados com as regras de negócio do OS.

## Como começar

O fluxo de integração segue quatro passos fundamentais:

1.  **Criar uma Aplicação**: No Console do Valtro OS, registre seu sistema.
2.  **Gerar Credenciais**: Obtenha seu `Key ID` e `Key Secret`.
3.  **Configurar Autenticação**: Implemente o protocolo HMAC-SHA256 para assinar suas requisições.
4.  **Executar Chamadas**: Utilize nossos endpoints para sincronizar dados.

## Próximos Passos

Para realizar sua primeira chamada em menos de 5 minutos, siga para o nosso guia de **[Primeiros Passos](getting-started)**.

---

### Referências Rápidas

*   **[Autenticação](authentication)**: Como assinar requisições com HMAC.
*   **[OpenAPI](openapi)**: Contrato técnico formal dos endpoints.
*   **[Erros & Status](errors)**: Como interpretar as respostas do servidor.
*   **[Versionamento](versioning)**: Como tratamos mudanças na API.
