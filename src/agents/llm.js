/**
 * Optional LLM helper for CircuitFlow agents.
 *
 * Supports:
 *   - Anthropic Claude  (preferred if ANTHROPIC_API_KEY is set)
 *   - OpenAI           (OPENAI_API_KEY)
 *
 * Env:
 *   ANTHROPIC_API_KEY / CLAUDE_API_KEY
 *   ANTHROPIC_MODEL   (default: claude-sonnet-4-20250514)
 *   OPENAI_API_KEY
 *   OPENAI_MODEL      (default: gpt-4o-mini)
 *   LLM_PROVIDER      force "anthropic" | "openai" (optional)
 */

const ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.CIRCUITFLOW_OPENAI_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getProvider() {
  const forced = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (forced === "anthropic" || forced === "claude") return ANTHROPIC_API_KEY ? "anthropic" : null;
  if (forced === "openai") return OPENAI_API_KEY ? "openai" : null;
  // Prefer Claude when both are set (user choice)
  if (ANTHROPIC_API_KEY) return "anthropic";
  if (OPENAI_API_KEY) return "openai";
  return null;
}

function isLLMEnabled() {
  return Boolean(getProvider());
}

function getLLMInfo() {
  const provider = getProvider();
  return {
    enabled: Boolean(provider),
    provider: provider || null,
    model:
      provider === "anthropic"
        ? ANTHROPIC_MODEL
        : provider === "openai"
          ? OPENAI_MODEL
          : null
  };
}

async function callAnthropic(systemPrompt, userPrompt, options = {}) {
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

  if (!response.ok) {
    const text = await response.text();
    console.warn("[LLM] Anthropic error:", response.status, text.slice(0, 300));
    return null;
  }

  const data = await response.json();
  const block = (data.content || []).find(b => b.type === "text");
  return block?.text || null;
}

async function callOpenAI(systemPrompt, userPrompt, options = {}) {
  const body = {
    model: options.model || OPENAI_MODEL,
    temperature: options.temperature ?? 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };
  if (options.json) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn("[LLM] OpenAI error:", response.status, text.slice(0, 200));
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callLLM(systemPrompt, userPrompt, options = {}) {
  const provider = getProvider();
  if (!provider) return null;

  try {
    if (provider === "anthropic") {
      let system = systemPrompt;
      if (options.json) {
        system +=
          "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown fences, no commentary.";
      }
      return await callAnthropic(system, userPrompt, options);
    }
    return await callOpenAI(systemPrompt, userPrompt, options);
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
    // strip markdown fences if model added them
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
}`;

  const content = await callLLM(system, rawText, { json: true, temperature: 0.1 });
  return parseJsonLoose(content);
}

async function llmSuggestBom(architecture, constraints) {
  const system = `You are a hardware sourcing engineer. Suggest a concise BOM for the given architecture.
Return ONLY valid JSON:
{
  "items": [
    { "category": "MCU"|"Sensor"|"Power"|"Passive"|"Other", "mpn": string, "manufacturer": string, "description": string, "approx_price_usd": number, "notes": string }
  ],
  "notes": string
}
Prefer commonly available parts. Keep the list under 12 items.`;

  const user = JSON.stringify({ architecture, constraints }, null, 2);
  const content = await callLLM(system, user, { json: true, temperature: 0.2 });
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
    temperature: 0.15
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
