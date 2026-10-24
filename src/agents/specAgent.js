/**
 * SpecAgent
 * Parses the user's natural language request into structured constraints.
 * This is the first agent in almost every flow.
 */

const { addHistory } = require("./state");

/**
 * Very simple rule-based parser for the first version.
 * Later this will call a real LLM with a structured output schema.
 */
function runSpecAgent(project) {
  const text = (project.user_intent.raw_text || "").toLowerCase();
  const constraints = project.user_intent.parsed_constraints;

  // --- crude but useful extraction for common hardware intents ---

  // Cost
  const costMatch = text.match(/under\s*\$?(\d+)/i) || text.match(/less than\s*\$?(\d+)/i);
  if (costMatch) {
    constraints.target_cost = parseInt(costMatch[1], 10);
  }

  // Form factor / wearable
  if (text.includes("wearable") || text.includes("watch") || text.includes("band")) {
    constraints.form_factor = "wearable";
  } else if (text.includes("handheld") || text.includes("portable")) {
    constraints.form_factor = "handheld";
  } else if (text.includes("module") || text.includes("board")) {
    constraints.form_factor = "module";
  }

  // Power
  if (text.includes("battery") || text.includes("coin cell") || text.includes("lipo")) {
    constraints.power = "battery";
  } else if (text.includes("usb") || text.includes("mains")) {
    constraints.power = "usb_or_mains";
  }

  // Wireless
  if (text.includes("bluetooth") || text.includes("ble")) {
    constraints.wireless = "ble";
  } else if (text.includes("wifi") || text.includes("wi-fi")) {
    constraints.wireless = "wifi";
  } else if (text.includes("lora") || text.includes("lorawan")) {
    constraints.wireless = "lora";
  } else if (text.includes("cellular") || text.includes("lte") || text.includes("nbiot")) {
    constraints.wireless = "cellular";
  }

  // Sensors (simple keyword list)
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
    if (words.some(w => text.includes(w))) {
      if (!constraints.sensors.includes(key)) {
        constraints.sensors.push(key);
      }
    }
  });

  // MCU preference hints
  if (text.includes("esp32")) constraints.mcu_preference = "esp32";
  else if (text.includes("stm32")) constraints.mcu_preference = "stm32";
  else if (text.includes("nrf52") || text.includes("nrf52840")) constraints.mcu_preference = "nrf52";
  else if (text.includes("rp2040") || text.includes("pico")) constraints.mcu_preference = "rp2040";

  // Confidence – higher when we extracted several useful constraints
  let extracted = 0;
  if (constraints.target_cost) extracted++;
  if (constraints.form_factor) extracted++;
  if (constraints.power) extracted++;
  if (constraints.wireless) extracted++;
  if (constraints.sensors.length > 0) extracted++;
  if (constraints.mcu_preference) extracted++;

  const confidence = Math.min(0.55 + extracted * 0.08, 0.92);

  addHistory(project, "SpecAgent", "parsed_constraints", {
    extracted_count: extracted,
    confidence
  });

  return {
    project,
    confidence,
    risk_level: confidence > 0.7 ? "low" : "medium",
    summary: `Extracted ${extracted} constraint groups from user prompt.`
  };
}

module.exports = { runSpecAgent };
