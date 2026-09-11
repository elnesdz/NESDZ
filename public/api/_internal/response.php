<?php

declare(strict_types=1);

function nesdz_json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Robots-Tag: noindex, nofollow');

    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') {
        echo json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );
    }

    exit;
}

function nesdz_method_not_allowed(array $allowed): never
{
    header('Allow: ' . implode(', ', $allowed));
    nesdz_json_response([
        'ok' => false,
        'error' => 'method_not_allowed',
    ], 405);
}
