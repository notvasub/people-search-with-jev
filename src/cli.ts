import { readFile } from "node:fs/promises";
import { chooseWithJev, normalizeHits, providerOrder, searchExa } from "./search.ts";

function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

const query = option("--query");
const sample = process.argv.includes("--sample");
const mode = option("--mode") ?? "jev";
if ((!query && !sample) || !["standard", "jev"].includes(mode)) {
  console.error("Usage: npm run search -- --query 'name, role, company' [--mode jev|standard]\n       npm run search -- --sample [--mode jev|standard]");
  process.exitCode = 2;
} else {
  try {
    const input = sample ? JSON.parse(await readFile(new URL("../examples/sample-results.json", import.meta.url), "utf8")) : null;
    const question = query ?? input.query;
    const hits = sample ? normalizeHits(input.results) : await searchExa(question, process.env.EXA_API_KEY ?? (() => { throw new Error("Set EXA_API_KEY for live search, or use --sample"); })());
    if (!hits.length) throw new Error("No public candidates found");
    if (mode === "jev" && !process.env.OPENROUTER_API_KEY) throw new Error("Set OPENROUTER_API_KEY for Jev mode");
    const decision = mode === "jev" ? await chooseWithJev(question, hits, process.env.OPENROUTER_API_KEY!) : providerOrder(hits);
    console.log(JSON.stringify({ query: question, source: sample ? "sample" : "exa", decision, note: "Candidate links only. Read sources and verify identity before making claims." }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
