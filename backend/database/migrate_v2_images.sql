-- Rode este arquivo apenas se você já tem um banco criado com a versão
-- antiga (que tinha a coluna image_url e salvava imagem em arquivo).
-- Quem estiver clonando o projeto do zero NÃO precisa disso — o schema.sql
-- já vem com a estrutura nova.
--
-- Como rodar:
--   docker-compose exec db mysql -u root -proot portal_cartas < backend/database/migrate_v2_images.sql
-- (ou local: mysql -u root -p portal_cartas < backend/database/migrate_v2_images.sql)

USE portal_cartas;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS image_mime VARCHAR(50) NULL AFTER image_url,
  ADD COLUMN IF NOT EXISTS image_data LONGBLOB NULL AFTER image_mime;

ALTER TABLE cards ADD INDEX IF NOT EXISTS idx_rarity (rarity);

-- Depois de rodar isto, execute o script PHP que lê os arquivos que já
-- estão em backend/public/uploads e copia o conteúdo pra dentro do banco:
--   docker-compose exec app php database/migrate_images_to_db.php
--
-- Só depois disso (com as imagens já migradas) é seguro remover a coluna
-- antiga, se quiser:
--   ALTER TABLE cards DROP COLUMN image_url;
