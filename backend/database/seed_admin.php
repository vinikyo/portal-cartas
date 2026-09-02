<?php

/**
 * Cria o usuário admin de teste (login: admin / senha: admin123).
 *
 * Gera o hash da senha com a própria função password_hash() do PHP em
 * execução (garante compatibilidade com password_verify() usado no login),
 * em vez de deixar um hash fixo hardcoded no seed.sql.
 *
 * Como rodar:
 *   - Local:  php backend/database/seed_admin.php
 *   - Docker: docker-compose exec app php database/seed_admin.php
 */

require __DIR__ . '/../src/Config/Constants.php';
require __DIR__ . '/../src/Config/Database.php';

$username = 'admin';
$password = 'admin123';
$hash = password_hash($password, PASSWORD_DEFAULT);

$db = Database::getConnection();

$stmt = $db->prepare(
    'INSERT INTO users (username, password_hash) VALUES (:username, :hash)
     ON DUPLICATE KEY UPDATE password_hash = :hash2'
);
$stmt->execute(['username' => $username, 'hash' => $hash, 'hash2' => $hash]);

echo "Usuário '$username' criado/atualizado com sucesso. Senha: $password\n";
