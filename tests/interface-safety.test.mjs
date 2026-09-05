import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const toolsPageUrl = new URL("../src/pages/outils/index.astro", import.meta.url);
const layoutUrl = new URL("../src/layouts/BaseLayout.astro", import.meta.url);
const globalStylesUrl = new URL("../src/styles/global.css", import.meta.url);
const buildWorkflowUrl = new URL("../.github/workflows/main.yml", import.meta.url);

test("briefing starts without inventing a selected terrain", async () => {
  const source = await readFile(toolsPageUrl, "utf8");

  assert.doesNotMatch(source, /value="LFQQ"/);
  assert.doesNotMatch(source, /sourceIcao\?\.value \|\| "LFQQ"/);
  assert.match(source, /id="briefingContextIcao"[^>]*>—<\/span>/);
  assert.match(source, /id="briefingContextName">Aucun terrain sélectionné<\/strong>/);
  assert.match(source, /aria-busy="false"/);
});

test("briefing exposes its operational limits and accessible search state", async () => {
  const source = await readFile(toolsPageUrl, "utf8");

  assert.match(source, /Aide à la préparation uniquement/);
  assert.match(source, /Ne l’utilise pas comme moyen de navigation en vol/);
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-controls="searchSuggestions"/);
  assert.match(source, /role="status"/);
});

test("site provides keyboard navigation and reduced-motion support", async () => {
  const [layout, styles] = await Promise.all([
    readFile(layoutUrl, "utf8"),
    readFile(globalStylesUrl, "utf8"),
  ]);

  assert.match(layout, /href="#main-content">Aller au contenu principal<\/a>/);
  assert.match(layout, /<main id="main-content" tabindex="-1">/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("main pushes automatically build a short-lived production artifact", async () => {
  const workflow = await readFile(buildWorkflowUrl, "utf8");

  assert.match(workflow, /push:\s+branches:\s+- main/);
  assert.match(workflow, /retention-days: 14/);
  assert.match(workflow, /if-no-files-found: error/);
});
