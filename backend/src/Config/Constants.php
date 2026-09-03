<?php

// Configurações da aplicação. Valores sensíveis devem vir do ambiente.

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'portal_cartas');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: 'root');
define('DB_PORT', getenv('DB_PORT') ?: '3306');

$jwtSecret = getenv('JWT_SECRET');
if (!is_string($jwtSecret) || trim($jwtSecret) === '') {
    throw new RuntimeException('JWT_SECRET não configurado no ambiente.');
}

define('JWT_SECRET', $jwtSecret);
define('JWT_EXPIRY_SECONDS', 60 * 60 * 8); // token válido por 8 horas

