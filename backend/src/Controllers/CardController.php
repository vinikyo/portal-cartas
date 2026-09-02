<?php

/**
 * CardController
 *
 * Todas as rotas de /api/cards e /api/editions passam por aqui.
 * Toda ação exige autenticação (requireAuth), já que é área admin.
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
        Response::success($this->cardService->list());
    }

    public function show(int $id): void
    {
        $this->authService->requireAuth();
        Response::success($this->cardService->get($id));
    }

    public function store(): void
    {
        $this->authService->requireAuth();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        Response::success($this->cardService->create($body), 201);
    }

    public function update(int $id): void
    {
        $this->authService->requireAuth();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        Response::success($this->cardService->update($id, $body));
    }

    public function destroy(int $id): void
    {
        $this->authService->requireAuth();
        $this->cardService->delete($id);
        Response::success(['message' => 'Carta excluída.']);
    }

    /**
     * GET /api/editions?game=magic
     * Simula a "fonte de dados" das edições exigida no enunciado.
     * Em produção isso poderia vir de uma API externa; aqui lemos de um JSON local.
     */
    public function editions(): void
    {
        $this->authService->requireAuth();

        $game = $_GET['game'] ?? '';
        $all = json_decode(file_get_contents(__DIR__ . '/../../data/editions.json'), true);

        if (!isset($all[$game])) {
            Response::error('Card game inválido.', 422);
        }

        // pequeno delay artificial pra deixar o loading state do front visível/testável
        usleep(400000);

        Response::success($all[$game]);
    }
}
