<?php

/**
 * Front Controller
 *
 * Todo request de API passa por aqui. É um roteador bem simples,
 * escrito à mão (sem framework), que casa método + path com uma ação
 * de um Controller.
 */

require __DIR__ . '/../src/Config/Constants.php';
require __DIR__ . '/../src/Config/Database.php';
require __DIR__ . '/../src/Utils/Response.php';
require __DIR__ . '/../src/Utils/Validator.php';
require __DIR__ . '/../src/Utils/Jwt.php';
require __DIR__ . '/../src/Models/User.php';
require __DIR__ . '/../src/Models/Card.php';
require __DIR__ . '/../src/Services/AuthService.php';
require __DIR__ . '/../src/Services/CardService.php';
require __DIR__ . '/../src/Controllers/AuthController.php';
require __DIR__ . '/../src/Controllers/CardController.php';

// CORS liberado para desenvolvimento local (front e back em portas/origens diferentes).
// Com JWT não dependemos mais de cookie entre origens, então Allow-Origin: *
// já é suficiente — só precisamos liberar o header Authorization no preflight.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// remove o prefixo /api caso exista, e barras extras
$path = '/' . trim(preg_replace('#^/api#', '', $path), '/');

$authController = new AuthController();
$cardController = new CardController();

try {
    // ---- Auth ----
    if ($path === '/login' && $method === 'POST') {
        $authController->login();
    } elseif ($path === '/logout' && $method === 'POST') {
        $authController->logout();
    } elseif ($path === '/me' && $method === 'GET') {
        $authController->me();

    // ---- Editions (select em cascata) ----
    } elseif ($path === '/editions' && $method === 'GET') {
        $cardController->editions();

    // ---- Imagem da carta (rota própria, pública — ver CardController::image) ----
    } elseif (preg_match('#^/cards/(\d+)/image$#', $path, $m) && $method === 'GET') {
        $cardController->image((int) $m[1]);

    // ---- Cards CRUD (a listagem aceita ?page=&per_page=&search=&game=&rarity=) ----
    } elseif ($path === '/cards' && $method === 'GET') {
        $cardController->index();
    } elseif ($path === '/cards' && $method === 'POST') {
        $cardController->store();
    } elseif (preg_match('#^/cards/(\d+)$#', $path, $m) && $method === 'GET') {
        $cardController->show((int) $m[1]);
    } elseif (preg_match('#^/cards/(\d+)$#', $path, $m) && $method === 'PUT') {
        $cardController->update((int) $m[1]);
    } elseif (preg_match('#^/cards/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $cardController->destroy((int) $m[1]);

    } else {
        Response::error('Rota não encontrada.', 404);
    }
} catch (Throwable $e) {
    Response::error('Erro interno: ' . $e->getMessage(), 500);
}
