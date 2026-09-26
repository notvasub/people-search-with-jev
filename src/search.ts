export type Hit = { id: string; title: string; url: string; snippet: string; rank: number };
export type Choice = { selected: Hit; ordered: Hit[]; mode: "standard" | "jev" | "fallback"; reason: string; model?: string; usage?: unknown };

const MAX_RESULTS = 6;

export function safePublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
    // Reject IP literals, including IPv6, to avoid sending readers to internal endpoints.
    if (/^[\d.]+$/.test(host) || host.includes(":")) return null;
    url.hash = "";
    url.searchParams.forEach((_, key) => {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    });
    return url.toString();
  } catch { return null; }
}

export function normalizeHits(raw: unknown): Hit[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? safePublicUrl(row.url) : null;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    hits.push({
      id: `source-${hits.length + 1}`,
      title: String(row.title ?? "Untitled").slice(0, 180),
      url,
      snippet: String(row.text ?? row.snippet ?? "").replace(/\s+/g, " ").slice(0, 500),
      rank: hits.length + 1,
    });
    if (hits.length === MAX_RESULTS) break;
  }
  return hits;
}

export async function searchExa(query: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<Hit[]> {
  const response = await fetcher("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ query, category: "people", numResults: MAX_RESULTS, contents: { text: { maxCharacters: 500 } } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Exa search failed (HTTP ${response.status})`);
  const data = await response.json() as { results?: unknown };
  return normalizeHits(data.results);
}

export function providerOrder(hits: Hit[], reason = "Provider order"): Choice {
  if (!hits.length) throw new Error("No public candidates found");
  return { selected: hits[0], ordered: hits, mode: "standard", reason };
}

export async function chooseWithJev(query: string, hits: Hit[], apiKey: string, fetcher: typeof fetch = fetch): Promise<Choice> {
  if (!hits.length) throw new Error("No public candidates found");
  if (hits.length === 1) return providerOrder(hits, "Only one candidate");
  const model = process.env.JEV_MODEL || "typesafe/jev-1.13";
  const choices = hits.map(hit => hit.id);
  try {
    const response = await fetcher("https://openrouter.ai/api/alpha/decisions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        state: { query: query.slice(0, 500), candidates: hits.map(hit => ({ id: hit.id, title: hit.title, url: hit.url, snippet: hit.snippet })) },
        questions: { next_source: {
          type: "choice",
          instructions: "Which candidate in `candidates` is most likely to give reliable public evidence for the professional identity, role, and organization requested in `query`? Prefer direct employer or professional sources. A snippet alone does not verify identity.",
          criteria: Object.fromEntries(hits.map(hit => [hit.id, `${hit.title} — ${hit.url} — ${hit.snippet}`])),
        } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Jev request failed (HTTP ${response.status})`);
    const data = await response.json() as Record<string, unknown>;
    const answers = data.answers as Record<string, unknown> | undefined;
    const answer = answers?.next_source as Record<string, unknown> | undefined;
    const selectedId = answer?.choice;
    if (answer?.type !== "choice" || typeof selectedId !== "string" || !choices.includes(selectedId)) {
      throw new Error("Jev returned an invalid choice");
    }
    const selected = hits.find(hit => hit.id === selectedId)!;
    return {
      selected,
      ordered: [selected, ...hits.filter(hit => hit.id !== selectedId)],
      mode: "jev",
      reason: "Jev selected this candidate for the next source read",
      model: typeof data.model === "string" ? data.model : model,
      usage: data.usage,
    };
  } catch (error) {
    return { ...providerOrder(hits), mode: "fallback", reason: error instanceof Error ? error.message : "Jev unavailable" };
  }
}
