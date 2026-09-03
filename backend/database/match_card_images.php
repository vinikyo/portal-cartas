<?php

/**
 * match_card_images.php
 *
 * Script único e manual (não é parte do fluxo normal da aplicação):
 * pega imagens de uma pasta local, casa cada uma com a carta certa no
 * banco pelo nome (name_en / name_pt) e grava o binário direto nas
 * colunas image_mime / image_data.
 *
 * Existe porque as 4 cartas de demo já estavam cadastradas em produção
 * sem imagem (por isso o placeholder) — em vez de editar cada uma na
 * mão pela UI, este script resolve tudo de uma vez.
 *
 * Como rodar:
 *   1. Coloque os arquivos de imagem na pasta ./images_to_import
 *      (ou passe outra pasta como primeiro argumento).
 *   2. Rode com as MESMAS variáveis de ambiente que a aplicação usa
 *      para conectar no banco (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS).
 *
 *      - Local (docker-compose):
 *          docker-compose exec app php database/match_card_images.php
 *
 *      - Produção (Railway), rodando local com as credenciais do
 *        Railway (Settings > Variables do serviço MySQL > "Connect",
 *        use os valores públicos - MYSQLHOST/MYSQLPORT/MYSQLUSER/
 *        MYSQLPASSWORD/MYSQLDATABASE):
 *          DB_HOST=xxxxx.proxy.rlwy.net DB_PORT=xxxxx DB_NAME=portal_cartas \
 *          DB_USER=root DB_PASS=xxxxx php database/match_card_images.php
 *
 *      - Ou via Railway CLI (injeta as variáveis do serviço automaticamente):
 *          railway run php backend/database/match_card_images.php
 */

require __DIR__ . '/../src/Config/Constants.php';
require __DIR__ . '/../src/Config/Database.php';

// Mapa: nome do arquivo de imagem => termos de busca (LIKE) por carta.
// Ajuste/adicione linhas aqui se tiver mais cartas/imagens.
$imageMap = [
    'pikachu.jpg' => ['name_en' => 'Pikachu%', 'card_game' => 'pokemon'],
    'umbreon.jpg' => ['name_en' => 'Moonbreon%', 'card_game' => 'pokemon'],
    'mago.jpg'    => ['name_en' => 'Dark Magician%', 'card_game' => 'yugioh'],
    'raio.jpg'    => ['name_en' => 'Lightning Bolt%', 'card_game' => 'magic'],
];

$mimeByExtension = [
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'webp' => 'image/webp',
];

$imagesDir = $argv[1] ?? __DIR__ . '/images_to_import';
$imagesDir = rtrim($imagesDir, '/');

if (!is_dir($imagesDir)) {
    fwrite(STDERR, "❌ Pasta não encontrada: $imagesDir\n");
    exit(1);
}

$db = Database::getConnection();

$matched = 0;
$notFoundOnDisk = 0;
$notFoundInDb = 0;

foreach ($imageMap as $filename => $rule) {
    $path = $imagesDir . '/' . $filename;

    if (!is_file($path)) {
        echo "⚠️  Imagem não encontrada em disco: $filename — pulando.\n";
        $notFoundOnDisk++;
        continue;
    }

    $stmt = $db->prepare(
        'SELECT id, name_en FROM cards WHERE card_game = :game AND name_en LIKE :name'
    );
    $stmt->execute([
        ':game' => $rule['card_game'],
        ':name' => $rule['name_en'],
    ]);
    $cards = $stmt->fetchAll();

    if (empty($cards)) {
        echo "⚠️  Nenhuma carta '{$rule['name_en']}' ({$rule['card_game']}) encontrada no banco — pulando $filename.\n";
        $notFoundInDb++;
        continue;
    }

    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $mime = $mimeByExtension[$extension] ?? 'image/jpeg';
    $binary = file_get_contents($path);

    foreach ($cards as $card) {
        $update = $db->prepare('UPDATE cards SET image_mime = :mime, image_data = :data WHERE id = :id');
        $update->bindValue(':mime', $mime);
        $update->bindValue(':data', $binary, PDO::PARAM_LOB);
        $update->bindValue(':id', $card['id'], PDO::PARAM_INT);
        $update->execute();

        $matched++;
        echo "✅ Carta #{$card['id']} ({$card['name_en']}): imagem '$filename' gravada (" . round(strlen($binary) / 1024) . "KB)\n";
    }
}

echo "\nConcluído: $matched imagem(ns) gravada(s). ";
echo "$notFoundOnDisk arquivo(s) não encontrados na pasta. ";
echo "$notFoundInDb carta(s) não encontradas no banco.\n";
