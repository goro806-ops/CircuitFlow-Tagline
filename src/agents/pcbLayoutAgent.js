/**
 * PCBLayoutAgent (v0)
 *
 * Produces a first-pass PCB layout representation from the
 * schematic + architecture + constraints.
 *
 * This version is still rule-based / heuristic:
 * - Estimates board size from form-factor and component count
 * - Places major components in simple regions
 * - Records layer count and basic DRC-style notes
 *
 * Later this will be replaced by real placement + routing logic
 * (and eventually a proper generative layout engine).
 */

const { addHistory } = require("./state");

function runPCBLayoutAgent(project) {
  if (!project.schematic || !project.architecture) {
    throw new Error("PCBLayoutAgent requires schematic and architecture");
  }

  const arch = project.architecture;
  const schematic = project.schematic;
  const constraints = project.user_intent.parsed_constraints;
  const components = schematic.components || [];

  // -------------------------------------------------------
  // Estimate board size
  // -------------------------------------------------------
  let widthMm = 40;
  let heightMm = 30;

  if (constraints.form_factor === "wearable") {
    widthMm = 28;
    heightMm = 22;
  } else if (constraints.form_factor === "handheld") {
    widthMm = 55;
    heightMm = 35;
  } else if (constraints.form_factor === "module") {
    widthMm = 45;
    heightMm = 30;
  }

  // Grow a bit with component count
  const extra = Math.max(0, components.length - 8) * 2.5;
  widthMm = Math.round(widthMm + extra * 0.6);
  heightMm = Math.round(heightMm + extra * 0.4);

  // -------------------------------------------------------
  // Layer count heuristic
  // -------------------------------------------------------
  let layers = 2;
  if (components.length > 15 || (constraints.sensors || []).length > 3) {
    layers = 4;
  }

  // -------------------------------------------------------
  // Simple placement regions
  // -------------------------------------------------------
  const placements = [];

  // MCU near center
  const mcu = components.find(c => c.category === "MCU");
  if (mcu) {
    placements.push({
      ref: mcu.ref,
      x_mm: Math.round(widthMm / 2),
      y_mm: Math.round(heightMm / 2),
      rotation: 0,
      side: "top",
      notes: "Central placement"
    });
  }

  // Power parts on one edge
  const powerParts = components.filter(c => c.category === "Power");
  powerParts.forEach((p, i) => {
    placements.push({
      ref: p.ref,
      x_mm: 5 + i * 8,
      y_mm: heightMm - 6,
      rotation: 0,
      side: "top",
      notes: "Power region"
    });
  });

  // Sensors in another region
  const sensors = components.filter(c => c.category === "Sensor");
  sensors.forEach((s, i) => {
    placements.push({
      ref: s.ref,
      x_mm: widthMm - 10,
      y_mm: 8 + i * 7,
      rotation: 0,
      side: "top",
      notes: "Sensor region"
    });
  });

  // Remaining components – rough grid
  const placedRefs = new Set(placements.map(p => p.ref));
  let gridX = 8;
  let gridY = 8;
  components.forEach(c => {
    if (placedRefs.has(c.ref)) return;
    if (c.category === "Passive") return; // skip detailed passive placement for now

    placements.push({
      ref: c.ref,
      x_mm: gridX,
      y_mm: gridY,
      rotation: 0,
      side: "top",
      notes: "Auto grid placement"
    });
    gridX += 10;
    if (gridX > widthMm - 8) {
      gridX = 8;
      gridY += 8;
    }
  });

  // -------------------------------------------------------
  // Basic issues / DRC-style notes
  // -------------------------------------------------------
  const issues = [];
  let confidence = 0.55;

  if (constraints.form_factor === "wearable" && (widthMm > 32 || heightMm > 26)) {
    issues.push("Board may be large for a typical wearable form factor");
    confidence -= 0.05;
  }

  if (layers === 2 && components.length > 12) {
    issues.push("Dense design on 2 layers – consider 4 layers for better routing and SI");
    confidence -= 0.04;
  }

  if (sensors.length > 0 && !mcu) {
    issues.push("Sensors present but no MCU found for placement reference");
    confidence -= 0.1;
  }

  if (placements.length < 3) {
    issues.push("Very few components placed – layout is incomplete");
    confidence -= 0.1;
  }

  // -------------------------------------------------------
  // Build PCB object
  // -------------------------------------------------------
  const pcb = {
    format: "circuitflow-pcb-v0",
    outline: {
      width_mm: widthMm,
      height_mm: heightMm,
      shape: "rectangle"
    },
    layers,
    placements,
    issues,
    notes: [
      "First-pass heuristic layout only.",
      "No real autorouting or advanced DRC yet.",
      "Component positions are approximate and intended for early digital-twin visualization."
    ],
    confidence: Math.max(0.35, Math.min(confidence, 0.8))
  };

  project.pcb = pcb;

  addHistory(project, "PCBLayoutAgent", "generated_layout", {
    width_mm: widthMm,
    height_mm: heightMm,
    layers,
    placement_count: placements.length,
    issue_count: issues.length
  });

  const risk_level = issues.length >= 2 ? "medium" : (issues.length === 1 ? "medium" : "low");

  return {
    project,
    confidence: pcb.confidence,
    risk_level,
    summary: `Generated ${widthMm}×${heightMm} mm, ${layers}-layer board with ${placements.length} placements. Issues: ${issues.length}`
  };
}

module.exports = { runPCBLayoutAgent };
