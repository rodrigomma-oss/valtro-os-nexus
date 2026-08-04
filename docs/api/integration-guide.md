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

## Autenticação futura

A fundação `VALTRO-HMAC-SHA256-V1` está implementada, mas ainda não existe endpoint autenticado de negócio no contrato público. Consulte `authentication.md` para o protocolo técnico atual.

## Limites técnicos

Os valores persistidos atualmente são configurações de preparação e não garantias aplicadas pelo runtime:

| Limite                               | Default configurado | Enforcement atual                                     |
| ------------------------------------ | ------------------: | ----------------------------------------------------- |
| Requisições por minuto por aplicação |                 100 | Não implementado.                                     |
| Payload por requisição               |               1 MiB | Não implementado.                                     |
| Anexo individual                     |              10 MiB | Não aplicável enquanto não houver endpoint de anexos. |
| Anexos por entidade                  |                   5 | Não aplicável enquanto não houver endpoint de anexos. |
| Janela de timestamp HMAC             |          15 minutos | Implementada na fundação HMAC.                        |

Clientes não devem depender dos valores ainda não aplicados como SLA ou garantia contratual. O pipeline compartilhado e o enforcement permanecem planejados.
