# Primeiros passos

[Início](README.md) · [Guia de integração](integration-guide.md) · [OpenAPI](openapi-v1.yaml) · [Erros](errors.md)

## Visão geral

A API pública do Valtro OS usa rotas versionadas sob `/api/v1`. Atualmente, o contrato público contém somente `GET /api/v1/meta`, um endpoint sem autenticação que informa o estado da versão v1.

Recursos de negócio, SDKs, playground e Portal do Desenvolvedor ainda não estão disponíveis. Confirme o escopo em [Estado de implementação](implementation-status.md).

## Arquitetura da requisição

As rotas v1 usam um pipeline compartilhado. Para a rota pública atual, o fluxo gera um request ID, verifica a disponibilidade da versão, aplica limites de payload, executa o handler, cria o envelope JSON e tenta registrar auditoria. As etapas HMAC, scopes e rate limiting só são executadas quando a configuração da rota as exige.

O comportamento detalhado está em [Pipeline compartilhado](pipeline.md).

## Autenticação HMAC

O protocolo `VALTRO-HMAC-SHA256-V1` está implementado, mas `GET /api/v1/meta` não exige autenticação e não existe endpoint público autenticado de negócio. Não envie headers HMAC para concluir este guia.

Para preparar uma integração futura, consulte [Autenticação HMAC](authentication.md). Credenciais não são emitidas por esta documentação.

## Request ID

Toda resposta JSON da API v1 recebe do servidor um identificador no formato `req_` seguido de 16 caracteres hexadecimais. O valor aparece no campo `requestId` e no header `X-Valtro-Request-ID`.

O consumidor pode enviar seu próprio `X-Valtro-Request-ID` válido para correlação, mas o valor não substitui o identificador confiável gerado pelo Valtro OS.

## Versionamento

A versão principal faz parte do path: `/api/v1`. O pipeline consulta o estado persistido da versão antes de executar o handler. Versões desabilitadas ou cujo sunset já passou não são processadas normalmente.

Consulte [Ciclo de vida e versionamento](versioning.md) para os estados e headers envolvidos.

## Primeira chamada

Use a URL hospedada atual somente como ambiente existente da aplicação; ela ainda não representa um hostname definitivo da API:

```bash
curl --request GET \
  --url https://valtro-vision-forge.lovable.app/api/v1/meta \
  --header "Accept: application/json"
```

Em desenvolvimento local, a rota é `http://localhost:8080/api/v1/meta`.

## Interpretar a resposta

Uma resposta bem-sucedida segue este formato:

```json
{
  "success": true,
  "data": {
    "version": "v1",
    "status": "stable",
    "deprecated": false,
    "releasedAt": null,
    "deprecationAt": null,
    "sunsetAt": null,
    "replacementVersion": null
  },
  "requestId": "req_a1b2c3d4e5f60708"
}
```

Os campos de data e substituição refletem o registro persistido e podem ser `null`. O status e as datas reais podem variar. Preserve o `requestId` ao diagnosticar uma falha.

Respostas de erro usam `success: false`, um objeto `error` e o mesmo request ID. Consulte o [catálogo de erros](errors.md). O formato normativo está no [OpenAPI](openapi-v1.yaml).

## Próximos passos

- Confira ambientes e limites no [guia de integração](integration-guide.md).
- Gere clientes somente a partir do [OpenAPI](openapi-v1.yaml), considerando que há apenas um endpoint público.
- Acompanhe capacidades futuras no [roadmap](roadmap.md).
- Consulte a [estratégia futura de SDK](sdk-strategy.md); nenhum SDK oficial existe hoje.
