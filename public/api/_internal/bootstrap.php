<?php

declare(strict_types=1);

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/database.php';

nesdz_send_security_headers();

date_default_timezone_set('UTC');

set_exception_handler(static function (Throwable $exception): void {
    error_log(sprintf(
        '[NESDZ API] %s in %s:%d',
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine()
    ));

    nesdz_json_response([
        'ok' => false,
        'error' => 'internal_error',
    ], 500);
});

function nesdz_config_path(): string
{
    $environmentPath = getenv('NESDZ_CONFIG_PATH');
    if (is_string($environmentPath) && $environmentPath !== '') {
        return $environmentPath;
    }

    return dirname(__DIR__, 3) . '/nesdz-private/config.php';
}

function nesdz_config(): array
{
    static $config = null;

    if (is_array($config)) {
        return $config;
    }

    $path = nesdz_config_path();
    if (!is_file($path) || !is_readable($path)) {
        throw new RuntimeException('Application configuration is unavailable.');
    }

    $loaded = require $path;
    if (!is_array($loaded)) {
        throw new RuntimeException('Application configuration is invalid.');
    }

    $timezone = $loaded['app']['timezone'] ?? 'Europe/Paris';
    if (!is_string($timezone) || !in_array($timezone, timezone_identifiers_list(), true)) {
        throw new RuntimeException('Application timezone is invalid.');
    }

    date_default_timezone_set($timezone);
    $config = $loaded;

    return $config;
}
