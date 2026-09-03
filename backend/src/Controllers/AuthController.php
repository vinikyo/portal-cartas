<?php

/**
 * AuthController
 *
 * Só recebe a requisição, chama o Service e devolve a resposta.
 */
class AuthController
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function login(): void
    {
        $body = Request::jsonBody();

        $username = trim($body['username'] ?? '');
        $password = (string) ($body['password'] ?? '');

        if ($username === '' || $password === '') {
            Response::error('Informe usuário e senha.', 422);
        }

        try {
            $result = $this->authService->login($username, $password);
            Response::success($result);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public function logout(): void
    {
        // Com JWT o logout é feito no cliente (apagando o token guardado).
        // Mantemos a rota só por simetria/compatibilidade com o front.
        Response::success(['message' => 'Logout realizado.']);
    }

    public function me(): void
    {
        $user = $this->authService->requireAuth();
        Response::success($user);
    }
}
