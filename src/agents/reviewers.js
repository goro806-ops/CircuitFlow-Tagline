/**
 * AI Expert Reviewer Agents (v0)
 *
 * These agents critique the work of the design agents and can
 * request revisions. They are the first layer of AI HITL.
 */

const { addHistory, addReview } = require("./state");

/**
 * SchematicReviewer
 * Looks for basic electrical / structural problems in the schematic.
 */
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
    if (sch.issues && sch.issues.length > 0) {
      issues.push(...sch.issues.map(i => `From schematic generation: ${i}`));
      if (status === "approved") status = "needs_changes";
      confidence -= 0.08 * sch.issues.length;
    }

    // Simple power check
    const hasGnd = sch.nets.some(n => n.name === "GND");
    const hasPower = sch.nets.some(n => n.name.includes("VCC") || n.name.includes("3V3") || n.name.includes("VIN"));
    if (!hasGnd || !hasPower) {
      issues.push("Missing clear power or ground net");
      status = "needs_changes";
      confidence -= 0.2;
    }
  }

  confidence = Math.max(0.2, Math.min(confidence, 0.95));
  const risk_level = status === "rejected" ? "high" : (status === "needs_changes" ? "medium" : "low");

  addReview(project, "SchematicReviewer", status, confidence, risk_level, issues);
  addHistory(project, "SchematicReviewer", "reviewed_schematic", { status, issue_count: issues.length });

  return {
    project,
    status,
    confidence,
    risk_level,
    issues,
    summary: `Schematic review: ${status} (${issues.length} issues)`
  };
}

/**
 * LayoutReviewer
 * Critiques the PCB layout for basic manufacturability and density issues.
 */
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
    if (pcb.issues && pcb.issues.length > 0) {
      issues.push(...pcb.issues.map(i => `From layout generation: ${i}`));
      if (status === "approved") status = "needs_changes";
      confidence -= 0.07 * pcb.issues.length;
    }

    // Density heuristic
    const area = pcb.outline.width_mm * pcb.outline.height_mm;
    const count = pcb.placements?.length || 0;
    if (count > 0 && area / count < 40) {
      issues.push("High component density – may be difficult to route on current layer count");
      if (status === "approved") status = "needs_changes";
      confidence -= 0.1;
    }
  }

  confidence = Math.max(0.2, Math.min(confidence, 0.95));
  const risk_level = status === "rejected" ? "high" : (status === "needs_changes" ? "medium" : "low");

  addReview(project, "LayoutReviewer", status, confidence, risk_level, issues);
  addHistory(project, "LayoutReviewer", "reviewed_layout", { status, issue_count: issues.length });

  return {
    project,
    status,
    confidence,
    risk_level,
    issues,
    summary: `Layout review: ${status} (${issues.length} issues)`
  };
}

/**
 * Combined review step used by the orchestrator.
 * Returns whether a revision is requested and which stage should be re-run.
 */
function runReviewers(project) {
  const schReview = runSchematicReviewer(project);
  project = schReview.project;

  const layReview = runLayoutReviewer(project);
  project = layReview.project;

  const reviews = [schReview, layReview];
  const needsRevision = reviews.some(r => r.status === "needs_changes" || r.status === "rejected");

  // Decide which stage to send back to (simple policy)
  let revisionTarget = null;
  if (schReview.status !== "approved") {
    revisionTarget = "schematic"; // re-run schematic (and later layout)
  } else if (layReview.status !== "approved") {
    revisionTarget = "pcb";
  }

  const overallConfidence =
    reviews.reduce((s, r) => s + r.confidence, 0) / reviews.length;

  const overallRisk = reviews.some(r => r.risk_level === "high")
    ? "high"
    : reviews.some(r => r.risk_level === "medium")
      ? "medium"
      : "low";

  return {
    project,
    needsRevision,
    revisionTarget,
    reviews,
    confidence: overallConfidence,
    risk_level: overallRisk,
    summary: `Reviews complete. Revision needed: ${needsRevision}${revisionTarget ? ` (target: ${revisionTarget})` : ""}`
  };
}

module.exports = {
  runSchematicReviewer,
  runLayoutReviewer,
  runReviewers
};
