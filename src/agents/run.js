/**
 * CLI entry point for the CircuitFlow multi-agent pipeline.
 *
 * Usage:
 *   node src/agents/run.js "Your hardware idea here"
 *
 * By default uses the new LangGraph orchestrator.
 * Fallback to the classic linear orchestrator with:
 *   USE_CLASSIC=1 node src/agents/run.js "..."
 */

async function main() {
  const prompt = process.argv.slice(2).join(" ") ||
    "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM";

  const useClassic = process.env.USE_CLASSIC === "1";

  try {
    let runPipeline;

    if (useClassic) {
      console.log("(Using classic linear orchestrator)");
      ({ runPipeline } = require("./orchestrator"));
    } else {
      try {
        ({ runPipeline } = require("./langgraphOrchestrator"));
      } catch (err) {
        console.warn("LangGraph orchestrator not available (missing dependencies?). Falling back to classic.");
        console.warn("Run: npm install @langchain/langgraph @langchain/core\n");
        ({ runPipeline } = require("./orchestrator"));
      }
    }

    const project = await runPipeline(prompt);

    console.log("\n----- Final Project State (summary) -----");
    console.log(JSON.stringify({
      project_id: project.project_id,
      status: project.status,
      constraints: project.user_intent.parsed_constraints,
      architecture_mcu: project.architecture?.mcu_family,
      bom_estimate: project.bom?.estimated_total,
      schematic_components: project.schematic?.components?.length,
      schematic_nets: project.schematic?.nets?.length,
      needs_human: !!project.escalation,
      history_length: project.history.length
    }, null, 2));

  } catch (err) {
    console.error("\nPipeline failed:", err);
    process.exit(1);
  }
}

main();
