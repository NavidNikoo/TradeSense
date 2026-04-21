const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const openaiKey = defineSecret("OPENAI_API_KEY");
const huggingfaceKey = defineSecret("HUGGINGFACE_API_KEY");

if (!admin.apps.length) {
  admin.initializeApp();
}

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

// In-memory cache: key → { data, ts }
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const cache = new Map();

function evictStale() {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.ts > CACHE_TTL_MS) cache.delete(k);
  }
}

async function fetchWithRetry(url, retries = 3, delayMs = 600) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 || res.status === 503) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
    }
    return res;
  }
  throw new Error("Retries exhausted");
}

exports.chartProxy = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Path: /api/chart/AAPL or /AAPL — extract last non-empty segment as symbol
  const parts = req.path.split("/").filter(Boolean);
  const symbol = (parts[parts.length - 1] || "").toUpperCase();

  if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid or missing ticker symbol" });
  }

  const range = req.query.range || "1mo";
  const interval = req.query.interval || "1d";
  const cacheKey = `${symbol}:${range}:${interval}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "public, max-age=120");
    return res.json(cached.data);
  }

  const yahooUrl = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=false`;

  try {
    const upstream = await fetchWithRetry(yahooUrl);
    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    cache.set(cacheKey, { data, ts: Date.now() });
    evictStale();

    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "public, max-age=120");
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to fetch chart data" });
  }
});

// ---------------------------------------------------------------------------
// Time-Lapse AI Chat (HTTP + Bearer ID token — same pattern as chart proxy)
// ---------------------------------------------------------------------------

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MAX_USER_MSG_LEN = 2000;
const MAX_SNAPSHOTS = 100;
const MAX_CONVERSATION_TURNS = 20;

function buildSystemPrompt(ctx) {
  return [
    "You are a concise stock-analysis assistant embedded in TradeSense's Time-Lapse feature.",
    "You ONLY answer questions using the data provided below. Do NOT use outside knowledge for factual claims about this symbol's price or sentiment history.",
    "If the data does not contain enough information to answer, say so honestly.",
    "Politely refuse questions unrelated to the provided stock data with a one-sentence redirect.",
    "Keep answers short (2-4 sentences unless the user asks for detail).",
    "Always end with: \"This is not financial advice.\"",
    "",
    `Symbol: ${ctx.symbol}`,
    `Date range: ${ctx.dateRange.from} to ${ctx.dateRange.to}`,
    `Number of snapshots: ${ctx.snapshots.length}`,
    "",
    "Snapshot data (chronological):",
    JSON.stringify(ctx.snapshots),
    "",
    ctx.ruleBasedInsights
      ? `Rule-based insights already shown to the user:\nHeadline: ${ctx.ruleBasedInsights.headline}\nBullets: ${ctx.ruleBasedInsights.bullets.join(" | ")}`
      : "",
  ].join("\n");
}

/**
 * @param {{ messages: unknown, context: unknown }} data
 * @param {string} apiKey
 * @returns {Promise<{ reply: string }>}
 */
async function executeTimeLapseChat(data, apiKey) {
  const { messages, context } = data || {};

  if (!context || !context.symbol || !Array.isArray(context.snapshots)) {
    const err = new Error("Missing or invalid context.");
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    const err = new Error("Messages array is required.");
    err.statusCode = 400;
    throw err;
  }
  if (context.snapshots.length > MAX_SNAPSHOTS) {
    const err = new Error(`Too many snapshots (max ${MAX_SNAPSHOTS}).`);
    err.statusCode = 400;
    throw err;
  }

  const validRoles = new Set(["user", "assistant"]);
  const trimmed = messages.slice(-MAX_CONVERSATION_TURNS).map((m) => ({
    role: validRoles.has(m.role) ? m.role : "user",
    content: String(m.content || "").slice(0, MAX_USER_MSG_LEN),
  }));

  const systemMsg = buildSystemPrompt(context);

  const body = {
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemMsg }, ...trimmed],
    temperature: 0.4,
    max_tokens: 512,
  };

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("OpenAI error", res.status, text.slice(0, 500));
    const err = new Error(
      res.status === 401 || res.status === 403
        ? "OpenAI API key is missing or invalid. Set the OPENAI_API_KEY secret and redeploy functions."
        : "AI service error. Check the function logs for details.",
    );
    err.statusCode = 502;
    throw err;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error("Invalid response from AI service.");
    err.statusCode = 502;
    throw err;
  }

  const reply = json.choices?.[0]?.message?.content || "Sorry, I could not generate a response.";
  return { reply };
}

function parseRequestBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (req.rawBody && req.rawBody.length) {
    try {
      return JSON.parse(req.rawBody.toString("utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// FinBERT proxy (server-side HF key, solves browser CORS block)
// ---------------------------------------------------------------------------

// NOTE: `api-inference.huggingface.co` was decommissioned in late 2025.
// The new HF Inference provider lives behind this router URL.
const HF_FINBERT_URL = "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert";
const FINBERT_MAX_INPUTS = 50;
const FINBERT_MAX_INPUT_LEN = 1000;

exports.finbertProxy = onRequest(
  {
    cors: true,
    region: "us-central1",
    secrets: [huggingfaceKey],
    invoker: "public",
    // HuggingFace serverless inference can take 20-40s on a cold model load,
    // so we give the function plenty of headroom. The browser-side fetch in
    // sentimentService.js still completes in ~1s when the model is warm.
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(503).json({
        error:
          "Server is not configured with HUGGINGFACE_API_KEY. Run: firebase functions:secrets:set HUGGINGFACE_API_KEY && firebase deploy --only functions",
      });
    }

    const payload = parseRequestBody(req);
    if (!payload || !Array.isArray(payload.inputs) || payload.inputs.length === 0) {
      return res.status(400).json({ error: "Expected JSON body { inputs: string[] }." });
    }
    if (payload.inputs.length > FINBERT_MAX_INPUTS) {
      return res.status(400).json({ error: `Too many inputs (max ${FINBERT_MAX_INPUTS}).` });
    }

    const inputs = payload.inputs.map((x) => String(x || "").slice(0, FINBERT_MAX_INPUT_LEN));

    try {
      const upstream = await fetch(HF_FINBERT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          // Tell HF to block until the model is loaded (cold-start safety).
          // Without this header, HF returns 503 "Model is loading" for
          // 20-40s after a period of inactivity.
          "x-wait-for-model": "true",
          "x-use-cache": "true",
        },
        body: JSON.stringify({ inputs }),
      });

      const text = await upstream.text();
      if (!upstream.ok) {
        console.error("HF error", upstream.status, text.slice(0, 500));
        return res.status(upstream.status === 401 || upstream.status === 403 ? 503 : 502).json({
          error:
            upstream.status === 401 || upstream.status === 403
              ? "HuggingFace API key is missing or invalid. Re-set HUGGINGFACE_API_KEY secret."
              : "HuggingFace inference error. See function logs.",
        });
      }

      try {
        return res.json(JSON.parse(text));
      } catch {
        return res.status(502).json({ error: "Invalid response from HuggingFace." });
      }
    } catch (e) {
      console.error("finbertProxy fetch", e.message);
      return res.status(502).json({ error: "Failed to reach HuggingFace." });
    }
  },
);

exports.timeLapseChatHttp = onRequest(
  {
    cors: true,
    region: "us-central1",
    secrets: [openaiKey],
    invoker: "public",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = req.headers.authorization || "";
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return res.status(401).json({ error: "Sign in required. Missing Authorization header." });
    }

    try {
      await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      console.error("verifyIdToken", e.message);
      return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }

    const payload = parseRequestBody(req);
    if (!payload) {
      return res.status(400).json({ error: "Expected JSON body with messages and context." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(503).json({
        error:
          "Server is not configured with OPENAI_API_KEY. Run: firebase functions:secrets:set OPENAI_API_KEY && firebase deploy --only functions",
      });
    }

    try {
      const result = await executeTimeLapseChat(payload, apiKey);
      return res.json(result);
    } catch (e) {
      const status = e.statusCode || 500;
      return res.status(status).json({ error: e.message || "Chat failed." });
    }
  },
);
