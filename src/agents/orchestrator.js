/**
 * Classic linear Orchestrator (v0.6)
 * Fallback when LangGraph is unavailable. Mirrors the main pipeline.
 */

const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { runSchematicAgent } = require("./schematicAgent");
const { runPCBLayoutAgent } = require("./pcbLayoutAgent");
const { runFirmwareAgent } = require("./firmwareAgent");
const { runEnclosureAgent } = require("./enclosureAgent");
const { runReviewers } = require("./reviewers");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

async function runPipeline(userPrompt) {
  let project = createEmptyProject(userPrompt);
  const agentResults = [];

  console.log("\n=== CircuitFlow Classic Orchestrator (v0.6) ===");
  console.log(`Project ID: ${project.project_id}`);
  console.log(`User prompt: "${userPrompt}"\n`);

  async function step(name, fn, isAsync = false) {
    console.log(`→ Running ${name}...`);
    const result = isAsync ? await fn(project) : fn(project);
    project = result.project;
    agentResults.push({
      agent: name,
      confidence: result.confidence,
      risk_level: result.risk_level,
      summary: result.summary
    });
    console.log(`   Confidence: ${result.confidence.toFixed(2)} | Risk: ${result.risk_level}`);
    console.log(`   ${result.summary}`);
  }

  await step("SpecAgent", runSpecAgent, true);
  await step("ArchitectureAgent", runArchitectureAgent);
  await step("ComponentAgent", runComponentAgent, true);
  await step("SchematicAgent", runSchematicAgent);
  await step("PCBLayoutAgent", runPCBLayoutAgent);
  await step("FirmwareAgent", runFirmwareAgent);
  await step("EnclosureAgent", runEnclosureAgent);

  console.log("\n→ Running Reviewers...");
  const reviewResult = await runReviewers(project);
  project = reviewResult.project;
  agentResults.push({
    agent: "Reviewers",
    confidence: reviewResult.confidence,
    risk_level: reviewResult.risk_level,
    summary: reviewResult.summary
  });
  console.log(`   ${reviewResult.summary}`);

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

  addHistory(project, "Orchestrator", "pipeline_complete_v0.6", {
    agents_run: agentResults.map(r => r.agent),
    overall_confidence: aggregation.overall_confidence,
    overall_risk: aggregation.overall_risk,
    needs_human: aggregation.needs_human
  });

  // Persist if possible
  try {
    const { saveProjectToDisk } = require("./langgraphOrchestrator");
    saveProjectToDisk(project);
    console.log(`Project saved under: data/projects/${project.project_id}.json`);
  } catch (_) {
    /* optional */
  }

  console.log("\n=== Pipeline finished (classic v0.6) ===");
  console.log(`Final status: ${project.status}`);
  console.log(`History entries: ${project.history.length}`);

  return project;
}

module.exports = { runPipeline };
