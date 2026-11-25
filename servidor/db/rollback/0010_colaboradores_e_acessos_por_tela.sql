-- Plano de reversão da migration 0010 (25/11/2026). NÃO é executado pelo drizzle: rode à mão, só se for preciso desfazer.
-- A 0010 só CRIA duas tabelas novas (colaboradores_acesso e acessos_por_tela); nenhuma tabela antiga é alterada.
-- Desfazer apaga apenas o que ela criou (os colaboradores enviados e a configuração do Acesso por Tela guardada no servidor).
-- A coluna perfis_usuarios.colaborador_id é da 0009 (Agenda) e NÃO é tocada aqui.
-- Antes de rodar, tire um backup dessas duas tabelas se houver dado que queira guardar:
--   \copy colaboradores_acesso to 'colaboradores_acesso.csv' csv header
--   \copy acessos_por_tela to 'acessos_por_tela.csv' csv header
DROP TABLE IF EXISTS "acessos_por_tela";
DROP TABLE IF EXISTS "colaboradores_acesso";
-- Depois, tire a linha da 0010 do controle do drizzle (tabela drizzle."__drizzle_migrations", a última linha) e apague os arquivos da 0010.
