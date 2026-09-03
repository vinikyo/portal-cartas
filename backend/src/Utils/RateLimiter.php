<?php

/**
 * RateLimiter
 *
 * Limite simples de 10 requisições/segundo por cliente. Guarda, por IP, os
 * timestamps das requisições recentes num arquivo em disco (com flock pra
 * ficar seguro mesmo com requisições concorrentes) — sem depender de
 * Redis/Memcached/extensão nenhuma, só PHP puro, o que já é suficiente pro
 * volume de tráfego desse desafio.
 *
 * Importante: em produção atrás de proxy, X-Forwarded-For só é aceito quando
 * TRUST_PROXY=1 estiver configurado para um proxy confiável.
 */
class RateLimiter
{
    private const MAX_REQUESTS = 10;
    private const WINDOW_SECONDS = 1;

    private static function clientIp(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        // Só confia em X-Forwarded-For quando o deploy explicitamente informa
        // que há um proxy confiável na frente da aplicação.
        if (defined('TRUST_PROXY') && TRUST_PROXY) {
            $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            if ($forwarded !== '') {
                $candidate = trim(explode(',', $forwarded)[0]);
                if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                    return $candidate;
                }
            }
        }

        return $remote;
    }

    public static function check(): void
    {
        $ip = self::clientIp();
        $safeKey = preg_replace('/[^a-zA-Z0-9_.:]/', '_', $ip);
        $file = sys_get_temp_dir() . "/portal_cartas_rl_{$safeKey}.json";

        $fp = @fopen($file, 'c+');
        if ($fp === false) {
            // Se não der nem pra abrir o arquivo (ex: permissão), deixa passar —
            // rate limit é proteção extra, não pode derrubar a API inteira sozinho.
            return;
        }

        flock($fp, LOCK_EX);

        $raw = stream_get_contents($fp);
        $timestamps = $raw ? (json_decode($raw, true) ?: []) : [];

        $now = microtime(true);
        $timestamps = array_values(array_filter(
            $timestamps,
            fn($t) => ($now - $t) < self::WINDOW_SECONDS
        ));

        if (count($timestamps) >= self::MAX_REQUESTS) {
            flock($fp, LOCK_UN);
            fclose($fp);
            header('Retry-After: 1');
            Response::error('Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.', 429);
        }

        $timestamps[] = $now;

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($timestamps));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
