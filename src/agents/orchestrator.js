/**
 * Simple Orchestrator (v0)
 * Runs a linear pipeline of agents for the first working slice.
 * Later this will be replaced / extended with LangGraph for full control,
 * branching, revision loops, and human-in-the-loop interrupts.
 */

const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");

/**
 * Run the current minimal pipeline:
 * SpecAgent → ArchitectureAgent
 */
async function runPipeline(userPrompt) {
  let project = createEmptyProject(userPrompt);

  console.log("\n=== CircuitFlow Orchestrator (v0) ===");
  console.log(`Project ID: ${project.project_id}`);
  console.log(`User prompt: "${userPrompt}"\n`);

  // 1. SpecAgent
  console.log("→ Running SpecAgent...");
  const specResult = runSpecAgent(project);
  project = specResult.project;
  console.log(`   Confidence: ${specResult.confidence.toFixed(2)} | ${specResult.summary}`);
  console.log("   Parsed constraints:", JSON.stringify(project.user_intent.parsed_constraints, null, 2));

  // 2. ArchitectureAgent
  console.log("\n→ Running ArchitectureAgent...");
  const archResult = runArchitectureAgent(project);
  project = archResult.project;
  console.log(`   Confidence: ${archResult.confidence.toFixed(2)} | ${archResult.summary}`);
  console.log("   Architecture blocks:");
  project.architecture.blocks.forEach(b => {
    console.log(`     - ${b.name}: ${b.part_family}`);
  });

  // For now we stop here. Later we will continue to Component → Schematic → etc.
  project.status = "in_progress";
  addHistory(project, "Orchestrator", "pipeline_complete_v0", {
    agents_run: ["SpecAgent", "ArchitectureAgent"]
  });

  console.log("\n=== Pipeline finished (v0) ===");
  console.log(`Final status: ${project.status}`);
  console.log(`History entries: ${project.history.length}`);

  return project;
}

module.exports = { runPipeline };
