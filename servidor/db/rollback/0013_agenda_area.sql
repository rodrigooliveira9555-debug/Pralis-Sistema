-- Plano de reversão da migration 0013 (27/11/2026). NÃO é executado pelo drizzle: rode à mão, só se for preciso desfazer.
-- A 0013 só ACRESCENTA a coluna agenda_compromissos.area_id (vazia nos compromissos que já existiam) e a checagem do formato.
-- Desfazer apaga só a área escolhida nos compromissos. Antes, se quiser guardar:
--   \copy (select empresa_id, id, area_id from agenda_compromissos where area_id is not null) to 'agenda_area.csv' csv header
ALTER TABLE "agenda_compromissos" DROP CONSTRAINT IF EXISTS "agenda_compromissos_area_check";
ALTER TABLE "agenda_compromissos" DROP COLUMN IF EXISTS "area_id";
-- Depois, tire a linha da 0013 do controle do drizzle (tabela drizzle."__drizzle_migrations", a última linha) e apague os arquivos da 0013.
