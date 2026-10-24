/**
 * SchematicAgent (v0)
 *
 * Generates a first-pass schematic representation (netlist-style)
 * from the architecture and BOM.
 *
 * This version is still rule-based and produces a simplified
 * structured netlist + component instances. Later it will be
 * upgraded to real generative schematic logic + LLM assistance.
 */

const { addHistory } = require("./state");

function runSchematicAgent(project) {
  if (!project.architecture || !project.bom) {
    throw new Error("SchematicAgent requires architecture and BOM");
  }

  const arch = project.architecture;
  const bom = project.bom;
  const constraints = project.user_intent.parsed_constraints;

  // -------------------------------------------------------
  // Build component instances from BOM line items
  // -------------------------------------------------------
  const components = bom.line_items
    .filter(item => item.category !== "Passives")
    .map(item => ({
      ref: item.ref,
      mpn: item.mpn,
      value: item.description,
      footprint: item.package || "TBD",
      category: item.category
    }));

  // Add a few standard passives so the netlist looks more realistic
  const extraPassives = [
    { ref: "C1", mpn: "100nF", value: "0.1uF decoupling", footprint: "0402", category: "Passive" },
    { ref: "C2", mpn: "10uF", value: "10uF bulk", footprint: "0805", category: "Passive" },
    { ref: "R1", mpn: "10k", value: "10k pull-up", footprint: "0402", category: "Passive" },
    { ref: "Y1", mpn: "40MHz", value: "Crystal (if needed)", footprint: "3225", category: "Passive" }
  ];

  const allComponents = [...components, ...extraPassives];

  // -------------------------------------------------------
  // Very simple netlist generation
  // -------------------------------------------------------
  const nets = [];

  // Power nets
  nets.push({
    name: "VCC_3V3",
    connected: ["U_REG.VOUT", "U1.VDD", "C1.1", "C2.1"]
  });
  nets.push({
    name: "GND",
    connected: ["U_REG.GND", "U1.GND", "C1.2", "C2.2"]
  });

  // Battery / charging (if present)
  if (arch.power_architecture === "battery") {
    nets.push({
      name: "VBAT",
      connected: ["U_CHG.BAT", "U_REG.VIN"]
    });
    nets.push({
      name: "USB_5V",
      connected: ["U_CHG.VCC"]
    });
  } else {
    nets.push({
      name: "VIN",
      connected: ["U_REG.VIN"]
    });
  }

  // MCU to sensors – very simplified (I2C bus assumption)
  const sensorRefs = components
    .filter(c => c.category === "Sensor")
    .map(c => c.ref);

  if (sensorRefs.length > 0) {
    nets.push({
      name: "I2C_SDA",
      connected: ["U1.SDA", ...sensorRefs.map(r => `${r}.SDA`), "R1.1"]
    });
    nets.push({
      name: "I2C_SCL",
      connected: ["U1.SCL", ...sensorRefs.map(r => `${r}.SCL`)]
    });
    // Pull-up to 3V3
    nets.push({
      name: "I2C_PULLUP",
      connected: ["R1.2", "VCC_3V3"]
    });
  }

  // Basic status
  const issues = [];
  let confidence = 0.58;

  if (sensorRefs.length > 3) {
    issues.push("Many sensors on a single I2C bus – may need address management or second bus");
    confidence -= 0.05;
  }

  if (arch.mcu_family === "esp32" && constraints.form_factor === "wearable") {
    issues.push("ESP32 power consumption may be high for always-on wearable – consider nRF52 later");
  }

  // Very rough connectivity check
  if (!components.find(c => c.category === "MCU")) {
    issues.push("No MCU found in BOM");
    confidence = 0.3;
  }

  const schematic = {
    format: "circuitflow-netlist-v0",
    components: allComponents,
    nets,
    issues,
    notes: [
      "This is a simplified first-pass schematic / netlist.",
      "It demonstrates connectivity intent but is not yet a full production schematic.",
      "Real pin-accurate generation and ERC will come in later versions."
    ],
    confidence: Math.max(0.35, Math.min(confidence, 0.85))
  };

  project.schematic = schematic;

  addHistory(project, "SchematicAgent", "generated_schematic", {
    component_count: allComponents.length,
    net_count: nets.length,
    issue_count: issues.length
  });

  const risk_level = issues.length > 1 ? "medium" : (issues.length === 1 ? "medium" : "low");

  return {
    project,
    confidence: schematic.confidence,
    risk_level,
    summary: `Generated schematic with ${allComponents.length} components and ${nets.length} nets. Issues: ${issues.length}`
  };
}

module.exports = { runSchematicAgent };
