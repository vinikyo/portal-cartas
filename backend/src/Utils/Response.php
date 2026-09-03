<?php

/**
 * Response
 *
 * Padroniza toda resposta JSON da API, então o front-end sempre
 * recebe o mesmo "formato de envelope": { success, data|message }.
 */
class Response
{
    public static function json($data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data = null, int $status = 200): never
    {
        self::json(['success' => true, 'data' => $data], $status);
    }

    public static function error(string $message, int $status = 400, array $errors = []): never
    {
        $payload = ['success' => false, 'message' => $message];
        if (!empty($errors)) {
            $payload['errors'] = $errors;
        }
        self::json($payload, $status);
    }

    /**
     * Traduz uma exceção não prevista (ex: erro do PDO/MySQL) pra uma resposta
     * HTTP segura e padronizada. NUNCA repassa $e->getMessage() de uma
     * PDOException pro cliente — isso vazaria detalhes do schema/banco
     * (nome de coluna, tipo, etc.). A mensagem real vai só pro error_log,
     * pra quem tem acesso ao servidor conseguir debugar.
     */
    public static function exception(Throwable $e): never
    {
        error_log('[portal-cartas] ' . get_class($e) . ': ' . $e->getMessage());

        if ($e instanceof PDOException) {
            // SQLSTATE de 5 caracteres (ex: '22001', '23000'), vem tanto pelo
            // código da exception quanto pelo array errorInfo do driver.
            $sqlState = $e->errorInfo[0] ?? (string) $e->getCode();

            // 22001 = "String data, right truncated" — valor maior que a coluna
            if ($sqlState === '22001') {
                self::error('Um dos campos enviados é maior do que o permitido.', 422);
            }

            // 23000 = violação de constraint (ex: UNIQUE duplicada)
            if ($sqlState === '23000') {
                self::error('Já existe um registro com esses dados.', 409);
            }

            // Sem conexão com o servidor de banco (fora do ar, host errado, etc.)
            if (in_array($sqlState, ['HY000', '2002', '2006'], true)) {
                self::error('Não foi possível conectar ao banco de dados. Tente novamente em instantes.', 503);
            }

            self::error('Erro ao acessar o banco de dados.', 500);
        }

        self::error('Erro interno do servidor. Tente novamente mais tarde.', 500);
    }
}
