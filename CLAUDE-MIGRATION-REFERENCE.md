# Claude Migration — Reference from troll-patrol (proven + runtime-verified)

**Companion to `MIGRATION-GEMINI-TO-CLAUDE.md`.** That file says *what* to migrate (the 4 routes + tiers). This file is the *how*: the working wrapper, the gotchas that actually bit us, model IDs, pricing, and the API-key step. Everything here was migrated **and runtime-verified on Claude** in `C:\Projects\troll-patrol` (2026-06-30), so it's not theory.

> Reminder of the architecture: this repo owns **no LLM code**. All 4 AI features are inline `gemini-2.5-flash` calls in the shared backend monolith
> `C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\api\api-server.js` (Cloud Run `business-search-api`). The work below happens **in that backend repo**, not here. This doc lives here because BulkListingPro is migration priority #2 and these are its routes.

---

## 0. First: create a NEW dedicated Anthropic API key (we agreed on this)

- Anthropic billing is a **separate Console account**, NOT tied to GCP. The GCP billing mess (all 13 billing accounts closed) does **not** touch Claude. This is a clean start.
- Create the key at **https://console.anthropic.com/settings/keys** → "Create Key".
- **Use a new, dedicated key per concern so cost is isolated and one leak is cheap to rotate.** Suggested:
  - `troll-patrol` — already has its own key (`ANTHROPIC_API_KEY` in that repo's `.env`).
  - `blp-backend` (or `govtools-backend`) — one key for the shared `api-server.js` monolith. Because the monolith serves 5 front-ends, this single backend key covers BulkListingPro's 4 routes. Name it clearly in the Console so usage is attributable.
- Store it as `ANTHROPIC_API_KEY` in the backend's environment (its `.env` / Cloud Run env / Railway or Render secret if it gets re-hosted — see the OUTAGE note at the bottom). **Never** hardcode it in a route.
- Set a **spend limit** on the key in the Console (customer-facing routes run on user credits — a runaway prompt shouldn't run up an unbounded bill).

---

## 1. The reusable wrapper (adapt the tier map + JSON-retry; don't reinvent)

troll-patrol's wrapper is TypeScript (`src/lib/claudeClient.ts`). The backend monolith is Node/CommonJS, so here is the **CommonJS port** — same behavior, ready to drop into the backend as `claudeClient.js` and `require()` from each route. Match the module system the backend actually uses (if it's ESM, convert `require`/`module.exports` to `import`/`export`).

```js
// claudeClient.js — shared Claude wrapper for the backend monolith.
// Mirrors troll-patrol/src/lib/claudeClient.ts. Node/CommonJS.
const Anthropic = require("@anthropic-ai/sdk");

const MODEL_BY_TIER = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
};

const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_RETRY_MAX_TOKENS = 6144;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in environment");
  // SDK auto-retries 429/5xx with retry-after-aware backoff — no hand-rolled loop needed.
  return new Anthropic({ apiKey, maxRetries: 4 });
}

function extractJson(raw) {
  let t = String(raw).trim();
  const fence = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/i);
  if (fence) t = fence[1].trim();
  return t;
}

/**
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {"haiku"|"sonnet"|"opus"} opts.tier
 * @param {number} [opts.temperature]        // ignored on opus (see gotcha #2)
 * @param {number} [opts.maxOutputTokens]
 * @param {number} [opts.retryMaxTokens]
 * @param {string} [opts.label]              // for log lines
 * @param {Array<{base64:string, mediaType?:string}>} [opts.documents]  // PDF/image input
 * @param {Array<{base64:string, mediaType:string}>} [opts.images]      // vision input
 */
async function callClaudeJson(opts) {
  const client = getClient();
  const model = MODEL_BY_TIER[opts.tier];
  const temperature = opts.tier === "opus" ? undefined : opts.temperature;

  const content = [];
  // PDFs
  for (const doc of opts.documents || []) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: doc.mediaType || "application/pdf", data: doc.base64 },
    });
  }
  // Images (generate-full-listing: up to 3 product photos)
  for (const img of opts.images || []) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
  }
  content.push({ type: "text", text: opts.prompt });

  const callOnce = async (maxTokens) => {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      messages: [{ role: "user", content }],
    });
    if (message.stop_reason === "refusal") {
      throw new Error(`[claude/${opts.label || "call"}] refused by safety classifier`);
    }
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
  };

  const firstCap = opts.maxOutputTokens || DEFAULT_MAX_TOKENS;
  const retryCap = opts.retryMaxTokens || DEFAULT_RETRY_MAX_TOKENS;

  let { text, inputTokens, outputTokens } = await callOnce(firstCap);
  let retried = false, parsed;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    // Truncated JSON (max_tokens) — retry once at the higher cap.
    retried = true;
    const r = await callOnce(retryCap);
    text = r.text; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
    parsed = JSON.parse(extractJson(text)); // let it throw if still bad
  }
  return { parsed, inputTokens, outputTokens, retried, rawText: text };
}

const PRICING_USD_PER_1M = {
  haiku: { input: 1.0, output: 5.0 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 5.0, output: 25.0 },
};
function estimateClaudeCostUsd(tier, inTok, outTok) {
  const p = PRICING_USD_PER_1M[tier];
  return (inTok * p.input) / 1e6 + (outTok * p.output) / 1e6;
}

module.exports = { callClaudeJson, estimateClaudeCostUsd, MODEL_BY_TIER };
```

Install once in the backend: `npm i @anthropic-ai/sdk`.

**Per-route migration = a 3-line diff:** replace the inline `gemini-2.5-flash` `generateContent(...)` call with `await callClaudeJson({ prompt, tier, images? })`, keep the same prompt string, read `result.parsed`. The prompts already ask for strict JSON, so they port unchanged.

---

## 2. Gotchas that actually bit us (each cost real debugging time)

1. **JSON truncation looks like a parse error, not an API error.** Long outputs hit `stop_reason: "max_tokens"` and the JSON is cut off mid-object. The wrapper's retry-at-higher-cap handles it. For `generate-full-listing` (biggest output — full title/desc/tags/attributes) set `maxOutputTokens` generously (e.g. 4096) up front.
2. **`temperature` is rejected with a 400 on Opus 4.8.** Allowed on Haiku 4.5 / Sonnet 4.6. The wrapper drops it for the opus tier automatically. (BLP uses no Opus, but keep this if you ever bump a route up.)
3. **Handle `stop_reason: "refusal"` explicitly.** Claude can refuse via a dedicated stop reason (not an exception, not empty text). The wrapper throws on it so the route can return a clean error instead of shipping `undefined` into a listing.
4. **Env var shadowing (this one burned a whole session on troll-patrol).** A stray user-level Windows env var silently shadowed the project key, so every key swap was ignored. If auth acts up, check `[Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY","User")` and make sure your loader lets the intended source win. Prefer setting the key **only** in the backend's deploy env, not in a machine-wide user var.
5. **Don't confuse response `serviceTier` with your billing tier** — a `standard` label on a success response is not proof of anything about your plan. (This was a Gemini-side red herring; noting it so nobody chases it again.)
6. **Vision is input-only and fully supported.** `generate-full-listing` sends product **photos in** → text out. That's ordinary multimodal input (the `image` blocks above), NOT image generation — 100% Claude-replaceable on Sonnet. (The only hard blocker in the whole portfolio is MarkItUp's image *generation*, which stays on Gemini. BLP has no such blocker.)

---

## 3. Model IDs & list pricing (2026)

| Tier | Model ID | $/1M in | $/1M out | Use for (BLP) |
|---|---|---|---|---|
| Haiku 4.5 | `claude-haiku-4-5` | 1.00 | 5.00 | `generate-listing-content`, `evaluate-listing`, `translate-listing` |
| Sonnet 4.6 | `claude-sonnet-4-6` | 3.00 | 15.00 | `generate-full-listing` (vision, highest-value output) |
| Opus 4.8 | `claude-opus-4-8` | 5.00 | 25.00 | none in BLP |

**Cost reality:** migrating **raises** per-token cost (you leave Gemini's free tier; Claude > Gemini Flash). These routes run on **customer credits**, so before rollout: (a) right-tier aggressively (Haiku where copy quality allows), (b) turn on **prompt caching** (~0.1× input cost — the listing-format instructions are identical every call, so cache them), (c) consider the **Batch API** (50% off) for any non-interactive bulk path, and (d) recompute the per-listing credit cost so margin stays positive. A/B the copy quality on `generate-listing-content` before committing it to Haiku — bump to Sonnet if it reads worse.

---

## 4. Order of operations

1. Create the dedicated backend Anthropic key (§0), put it in the backend env, set a spend limit.
2. Drop `claudeClient.js` into the backend, `npm i @anthropic-ai/sdk`.
3. Migrate one route as a pilot — **`translate-listing` (`:2512`, Haiku)** is the safest first cut (mechanical, easy to eyeball).
4. Then `evaluate-listing` (`:2271`), `generate-listing-content` (`:1831`), and last `generate-full-listing` (`:2035`, Sonnet + vision — verify the image blocks and the output schema).
5. Cost check vs the Gemini baseline; verify the extension end-to-end against a staging backend before prod.
6. Leave the backend's **other** endpoints (the other 4 front-ends' routes) on Gemini until their turn.

---

## 🔴 Prerequisite you can't skip: the backend may need re-hosting first

As of 2026-06-30 the shared backend `business-search-api` (GCP project `sam-extension`) was **DOWN** — GCP billing disabled, Cloud Run can't start instances, every request 500s (including Stripe credit webhooks). All GCP billing accounts on the profile are closed, so you **can't** just redeploy on GCP. The fix is a **lift-and-shift** of the Express monolith to Railway/Render/Fly (keep Firestore remote via the bundled service-account JSON), and **fold this Claude swap into that same redeploy**. Full spec:
`C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\RESTORE-AND-MIGRATE.md`.

So the true sequence is: **re-host the backend → stand up `claudeClient.js` → migrate BLP's 4 routes → verify.** If the backend is already back up by the time you read this, skip straight to §1.

---

*Source of truth for the wrapper: `C:\Projects\troll-patrol\src\lib\claudeClient.ts` (verified working). This is its CommonJS twin. Portfolio migration map lives in troll-patrol's session memory (`gemini-to-claude-migration`).*
