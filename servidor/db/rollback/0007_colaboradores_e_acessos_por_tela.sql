-- Plano de reversão da migration 0007 (24/11/2026). NÃO é executado pelo drizzle: rode à mão, nesta ordem, só se for preciso desfazer.
-- A 0007 só CRIA tabelas e UMA coluna opcional; nenhum dado antigo foi alterado. Desfazer apaga apenas o que ela criou
-- (o vínculo conta↔colaborador, os colaboradores enviados e a configuração do Acesso por Tela guardada no servidor).
-- Antes de rodar, tire um backup dessas duas tabelas se houver dado que queira guardar:
--   \copy colaboradores_acesso to 'colaboradores_acesso.csv' csv header
--   \copy acessos_por_tela to 'acessos_por_tela.csv' csv header
DROP INDEX IF EXISTS "perfis_usuarios_colaborador_uq";
ALTER TABLE "perfis_usuarios" DROP CONSTRAINT IF EXISTS "perfis_usuarios_colaborador_id_colaboradores_acesso_id_fk";
ALTER TABLE "perfis_usuarios" DROP COLUMN IF EXISTS "colaborador_id";
DROP TABLE IF EXISTS "acessos_por_tela";
DROP TABLE IF EXISTS "colaboradores_acesso";
-- Depois, tire a linha da 0007 do controle do drizzle (tabela drizzle."__drizzle_migrations", a última linha) e apague os arquivos da 0007.
