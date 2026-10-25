/**
 * SchematicAgent (v1.7) – pin-aware netlist
 *
 * Produces a structured netlist with explicit pins for major parts.
 * Still not a full KiCad schematic, but much closer to something
 * that can be exported or reviewed by engineers.
 */

const { addHistory } = require("./state");

// Minimal pin maps for common families
const PIN_MAPS = {
  esp32: {
    power: ["3V3", "GND"],
    i2c: { sda: "GPIO21", scl: "GPIO22" },
    uart: { tx: "GPIO1", rx: "GPIO3" },
    notes: "ESP32-WROOM style module pins (simplified)"
  },
  nrf52: {
    power: ["VDD", "GND"],
    i2c: { sda: "P0.26", scl: "P0.27" },
    uart: { tx: "P0.06", rx: "P0.08" },
    notes: "nRF52840 simplified"
  },
  stm32: {
    power: ["VDD", "VSS"],
    i2c: { sda: "PB7", scl: "PB6" },
    uart: { tx: "PA2", rx: "PA3" },
    notes: "STM32L4 simplified"
  },
  rp2040: {
    power: ["VCC", "GND"],
    i2c: { sda: "GP4", scl: "GP5" },
    uart: { tx: "GP0", rx: "GP1" },
    notes: "RP2040 simplified"
  },
  sensor_i2c: {
    power: ["VDD", "GND"],
    i2c: { sda: "SDA", scl: "SCL" }
  },
  regulator: {
    pins: ["VIN", "VOUT", "GND", "EN"]
  },
  charger: {
    pins: ["VCC", "BAT", "GND", "CHRG"]
  }
};

function runSchematicAgent(project) {
  if (!project.architecture || !project.bom) {
    throw new Error("SchematicAgent requires architecture and BOM");
  }

  const arch = project.architecture;
  const bom = project.bom;
  const constraints = project.user_intent.parsed_constraints || {};
  const mcuFamily = arch.mcu_family || "esp32";
  const mcuPins = PIN_MAPS[mcuFamily] || PIN_MAPS.esp32;

  // Components from BOM (non-passives)
  const components = bom.line_items
    .filter(item => item.category !== "Passives")
    .map(item => {
      const base = {
        ref: item.ref,
        mpn: item.mpn,
        value: item.description,
        footprint: item.package || "TBD",
        category: item.category
      };

      if (item.category === "MCU") {
        base.pins = {
          power: mcuPins.power,
          i2c: mcuPins.i2c,
          uart: mcuPins.uart
        };
        base.pin_notes = mcuPins.notes;
      } else if (item.category === "Sensor") {
        base.pins = PIN_MAPS.sensor_i2c;
      } else if (item.ref === "U_REG") {
        base.pins = { list: PIN_MAPS.regulator.pins };
      } else if (item.ref === "U_CHG") {
        base.pins = { list: PIN_MAPS.charger.pins };
      }

      return base;
    });

  // Standard passives with explicit pins
  const extraPassives = [
    { ref: "C1", mpn: "100nF", value: "0.1uF decoupling", footprint: "0402", category: "Passive", pins: { list: ["1", "2"] } },
    { ref: "C2", mpn: "10uF", value: "10uF bulk", footprint: "0805", category: "Passive", pins: { list: ["1", "2"] } },
    { ref: "C3", mpn: "100nF", value: "0.1uF (MCU)", footprint: "0402", category: "Passive", pins: { list: ["1", "2"] } },
    { ref: "R1", mpn: "10k", value: "10k I2C pull-up SDA", footprint: "0402", category: "Passive", pins: { list: ["1", "2"] } },
    { ref: "R2", mpn: "10k", value: "10k I2C pull-up SCL", footprint: "0402", category: "Passive", pins: { list: ["1", "2"] } },
    { ref: "Y1", mpn: "40MHz", value: "Crystal (optional)", footprint: "3225", category: "Passive", pins: { list: ["1", "2"] } }
  ];

  const allComponents = [...components, ...extraPassives];

  // -------------------------------------------------------
  // Pin-aware nets
  // -------------------------------------------------------
  const nets = [];
  const mcuRef = components.find(c => c.category === "MCU")?.ref || "U1";
  const sdaPin = mcuPins.i2c?.sda || "SDA";
  const sclPin = mcuPins.i2c?.scl || "SCL";
  const vddPin = (mcuPins.power || ["VDD"])[0];
  const gndPin = (mcuPins.power || ["GND", "VSS"]).find(p => /GND|VSS/i.test(p)) || "GND";

  // Power
  nets.push({
    name: "VCC_3V3",
    connected: [
      "U_REG.VOUT",
      `${mcuRef}.${vddPin}`,
      "C1.1",
      "C2.1",
      "C3.1",
      "R1.2",
      "R2.2"
    ]
  });
  nets.push({
    name: "GND",
    connected: [
      "U_REG.GND",
      `${mcuRef}.${gndPin}`,
      "C1.2",
      "C2.2",
      "C3.2"
    ]
  });

  if (arch.power_architecture === "battery") {
    nets.push({ name: "VBAT", connected: ["U_CHG.BAT", "U_REG.VIN"] });
    nets.push({ name: "USB_5V", connected: ["U_CHG.VCC"] });
    nets.push({ name: "CHG_GND", connected: ["U_CHG.GND", "GND"] });
  } else {
    nets.push({ name: "VIN", connected: ["U_REG.VIN"] });
  }

  // I2C bus with real pin names
  const sensorRefs = components.filter(c => c.category === "Sensor").map(c => c.ref);
  if (sensorRefs.length > 0) {
    nets.push({
      name: "I2C_SDA",
      connected: [
        `${mcuRef}.${sdaPin}`,
        ...sensorRefs.map(r => `${r}.SDA`),
        "R1.1"
      ]
    });
    nets.push({
      name: "I2C_SCL",
      connected: [
        `${mcuRef}.${sclPin}`,
        ...sensorRefs.map(r => `${r}.SCL`),
        "R2.1"
      ]
    });
  }

  // -------------------------------------------------------
  // Issues / confidence
  // -------------------------------------------------------
  const issues = [];
  let confidence = 0.68;

  if (sensorRefs.length > 3) {
    issues.push("Many sensors on a single I2C bus – check addresses or add a second bus");
    confidence -= 0.05;
  }
  if (arch.mcu_family === "esp32" && constraints.form_factor === "wearable") {
    issues.push("ESP32 power consumption may be high for always-on wearable – consider nRF52");
  }
  if (!components.find(c => c.category === "MCU")) {
    issues.push("No MCU found in BOM");
    confidence = 0.3;
  }

  const schematic = {
    format: "circuitflow-netlist-v1",
    mcu_family: mcuFamily,
    pin_maps_used: true,
    components: allComponents,
    nets,
    issues,
    notes: [
      "Pin-aware netlist (v1.7). Major parts have explicit pin assignments.",
      "Still simplified – not a full production KiCad schematic.",
      "Suitable for review, ERC-style checks, and future KiCad export."
    ],
    confidence: Math.max(0.35, Math.min(confidence, 0.88))
  };

  project.schematic = schematic;

  addHistory(project, "SchematicAgent", "generated_schematic", {
    component_count: allComponents.length,
    net_count: nets.length,
    issue_count: issues.length,
    pin_aware: true
  });

  const risk_level = issues.length > 1 ? "medium" : issues.length === 1 ? "medium" : "low";

  return {
    project,
    confidence: schematic.confidence,
    risk_level,
    summary: `Pin-aware schematic: ${allComponents.length} components, ${nets.length} nets, ${issues.length} issues`
  };
}

module.exports = { runSchematicAgent };
