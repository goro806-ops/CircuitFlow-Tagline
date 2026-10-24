/**
 * HumanEscalationAgent (placeholder)
 *
 * When the Orchestrator decides a real human is needed,
 * this agent packages the current Project State + all agent
 * results into a clean briefing for a senior hardware engineer.
 *
 * In the future this will:
 *  - Create a ticket in a review queue
 *  - Notify available experts
 *  - Provide a structured review UI
 *  - Record the human decision back into the Project State
 */

const { addHistory } = require("./state");

function runHumanEscalationAgent(project, aggregation, agentResults = []) {
  const brief = {
    project_id: project.project_id,
    created_at: new Date().toISOString(),
    status: "awaiting_human_review",

    user_request: project.user_intent.raw_text,

    summary: {
      overall_confidence: aggregation.overall_confidence,
      overall_risk: aggregation.overall_risk,
      reasons_for_escalation: aggregation.reasons
    },

    key_artifacts: {
      constraints: project.user_intent.parsed_constraints,
      architecture: project.architecture
        ? {
            mcu: project.architecture.mcu_family,
            wireless: project.architecture.wireless,
            power: project.architecture.power_architecture,
            blocks: project.architecture.blocks
          }
        : null,
      bom_estimate: project.bom
        ? {
            item_count: project.bom.line_items.length,
            estimated_total: project.bom.estimated_total,
            target_cost: project.bom.target_cost,
            meets_target: project.bom.meets_target,
            line_items_preview: project.bom.line_items.map(i => ({
              ref: i.ref,
              mpn: i.mpn,
              description: i.description,
              unit_price_usd: i.unit_price_usd
            }))
          }
        : null
    },

    agent_results: agentResults.map(r => ({
      agent: r.agent,
      confidence: r.confidence,
      risk_level: r.risk_level,
      summary: r.summary
    })),

    // Placeholder for the human to fill later
    human_decision: null, // will become: approved | changes_requested | rejected
    human_comments: null,
    reviewed_by: null,
    reviewed_at: null
  };

  project.escalation = brief;
  project.status = "needs_human";

  addHistory(project, "HumanEscalationAgent", "escalated_to_human", {
    reasons: aggregation.reasons,
    overall_confidence: aggregation.overall_confidence,
    overall_risk: aggregation.overall_risk
  });

  return {
    project,
    brief,
    message: "Project escalated to human review. A senior engineer should examine the briefing."
  };
}

module.exports = { runHumanEscalationAgent };
