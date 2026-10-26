/**
 * SpecAgent (v1.9.3)
 * Parses user request into structured constraints.
 * Normalizes sensor names from LLM free-text to library keys.
 */

const { addHistory } = require("./state");
const { isLLMEnabled, llmExtractConstraints } = require("./llm");

const SENSOR_ALIASES = [
  { key: "imu", patterns: [/imu/i, /6[- ]?axis/i, /9[- ]?axis/i, /accel/i, /gyro/i, /bmi\d+/i] },
  { key: "temperature", patterns: [/temp/i, /tmp\d+/i] },
  { key: "humidity", patterns: [/humid/i, /sht\d+/i] },
  { key: "pressure", patterns: [/pressure/i, /barometer/i, /bmp\d+/i] },
  { key: "heart_rate", patterns: [/heart\s*rate/i, /\bppg\b/i, /\bhr\b/i, /max3010/i, /pulse\s*ox/i] },
  { key: "gps", patterns: [/\bgps\b/i, /gnss/i, /u-?blox/i] },
  { key: "microphone", patterns: [/microphone/i, /\bmic\b/i] },
  { key: "camera", patterns: [/camera/i, /cmos\s*image/i] }
];

function normalizeSensorName(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase().replace(/\s+/g, "_");
  // already a known key
  if (SENSOR_ALIASES.some(a => a.key === lower)) return lower;
  for (const { key, patterns } of SENSOR_ALIASES) {
    if (patterns.some(p => p.test(s))) return key;
  }
  // unknown – keep a safe slug (max 24 chars)
  return lower.replace(/[^a-z0-9_]/g, "_").slice(0, 24) || null;
}

function normalizeSensors(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  list.forEach(item => {
    const key = normalizeSensorName(item);
    if (key && !out.includes(key)) out.push(key);
  });
  return out;
}

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

  SENSOR_ALIASES.forEach(({ key, patterns }) => {
    if (patterns.some(p => p.test(lower)) && !constraints.sensors.includes(key)) {
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
      const llmSensors = normalizeSensors(llmResult.sensors);
      const ruleSensors = constraints.sensors || [];
      // Prefer normalized union so rule keywords aren't lost
      const sensors = [...new Set([...llmSensors, ...ruleSensors])];

      constraints = {
        target_cost: llmResult.target_cost ?? constraints.target_cost,
        form_factor: llmResult.form_factor ?? constraints.form_factor,
        power: llmResult.power ?? constraints.power,
        wireless: llmResult.wireless ?? constraints.wireless,
        sensors,
        mcu_preference: llmResult.mcu_preference ?? constraints.mcu_preference,
        other: { notes: llmResult.notes || null }
      };
      source = "llm";
      confidence = 0.82;
    }
  } else {
    let extracted = 0;
    if (constraints.target_cost) extracted++;
    if (constraints.form_factor) extracted++;
    if (constraints.power) extracted++;
    if (constraints.wireless) extracted++;
    if (constraints.sensors.length > 0) extracted++;
    if (constraints.mcu_preference) extracted++;
    confidence = Math.min(0.55 + extracted * 0.08, 0.92);
  }

  // Always normalize final sensor list
  constraints.sensors = normalizeSensors(constraints.sensors);

  project.user_intent.parsed_constraints = constraints;

  addHistory(project, "SpecAgent", "parsed_constraints", {
    source,
    confidence,
    sensors: constraints.sensors
  });

  return {
    project,
    confidence,
    risk_level: confidence > 0.7 ? "low" : "medium",
    summary: `Extracted constraints via ${source}.`
  };
}

module.exports = { runSpecAgent, normalizeSensorName, normalizeSensors };
