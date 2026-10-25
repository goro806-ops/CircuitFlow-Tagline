/**
 * EnclosureAgent (v1.7)
 * Parametric enclosure + OpenSCAD-style export script.
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

  // OpenSCAD-style parametric script (can be pasted into OpenSCAD)
  const scad = `// CircuitFlow parametric enclosure – generated
// Form: ${form}
outer_w = ${outerW.toFixed(2)};
outer_h = ${outerH.toFixed(2)};
outer_d = ${heightMm.toFixed(2)};
wall = ${wallMm.toFixed(2)};
inner_w = ${innerW.toFixed(2)};
inner_h = ${innerH.toFixed(2)};

difference() {
  // Outer shell
  cube([outer_w, outer_h, outer_d], center = false);
  // Inner cavity
  translate([wall, wall, wall])
    cube([inner_w, inner_h, outer_d], center = false);
}

// Corner standoffs (simplified)
standoff_r = 2.0;
standoff_h = ${Math.max(2, heightMm - wallMm * 2).toFixed(2)};
for (x = [wall + 3, outer_w - wall - 3])
  for (y = [wall + 3, outer_h - wall - 3])
    translate([x, y, wall])
      cylinder(r = standoff_r, h = standoff_h, $fn = 24);
`;

  const enclosure = {
    format: "circuitflow-enclosure-v1",
    form_factor: form,
    outer_mm: {
      width: Math.round(outerW * 10) / 10,
      height: Math.round(outerH * 10) / 10,
      depth: heightMm
    },
    inner_mm: {
      width: Math.round(innerW * 10) / 10,
      height: Math.round(innerH * 10) / 10
    },
    wall_mm: wallMm,
    material: form === "wearable" ? "PC/ABS or TPU soft-touch" : "ABS or PC",
    features,
    export: {
      openscad: scad,
      notes: "Paste the OpenSCAD script into OpenSCAD to generate STL. Full STEP export still future work."
    },
    notes: [
      "Parametric enclosure with OpenSCAD export (v1.7).",
      "Not a full mechanical CAD assembly yet."
    ],
    confidence: 0.68
  };

  project.enclosure = enclosure;

  addHistory(project, "EnclosureAgent", "generated_enclosure", {
    form,
    outer: enclosure.outer_mm,
    has_openscad: true
  });

  return {
    project,
    confidence: enclosure.confidence,
    risk_level: "low",
    summary: `Enclosure ${enclosure.outer_mm.width}×${enclosure.outer_mm.height}×${enclosure.outer_mm.depth} mm (${form}) + OpenSCAD`
  };
}

module.exports = { runEnclosureAgent };
