/**
 * Simple CLI entry point to test the multi-agent pipeline.
 * Usage:
 *   node src/agents/run.js "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM"
 */

const { runPipeline } = require("./orchestrator");

async function main() {
  const prompt = process.argv.slice(2).join(" ") ||
    "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM";

  try {
    const project = await runPipeline(prompt);

    console.log("\n----- Final Project State (summary) -----");
    console.log(JSON.stringify({
      project_id: project.project_id,
      status: project.status,
      constraints: project.user_intent.parsed_constraints,
      architecture: project.architecture,
      history_length: project.history.length
    }, null, 2));

  } catch (err) {
    console.error("Pipeline failed:", err);
    process.exit(1);
  }
}

main();
