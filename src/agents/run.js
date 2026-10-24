/**
 * CLI entry point for the CircuitFlow multi-agent pipeline.
 *
 * Usage:
 *   node src/agents/run.js "Your hardware idea here"
 *   node src/agents/run.js --load proj_xxxxx
 *
 * USE_CLASSIC=1 forces the old linear orchestrator.
 */

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--load" && args[1]) {
    try {
      const { loadProject } = require("./langgraphOrchestrator");
      const project = loadProject(args[1]);
      console.log("\n=== Loaded Project ===");
      console.log(JSON.stringify({
        project_id: project.project_id,
        status: project.status,
        constraints: project.user_intent?.parsed_constraints,
        architecture_mcu: project.architecture?.mcu_family,
        bom_estimate: project.bom?.estimated_total,
        schematic_components: project.schematic?.components?.length,
        pcb: project.pcb ? {
          size_mm: `${project.pcb.outline.width_mm}×${project.pcb.outline.height_mm}`,
          layers: project.pcb.layers,
          placements: project.pcb.placements?.length
        } : null,
        needs_human: !!project.escalation,
        history_length: project.history?.length
      }, null, 2));
      return;
    } catch (err) {
      console.error("Failed to load project:", err.message);
      process.exit(1);
    }
  }

  const prompt = args.join(" ") ||
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
        console.warn("LangGraph orchestrator not available. Falling back to classic.");
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
      pcb: project.pcb ? {
        size_mm: `${project.pcb.outline.width_mm}×${project.pcb.outline.height_mm}`,
        layers: project.pcb.layers,
        placements: project.pcb.placements?.length,
        issues: project.pcb.issues?.length
      } : null,
      needs_human: !!project.escalation,
      history_length: project.history.length,
      thread_id: project._thread_id || null
    }, null, 2));

    if (project.project_id) {
      console.log(`\nProject saved under: data/projects/${project.project_id}.json`);
    }

  } catch (err) {
    console.error("\nPipeline failed:", err);
    process.exit(1);
  }
}

main();
