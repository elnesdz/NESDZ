import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const modelsDir = new URL("../src/content/models/", import.meta.url);
const modelsIndexUrl = new URL("../src/pages/modeles/index.astro", import.meta.url);
const batchMarker = 'catalogBatch: "2026-09-100"';

test("the September catalog batch adds exactly 100 sourced model sheets", async () => {
  const filenames = (await readdir(modelsDir)).filter((name) => name.endsWith(".md"));
  const contents = await Promise.all(
    filenames.map(async (name) => ({
      name,
      source: await readFile(new URL(name, modelsDir), "utf8"),
    }))
  );
  const batch = contents.filter(({ source }) => source.includes(batchMarker));

  assert.equal(batch.length, 100);
  assert.equal(filenames.length, 153);

  for (const { name, source } of batch) {
    assert.match(source, /^---\n[\s\S]*?\n---\n/);
    assert.match(source, /manufacturer:\s*"[^"]+"/);
    assert.match(source, /category:\s*"(?:Multiaxe|Pendulaire|Paramoteur|Autogire|HydroULM|Autre)"/);
    assert.match(source, /country:\s*"[^"]+"/);
    assert.match(source, /editorialStatus:\s*"a-completer"/);
    assert.match(source, /youtubeSearchQuery:\s*"[^"]+"/);
    assert.match(source, /links:\n\s+- label:\s*"Source/);
    assert.match(source, /url:\s*"https?:\/\//, `${name} must include a source URL`);
  }
});

test("all model filenames remain unique", async () => {
  const filenames = (await readdir(modelsDir)).filter((name) => name.endsWith(".md"));
  assert.equal(new Set(filenames).size, filenames.length);
});

test("the expanded directory can be filtered by manufacturer", async () => {
  const source = await readFile(modelsIndexUrl, "utf8");

  assert.match(source, /id="manufacturer"/);
  assert.match(source, /m\.manufacturer !== maker/);
  assert.match(source, /manufacturer\.value = ""/);
  assert.match(source, /aria-live="polite"/);
});
