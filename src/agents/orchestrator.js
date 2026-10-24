/**
 * Simple Orchestrator (v0.3)
 * Runs a linear pipeline of agents + confidence/risk aggregation
 * and decides whether to escalate to a human.
 *
 * Later this will be replaced / extended with LangGraph for full control,
 * branching, revision loops, and first-class human-in-the-loop interrupts.
 */

const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

/**
 * Run the current pipeline:
 * SpecAgent → ArchitectureAgent → ComponentAgent
 * then aggregate confidence/risk and escalate if needed.
 */
async function runPipeline(userPrompt) {
  let project = createEmptyProject(userPrompt);
  const agentResults = [];

  console.log("\n=== CircuitFlow Orchestrator (v0.3) ===");
  console.log(`Project ID: ${project.project_id}`);
  console.log(`User prompt: "${userPrompt}"\n`);

  // 1. SpecAgent
  console.log("→ Running SpecAgent...");
  const specResult = runSpecAgent(project);
  project = specResult.project;
  agentResults.push({
    agent: "SpecAgent",
    confidence: specResult.confidence,
    risk_level: specResult.risk_level,
    summary: specResult.summary
  });
  console.log(`   Confidence: ${specResult.confidence.toFixed(2)} | Risk: ${specResult.risk_level}`);
  console.log(`   ${specResult.summary}`);

  // 2. ArchitectureAgent
  console.log("\n→ Running ArchitectureAgent...");
  const archResult = runArchitectureAgent(project);
  project = archResult.project;
  agentResults.push({
    agent: "ArchitectureAgent",
    confidence: archResult.confidence,
    risk_level: archResult.risk_level,
    summary: archResult.summary
  });
  console.log(`   Confidence: ${archResult.confidence.toFixed(2)} | Risk: ${archResult.risk_level}`);
  console.log(`   ${archResult.summary}`);

  // 3. ComponentAgent
  console.log("\n→ Running ComponentAgent...");
  const compResult = runComponentAgent(project);
  project = compResult.project;
  agentResults.push({
    agent: "ComponentAgent",
    confidence: compResult.confidence,
    risk_level: compResult.risk_level,
    summary: compResult.summary
  });
  console.log(`   Confidence: ${compResult.confidence.toFixed(2)} | Risk: ${compResult.risk_level}`);
  console.log(`   ${compResult.summary}`);
  if (project.bom) {
    console.log(`   Estimated total: $${project.bom.estimated_total.low} – $${project.bom.estimated_total.high}`);
    if (project.bom.target_cost) {
      console.log(`   Target cost: $${project.bom.target_cost} | Meets target: ${project.bom.meets_target}`);
    }
  }

  // 4. Aggregate confidence & risk
  console.log("\n→ Aggregating confidence & risk...");
  const aggregation = aggregateRisk(agentResults);
  console.log(`   Overall confidence: ${aggregation.overall_confidence}`);
  console.log(`   Overall risk:       ${aggregation.overall_risk}`);
  console.log(`   Needs human:        ${aggregation.needs_human}`);
  aggregation.reasons.forEach(r => console.log(`     - ${r}`));

  // 5. Decide: continue or escalate
  if (aggregation.needs_human) {
    console.log("\n→ Escalating to human review...");
    const escalationResult = runHumanEscalationAgent(project, aggregation, agentResults);
    project = escalationResult.project;

    console.log(`   ${escalationResult.message}`);
    console.log(`   Escalation brief created for project ${project.project_id}`);
  } else {
    project.status = "in_progress"; // later this will become "ready_for_next_stage"
    addHistory(project, "Orchestrator", "auto_approved_for_now", {
      overall_confidence: aggregation.overall_confidence,
      overall_risk: aggregation.overall_risk
    });
    console.log("\n→ No human escalation required at this stage.");
  }

  addHistory(project, "Orchestrator", "pipeline_complete_v0.3", {
    agents_run: agentResults.map(r => r.agent),
    overall_confidence: aggregation.overall_confidence,
    overall_risk: aggregation.overall_risk,
    needs_human: aggregation.needs_human
  });

  console.log("\n=== Pipeline finished (v0.3) ===");
  console.log(`Final status: ${project.status}`);
  console.log(`History entries: ${project.history.length}`);
  if (project.escalation) {
    console.log(`Escalation status: ${project.escalation.status}`);
  }

  return project;
}

module.exports = { runPipeline };
