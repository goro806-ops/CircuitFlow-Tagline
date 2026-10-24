/**
 * Smoke test for the multi-agent pipeline (rule-based, no LLM required).
 * Run: node tests/agents.smoke.test.js
 */

async function main() {
  const prompt =
    "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM";

  let runPipeline;
  try {
    ({ runPipeline } = require("../src/agents/langgraphOrchestrator"));
  } catch (err) {
    console.warn("LangGraph unavailable, using classic orchestrator:", err.message);
    ({ runPipeline } = require("../src/agents/orchestrator"));
  }

  console.log("Running agents smoke test...");
  const project = await runPipeline(prompt);

  const checks = [
    ["project_id", !!project.project_id],
    ["constraints", !!project.user_intent?.parsed_constraints],
    ["architecture", !!project.architecture],
    ["bom", !!project.bom?.line_items?.length],
    ["schematic", !!project.schematic],
    ["pcb", !!project.pcb],
    ["firmware", !!project.firmware],
    ["enclosure", !!project.enclosure],
    ["history", project.history?.length > 0]
  ];

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? "OK" : "FAIL"}  ${name}`);
    if (!ok) failed++;
  }

  if (failed) {
    console.error(`\nSmoke test failed: ${failed} check(s)`);
    process.exit(1);
  }

  console.log("\nSmoke test passed.");
  console.log(`Project: ${project.project_id}  status=${project.status}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
