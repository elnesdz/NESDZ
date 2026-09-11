<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_internal/bootstrap.php';

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
    nesdz_method_not_allowed(['GET', 'HEAD']);
}

try {
    $config = nesdz_config();
    $databaseReady = (int) nesdz_database($config)->query('SELECT 1')->fetchColumn() === 1;
} catch (Throwable $exception) {
    error_log('[NESDZ health] ' . $exception->getMessage());
    nesdz_json_response([
        'ok' => false,
        'service' => 'nesdz-api',
        'status' => 'unavailable',
    ], 503);
}

nesdz_json_response([
    'ok' => $databaseReady,
    'service' => 'nesdz-api',
    'status' => $databaseReady ? 'ready' : 'unavailable',
    'database' => $databaseReady ? 'ready' : 'unavailable',
    'checked_at' => gmdate('c'),
], $databaseReady ? 200 : 503);
