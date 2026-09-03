<?php

/**
 * migrate_images_to_db.php
 *
 * Script de migração única: lê as cartas que ainda têm o campo antigo
 * `image_url` (apontando pra um arquivo em backend/public/uploads) e copia
 * o conteúdo do arquivo pras novas colunas `image_mime` / `image_data`.
 *
 * Rode isso DEPOIS de aplicar o migrate_v2_images.sql e ANTES de fazer
 * deploy — assim as imagens que você já cadastrou localmente não se perdem.
 *
 * Como rodar:
 *   Docker:  docker-compose exec app php database/migrate_images_to_db.php
 *   Local:   php backend/database/migrate_images_to_db.php
 */

require __DIR__ . '/../src/Config/Constants.php';
require __DIR__ . '/../src/Config/Database.php';

$db = Database::getConnection();
$uploadsDir = __DIR__ . '/../public/uploads';

$mimeByExtension = [
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'webp' => 'image/webp',
];

$stmt = $db->query(
    "SELECT id, image_url FROM cards
     WHERE image_url IS NOT NULL AND image_url != '' AND (image_data IS NULL)"
);
$cards = $stmt->fetchAll();

if (empty($cards)) {
    echo "Nenhuma carta com imagem antiga pendente de migração.\n";
    exit(0);
}

$migrated = 0;

foreach ($cards as $card) {
    $filename = basename(parse_url($card['image_url'], PHP_URL_PATH));
    $path = $uploadsDir . '/' . $filename;

    if (!is_file($path)) {
        echo "⚠️  Carta #{$card['id']}: arquivo não encontrado ($filename) — pulando.\n";
        continue;
    }

    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $mime = $mimeByExtension[$extension] ?? 'image/jpeg';
    $binary = file_get_contents($path);

    $update = $db->prepare('UPDATE cards SET image_mime = :mime, image_data = :data WHERE id = :id');
    $update->bindValue(':mime', $mime);
    $update->bindValue(':data', $binary, PDO::PARAM_LOB);
    $update->bindValue(':id', $card['id'], PDO::PARAM_INT);
    $update->execute();

    $migrated++;
    echo "✅ Carta #{$card['id']}: imagem migrada ($filename, " . round(strlen($binary) / 1024) . "KB)\n";
}

echo "\nConcluído: $migrated imagem(ns) migrada(s) para o banco.\n";
