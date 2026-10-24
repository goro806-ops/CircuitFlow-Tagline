/**
 * SpecAgent
 * Parses the user's natural language request into structured constraints.
 * Uses LLM when OPENAI_API_KEY is available, otherwise falls back to rules.
 */

const { addHistory } = require("./state");
const { isLLMEnabled, llmExtractConstraints } = require("./llm");

function ruleBasedParse(text) {
  const lower = (text || "").toLowerCase();
  const constraints = {
    target_cost: null,
    form_factor: null,
    power: null,
    wireless: null,
    sensors: [],
    mcu_preference: null,
    other: {}
  };

  const costMatch = lower.match(/under\s*\$?(\d+)/i) || lower.match(/less than\s*\$?(\d+)/i);
  if (costMatch) constraints.target_cost = parseInt(costMatch[1], 10);

  if (lower.includes("wearable") || lower.includes("watch") || lower.includes("band")) {
    constraints.form_factor = "wearable";
  } else if (lower.includes("handheld") || lower.includes("portable")) {
    constraints.form_factor = "handheld";
  } else if (lower.includes("module") || lower.includes("board")) {
    constraints.form_factor = "module";
  }

  if (lower.includes("battery") || lower.includes("coin cell") || lower.includes("lipo")) {
    constraints.power = "battery";
  } else if (lower.includes("usb") || lower.includes("mains")) {
    constraints.power = "usb_or_mains";
  }

  if (lower.includes("bluetooth") || lower.includes("ble")) constraints.wireless = "ble";
  else if (lower.includes("wifi") || lower.includes("wi-fi")) constraints.wireless = "wifi";
  else if (lower.includes("lora") || lower.includes("lorawan")) constraints.wireless = "lora";
  else if (lower.includes("cellular") || lower.includes("lte") || lower.includes("nbiot")) constraints.wireless = "cellular";

  const sensorKeywords = [
    { key: "imu", words: ["imu", "accelerometer", "gyro", "6-axis", "9-axis"] },
    { key: "temperature", words: ["temperature", "temp sensor"] },
    { key: "humidity", words: ["humidity"] },
    { key: "pressure", words: ["pressure", "barometer"] },
    { key: "heart_rate", words: ["heart rate", "ppg", "hr"] },
    { key: "gps", words: ["gps", "gnss"] },
    { key: "microphone", words: ["microphone", "mic"] },
    { key: "camera", words: ["camera"] }
  ];

  sensorKeywords.forEach(({ key, words }) => {
    if (words.some(w => lower.includes(w)) && !constraints.sensors.includes(key)) {
      constraints.sensors.push(key);
    }
  });

  if (lower.includes("esp32")) constraints.mcu_preference = "esp32";
  else if (lower.includes("stm32")) constraints.mcu_preference = "stm32";
  else if (lower.includes("nrf52") || lower.includes("nrf52840")) constraints.mcu_preference = "nrf52";
  else if (lower.includes("rp2040") || lower.includes("pico")) constraints.mcu_preference = "rp2040";

  return constraints;
}

async function runSpecAgent(project) {
  const raw = project.user_intent.raw_text || "";
  let constraints = ruleBasedParse(raw);
  let source = "rules";
  let confidence = 0.6;

  if (isLLMEnabled()) {
    const llmResult = await llmExtractConstraints(raw);
    if (llmResult && typeof llmResult === "object") {
      constraints = {
        target_cost: llmResult.target_cost ?? constraints.target_cost,
        form_factor: llmResult.form_factor ?? constraints.form_factor,
        power: llmResult.power ?? constraints.power,
        wireless: llmResult.wireless ?? constraints.wireless,
        sensors: Array.isArray(llmResult.sensors) ? llmResult.sensors : constraints.sensors,
        mcu_preference: llmResult.mcu_preference ?? constraints.mcu_preference,
        other: { notes: llmResult.notes || null }
      };
      source = "llm";
      confidence = 0.82;
    }
  } else {
    // Rule-based confidence based on how much we extracted
    let extracted = 0;
    if (constraints.target_cost) extracted++;
    if (constraints.form_factor) extracted++;
    if (constraints.power) extracted++;
    if (constraints.wireless) extracted++;
    if (constraints.sensors.length > 0) extracted++;
    if (constraints.mcu_preference) extracted++;
    confidence = Math.min(0.55 + extracted * 0.08, 0.92);
  }

  project.user_intent.parsed_constraints = constraints;

  addHistory(project, "SpecAgent", "parsed_constraints", {
    source,
    confidence
  });

  return {
    project,
    confidence,
    risk_level: confidence > 0.7 ? "low" : "medium",
    summary: `Extracted constraints via ${source}.`
  };
}

module.exports = { runSpecAgent };
