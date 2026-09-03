<?php

/**
 * Request
 *
 * Helper pra ler o corpo da requisição. Existe só pra separar dois erros
 * que são conceitualmente diferentes: corpo que não é um JSON válido
 * (400 Bad Request — a requisição em si está malformada) de campos
 * obrigatórios faltando dentro de um JSON válido (422 Unprocessable
 * Content — isso já é responsabilidade do Validator/CardService).
 */
class Request
{
    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input');

        // corpo vazio é normal em alguns métodos (ex: DELETE) — não é erro
        if (trim((string) $raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            Response::error('Corpo da requisição não é um JSON válido.', 400);
        }

        return $decoded;
    }
}
