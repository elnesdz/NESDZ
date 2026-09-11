-- NESDZ - schéma initial MySQL 8 / MariaDB 10.6+
-- À importer une seule fois avec phpMyAdmin sur la base dédiée.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(32) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) NOT NULL,
    email VARCHAR(254) NOT NULL,
    email_normalized VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NULL,
    display_name VARCHAR(120) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    email_verified_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY users_public_id_unique (public_id),
    UNIQUE KEY users_email_normalized_unique (email_normalized),
    KEY users_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    purchaser_email VARCHAR(254) NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    amount_cents INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'eur',
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    stripe_checkout_session_id VARCHAR(255) NULL,
    stripe_payment_intent_id VARCHAR(255) NULL,
    paid_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY payment_orders_public_id_unique (public_id),
    UNIQUE KEY payment_orders_checkout_unique (stripe_checkout_session_id),
    KEY payment_orders_user_index (user_id),
    KEY payment_orders_status_index (status),
    CONSTRAINT payment_orders_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entitlements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    source_order_id BIGINT UNSIGNED NULL,
    product_code VARCHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    valid_from DATETIME NOT NULL,
    valid_until DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY entitlements_source_order_unique (source_order_id),
    KEY entitlements_access_index (user_id, product_code, status, valid_until),
    CONSTRAINT entitlements_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT entitlements_order_fk FOREIGN KEY (source_order_id) REFERENCES payment_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activation_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY activation_tokens_hash_unique (token_hash),
    KEY activation_tokens_user_index (user_id, expires_at),
    CONSTRAINT activation_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS authorized_devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    device_hash BINARY(32) NOT NULL,
    label VARCHAR(120) NULL,
    first_seen_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    UNIQUE KEY authorized_devices_user_device_unique (user_id, device_hash),
    KEY authorized_devices_active_index (user_id, revoked_at),
    CONSTRAINT authorized_devices_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    device_id BIGINT UNSIGNED NOT NULL,
    session_hash BINARY(32) NOT NULL,
    user_agent_hash BINARY(32) NOT NULL,
    ip_prefix_hash BINARY(32) NULL,
    expires_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY account_sessions_hash_unique (session_hash),
    KEY account_sessions_user_active_index (user_id, revoked_at, expires_at),
    CONSTRAINT account_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT account_sessions_device_fk FOREIGN KEY (device_id) REFERENCES authorized_devices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_events (
    event_id VARCHAR(255) NOT NULL PRIMARY KEY,
    event_type VARCHAR(120) NOT NULL,
    livemode TINYINT(1) NOT NULL,
    payload_sha256 BINARY(32) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'received',
    attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    KEY stripe_events_status_index (status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_jobs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    deduplication_key VARCHAR(191) NOT NULL,
    recipient VARCHAR(254) NOT NULL,
    template_code VARCHAR(64) NOT NULL,
    payload_json JSON NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    available_at DATETIME NOT NULL,
    locked_at DATETIME NULL,
    sent_at DATETIME NULL,
    last_error TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY email_jobs_deduplication_unique (deduplication_key),
    KEY email_jobs_queue_index (status, available_at),
    CONSTRAINT email_jobs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    exam_code VARCHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'in_progress',
    question_count SMALLINT UNSIGNED NOT NULL,
    correct_count SMALLINT UNSIGNED NULL,
    score_percent DECIMAL(5,2) NULL,
    question_snapshot_json JSON NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY exam_attempts_public_id_unique (public_id),
    KEY exam_attempts_user_index (user_id, started_at),
    CONSTRAINT exam_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_responses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT UNSIGNED NOT NULL,
    sequence_number SMALLINT UNSIGNED NOT NULL,
    question_key VARCHAR(191) NOT NULL,
    topic_code VARCHAR(64) NOT NULL,
    selected_choice_key VARCHAR(64) NULL,
    correct_choice_key VARCHAR(64) NOT NULL,
    is_correct TINYINT(1) NOT NULL,
    explanation_snapshot TEXT NOT NULL,
    answered_at DATETIME NOT NULL,
    UNIQUE KEY exam_responses_attempt_sequence_unique (attempt_id, sequence_number),
    CONSTRAINT exam_responses_attempt_fk FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT UNSIGNED NULL,
    action_code VARCHAR(100) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_public_id VARCHAR(191) NULL,
    metadata_json JSON NULL,
    ip_hash BINARY(32) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY admin_audit_log_actor_index (actor_user_id, created_at),
    KEY admin_audit_log_action_index (action_code, created_at),
    CONSTRAINT admin_audit_log_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('2026-09-11-initial');
