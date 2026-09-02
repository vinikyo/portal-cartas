<?php

/**
 * AuthService
 *
 * Regra de negócio de autenticação, agora via JWT (stateless):
 * login() gera um token assinado; requireAuth() lê o header
 * "Authorization: Bearer <token>" e valida.
 */
class AuthService
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    public function login(string $username, string $password): array
    {
        $user = $this->userModel->findByUsername($username);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new RuntimeException('Usuário ou senha inválidos.');
        }

        $token = Jwt::encode([
            'sub'      => $user['id'],
            'username' => $user['username'],
            'iat'      => time(),
            'exp'      => time() + JWT_EXPIRY_SECONDS,
        ]);

        return [
            'token' => $token,
            'user'  => [
                'id'       => $user['id'],
                'username' => $user['username'],
            ],
        ];
    }

    public function userFromToken(): ?array
    {
        $token = $this->extractBearerToken();
        if (!$token) {
            return null;
        }

        $payload = Jwt::decode($token);
        if (!$payload || empty($payload['sub'])) {
            return null;
        }

        return [
            'id'       => $payload['sub'],
            'username' => $payload['username'] ?? null,
        ];
    }

    public function requireAuth(): array
    {
        $user = $this->userFromToken();

        if (!$user) {
            Response::error('Não autenticado.', 401);
        }

        return $user;
    }

    private function extractBearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;

        // fallback para servidores onde o header some de $_SERVER (comum com Apache + mod_php)
        if (!$header && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header = $headers['Authorization'] ?? null;
        }

        if (!$header || !preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            return null;
        }

        return $matches[1];
    }
}
