# Versionamento

Trabalhamos para que a API do Valtro OS seja estável e previsível, permitindo que sua integração funcione sem interrupções por longos períodos.

## Identificação da Versão

A versão da API é explicitada diretamente no caminho da URL:

`https://valtro-vision-forge.lovable.app/api/v1/...`

---

## Ciclo de Vida da Versão

| Estado | Descrição |
| :--- | :--- |
| **Stable** | Versão atual recomendada (Ex: `v1`). |
| **Deprecated** | Nova versão disponível. A antiga funciona, mas sem novos recursos. |
| **Sunset** | Versão programada para desligamento (aviso prévio de 6 meses). |

---

## Política de Mudanças

Para evitar quebras no seu sistema, seguimos regras rígidas sobre o que pode mudar em uma versão estável.

### Mudanças Non-breaking (Permitidas em v1)
*   Adição de novos endpoints.
*   Adição de novos campos opcionais em respostas ou requisições.
*   Mudanças na ordem dos campos em objetos JSON.

### Mudanças Breaking (Exigem v2)
*   Remoção de endpoints ou campos existentes.
*   Alteração de tipos de dados (ex: mudar string para number).
*   Mudanças obrigatórias na lógica de autenticação.

> 📌 **Importante**
> Recomendamos que seu parser JSON seja resiliente a novos campos desconhecidos para garantir compatibilidade futura.

#### Próximo Passo

[→ Introdução](index)
