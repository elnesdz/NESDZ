import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("the Hostinger artifact includes hidden security files", async () => {
  const workflow = await read(".github/workflows/main.yml");

  assert.match(workflow, /include-hidden-files:\s*true/);
});

test("quality checks validate PHP 8.3 syntax with PDO MySQL", async () => {
  const workflow = await read(".github/workflows/quality.yml");

  assert.match(workflow, /php-version:\s*"8\.3"/);
  assert.match(workflow, /extensions:\s*pdo_mysql/);
  assert.match(workflow, /php -l/);
});

test("the private configuration template contains no real credentials", async () => {
  const config = await read("server/config/config.example.php");

  assert.match(config, /PREFIXE_nesdz_app/);
  assert.match(config, /REMPLACER_PAR_LE_MOT_DE_PASSE_MYSQL/);
  assert.doesNotMatch(config, /u949636039/);
  assert.doesNotMatch(config, /sk_(?:live|test)_/);
  assert.doesNotMatch(config, /whsec_/);
});

test("the initial schema covers payment, access, delivery and learning", async () => {
  const schema = await read("server/database/schema.sql");
  const requiredTables = [
    "users",
    "payment_orders",
    "entitlements",
    "activation_tokens",
    "authorized_devices",
    "account_sessions",
    "stripe_events",
    "email_jobs",
    "exam_attempts",
    "exam_responses",
    "admin_audit_log",
  ];

  for (const table of requiredTables) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }

  assert.match(schema, /token_hash BINARY\(32\)/);
  assert.match(schema, /password_hash VARCHAR\(255\)/);
});

test("API internals are denied over HTTP and the health check leaks no details", async () => {
  const internalAccess = await read("public/api/_internal/.htaccess");
  const health = await read("public/api/v1/health.php");

  assert.match(internalAccess, /Require all denied/);
  assert.match(health, /status' => 'unavailable'/);
  assert.doesNotMatch(health, /'(?:error|message)'\s*=>\s*\$exception/);
});

test("Hostinger deployment explicitly preserves the VAC and AIP directory", async () => {
  const guide = await read("DEPLOIEMENT_HOSTINGER.md");

  assert.match(guide, /Ne jamais supprimer `public_html\/docs`/);
});
