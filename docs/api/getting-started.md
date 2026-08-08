# Primeiros Passos

Este guia ajudará você a realizar sua primeira chamada à API do Valtro OS. Vamos focar na integração com o **Valtro Pricing**.

## 1. Obter Credenciais

Antes de qualquer chamada, você precisa de uma aplicação ativa no Console do Valtro OS:

1.  Acesse o **[Centro de Operações](/os/admin/api)**.
2.  Crie uma nova **Aplicação**.
3.  Gere uma **Credencial**.
4.  **Importante**: Salve seu `Key Secret` em um local seguro. Ele não será exibido novamente e é fundamental para a segurança da sua integração.

## 2. A primeira chamada (Pública)

Para testar se sua conectividade está correta, você pode chamar nosso endpoint de metadados, que não exige autenticação:

```bash
curl -i https://valtro-vision-forge.lovable.app/api/v1/meta
```

**O que esperar:**
Uma resposta JSON com `success: true` e o status atual da API. Observe o campo `requestId` na resposta; ele é sua chave para suporte técnico caso algo falhe.

## 3. Entendendo a Resposta

Toda resposta da API segue um padrão previsível para reduzir a carga cognitiva do seu código:

```json
{
  "success": true,
  "data": {
    "version": "v1",
    "status": "stable"
  },
  "requestId": "req_..."
}
```

## 4. Próximo Nível: Chamadas Autenticadas

As chamadas de negócio (como as do Valtro Pricing) exigem que cada requisição seja assinada usando o protocolo HMAC-SHA256. Isso garante que apenas o seu sistema possa falar com a nossa API em seu nome.

**Próximo passo:** Aprenda a assinar suas requisições no guia de **[Autenticação](authentication)**.
