import assert from "node:assert/strict";
import test from "node:test";
import { chooseWithJev, normalizeHits, safePublicUrl, searchExa } from "../src/search.ts";

const hits = normalizeHits([
  { title: "First", url: "https://example.org/a", text: "Old profile" },
  { title: "Second", url: "https://example.com/b", text: "Employer page" },
]);

test("normalization rejects unsafe URLs and duplicates", () => {
  assert.equal(safePublicUrl("http://example.com"), null);
  assert.equal(safePublicUrl("https://127.0.0.1/a"), null);
  assert.equal(normalizeHits([{ url: "https://example.com/a" }, { url: "https://example.com/a" }, { url: "https://localhost/a" }]).length, 1);
});

test("Jev choice changes the next candidate and records model", async () => {
  const fetcher = async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.questions.next_source.type, "choice");
    assert.equal(request.questions.next_source.criteria["source-2"].includes("Employer page"), true);
    return new Response(JSON.stringify({ model: "typesafe/jev-1.13", answers: { next_source: { type: "choice", choice: "source-2" } }, usage: { cost: 0.001 } }), { status: 200 });
  };
  const result = await chooseWithJev("Find person", hits, "test-key", fetcher as typeof fetch);
  assert.equal(result.selected.id, "source-2");
  assert.equal(result.mode, "jev");
  assert.equal(result.model, "typesafe/jev-1.13");
});

test("Exa people search requests six results and normalizes returned links", async () => {
  const fetcher = async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.category, "people");
    assert.equal(request.numResults, 6);
    return new Response(JSON.stringify({ results: [{ title: "Profile", url: "https://example.com/p", text: "Professional bio" }] }), { status: 200 });
  };
  const results = await searchExa("Find a person", "test-key", fetcher as typeof fetch);
  assert.equal(results[0].snippet, "Professional bio");
});

test("invalid Jev output falls back to provider order", async () => {
  const fetcher = async () => new Response(JSON.stringify({ answers: { next_source: { type: "choice", choice: "invented" } } }), { status: 200 });
  const result = await chooseWithJev("Find person", hits, "test-key", fetcher as typeof fetch);
  assert.equal(result.selected.id, "source-1");
  assert.equal(result.mode, "fallback");
});
