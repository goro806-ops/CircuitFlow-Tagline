/**
 * Optional LLM helper for CircuitFlow agents.
 * Enabled when OPENAI_API_KEY or CIRCUITFLOW_OPENAI_KEY is set.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.CIRCUITFLOW_OPENAI_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function isLLMEnabled() {
  return Boolean(OPENAI_API_KEY);
}

async function callLLM(systemPrompt, userPrompt, options = {}) {
  if (!isLLMEnabled()) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: options.model || OPENAI_MODEL,
        temperature: options.temperature ?? 0.2,
        response_format: options.json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("[LLM] OpenAI error:", response.status, text.slice(0, 200));
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("[LLM] call failed:", err.message);
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
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Suggest BOM line items / alternates from architecture + constraints.
 */
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
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Extra review comments from an LLM given project snapshot.
 */
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
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

module.exports = {
  isLLMEnabled,
  callLLM,
  llmExtractConstraints,
  llmSuggestBom,
  llmReviewProject
};
