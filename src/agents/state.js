/**
 * CircuitFlow – Shared Project State (Digital Twin)
 * This is the single source of truth for all agents.
 */

function createEmptyProject(userPrompt = "") {
  const now = new Date().toISOString();
  return {
    project_id: generateId(),
    created_at: now,
    updated_at: now,
    status: "in_progress", // in_progress | needs_human | approved | exported | failed

    user_intent: {
      raw_text: userPrompt,
      parsed_constraints: {
        target_cost: null,
        form_factor: null,
        power: null,
        wireless: null,
        sensors: [],
        mcu_preference: null,
        other: {}
      }
    },

    architecture: null,
    bom: null,
    schematic: null,
    pcb: null,
    firmware: null,
    enclosure: null,
    dfm: null,
    simulations: null,

    reviews: [],
    history: [],
    escalation: null
  };
}

function generateId() {
  return "proj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Helper to append an entry to the audit history
 */
function addHistory(project, agentName, action, details = {}) {
  project.history.push({
    timestamp: new Date().toISOString(),
    agent: agentName,
    action,
    details
  });
  project.updated_at = new Date().toISOString();
  return project;
}

/**
 * Helper to record a review
 */
function addReview(project, agentName, status, confidence, riskLevel, issues = []) {
  project.reviews.push({
    agent: agentName,
    status,          // approved | needs_changes | rejected
    confidence,      // 0.0 – 1.0
    risk_level: riskLevel, // low | medium | high
    issues,
    timestamp: new Date().toISOString()
  });
  project.updated_at = new Date().toISOString();
  return project;
}

module.exports = {
  createEmptyProject,
  addHistory,
  addReview
};
