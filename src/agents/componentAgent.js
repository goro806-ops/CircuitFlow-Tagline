/**
 * ComponentAgent
 * Builds a first-pass BOM. Uses internal library + optional LLM suggestions.
 */

const { addHistory } = require("./state");
const { isLLMEnabled, llmSuggestBom } = require("./llm");

const PART_LIBRARY = {
  mcu: {
    esp32: { mpn: "ESP32-WROOM-32E", manufacturer: "Espressif", description: "Wi-Fi + BLE MCU module", approx_price_usd: 2.80, package: "Module", notes: "Very common" },
    nrf52: { mpn: "nRF52840", manufacturer: "Nordic Semiconductor", description: "Bluetooth 5.3 / BLE SoC", approx_price_usd: 3.50, package: "AQFN-73", notes: "Low-power BLE" },
    stm32: { mpn: "STM32L4", manufacturer: "STMicroelectronics", description: "Ultra-low-power MCU family", approx_price_usd: 2.20, package: "LQFP", notes: "Flexible peripherals" },
    rp2040: { mpn: "RP2040", manufacturer: "Raspberry Pi", description: "Dual-core Cortex-M0+", approx_price_usd: 0.80, package: "QFN-56", notes: "Low cost" }
  },
  sensors: {
    imu: { mpn: "BMI270", manufacturer: "Bosch", description: "6-axis IMU", approx_price_usd: 1.80, package: "LGA-14", notes: "Wearables" },
    temperature: { mpn: "TMP117", manufacturer: "Texas Instruments", description: "Temperature sensor", approx_price_usd: 1.40, package: "WSON-6", notes: "" },
    humidity: { mpn: "SHT40", manufacturer: "Sensirion", description: "Humidity + temp", approx_price_usd: 1.60, package: "DFN", notes: "" },
    heart_rate: { mpn: "MAX30102", manufacturer: "Analog Devices", description: "PPG heart-rate", approx_price_usd: 3.20, package: "OLGA-14", notes: "" },
    gps: { mpn: "MAX-M10S", manufacturer: "u-blox", description: "GNSS module", approx_price_usd: 8.50, package: "Module", notes: "Higher cost" }
  },
  power: {
    battery: { mpn: "TP4056 + DW01", manufacturer: "Various", description: "LiPo charge + protection", approx_price_usd: 0.35, package: "Module", notes: "" },
    regulator: { mpn: "AP2112K-3.3", manufacturer: "Diodes Inc", description: "3.3V LDO", approx_price_usd: 0.25, package: "SOT-23-5", notes: "" }
  },
  passive_budget: 1.20
};

function buildRuleBasedBom(project) {
  const arch = project.architecture;
  const constraints = project.user_intent.parsed_constraints;
  const lineItems = [];
  let totalLow = 0;
  let totalHigh = 0;

  const mcuKey = arch.mcu_family || "esp32";
  const mcuPart = PART_LIBRARY.mcu[mcuKey] || PART_LIBRARY.mcu.esp32;
  lineItems.push({
    ref: "U1", category: "MCU", mpn: mcuPart.mpn, manufacturer: mcuPart.manufacturer,
    description: mcuPart.description, qty: 1, unit_price_usd: mcuPart.approx_price_usd,
    package: mcuPart.package, notes: mcuPart.notes, lifecycle: "Active"
  });
  totalLow += mcuPart.approx_price_usd * 0.9;
  totalHigh += mcuPart.approx_price_usd * 1.25;

  (constraints.sensors || []).forEach((sensorKey, idx) => {
    const sensorPart = PART_LIBRARY.sensors[sensorKey];
    if (sensorPart) {
      lineItems.push({
        ref: `U${idx + 2}`, category: "Sensor", mpn: sensorPart.mpn, manufacturer: sensorPart.manufacturer,
        description: sensorPart.description, qty: 1, unit_price_usd: sensorPart.approx_price_usd,
        package: sensorPart.package, notes: sensorPart.notes, lifecycle: "Active"
      });
      totalLow += sensorPart.approx_price_usd * 0.9;
      totalHigh += sensorPart.approx_price_usd * 1.3;
    } else {
      lineItems.push({
        ref: `U${idx + 2}`, category: "Sensor", mpn: "TBD", manufacturer: "TBD",
        description: `Sensor: ${sensorKey}`, qty: 1, unit_price_usd: 2.0,
        package: "TBD", notes: "Needs selection", lifecycle: "Unknown"
      });
      totalLow += 1.5;
      totalHigh += 4.0;
    }
  });

  if (arch.power_architecture === "battery") {
    const charger = PART_LIBRARY.power.battery;
    lineItems.push({
      ref: "U_CHG", category: "Power", mpn: charger.mpn, manufacturer: charger.manufacturer,
      description: charger.description, qty: 1, unit_price_usd: charger.approx_price_usd,
      package: charger.package, notes: charger.notes, lifecycle: "Active"
    });
    totalLow += charger.approx_price_usd;
    totalHigh += charger.approx_price_usd * 1.5;
  }

  const regulator = PART_LIBRARY.power.regulator;
  lineItems.push({
    ref: "U_REG", category: "Power", mpn: regulator.mpn, manufacturer: regulator.manufacturer,
    description: regulator.description, qty: 1, unit_price_usd: regulator.approx_price_usd,
    package: regulator.package, notes: regulator.notes, lifecycle: "Active"
  });
  totalLow += regulator.approx_price_usd;
  totalHigh += regulator.approx_price_usd * 1.4;

  lineItems.push({
    ref: "PASSIVES", category: "Passives", mpn: "Various", manufacturer: "Various",
    description: "Resistors, capacitors, crystal, connectors", qty: 1,
    unit_price_usd: PART_LIBRARY.passive_budget, package: "—", notes: "Budget", lifecycle: "Active"
  });
  totalLow += PART_LIBRARY.passive_budget * 0.8;
  totalHigh += PART_LIBRARY.passive_budget * 1.6;

  return {
    lineItems,
    totalLow: Math.round(totalLow * 100) / 100,
    totalHigh: Math.round(totalHigh * 100) / 100
  };
}

async function runComponentAgent(project) {
  if (!project.architecture) {
    throw new Error("ComponentAgent requires architecture");
  }

  const constraints = project.user_intent.parsed_constraints;
  let source = "rules";
  let { lineItems, totalLow, totalHigh } = buildRuleBasedBom(project);
  let extraNotes = [];

  if (isLLMEnabled()) {
    const llmBom = await llmSuggestBom(project.architecture, constraints);
    if (llmBom && Array.isArray(llmBom.items) && llmBom.items.length) {
      source = "rules+llm";
      // Merge: keep rule MCU/power core, append unique LLM suggestions as alternates/notes
      llmBom.items.forEach((item, i) => {
        const exists = lineItems.some(
          li => li.mpn && item.mpn && li.mpn.toLowerCase() === String(item.mpn).toLowerCase()
        );
        if (!exists && item.mpn) {
          lineItems.push({
            ref: `LLM${i + 1}`,
            category: item.category || "Other",
            mpn: item.mpn,
            manufacturer: item.manufacturer || "TBD",
            description: item.description || item.mpn,
            qty: 1,
            unit_price_usd: Number(item.approx_price_usd) || 1,
            package: "TBD",
            notes: (item.notes || "") + " [LLM suggestion]",
            lifecycle: "Suggested"
          });
          const p = Number(item.approx_price_usd) || 1;
          totalLow += p * 0.85;
          totalHigh += p * 1.3;
        }
      });
      if (llmBom.notes) extraNotes.push(llmBom.notes);
      totalLow = Math.round(totalLow * 100) / 100;
      totalHigh = Math.round(totalHigh * 100) / 100;
    }
  }

  const bom = {
    currency: "USD",
    line_items: lineItems,
    estimated_total: { low: totalLow, high: totalHigh },
    target_cost: constraints.target_cost || null,
    meets_target: constraints.target_cost ? totalHigh <= constraints.target_cost * 1.15 : null,
    source,
    notes: [
      "First-pass BOM.",
      source.includes("llm") ? "Includes LLM-suggested parts (verify availability)." : "Rule-based library only.",
      ...extraNotes
    ],
    confidence: source.includes("llm") ? 0.72 : 0.62
  };

  project.bom = bom;

  addHistory(project, "ComponentAgent", "generated_bom", {
    item_count: lineItems.length,
    estimated_low: totalLow,
    estimated_high: totalHigh,
    source
  });

  let risk = "medium";
  if (constraints.target_cost && totalLow > constraints.target_cost) risk = "high";
  else if (bom.meets_target === true) risk = "low";

  return {
    project,
    confidence: bom.confidence,
    risk_level: risk,
    summary: `BOM (${source}): ${lineItems.length} items, $${totalLow}–$${totalHigh}`
  };
}

module.exports = { runComponentAgent };
