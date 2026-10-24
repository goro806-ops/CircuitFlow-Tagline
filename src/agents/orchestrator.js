/**
 * Simple Orchestrator (v0.2)
 * Runs a linear pipeline of agents for the first working slice.
 * Later this will be replaced / extended with LangGraph for full control,
 * branching, revision loops, and human-in-the-loop interrupts.
 */

const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");

/**
 * Run the current minimal pipeline:
 * SpecAgent → ArchitectureAgent → ComponentAgent
 */
async function runPipeline(userPrompt) {
  let project = createEmptyProject(userPrompt);

  console.log("\n=== CircuitFlow Orchestrator (v0.2) ===");
  console.log(`Project ID: ${project.project_id}`);
  console.log(`User prompt: "${userPrompt}"\n`);

  // 1. SpecAgent
  console.log("→ Running SpecAgent...");
  const specResult = runSpecAgent(project);
  project = specResult.project;
  console.log(`   Confidence: ${specResult.confidence.toFixed(2)} | Risk: ${specResult.risk_level}`);
  console.log(`   ${specResult.summary}`);
  console.log("   Parsed constraints:", JSON.stringify(project.user_intent.parsed_constraints, null, 2));

  // 2. ArchitectureAgent
  console.log("\n→ Running ArchitectureAgent...");
  const archResult = runArchitectureAgent(project);
  project = archResult.project;
  console.log(`   Confidence: ${archResult.confidence.toFixed(2)} | Risk: ${archResult.risk_level}`);
  console.log(`   ${archResult.summary}`);
  console.log("   Architecture blocks:");
  project.architecture.blocks.forEach(b => {
    console.log(`     - ${b.name}: ${b.part_family}`);
  });

  // 3. ComponentAgent
  console.log("\n→ Running ComponentAgent...");
  const compResult = runComponentAgent(project);
  project = compResult.project;
  console.log(`   Confidence: ${compResult.confidence.toFixed(2)} | Risk: ${compResult.risk_level}`);
  console.log(`   ${compResult.summary}`);
  console.log("   BOM line items:");
  project.bom.line_items.forEach(item => {
    console.log(`     - ${item.ref}: ${item.mpn} (${item.description}) @ ~$${item.unit_price_usd}`);
  });
  console.log(`   Estimated total: $${project.bom.estimated_total.low} – $${project.bom.estimated_total.high}`);
  if (project.bom.target_cost) {
    console.log(`   Target cost: $${project.bom.target_cost} | Meets target: ${project.bom.meets_target}`);
  }

  // For now we stop here. Later we continue to Schematic → etc.
  project.status = "in_progress";
  addHistory(project, "Orchestrator", "pipeline_complete_v0.2", {
    agents_run: ["SpecAgent", "ArchitectureAgent", "ComponentAgent"]
  });

  console.log("\n=== Pipeline finished (v0.2) ===");
  console.log(`Final status: ${project.status}`);
  console.log(`History entries: ${project.history.length}`);

  return project;
}

module.exports = { runPipeline };
