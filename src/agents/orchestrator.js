/**
 * Classic linear Orchestrator (v0.5)
 * Kept as fallback. Supports async SpecAgent.
 */

const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { runSchematicAgent } = require("./schematicAgent");
const { runPCBLayoutAgent } = require("./pcbLayoutAgent");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

async function runPipeline(userPrompt) {
  let project = createEmptyProject(userPrompt);
  const agentResults = [];

  console.log("\n=== CircuitFlow Classic Orchestrator (v0.5) ===");
  console.log(`Project ID: ${project.project_id}`);
  console.log(`User prompt: "${userPrompt}"\n`);

  console.log("→ Running SpecAgent...");
  let result = await runSpecAgent(project);
  project = result.project;
  agentResults.push({
    agent: "SpecAgent",
    confidence: result.confidence,
    risk_level: result.risk_level,
    summary: result.summary
  });
  console.log(`   Confidence: ${result.confidence.toFixed(2)} | Risk: ${result.risk_level}`);
  console.log(`   ${result.summary}`);

  const syncSteps = [
    { name: "ArchitectureAgent", fn: runArchitectureAgent },
    { name: "ComponentAgent", fn: runComponentAgent },
    { name: "SchematicAgent", fn: runSchematicAgent },
    { name: "PCBLayoutAgent", fn: runPCBLayoutAgent }
  ];

  for (const step of syncSteps) {
    console.log(`→ Running ${step.name}...`);
    result = step.fn(project);
    project = result.project;
    agentResults.push({
      agent: step.name,
      confidence: result.confidence,
      risk_level: result.risk_level,
      summary: result.summary
    });
    console.log(`   Confidence: ${result.confidence.toFixed(2)} | Risk: ${result.risk_level}`);
    console.log(`   ${result.summary}`);
  }

  console.log("\n→ Aggregating confidence & risk...");
  const aggregation = aggregateRisk(agentResults);
  console.log(`   Overall confidence: ${aggregation.overall_confidence}`);
  console.log(`   Overall risk:       ${aggregation.overall_risk}`);
  console.log(`   Needs human:        ${aggregation.needs_human}`);
  aggregation.reasons.forEach(r => console.log(`     - ${r}`));

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

  addHistory(project, "Orchestrator", "pipeline_complete_v0.5", {
    agents_run: agentResults.map(r => r.agent),
    overall_confidence: aggregation.overall_confidence,
    overall_risk: aggregation.overall_risk,
    needs_human: aggregation.needs_human
  });

  console.log("\n=== Pipeline finished (classic v0.5) ===");
  console.log(`Final status: ${project.status}`);
  console.log(`History entries: ${project.history.length}`);

  return project;
}

module.exports = { runPipeline };
