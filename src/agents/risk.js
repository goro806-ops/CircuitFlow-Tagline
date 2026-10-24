/**
 * Confidence & Risk aggregation helpers
 *
 * Every agent returns { confidence, risk_level }.
 * This module aggregates them into an overall assessment
 * that the Orchestrator uses to decide whether to continue
 * or escalate to a human.
 */

const RISK_ORDER = { low: 0, medium: 1, high: 2 };

/**
 * Aggregate results from multiple agents.
 * @param {Array<{agent: string, confidence: number, risk_level: string, summary?: string}>} agentResults
 * @returns {{ overall_confidence: number, overall_risk: string, needs_human: boolean, reasons: string[] }}
 */
function aggregateRisk(agentResults) {
  if (!agentResults || agentResults.length === 0) {
    return {
      overall_confidence: 0,
      overall_risk: "high",
      needs_human: true,
      reasons: ["No agent results to aggregate"]
    };
  }

  // Average confidence (simple for now)
  const confidences = agentResults.map(r => r.confidence || 0);
  const overall_confidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

  // Highest risk wins
  let maxRisk = "low";
  agentResults.forEach(r => {
    const level = r.risk_level || "medium";
    if (RISK_ORDER[level] > RISK_ORDER[maxRisk]) {
      maxRisk = level;
    }
  });

  const reasons = [];

  // Decision rules (can be tuned later)
  let needs_human = false;

  if (overall_confidence < 0.55) {
    needs_human = true;
    reasons.push(`Overall confidence too low (${overall_confidence.toFixed(2)})`);
  }

  if (maxRisk === "high") {
    needs_human = true;
    reasons.push("At least one agent reported high risk");
  }

  // Special case: cost target clearly missed
  const costRisk = agentResults.find(
    r => r.agent === "ComponentAgent" && r.risk_level === "high"
  );
  if (costRisk) {
    needs_human = true;
    reasons.push("BOM cost appears to exceed target");
  }

  // If everything looks good
  if (!needs_human && overall_confidence >= 0.7 && maxRisk === "low") {
    reasons.push("All agents report acceptable confidence and low risk");
  } else if (!needs_human) {
    reasons.push("Proceeding with medium confidence – monitoring recommended");
  }

  return {
    overall_confidence: Math.round(overall_confidence * 100) / 100,
    overall_risk: maxRisk,
    needs_human,
    reasons
  };
}

module.exports = { aggregateRisk };
