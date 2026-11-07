# Introdução

Bem-vindo ao Portal do Desenvolvedor da Valtro Labs. Nossa API foi projetada para que você possa integrar **Aplicações Valtro Labs** ao seu ecossistema de forma simples, segura e escalável.

Esta documentação foca no que você precisa para realizar a integração, priorizando exemplos práticos e uma experiência fluida para o desenvolvedor.

## O que é a API da Valtro Labs?

A API permite que sistemas externos interajam com o ecossistema Valtro Labs. Ela fornece a infraestrutura necessária para conectar produtos como o **Valtro Pricing**, o CRM e futuras aplicações ao seu fluxo de trabalho, garantindo que suas operações estejam sempre alinhadas com as regras de negócio do OS.

## Como começar

O fluxo de integração segue quatro passos fundamentais:

Passo 1. Criar uma Aplicação
No Console do Valtro OS, registre sua aplicação no [Centro de Operações](/os/admin/api).

---

Passo 2. Gerar Credenciais
Obtenha seu `Key ID` e `Key Secret` para a aplicação criada. Lembre-se que o Secret é exibido apenas uma vez.

---

Passo 3. Configurar Autenticação
Implemente o protocolo HMAC-SHA256 para assinar suas requisições de forma segura.

---

Passo 4. Consumir APIs da Plataforma
Utilize nossos endpoints para sincronizar dados e interagir com os produtos do ecossistema.

#### Próximo Passo

[→ Primeiros Passos](getting-started)

---

### Referências Rápidas

*   **[Autenticação](authentication)**: Como assinar requisições com HMAC.
*   **[OpenAPI](openapi)**: Contrato técnico formal da Plataforma.
*   **[Erros & Status](errors)**: Como interpretar as respostas do servidor.
*   **[Versionamento](versioning)**: Como tratamos mudanças na API.
