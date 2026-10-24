/**
 * EnclosureAgent (v0)
 * Produces a parametric enclosure description from PCB outline + form factor.
 */

const { addHistory } = require("./state");

function runEnclosureAgent(project) {
  if (!project.pcb) {
    throw new Error("EnclosureAgent requires PCB layout");
  }

  const pcb = project.pcb;
  const constraints = project.user_intent.parsed_constraints || {};
  const form = constraints.form_factor || "module";

  const wallMm = form === "wearable" ? 1.2 : 1.6;
  const clearanceMm = 0.8;
  const heightMm = form === "wearable" ? 8 : form === "handheld" ? 12 : 10;

  const innerW = pcb.outline.width_mm + clearanceMm * 2;
  const innerH = pcb.outline.height_mm + clearanceMm * 2;
  const outerW = innerW + wallMm * 2;
  const outerH = innerH + wallMm * 2;

  const features = [
    { type: "cavity", notes: "PCB pocket with standoffs" },
    { type: "standoffs", count: 4, notes: "Corner bosses for M2 screws" }
  ];

  if (constraints.power === "battery" || project.architecture?.power_architecture === "battery") {
    features.push({ type: "battery_bay", notes: "Space for LiPo or coin cell" });
  }
  if (constraints.wireless === "ble" || constraints.wireless === "wifi") {
    features.push({ type: "antenna_window", notes: "Keep plastic thin / no metal over antenna zone" });
  }
  if (form === "wearable") {
    features.push({ type: "strap_lugs", notes: "Optional strap or clip interfaces" });
  }

  const enclosure = {
    format: "circuitflow-enclosure-v0",
    form_factor: form,
    outer_mm: { width: Math.round(outerW * 10) / 10, height: Math.round(outerH * 10) / 10, depth: heightMm },
    inner_mm: { width: Math.round(innerW * 10) / 10, height: Math.round(innerH * 10) / 10 },
    wall_mm: wallMm,
    material: form === "wearable" ? "PC/ABS or TPU soft-touch" : "ABS or PC",
    features,
    notes: [
      "Parametric description only – not a full CAD model yet.",
      "Export to STEP/STL will come in a later agent version."
    ],
    confidence: 0.6
  };

  project.enclosure = enclosure;

  addHistory(project, "EnclosureAgent", "generated_enclosure", {
    form,
    outer: enclosure.outer_mm
  });

  return {
    project,
    confidence: enclosure.confidence,
    risk_level: "low",
    summary: `Enclosure ${enclosure.outer_mm.width}×${enclosure.outer_mm.height}×${enclosure.outer_mm.depth} mm (${form})`
  };
}

module.exports = { runEnclosureAgent };
