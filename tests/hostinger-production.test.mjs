import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htaccessUrl = new URL("../public/.htaccess", import.meta.url);
const adminUrl = new URL("../public/admin/index.html", import.meta.url);
const notFoundUrl = new URL("../src/pages/404.astro", import.meta.url);

test("Hostinger configuration protects pages without blocking geolocation", async () => {
  const config = await readFile(htaccessUrl, "utf8");

  assert.match(config, /Options -Indexes/);
  assert.match(config, /ErrorDocument 404 \/404\.html/);
  assert.match(config, /X-Content-Type-Options "nosniff"/);
  assert.match(config, /X-Frame-Options "SAMEORIGIN"/);
  assert.match(config, /Referrer-Policy "strict-origin-when-cross-origin"/);
  assert.match(config, /geolocation=\(self\)/);
  assert.match(config, /max-age=31536000, immutable/);
});

test("Decap CMS uses an exact supported version", async () => {
  const admin = await readFile(adminUrl, "utf8");

  assert.match(admin, /decap-cms@3\.16\.0\/dist\/decap-cms\.js/);
  assert.doesNotMatch(admin, /decap-cms@\^/);
});

test("custom 404 page stays out of search indexes", async () => {
  const page = await readFile(notFoundUrl, "utf8");

  assert.match(page, /robots="noindex, follow"/);
  assert.match(page, /href="\/outils\/"/);
});
