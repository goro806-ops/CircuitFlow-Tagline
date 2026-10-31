/**
 * PCBLayoutAgent (v1.9.3)
 * - 4 layers for wearables / RF / modules
 * - Wearable size bias: denser pack, hard max outline
 */

const { addHistory } = require("./state");

function runPCBLayoutAgent(project) {
  if (!project.schematic || !project.architecture) {
    throw new Error("PCBLayoutAgent requires schematic and architecture");
  }

  const arch = project.architecture;
  const schematic = project.schematic;
  const constraints = project.user_intent.parsed_constraints || {};
  const components = schematic.components || [];
  const bom = project.bom;
  const isWearable = constraints.form_factor === "wearable";

  let widthMm = 40;
  let heightMm = 30;

  if (isWearable) {
    widthMm = 28;
    heightMm = 22;
  } else if (constraints.form_factor === "handheld") {
    widthMm = 55;
    heightMm = 35;
  } else if (constraints.form_factor === "module") {
    widthMm = 45;
    heightMm = 30;
  }

  // Growth with component count – weaker for wearables (denser)
  const over = Math.max(0, components.length - (isWearable ? 10 : 8));
  const growth = isWearable ? 1.2 : 2.5;
  widthMm = Math.round(widthMm + over * growth * 0.55);
  heightMm = Math.round(heightMm + over * growth * 0.4);

  // Hard caps for wearables so LLM-bloated BOMs don't explode outline
  if (isWearable) {
    widthMm = Math.min(widthMm, 36);
    heightMm = Math.min(heightMm, 28);
  }

  let layers = 2;
  const hasModule = bom?.line_items?.some(i =>
    (i.package || "").toLowerCase().includes("module")
  );
  const isRf =
    constraints.wireless === "ble" ||
    constraints.wireless === "wifi" ||
    constraints.wireless === "lora" ||
    arch.wireless === "ble" ||
    arch.wireless === "wifi";

  if (
    isWearable ||
    isRf ||
    hasModule ||
    components.length > 12 ||
    (constraints.sensors || []).length > 3
  ) {
    layers = 4;
  }

  const placements = [];
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

  const powerParts = components.filter(c => c.category === "Power");
  powerParts.forEach((p, i) => {
    placements.push({
      ref: p.ref,
      x_mm: Math.min(5 + i * 7, widthMm - 4),
      y_mm: heightMm - 5,
      rotation: 0,
      side: "top",
      notes: "Power region"
    });
  });

  const sensors = components.filter(c => c.category === "Sensor");
  sensors.forEach((s, i) => {
    placements.push({
      ref: s.ref,
      x_mm: Math.max(4, widthMm - 9),
      y_mm: Math.min(7 + i * 6, heightMm - 4),
      rotation: 0,
      side: "top",
      notes: "Sensor region"
    });
  });

  const placedRefs = new Set(placements.map(p => p.ref));
  let gridX = 6;
  let gridY = 6;
  const step = isWearable ? 7 : 10;
  components.forEach(c => {
    if (placedRefs.has(c.ref)) return;
    placements.push({
      ref: c.ref,
      x_mm: gridX,
      y_mm: gridY,
      rotation: 0,
      side: "top",
      notes: c.category === "Passive" ? "Auto grid placement; review decoupling and return paths" : "Auto grid placement"
    });
    gridX += step;
    if (gridX > widthMm - 5) {
      gridX = 6;
      gridY += step;
    }
  });

  const issues = [];
  let confidence = 0.62;

  // Softer wearable size warning (only if still over hard target after bias)
  if (isWearable && (widthMm > 34 || heightMm > 27)) {
    issues.push("Board may be large for a typical wearable form factor");
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
      layers === 4
        ? "4-layer stackup chosen for RF/wearable/module ground-plane quality."
        : "2-layer stackup – consider 4 layers if adding RF or density.",
      isWearable ? "Wearable size bias applied (max ~36×28 mm)." : null,
      "Component positions are approximate."
    ].filter(Boolean),
    confidence: Math.max(0.35, Math.min(confidence, 0.85))
  };

  project.pcb = pcb;

  addHistory(project, "PCBLayoutAgent", "generated_layout", {
    width_mm: widthMm,
    height_mm: heightMm,
    layers,
    placement_count: placements.length,
    issue_count: issues.length
  });

  const risk_level = issues.length >= 2 ? "medium" : issues.length === 1 ? "medium" : "low";

  return {
    project,
    confidence: pcb.confidence,
    risk_level,
    summary: `Generated ${widthMm}×${heightMm} mm, ${layers}-layer board with ${placements.length} placements. Issues: ${issues.length}`
  };
}

module.exports = { runPCBLayoutAgent };
