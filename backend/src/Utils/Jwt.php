<?php

/**
 * Jwt
 *
 * Implementação manual (HS256) de JWT — sem biblioteca externa, só
 * funções nativas do PHP (base64, hash_hmac). Formato padrão:
 * header.payload.signature, cada parte em base64url.
 */
class Jwt
{
    public static function encode(array $payload): string
    {
        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = self::base64UrlEncode(json_encode($payload));
        $signature = self::sign("$header.$body");

        return "$header.$body.$signature";
    }

    /**
     * Retorna o payload decodificado, ou null se o token for inválido,
     * malformado, com assinatura incorreta ou expirado.
     */
    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $body, $signature] = $parts;

        $expectedSignature = self::sign("$header.$body");
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($body), true);
        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // token expirado
        }

        return $payload;
    }

    private static function sign(string $data): string
    {
        return self::base64UrlEncode(hash_hmac('sha256', $data, JWT_SECRET, true));
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $padded = str_pad($data, strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + 4 - strlen($data) % 4, '=');
        return base64_decode(strtr($padded, '-_', '+/'));
    }
}
