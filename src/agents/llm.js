/**
 * Optional LLM helper for CircuitFlow agents (v1.9.3)
 * - Groq / xAI / Anthropic / OpenAI
 * - Retry on 429 with backoff
 * - Default Groq model: llama-3.1-8b-instant (widely available)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
const XAI_MODEL = process.env.XAI_MODEL || process.env.GROK_MODEL || "grok-2-latest";

const ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.CIRCUITFLOW_OPENAI_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MAX_429_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRetryAfterMs(status, bodyText) {
  // Groq often says "try again in 5.88s"
  const m = String(bodyText || "").match(/try again in ([\d.]+)\s*s/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 200;
  if (status === 429) return 6000;
  return 0;
}

function getProvider() {
  const forced = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  if (forced === "groq") return GROQ_API_KEY ? "groq" : null;
  if (forced === "xai" || forced === "grok") return XAI_API_KEY ? "xai" : null;
  if (forced === "anthropic" || forced === "claude") return ANTHROPIC_API_KEY ? "anthropic" : null;
  if (forced === "openai") return OPENAI_API_KEY ? "openai" : null;

  if (GROQ_API_KEY) return "groq";
  if (XAI_API_KEY) return "xai";
  if (ANTHROPIC_API_KEY) return "anthropic";
  if (OPENAI_API_KEY) return "openai";
  return null;
}

function isLLMEnabled() {
  return Boolean(getProvider());
}

function getLLMInfo() {
  const provider = getProvider();
  const models = {
    groq: GROQ_MODEL,
    xai: XAI_MODEL,
    anthropic: ANTHROPIC_MODEL,
    openai: OPENAI_MODEL
  };
  return {
    enabled: Boolean(provider),
    provider: provider || null,
    model: provider ? models[provider] : null,
    keys_present: {
      groq: Boolean(GROQ_API_KEY),
      xai: Boolean(XAI_API_KEY),
      anthropic: Boolean(ANTHROPIC_API_KEY),
      openai: Boolean(OPENAI_API_KEY)
    }
  };
}

async function callAnthropic(systemPrompt, userPrompt, options = {}) {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: options.model || ANTHROPIC_MODEL,
        max_tokens: options.max_tokens || 2048,
        temperature: options.temperature ?? 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const block = (data.content || []).find(b => b.type === "text");
      return block?.text || null;
    }

    const text = await response.text();
    if (response.status === 429 && attempt < MAX_429_RETRIES) {
      const wait = parseRetryAfterMs(429, text);
      console.warn(`[LLM] Anthropic 429 – retry in ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      continue;
    }
    console.warn("[LLM] Anthropic error:", response.status, text.slice(0, 300));
    return null;
  }
  return null;
}

async function callOpenAICompatible(baseUrl, apiKey, defaultModel, systemPrompt, userPrompt, options = {}) {
  const model = options.model || defaultModel;
  const makeBody = (withJsonFormat) => {
    const body = {
      model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens || 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    };
    if (withJsonFormat && options.json) {
      body.response_format = { type: "json_object" };
    }
    return body;
  };

  // Outer: 429 retries; inner: json_mode then plain
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const formatAttempts = options.json ? [true, false] : [false];
    let lastStatus = 0;
    let lastText = "";

    for (const withJson of formatAttempts) {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(makeBody(withJson))
      });

      lastStatus = response.status;
      if (!response.ok) {
        lastText = await response.text();
        console.warn(
          `[LLM] error ${baseUrl} (${withJson ? "json_mode" : "plain"}):`,
          response.status,
          lastText.slice(0, 350)
        );
        if (response.status === 429) break; // go to retry sleep
        if (withJson) continue;
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || null;
      if (content) {
        console.log(`[LLM] OK provider-api=${baseUrl} model=${model} chars=${content.length}`);
        return content;
      }
    }

    if (lastStatus === 429 && attempt < MAX_429_RETRIES) {
      const wait = parseRetryAfterMs(429, lastText);
      console.warn(`[LLM] 429 – retry in ${wait}ms (attempt ${attempt + 1}/${MAX_429_RETRIES})`);
      await sleep(wait);
      continue;
    }
    return null;
  }
  return null;
}

async function callLLM(systemPrompt, userPrompt, options = {}) {
  const provider = getProvider();
  if (!provider) {
    console.warn("[LLM] no provider configured");
    return null;
  }

  let system = systemPrompt;
  if (options.json) {
    system +=
      "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown fences, no commentary.";
  }

  console.log(`[LLM] using provider=${provider}`);

  try {
    if (provider === "anthropic") {
      return await callAnthropic(system, userPrompt, options);
    }
    if (provider === "groq") {
      return await callOpenAICompatible(
        "https://api.groq.com/openai/v1",
        GROQ_API_KEY,
        GROQ_MODEL,
        system,
        userPrompt,
        options
      );
    }
    if (provider === "xai") {
      return await callOpenAICompatible(
        "https://api.x.ai/v1",
        XAI_API_KEY,
        XAI_MODEL,
        system,
        userPrompt,
        options
      );
    }
    if (provider === "openai") {
      return await callOpenAICompatible(
        "https://api.openai.com/v1",
        OPENAI_API_KEY,
        OPENAI_MODEL,
        system,
        userPrompt,
        options
      );
    }
    return null;
  } catch (err) {
    console.warn("[LLM] call failed:", err.message);
    return null;
  }
}

function parseJsonLoose(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        return JSON.parse(m[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function llmExtractConstraints(rawText) {
  const system = `You are a senior hardware engineer. Extract structured design constraints from the user request.
Return ONLY valid JSON with these fields (use null when unknown):
{
  "target_cost": number | null,
  "form_factor": "wearable" | "handheld" | "module" | "other" | null,
  "power": "battery" | "usb_or_mains" | null,
  "wireless": "ble" | "wifi" | "lora" | "cellular" | null,
  "sensors": string[],
  "mcu_preference": "esp32" | "nrf52" | "stm32" | "rp2040" | null,
  "notes": string
}
For sensors use short keys only: imu, temperature, humidity, pressure, heart_rate, gps, microphone, camera.`;

  const content = await callLLM(system, rawText, { json: true, temperature: 0.1 });
  return parseJsonLoose(content);
}

async function llmSuggestBom(architecture, constraints) {
  const target = constraints?.target_cost;
  const budgetHint = target
    ? `Hard budget: total BOM must stay under about $${target}. Prefer fewer, cheaper parts.`
    : "Prefer commonly available low-cost parts.";

  const system = `You are a hardware sourcing engineer. Suggest a concise BOM for the given architecture.
${budgetHint}
Return ONLY valid JSON:
{
  "items": [
    { "category": "MCU"|"Sensor"|"Power"|"Passive"|"Other", "mpn": string, "manufacturer": string, "description": string, "approx_price_usd": number, "notes": string }
  ],
  "notes": string
}
Keep the list under 8 items. Do not duplicate the main MCU/sensor if already obvious from architecture.`;

  const user = JSON.stringify({ architecture, constraints }, null, 2);
  const content = await callLLM(system, user, { json: true, temperature: 0.2, max_tokens: 900 });
  return parseJsonLoose(content);
}

async function llmReviewProject(snapshot) {
  const system = `You are a senior hardware design reviewer.
Given a project snapshot, list concrete issues (if any).
Return ONLY valid JSON:
{
  "issues": string[],
  "overall": "approved" | "needs_changes",
  "notes": string
}
Be practical and brief. If the design looks reasonable for an early prototype, approve it.`;

  const content = await callLLM(system, JSON.stringify(snapshot, null, 2), {
    json: true,
    temperature: 0.15,
    max_tokens: 600
  });
  return parseJsonLoose(content);
}

module.exports = {
  isLLMEnabled,
  getLLMInfo,
  callLLM,
  llmExtractConstraints,
  llmSuggestBom,
  llmReviewProject
};
