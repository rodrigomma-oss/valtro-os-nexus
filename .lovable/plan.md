# OPS-MIG-001C — Auditoria somente leitura de migrações

## Objetivo
Comparar o inventário de `supabase/migrations/` com os registros efetivamente aplicados em `supabase_migrations.schema_migrations`, sem alterar código, arquivos de migração ou banco de dados.

## Entregáveis
1. Lista ordenada dos caminhos de arquivos do repositório que correspondem a migrações aplicadas, reconciliando o timestamp/nome do arquivo com `version` e `name` registrados.
2. Arquivos presentes no repositório sem registro correspondente no banco.
3. Versões aplicadas sem arquivo correspondente no repositório, incluindo registros com `name` ausente ou divergente.
4. Classificação das migrações que exigem revisão antes de um replay limpo, cobrindo:
   - IDs UUID e e-mails específicos do projeto;
   - URLs, referências de ambiente e configurações específicas;
   - `CREATE EXTENSION`, agendamentos e dependências de extensão;
   - `INSERT`, `UPDATE`, `DELETE`, seeds, fixtures e dados de teste;
   - probes de diagnóstico, limpeza, operações destrutivas e alterações em `storage`/`auth`;
   - dependências de usuários ou objetos que não existem em um projeto novo.
5. Ordem recomendada para um projeto Lovable Cloud vazio, preservando a ordem cronológica/dependências e separando SQL estrutural de SQL que deve ser adaptado, validado ou omitido.

## Método de validação
- Usar somente consultas `SELECT` no catálogo de migrações e leitura dos arquivos locais.
- Normalizar a comparação por `name` quando disponível e por `version`/prefixo temporal quando o registro não tiver nome.
- Inspecionar o conteúdo SQL e citar arquivo, linha e motivo para cada risco de replay relevante.
- Não executar `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, `DROP`, migrations, deploy ou qualquer operação de escrita.

## Formato do relatório
O resultado final será apresentado em cinco seções correspondentes aos entregáveis, com contagens de conferência, listas completas e uma tabela de risco/recomendação. A conclusão distinguirá claramente “aplicado no banco atual” de “seguro para replay em projeto novo”.

## Escopo
Nenhum arquivo de código será modificado, nenhum arquivo de auditoria será criado além deste plano operacional e nenhuma alteração será feita no banco.