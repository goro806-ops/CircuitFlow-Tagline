/**
 * ComponentAgent
 * Selects concrete parts / part families and builds a first-pass BOM
 * based on the architecture proposed by ArchitectureAgent.
 *
 * Current version uses a small curated knowledge base of common parts.
 * Later this will call live distributor APIs (Octopart / DigiKey / Mouser)
 * and an LLM for smarter selection + alternates.
 */

const { addHistory } = require("./state");

// ---------------------------------------------------------------
// Simple internal knowledge base (very small for v0)
// ---------------------------------------------------------------
const PART_LIBRARY = {
  mcu: {
    esp32: {
      mpn: "ESP32-WROOM-32E",
      manufacturer: "Espressif",
      description: "Wi-Fi + BLE MCU module",
      approx_price_usd: 2.80,
      package: "Module",
      notes: "Very common, good ecosystem"
    },
    nrf52: {
      mpn: "nRF52840",
      manufacturer: "Nordic Semiconductor",
      description: "Bluetooth 5.3 / BLE SoC",
      approx_price_usd: 3.50,
      package: "AQFN-73",
      notes: "Excellent for low-power BLE wearables"
    },
    stm32: {
      mpn: "STM32L4",
      manufacturer: "STMicroelectronics",
      description: "Ultra-low-power MCU family",
      approx_price_usd: 2.20,
      package: "LQFP / UFQFPN",
      notes: "Good when you need more peripherals"
    },
    rp2040: {
      mpn: "RP2040",
      manufacturer: "Raspberry Pi",
      description: "Dual-core Cortex-M0+ MCU",
      approx_price_usd: 0.80,
      package: "QFN-56",
      notes: "Very low cost, great for simple designs"
    }
  },

  sensors: {
    imu: {
      mpn: "BMI270",
      manufacturer: "Bosch",
      description: "6-axis IMU (accel + gyro)",
      approx_price_usd: 1.80,
      package: "LGA-14",
      notes: "Popular in wearables"
    },
    temperature: {
      mpn: "TMP117",
      manufacturer: "Texas Instruments",
      description: "High-accuracy temperature sensor",
      approx_price_usd: 1.40,
      package: "WSON-6",
      notes: "Good accuracy"
    },
    humidity: {
      mpn: "SHT40",
      manufacturer: "Sensirion",
      description: "Humidity + temperature sensor",
      approx_price_usd: 1.60,
      package: "DFN",
      notes: "Reliable digital humidity sensor"
    },
    heart_rate: {
      mpn: "MAX30102",
      manufacturer: "Analog Devices",
      description: "Pulse oximeter & heart-rate sensor",
      approx_price_usd: 3.20,
      package: "OLGA-14",
      notes: "Common PPG sensor"
    },
    gps: {
      mpn: "MAX-M10S",
      manufacturer: "u-blox",
      description: "GNSS module",
      approx_price_usd: 8.50,
      package: "Module",
      notes: "Higher cost item"
    }
  },

  power: {
    battery: {
      mpn: "TP4056 + DW01",
      manufacturer: "Various",
      description: "LiPo charge + protection",
      approx_price_usd: 0.35,
      package: "Module / discrete",
      notes: "Very common cheap solution"
    },
    regulator: {
      mpn: "AP2112K-3.3",
      manufacturer: "Diodes Inc",
      description: "3.3V LDO",
      approx_price_usd: 0.25,
      package: "SOT-23-5",
      notes: "Simple and cheap"
    }
  },

  passive_budget: 1.20 // rough allowance for resistors, caps, crystals, etc.
};

function runComponentAgent(project) {
  if (!project.architecture) {
    throw new Error("ComponentAgent requires architecture to be present");
  }

  const arch = project.architecture;
  const constraints = project.user_intent.parsed_constraints;
  const lineItems = [];
  let totalLow = 0;
  let totalHigh = 0;

  // ---- MCU ----
  const mcuKey = arch.mcu_family || "esp32";
  const mcuPart = PART_LIBRARY.mcu[mcuKey] || PART_LIBRARY.mcu.esp32;
  lineItems.push({
    ref: "U1",
    category: "MCU",
    mpn: mcuPart.mpn,
    manufacturer: mcuPart.manufacturer,
    description: mcuPart.description,
    qty: 1,
    unit_price_usd: mcuPart.approx_price_usd,
    package: mcuPart.package,
    notes: mcuPart.notes,
    lifecycle: "Active" // placeholder
  });
  totalLow += mcuPart.approx_price_usd * 0.9;
  totalHigh += mcuPart.approx_price_usd * 1.25;

  // ---- Sensors ----
  (constraints.sensors || []).forEach((sensorKey, idx) => {
    const sensorPart = PART_LIBRARY.sensors[sensorKey];
    if (sensorPart) {
      lineItems.push({
        ref: `U${idx + 2}`,
        category: "Sensor",
        mpn: sensorPart.mpn,
        manufacturer: sensorPart.manufacturer,
        description: sensorPart.description,
        qty: 1,
        unit_price_usd: sensorPart.approx_price_usd,
        package: sensorPart.package,
        notes: sensorPart.notes,
        lifecycle: "Active"
      });
      totalLow += sensorPart.approx_price_usd * 0.9;
      totalHigh += sensorPart.approx_price_usd * 1.3;
    } else {
      // Unknown sensor – add a placeholder
      lineItems.push({
        ref: `U${idx + 2}`,
        category: "Sensor",
        mpn: "TBD",
        manufacturer: "TBD",
        description: `Sensor: ${sensorKey} (not in knowledge base yet)`,
        qty: 1,
        unit_price_usd: 2.00,
        package: "TBD",
        notes: "Needs manual / LLM selection",
        lifecycle: "Unknown"
      });
      totalLow += 1.5;
      totalHigh += 4.0;
    }
  });

  // ---- Power ----
  if (arch.power_architecture === "battery") {
    const charger = PART_LIBRARY.power.battery;
    lineItems.push({
      ref: "U_CHG",
      category: "Power",
      mpn: charger.mpn,
      manufacturer: charger.manufacturer,
      description: charger.description,
      qty: 1,
      unit_price_usd: charger.approx_price_usd,
      package: charger.package,
      notes: charger.notes,
      lifecycle: "Active"
    });
    totalLow += charger.approx_price_usd;
    totalHigh += charger.approx_price_usd * 1.5;
  }

  const regulator = PART_LIBRARY.power.regulator;
  lineItems.push({
    ref: "U_REG",
    category: "Power",
    mpn: regulator.mpn,
    manufacturer: regulator.manufacturer,
    description: regulator.description,
    qty: 1,
    unit_price_usd: regulator.approx_price_usd,
    package: regulator.package,
    notes: regulator.notes,
    lifecycle: "Active"
  });
  totalLow += regulator.approx_price_usd;
  totalHigh += regulator.approx_price_usd * 1.4;

  // ---- Passives & miscellaneous ----
  lineItems.push({
    ref: "PASSIVES",
    category: "Passives",
    mpn: "Various",
    manufacturer: "Various",
    description: "Resistors, capacitors, crystal, connectors, etc.",
    qty: 1,
    unit_price_usd: PART_LIBRARY.passive_budget,
    package: "—",
    notes: "Rough budget – will be refined later",
    lifecycle: "Active"
  });
  totalLow += PART_LIBRARY.passive_budget * 0.8;
  totalHigh += PART_LIBRARY.passive_budget * 1.6;

  // Round totals
  totalLow = Math.round(totalLow * 100) / 100;
  totalHigh = Math.round(totalHigh * 100) / 100;

  const bom = {
    currency: "USD",
    line_items: lineItems,
    estimated_total: {
      low: totalLow,
      high: totalHigh
    },
    target_cost: constraints.target_cost || null,
    meets_target: constraints.target_cost
      ? totalHigh <= constraints.target_cost * 1.15
      : null,
    notes: [
      "First-pass BOM generated from internal knowledge base.",
      "Prices are approximate and do not include volume discounts or shipping.",
      "Live distributor pricing and alternate suggestions will be added later."
    ],
    confidence: 0.62
  };

  project.bom = bom;

  addHistory(project, "ComponentAgent", "generated_bom", {
    item_count: lineItems.length,
    estimated_low: totalLow,
    estimated_high: totalHigh
  });

  let risk = "medium";
  if (constraints.target_cost && totalLow > constraints.target_cost) {
    risk = "high";
  } else if (bom.meets_target === true) {
    risk = "low";
  }

  return {
    project,
    confidence: bom.confidence,
    risk_level: risk,
    summary: `Generated BOM with ${lineItems.length} line items. Estimated $${totalLow} – $${totalHigh}`
  };
}

module.exports = { runComponentAgent };
