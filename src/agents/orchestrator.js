/**
 * Simple Orchestrator (v0.4)
 * Pipeline: Spec → Architecture → Component → Schematic
 * + confidence/risk aggregation + human escalation
 */

const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { runSchematicAgent } = require("./schematicAgent");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

async function runPipeline(userPrompt) {
  let project = createEmptyProject(userPrompt);
  const agentResults = [];

  console.log("\n=== CircuitFlow Orchestrator (v0.4) ===");
  console.log(`Project ID: ${project.project_id}`);
  console.log(`User prompt: "${userPrompt}"\n`);

  // 1. SpecAgent
  console.log("→ Running SpecAgent...");
  const specResult = runSpecAgent(project);
  project = specResult.project;
  agentResults.push({ agent: "SpecAgent", confidence: specResult.confidence, risk_level: specResult.risk_level, summary: specResult.summary });
  console.log(`   Confidence: ${specResult.confidence.toFixed(2)} | Risk: ${specResult.risk_level}`);
  console.log(`   ${specResult.summary}`);

  // 2. ArchitectureAgent
  console.log("\n→ Running ArchitectureAgent...");
  const archResult = runArchitectureAgent(project);
  project = archResult.project;
  agentResults.push({ agent: "ArchitectureAgent", confidence: archResult.confidence, risk_level: archResult.risk_level, summary: archResult.summary });
  console.log(`   Confidence: ${archResult.confidence.toFixed(2)} | Risk: ${archResult.risk_level}`);
  console.log(`   ${archResult.summary}`);

  // 3. ComponentAgent
  console.log("\n→ Running ComponentAgent...");
  const compResult = runComponentAgent(project);
  project = compResult.project;
  agentResults.push({ agent: "ComponentAgent", confidence: compResult.confidence, risk_level: compResult.risk_level, summary: compResult.summary });
  console.log(`   Confidence: ${compResult.confidence.toFixed(2)} | Risk: ${compResult.risk_level}`);
  console.log(`   ${compResult.summary}`);
  if (project.bom) {
    console.log(`   Estimated total: $${project.bom.estimated_total.low} – $${project.bom.estimated_total.high}`);
  }

  // 4. SchematicAgent
  console.log("\n→ Running SchematicAgent...");
  const schResult = runSchematicAgent(project);
  project = schResult.project;
  agentResults.push({ agent: "SchematicAgent", confidence: schResult.confidence, risk_level: schResult.risk_level, summary: schResult.summary });
  console.log(`   Confidence: ${schResult.confidence.toFixed(2)} | Risk: ${schResult.risk_level}`);
  console.log(`   ${schResult.summary}`);
  if (project.schematic && project.schematic.issues.length > 0) {
    console.log("   Issues:");
    project.schematic.issues.forEach(i => console.log(`     - ${i}`));
  }

  // 5. Aggregate confidence & risk
  console.log("\n→ Aggregating confidence & risk...");
  const aggregation = aggregateRisk(agentResults);
  console.log(`   Overall confidence: ${aggregation.overall_confidence}`);
  console.log(`   Overall risk:       ${aggregation.overall_risk}`);
  console.log(`   Needs human:        ${aggregation.needs_human}`);
  aggregation.reasons.forEach(r => console.log(`     - ${r}`));

  // 6. Decide: continue or escalate
  if (aggregation.needs_human) {
    console.log("\n→ Escalating to human review...");
    const escalationResult = runHumanEscalationAgent(project, aggregation, agentResults);
    project = escalationResult.project;
    console.log(`   ${escalationResult.message}`);
  } else {
    project.status = "in_progress";
    addHistory(project, "Orchestrator", "auto_approved_for_now", {
      overall_confidence: aggregation.overall_confidence,
      overall_risk: aggregation.overall_risk
    });
    console.log("\n→ No human escalation required at this stage.");
  }

  addHistory(project, "Orchestrator", "pipeline_complete_v0.4", {
    agents_run: agentResults.map(r => r.agent),
    overall_confidence: aggregation.overall_confidence,
    overall_risk: aggregation.overall_risk,
    needs_human: aggregation.needs_human
  });

  console.log("\n=== Pipeline finished (v0.4) ===");
  console.log(`Final status: ${project.status}`);
  console.log(`History entries: ${project.history.length}`);
  if (project.escalation) {
    console.log(`Escalation status: ${project.escalation.status}`);
  }

  return project;
}

module.exports = { runPipeline };
