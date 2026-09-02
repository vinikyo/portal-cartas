<?php
// Constantes globais da aplicação.
// Em um projeto real, isso viria de variáveis de ambiente (.env),
// mas para simplificar o setup do desafio, deixamos fixo aqui.

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'portal_cartas');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: 'root');
define('DB_PORT', getenv('DB_PORT') ?: '3306');

define('SESSION_NAME', 'portal_cartas_session');

// Chave usada para assinar os JWTs. Em produção, isso DEVE vir de uma
// variável de ambiente diferente por deploy — nunca fixo no código.
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'troque-esta-chave-em-producao');
define('JWT_EXPIRY_SECONDS', 60 * 60 * 8); // token válido por 8 horas

define('UPLOADS_DIR', __DIR__ . '/../../public/uploads');
define('MAX_UPLOAD_SIZE_BYTES', 5 * 1024 * 1024); // 5MB
define('ALLOWED_UPLOAD_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
