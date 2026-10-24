/**
 * Optional LLM helper for CircuitFlow agents.
 *
 * If OPENAI_API_KEY is set, agents can call a real model.
 * Otherwise they fall back to rule-based logic.
 *
 * This keeps the system usable without any paid API key
 * while making it easy to upgrade quality later.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.CIRCUITFLOW_OPENAI_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function isLLMEnabled() {
  return Boolean(OPENAI_API_KEY);
}

/**
 * Call OpenAI chat completions (simple JSON-friendly helper).
 * Returns the assistant text content, or null on failure / disabled.
 */
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

/**
 * Ask the LLM to extract structured constraints from a hardware prompt.
 * Returns an object or null.
 */
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

module.exports = {
  isLLMEnabled,
  callLLM,
  llmExtractConstraints
};
