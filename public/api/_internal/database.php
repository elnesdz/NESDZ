<?php

declare(strict_types=1);

function nesdz_database(array $config): PDO
{
    static $connection = null;

    if ($connection instanceof PDO) {
        return $connection;
    }

    $database = $config['database'] ?? null;
    if (!is_array($database)) {
        throw new RuntimeException('Database configuration is unavailable.');
    }

    foreach (['dsn', 'username', 'password'] as $requiredKey) {
        if (!isset($database[$requiredKey]) || !is_string($database[$requiredKey]) || $database[$requiredKey] === '') {
            throw new RuntimeException('Database configuration is incomplete.');
        }
    }

    $connection = new PDO(
        $database['dsn'],
        $database['username'],
        $database['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ]
    );

    return $connection;
}
