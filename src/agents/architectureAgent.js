/**
 * ArchitectureAgent (v1.9.2)
 * BLE + wearable → nRF52 by default (not ESP32).
 * Honors explicit mcu_preference and revision hints.
 */

const { addHistory } = require("./state");

function pickMcu(constraints, revisionHint) {
  // Explicit user preference wins
  if (constraints.mcu_preference) return constraints.mcu_preference;

  // Revision loop asked to switch away from ESP32
  if (revisionHint === "prefer_nrf52") return "nrf52";

  const wireless = constraints.wireless || null;
  const form = constraints.form_factor || null;
  const power = constraints.power || null;

  // Battery BLE wearable / always-on low power → nRF52
  if (
    (wireless === "ble" || !wireless) &&
    (form === "wearable" || power === "battery") &&
    form !== "module"
  ) {
    // If form is wearable OR (ble + battery without wifi), prefer nRF52
    if (form === "wearable") return "nrf52";
    if (wireless === "ble" && power === "battery") return "nrf52";
  }

  if (wireless === "wifi") return "esp32";
  if (wireless === "lora") return "esp32";
  if (wireless === "ble") return "nrf52";

  return "esp32";
}

function runArchitectureAgent(project, options = {}) {
  const c = project.user_intent.parsed_constraints || {};
  const revisionHint = options.revisionHint || project._revision_hint || null;

  let mcu = pickMcu(c, revisionHint);
  let wireless = c.wireless || (mcu === "nrf52" ? "ble" : "ble");
  let power = c.power || "battery";
  let form = c.form_factor || "module";

  // nRF52 is BLE-native
  if (mcu === "nrf52" && !c.wireless) wireless = "ble";

  const blocks = [
    { name: "MCU", part_family: mcu, notes: "Main application processor" }
  ];

  if (wireless) {
    blocks.push({
      name: "Wireless",
      part_family: wireless === "ble" ? "BLE (integrated)" : wireless,
      notes: `Connectivity: ${wireless}`
    });
  }

  if (power === "battery") {
    blocks.push({
      name: "Power",
      part_family: "Battery management + regulator",
      notes: "LiPo or coin-cell friendly power path"
    });
  } else {
    blocks.push({
      name: "Power",
      part_family: "USB / external supply + regulator",
      notes: "Non-battery powered"
    });
  }

  (c.sensors || []).forEach(sensor => {
    blocks.push({
      name: `Sensor: ${sensor}`,
      part_family: sensor,
      notes: "Required by user"
    });
  });

  let estimatedBomLow = mcu === "nrf52" ? 5 : 4;
  let estimatedBomHigh = mcu === "nrf52" ? 14 : 12;
  if (c.sensors && c.sensors.length > 2) {
    estimatedBomLow += 3;
    estimatedBomHigh += 8;
  }
  if (wireless === "cellular") {
    estimatedBomLow += 8;
    estimatedBomHigh += 20;
  }

  const notes = [
    mcu === "nrf52"
      ? "Selected nRF52 for low-power BLE (better fit for battery wearables than ESP32)."
      : "Architecture chosen from constraints and defaults."
  ];
  if (revisionHint) notes.push(`Revision hint applied: ${revisionHint}`);

  const architecture = {
    mcu_family: mcu,
    wireless,
    power_architecture: power,
    form_factor: form,
    blocks,
    estimated_bom_usd: { low: estimatedBomLow, high: estimatedBomHigh },
    notes,
    confidence: mcu === "nrf52" && form === "wearable" ? 0.78 : 0.7
  };

  project.architecture = architecture;
  // clear hint after applying
  delete project._revision_hint;

  addHistory(project, "ArchitectureAgent", "proposed_architecture", {
    mcu,
    wireless,
    block_count: blocks.length,
    revision_hint: revisionHint || null
  });

  return {
    project,
    confidence: architecture.confidence,
    risk_level: "low",
    summary: `Proposed ${mcu}-based architecture with ${blocks.length} major blocks.`
  };
}

module.exports = { runArchitectureAgent, pickMcu };
