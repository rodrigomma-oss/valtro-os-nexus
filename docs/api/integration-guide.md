# Guia de integração

## Estado atual

A API pública v1 possui atualmente um único endpoint contratado:

```http
GET /api/v1/meta
```

Esse endpoint não exige autenticação e informa o estado da versão. Endpoints de tickets, bugs, feedback, sugestões e anexos ainda não estão disponíveis.

O ambiente hospedado atual é:

```text
https://valtro-vision-forge.lovable.app/api/v1
```

Esse endereço representa a hospedagem atual da aplicação. O hostname definitivo da API ainda depende de homologação futura; `api.valtrolabs.pro` não deve ser tratado como infraestrutura existente.

Para desenvolvimento local, o endereço padrão é:

```text
http://localhost:8080/api/v1
```

## Exemplo

```http
GET /api/v1/meta HTTP/1.1
Host: valtro-vision-forge.lovable.app
Accept: application/json
```

## Autenticação

A fundação `VALTRO-HMAC-SHA256-V1` e sua integração ao pipeline compartilhado estão implementadas, mas ainda não existe endpoint autenticado de negócio no contrato público. Consulte `authentication.md` para o protocolo técnico atual.

## Limites técnicos

| Limite                               | Default configurado | Enforcement atual                                                                                 |
| ------------------------------------ | ------------------: | ------------------------------------------------------------------------------------------------- |
| Requisições por minuto por aplicação |                 100 | Não ativo; persistência atômica aguarda homologação.                                              |
| Payload por requisição               |               1 MiB | Implementado no pipeline, com limite por aplicação autenticada e teto absoluto default de 10 MiB. |
| Anexo individual                     |              10 MiB | Não aplicável enquanto não houver endpoint público de anexos.                                     |
| Anexos por entidade                  |                   5 | Não aplicável enquanto não houver endpoint público de anexos.                                     |
| Janela de timestamp HMAC             |          15 minutos | Implementada no autenticador HMAC.                                                                |

O limite de payload mede os bytes reais, mas sem `Content-Length` o framework precisa terminar o buffering antes de rejeitar o corpo; consulte `pipeline.md`. O valor de RPM não é SLA nem garantia contratual enquanto o rate limiter distribuído não for homologado e ativado.
