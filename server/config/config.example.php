<?php

declare(strict_types=1);

/**
 * Copier ce fichier vers ../nesdz-private/config.php sur Hostinger.
 * Ne jamais placer le fichier réel dans public_html ou dans GitHub.
 */
return [
    'app' => [
        'environment' => 'production',
        'base_url' => 'https://nesdz.com',
        'timezone' => 'Europe/Paris',
    ],
    'database' => [
        'dsn' => 'mysql:host=localhost;dbname=PREFIXE_nesdz_app;charset=utf8mb4',
        'username' => 'PREFIXE_nesdz_app',
        'password' => 'REMPLACER_PAR_LE_MOT_DE_PASSE_MYSQL',
    ],
    'security' => [
        // Au moins 64 caractères aléatoires, différents du mot de passe MySQL.
        'app_key' => 'REMPLACER_PAR_UN_SECRET_ALEATOIRE_DE_64_CARACTERES',
        'session_lifetime_seconds' => 7200,
        'maximum_devices_per_user' => 2,
    ],
    'stripe' => [
        // Ces valeurs resteront vides tant que le paiement n'est pas activé.
        'secret_key' => '',
        'webhook_secret' => '',
        'payment_link_id' => '',
        'expected_amount_cents' => 2500,
        'currency' => 'eur',
        'livemode' => true,
    ],
    'mail' => [
        'host' => 'smtp.hostinger.com',
        'port' => 465,
        'encryption' => 'ssl',
        'username' => 'noreply@nesdz.com',
        'password' => 'REMPLACER_PAR_LE_MOT_DE_PASSE_EMAIL',
        'from_address' => 'noreply@nesdz.com',
        'from_name' => 'NESDZ',
    ],
];
