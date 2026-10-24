/**
 * AI Expert Reviewer Agents (v1)
 *
 * SchematicReviewer, LayoutReviewer, PowerThermalReviewer, DFMReviewer
 * + combined runReviewers() used by the orchestrator.
 */

const { addHistory, addReview } = require("./state");

function runSchematicReviewer(project) {
  const issues = [];
  let confidence = 0.75;
  let status = "approved";
  const sch = project.schematic;

  if (!sch) {
    issues.push("No schematic present");
    status = "rejected";
    confidence = 0.2;
  } else {
    if (!sch.components || sch.components.length < 3) {
      issues.push("Schematic has very few components");
      status = "needs_changes";
      confidence -= 0.15;
    }
    if (!sch.nets || sch.nets.length < 2) {
      issues.push("Insufficient nets defined");
      status = "needs_changes";
      confidence -= 0.15;
    }
    if (sch.issues?.length) {
      issues.push(...sch.issues.map(i => `From schematic generation: ${i}`));
      if (status === "approved") status = "needs_changes";
      confidence -= 0.08 * sch.issues.length;
    }
    const hasGnd = sch.nets?.some(n => n.name === "GND");
    const hasPower = sch.nets?.some(n =>
      n.name.includes("VCC") || n.name.includes("3V3") || n.name.includes("VIN")
    );
    if (!hasGnd || !hasPower) {
      issues.push("Missing clear power or ground net");
      status = "needs_changes";
      confidence -= 0.2;
    }
  }

  confidence = Math.max(0.2, Math.min(confidence, 0.95));
  const risk_level = status === "rejected" ? "high" : status === "needs_changes" ? "medium" : "low";
  addReview(project, "SchematicReviewer", status, confidence, risk_level, issues);
  addHistory(project, "SchematicReviewer", "reviewed_schematic", { status, issue_count: issues.length });
  return { project, status, confidence, risk_level, issues, summary: `Schematic review: ${status} (${issues.length} issues)` };
}

function runLayoutReviewer(project) {
  const issues = [];
  let confidence = 0.72;
  let status = "approved";
  const pcb = project.pcb;

  if (!pcb) {
    issues.push("No PCB layout present");
    status = "rejected";
    confidence = 0.2;
  } else {
    if (!pcb.placements || pcb.placements.length < 2) {
      issues.push("Too few components placed");
      status = "needs_changes";
      confidence -= 0.2;
    }
    if (pcb.outline.width_mm < 15 || pcb.outline.height_mm < 12) {
      issues.push("Board outline seems unrealistically small");
      status = "needs_changes";
      confidence -= 0.1;
    }
    if (pcb.issues?.length) {
      issues.push(...pcb.issues.map(i => `From layout generation: ${i}`));
      if (status === "approved") status = "needs_changes";
      confidence -= 0.07 * pcb.issues.length;
    }
    const area = pcb.outline.width_mm * pcb.outline.height_mm;
    const count = pcb.placements?.length || 0;
    if (count > 0 && area / count < 40) {
      issues.push("High component density – may be difficult to route on current layer count");
      if (status === "approved") status = "needs_changes";
      confidence -= 0.1;
    }
  }

  confidence = Math.max(0.2, Math.min(confidence, 0.95));
  const risk_level = status === "rejected" ? "high" : status === "needs_changes" ? "medium" : "low";
  addReview(project, "LayoutReviewer", status, confidence, risk_level, issues);
  addHistory(project, "LayoutReviewer", "reviewed_layout", { status, issue_count: issues.length });
  return { project, status, confidence, risk_level, issues, summary: `Layout review: ${status} (${issues.length} issues)` };
}

function runPowerThermalReviewer(project) {
  const issues = [];
  let confidence = 0.7;
  let status = "approved";

  const arch = project.architecture;
  const bom = project.bom;
  const constraints = project.user_intent?.parsed_constraints || {};

  if (!arch) {
    issues.push("No architecture for power/thermal review");
    status = "needs_changes";
    confidence = 0.3;
  } else {
    if (constraints.form_factor === "wearable" && arch.mcu_family === "esp32") {
      issues.push("ESP32 may be thermally and power-hungry for a small wearable – consider nRF52");
      status = "needs_changes";
      confidence -= 0.12;
    }
    if (arch.power_architecture === "battery" && !bom?.line_items?.some(i => i.category === "Power")) {
      issues.push("Battery power selected but no power-management parts in BOM");
      status = "needs_changes";
      confidence -= 0.15;
    }
    if ((constraints.sensors || []).includes("gps") && constraints.power === "battery") {
      issues.push("GPS + battery can drain quickly – ensure aggressive power management");
      if (status === "approved") status = "needs_changes";
      confidence -= 0.08;
    }
  }

  confidence = Math.max(0.25, Math.min(confidence, 0.92));
  const risk_level = status === "needs_changes" ? "medium" : "low";
  addReview(project, "PowerThermalReviewer", status, confidence, risk_level, issues);
  addHistory(project, "PowerThermalReviewer", "reviewed_power_thermal", { status, issue_count: issues.length });
  return { project, status, confidence, risk_level, issues, summary: `Power/Thermal review: ${status} (${issues.length} issues)` };
}

function runDFMReviewer(project) {
  const issues = [];
  let confidence = 0.7;
  let status = "approved";
  const pcb = project.pcb;
  const bom = project.bom;

  if (!pcb) {
    issues.push("No PCB for DFM review");
    status = "needs_changes";
    confidence = 0.3;
  } else {
    if (pcb.layers === 2 && (pcb.placements?.length || 0) > 14) {
      issues.push("Dense 2-layer board – DFM and yield risk; prefer 4 layers");
      status = "needs_changes";
      confidence -= 0.12;
    }
    if (pcb.outline.width_mm < 20 || pcb.outline.height_mm < 15) {
      issues.push("Very small board – check fab minimum size and handling");
      if (status === "approved") status = "needs_changes";
      confidence -= 0.08;
    }
    const hasModule = bom?.line_items?.some(i => (i.package || "").toLowerCase().includes("module"));
    if (hasModule && pcb.layers < 4) {
      issues.push("RF / module parts often benefit from ground planes on 4-layer stackups");
      if (status === "approved") status = "needs_changes";
      confidence -= 0.06;
    }
  }

  confidence = Math.max(0.25, Math.min(confidence, 0.92));
  const risk_level = status === "needs_changes" ? "medium" : "low";
  addReview(project, "DFMReviewer", status, confidence, risk_level, issues);
  addHistory(project, "DFMReviewer", "reviewed_dfm", { status, issue_count: issues.length });
  return { project, status, confidence, risk_level, issues, summary: `DFM review: ${status} (${issues.length} issues)` };
}

function runReviewers(project) {
  const results = [];

  let r = runSchematicReviewer(project);
  project = r.project;
  results.push(r);

  r = runLayoutReviewer(project);
  project = r.project;
  results.push(r);

  r = runPowerThermalReviewer(project);
  project = r.project;
  results.push(r);

  r = runDFMReviewer(project);
  project = r.project;
  results.push(r);

  const needsRevision = results.some(x => x.status === "needs_changes" || x.status === "rejected");

  let revisionTarget = null;
  if (results[0].status !== "approved") revisionTarget = "schematic";
  else if (results[1].status !== "approved" || results[3].status !== "approved") revisionTarget = "pcb";
  else if (results[2].status !== "approved") revisionTarget = "schematic"; // power issues often need arch/schematic rethink

  const overallConfidence = results.reduce((s, x) => s + x.confidence, 0) / results.length;
  const overallRisk = results.some(x => x.risk_level === "high")
    ? "high"
    : results.some(x => x.risk_level === "medium")
      ? "medium"
      : "low";

  return {
    project,
    needsRevision,
    revisionTarget,
    reviews: results,
    confidence: overallConfidence,
    risk_level: overallRisk,
    summary: `Reviews complete (${results.length} reviewers). Revision needed: ${needsRevision}${revisionTarget ? ` → ${revisionTarget}` : ""}`
  };
}

module.exports = {
  runSchematicReviewer,
  runLayoutReviewer,
  runPowerThermalReviewer,
  runDFMReviewer,
  runReviewers
};
