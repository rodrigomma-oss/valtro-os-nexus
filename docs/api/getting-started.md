# Primeiros Passos

Este guia ajudará você a realizar sua primeira chamada à API do Valtro OS. Vamos focar na integração com o **Valtro Pricing**.

Passo 1. Obter Credenciais
Antes de qualquer chamada, você precisa de uma aplicação ativa no Console do Valtro OS.

1.  Acesse o **[Centro de Operações](/os/admin/api)**.
2.  Crie uma nova **Aplicação**.
3.  Gere uma **Credencial**.

> 🔒 **Segurança**
> Salve seu `Key Secret` em um local seguro imediatamente. Ele não será exibido novamente e é a única forma de autenticar suas chamadas.

---

Passo 2. A primeira chamada (Pública)
Para testar se sua conectividade está correta, você pode chamar nosso endpoint de metadados, que não exige autenticação.

```bash
curl -i https://valtro-vision-forge.lovable.app/api/v1/meta
```

### Resultado esperado

```json
{
  "success": true,
  "data": {
    "version": "v1",
    "status": "stable"
  },
  "requestId": "req_123456789"
}
```

> 💡 **Dica**
> Observe o campo `requestId` na resposta; ele é sua chave para suporte técnico caso algo falhe.

---

Passo 3. Entendendo a Resposta
Toda resposta da API segue um padrão previsível para facilitar o tratamento de dados no seu sistema.

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `success` | boolean | Indica se a operação foi bem-sucedida. |
| `data` | object | Contém o corpo da resposta solicitado. |
| `requestId` | string | Identificador único da requisição para rastreabilidade. |

---

Passo 4. Próximo Nível: Chamadas Autenticadas
As chamadas de negócio exigem que cada requisição seja assinada usando o protocolo HMAC-SHA256.

#### Próximo Passo

[→ Autenticação](authentication)
