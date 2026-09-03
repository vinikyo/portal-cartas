<?php

/**
 * CardController
 *
 * Todas as rotas de /api/cards e /api/editions passam por aqui.
 */
class CardController
{
    private CardService $cardService;
    private AuthService $authService;

    public function __construct()
    {
        $this->cardService = new CardService();
        $this->authService = new AuthService();
    }

    public function index(): void
    {
        $this->authService->requireAuth();
        Response::success($this->cardService->list($_GET));
    }

    public function show(int $id): void
    {
        $this->authService->requireAuth();
        Response::success($this->cardService->get($id));
    }

    public function store(): void
    {
        $this->authService->requireAuth();
        $body = Request::jsonBody();
        Response::success($this->cardService->create($body), 201);
    }

    public function update(int $id): void
    {
        $this->authService->requireAuth();
        $body = Request::jsonBody();
        Response::success($this->cardService->update($id, $body));
    }

    public function destroy(int $id): void
    {
        $this->authService->requireAuth();
        $this->cardService->delete($id);
        Response::success(['message' => 'Carta excluída.']);
    }

    /**
     * GET /api/cards/{id}/image
     *
     * Serve o binário da imagem direto do banco. Propositalmente PÚBLICO
     * (sem requireAuth): uma tag <img src="..."> do navegador não consegue
     * mandar o header Authorization, então essa rota fica de fora do JWT
     * — é só o binário da imagem, não dado sensível da carta.
     */
    public function image(int $id): void
    {
        $image = $this->cardService->getImage($id);

        header('Content-Type: ' . $image['image_mime']);
        header('Cache-Control: public, max-age=86400, immutable');
        header('Content-Length: ' . strlen($image['image_data']));
        echo $image['image_data'];
        exit;
    }

    /**
     * GET /api/editions?game=magic
     * Simula a "fonte de dados" das edições exigida no enunciado.
     */
    public function editions(): void
    {
        $this->authService->requireAuth();

        $game = $_GET['game'] ?? '';
        $all = json_decode(file_get_contents(__DIR__ . '/../../data/editions.json'), true);

        if (!isset($all[$game])) {
            Response::error('Card game inválido.', 422);
        }

        // As edições vêm de um arquivo estático; o navegador pode reutilizar
        // a resposta por uma hora mesmo quando o modal é reaberto.
        header('Cache-Control: public, max-age=3600');

        // Latência artificial só para demonstração/testes locais.
        if (getenv('SIMULATE_LATENCY') === '1') {
            usleep(400000);
        }

        Response::success($all[$game]);
    }
}
