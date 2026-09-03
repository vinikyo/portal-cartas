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
require __DIR__ . '/../src/Utils/Request.php';
require __DIR__ . '/../src/Utils/RateLimiter.php';
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

try {
    // Instanciar os controllers aqui dentro (e não antes do try) importa:
    // o construtor de CardController já abre a conexão com o banco (ver
    // Card::__construct), então se o MySQL estiver fora do ar isso lança
    // uma PDOException — e só passa pelo nosso Response::exception() (que
    // nunca vaza mensagem crua de banco) se estiver dentro do try.
    $authController = new AuthController();
    $cardController = new CardController();

    // 10 requisições/s por IP. Roda antes do roteamento: qualquer rota
    // (existente ou não) conta pro limite, senão dava pra descobrir rotas
    // válidas só testando até parar de tomar 429.
    RateLimiter::check();

    // Tabela de rotas: [método, regex do path, handler]. Guardamos TODOS os
    // métodos que casam com o path (independente do método bater) pra poder
    // responder 405 (rota existe, método errado) em vez de 404 quando for
    // o caso — são erros diferentes e o cliente se beneficia de saber qual é.
    $routes = [
        ['POST',   '#^/login$#',             fn($m) => $authController->login()],
        ['POST',   '#^/logout$#',            fn($m) => $authController->logout()],
        ['GET',    '#^/me$#',                fn($m) => $authController->me()],
        ['GET',    '#^/editions$#',          fn($m) => $cardController->editions()],
        ['GET',    '#^/cards/(\d+)/image$#', fn($m) => $cardController->image((int) $m[1])],
        ['GET',    '#^/cards$#',             fn($m) => $cardController->index()],
        ['POST',   '#^/cards$#',             fn($m) => $cardController->store()],
        ['GET',    '#^/cards/(\d+)$#',       fn($m) => $cardController->show((int) $m[1])],
        ['PUT',    '#^/cards/(\d+)$#',       fn($m) => $cardController->update((int) $m[1])],
        ['DELETE', '#^/cards/(\d+)$#',       fn($m) => $cardController->destroy((int) $m[1])],
    ];

    $handler = null;
    $handlerArgs = [];
    $allowedMethodsForPath = [];

    foreach ($routes as [$routeMethod, $pattern, $routeHandler]) {
        if (preg_match($pattern, $path, $m)) {
            $allowedMethodsForPath[] = $routeMethod;
            if ($routeMethod === $method) {
                $handler = $routeHandler;
                $handlerArgs = $m;
            }
        }
    }

    if ($handler) {
        $handler($handlerArgs);
    } elseif (!empty($allowedMethodsForPath)) {
        header('Allow: ' . implode(', ', array_unique($allowedMethodsForPath)));
        Response::error('Método não permitido para esta rota.', 405);
    } else {
        Response::error('Rota não encontrada.', 404);
    }
} catch (Throwable $e) {
    Response::exception($e);
}
