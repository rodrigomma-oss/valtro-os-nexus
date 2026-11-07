# Remover campo "Próxima reunião" do card Visão geral do projeto

## Contexto
A página de detalhe do projeto (`/os/comercial/projetos/$id`) já renderiza o `ProjectMeetingsCard`, um card exclusivo para agendar, reagendar, concluir e consultar o histórico de reuniões do projeto. O card **Visão geral** (`ProjectOverviewCard`) ainda exibe um campo estático "Próxima reunião" lido de `project_operations.next_meeting_at`, tornando a informação duplicada e mantendo uma entrada manual que não reflete mais o fluxo oficial.

## O que será feito
- Remover o campo "Próxima reunião" da seção **Operação** do `ProjectOverviewCard`.
- Ajustar o grid da seção Operação para manter o alinhamento visual sem o campo removido.
- Não alterar o card `ProjectMeetingsCard`, o fluxo de Google Calendar, nem o schema do banco.

## Arquivos alterados
- `src/components/app/project-overview-card.tsx` — remoção do campo estático e ajuste de layout.

## Validação
- Verificar visualmente que o card Visão geral não exibe mais "Próxima reunião".
- Confirmar que o card dedicado de reuniões continua aparecendo normalmente na página.
- Rodar typecheck/build para garantir que não há erros de compilação.
