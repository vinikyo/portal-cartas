<?php

/**
 * seed_extra_cards.php
 *
 * Script único e manual: insere um lote fixo de cartas novas (com imagem)
 * direto no banco, sem passar pela UI. Existe pra popular a demo com mais
 * cartas de uma vez, em vez de cadastrar uma por uma pelo formulário.
 *
 * É IDEMPOTENTE: se rodar duas vezes, não duplica — pula qualquer carta
 * cujo name_en + card_game já exista no banco.
 *
 * Como rodar:
 *   1. Coloque os arquivos de imagem na pasta ./images_to_import
 *      (ou passe outra pasta como primeiro argumento).
 *   2. Rode com as MESMAS variáveis de ambiente que a aplicação usa
 *      para conectar no banco (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS).
 *
 *      - Local (docker-compose):
 *          docker-compose exec app php database/seed_extra_cards.php
 *
 *      - Produção (Railway), rodando local com as credenciais PÚBLICAS do
 *        MySQL do Railway (não a interna *.railway.internal — essa só
 *        funciona de dentro da rede do Railway):
 *          $env:DB_HOST="xxxx.proxy.rlwy.net"
 *          $env:DB_PORT="xxxxx"
 *          $env:DB_NAME="portal_cartas"
 *          $env:DB_USER="root"
 *          $env:DB_PASS="xxxxx"
 *          php backend/database/seed_extra_cards.php
 */

require __DIR__ . '/../src/Config/Constants.php';
require __DIR__ . '/../src/Config/Database.php';

// Lista fixa de cartas a inserir. edition_id/edition_name têm que ser um dos
// pares válidos em backend/data/editions.json para o card_game escolhido.
$cards = [
    ['file' => '148.jpg', 'name_en' => 'Miraidon', 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'base1', 'edition_name' => 'Base Set', 'rarity' => 'rare'],
    ['file' => '163.jpg', 'name_en' => "N's Plan", 'name_pt' => 'Plano de N', 'card_game' => 'pokemon', 'edition_id' => 'swsh1', 'edition_name' => 'Sword & Shield', 'rarity' => 'ultra_rare'],
    ['file' => '171.jpg', 'name_en' => "Team Rocket's Ariana", 'name_pt' => 'Ariana da Equipe Rocket', 'card_game' => 'pokemon', 'edition_id' => 'sv1', 'edition_name' => 'Scarlet & Violet', 'rarity' => 'uncommon'],
    ['file' => '207.jpg', 'name_en' => "Steven's Beldum", 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => '30c', 'edition_name' => '30th Celebration', 'rarity' => 'rare'],
    ['file' => '224.jpg', 'name_en' => "Team Rocket's Ariana (Full Art)", 'name_pt' => 'Ariana da Equipe Rocket (Full Art)', 'card_game' => 'pokemon', 'edition_id' => 'cri', 'edition_name' => 'Chaos Rising', 'rarity' => 'super_rare'],
    ['file' => '244.jpg', 'name_en' => "Cynthia's Spiritomb", 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'base1', 'edition_name' => 'Base Set', 'rarity' => 'ultra_rare'],
    ['file' => '112.jpg', 'name_en' => 'Riolu', 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'swsh1', 'edition_name' => 'Sword & Shield', 'rarity' => 'common'],
    ['file' => '115.jpg', 'name_en' => "Larry's Skill", 'name_pt' => 'Talento de Larry', 'card_game' => 'pokemon', 'edition_id' => 'sv1', 'edition_name' => 'Scarlet & Violet', 'rarity' => 'common'],
    ['file' => '116.jpg', 'name_en' => "Team Rocket's Nidoqueen", 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => '30c', 'edition_name' => '30th Celebration', 'rarity' => 'uncommon'],
    ['file' => '117.jpg', 'name_en' => 'Rehoru', 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'cri', 'edition_name' => 'Chaos Rising', 'rarity' => 'rare'],
    ['file' => '121.jpg', 'name_en' => "Professor Turo's Scenario", 'name_pt' => 'Cenário do Professor Turo', 'card_game' => 'pokemon', 'edition_id' => 'base1', 'edition_name' => 'Base Set', 'rarity' => 'uncommon'],
    ['file' => '127.jpg', 'name_en' => "Team Rocket's Honchkrow", 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'swsh1', 'edition_name' => 'Sword & Shield', 'rarity' => 'ultra_rare'],
    ['file' => '130.jpg', 'name_en' => 'Kibana', 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'sv1', 'edition_name' => 'Scarlet & Violet', 'rarity' => 'rare'],
    ['file' => '139.jpg', 'name_en' => 'Latias', 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => '30c', 'edition_name' => '30th Celebration', 'rarity' => 'rare'],
    ['file' => '144.jpg', 'name_en' => 'Cobalion', 'name_pt' => null, 'card_game' => 'pokemon', 'edition_id' => 'cri', 'edition_name' => 'Chaos Rising', 'rarity' => 'ultra_rare'],

    // Yu-Gi-Oh!
    ['file' => 'kuriboh.png', 'name_en' => 'Kuriboh', 'name_pt' => null, 'card_game' => 'yugioh', 'edition_id' => 'sdy', 'edition_name' => 'Starter Deck: Yugi', 'rarity' => 'common'],
    ['file' => 'blue-eyes-white-dragon.png', 'name_en' => 'Blue-Eyes White Dragon', 'name_pt' => 'Dragão Branco de Olhos Azuis', 'card_game' => 'yugioh', 'edition_id' => 'mrd', 'edition_name' => 'Metal Raiders', 'rarity' => 'secret_rare'],

    // Magic: The Gathering
    ['file' => 'thornscape-battlemage.png', 'name_en' => 'Thornscape Battlemage', 'name_pt' => null, 'card_game' => 'magic', 'edition_id' => 'eld', 'edition_name' => 'Throne of Eldraine', 'rarity' => 'uncommon'],
    ['file' => 'battle-menu.png', 'name_en' => 'Battle Menu', 'name_pt' => null, 'card_game' => 'magic', 'edition_id' => 'msh', 'edition_name' => 'Marvel Super Heroes', 'rarity' => 'uncommon'],
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

$inserted = 0;
$skippedExisting = 0;
$skippedNoFile = 0;

$existsStmt = $db->prepare('SELECT id FROM cards WHERE name_en = :name_en AND card_game = :card_game LIMIT 1');
$insertStmt = $db->prepare(
    'INSERT INTO cards (name_en, name_pt, card_game, edition_id, edition_name, rarity, image_mime, image_data, created_at, updated_at)
     VALUES (:name_en, :name_pt, :card_game, :edition_id, :edition_name, :rarity, :image_mime, :image_data, NOW(), NOW())'
);

foreach ($cards as $card) {
    $existsStmt->execute(['name_en' => $card['name_en'], 'card_game' => $card['card_game']]);
    if ($existsStmt->fetch()) {
        echo "⏭️  '{$card['name_en']}' já existe no banco — pulando.\n";
        $skippedExisting++;
        continue;
    }

    $path = $imagesDir . '/' . $card['file'];
    if (!is_file($path)) {
        echo "⚠️  Imagem não encontrada em disco: {$card['file']} — pulando '{$card['name_en']}'.\n";
        $skippedNoFile++;
        continue;
    }

    $extension = strtolower(pathinfo($card['file'], PATHINFO_EXTENSION));
    $mime = $mimeByExtension[$extension] ?? 'image/jpeg';
    $binary = file_get_contents($path);

    $insertStmt->bindValue(':name_en', $card['name_en']);
    $insertStmt->bindValue(':name_pt', $card['name_pt']);
    $insertStmt->bindValue(':card_game', $card['card_game']);
    $insertStmt->bindValue(':edition_id', $card['edition_id']);
    $insertStmt->bindValue(':edition_name', $card['edition_name']);
    $insertStmt->bindValue(':rarity', $card['rarity']);
    $insertStmt->bindValue(':image_mime', $mime);
    $insertStmt->bindValue(':image_data', $binary, PDO::PARAM_LOB);
    $insertStmt->execute();

    $inserted++;
    echo "✅ '{$card['name_en']}' cadastrada (id " . $db->lastInsertId() . ", " . round(strlen($binary) / 1024) . "KB)\n";
}

echo "\nConcluído: $inserted carta(s) inserida(s). $skippedExisting já existiam. $skippedNoFile sem imagem no disco.\n";
