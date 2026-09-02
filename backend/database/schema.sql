CREATE DATABASE IF NOT EXISTS portal_cartas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE portal_cartas;

CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cards (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name_en      VARCHAR(150) NOT NULL,
    name_pt      VARCHAR(150) NULL,
    card_game    ENUM('magic', 'pokemon', 'yugioh') NOT NULL,
    edition_id   VARCHAR(50) NOT NULL,
    edition_name VARCHAR(150) NOT NULL,
    image_url    VARCHAR(500) NULL,
    rarity       ENUM('common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare') NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_card_game (card_game)
) ENGINE=InnoDB;
