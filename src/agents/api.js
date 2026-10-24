/**
 * Multi-agent HTTP API routes
 * Mounted under /api/agents
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

function listSavedProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), "utf8"));
        return {
          project_id: data.project_id,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
          prompt: data.user_intent?.raw_text?.slice(0, 120)
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * POST /api/agents/run
 * Body: { prompt: string }
 * Runs the full multi-agent pipeline and returns the project state.
 */
router.post("/run", async (req, res) => {
  try {
    const prompt = (req.body && req.body.prompt) || "";
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ success: false, error: "prompt (string) is required" });
    }

    let runPipeline;
    try {
      ({ runPipeline } = require("./langgraphOrchestrator"));
    } catch {
      ({ runPipeline } = require("./orchestrator"));
    }

    const project = await runPipeline(prompt);

    res.json({
      success: true,
      project_id: project.project_id,
      status: project.status,
      summary: {
        constraints: project.user_intent?.parsed_constraints,
        architecture_mcu: project.architecture?.mcu_family,
        bom_estimate: project.bom?.estimated_total,
        schematic_components: project.schematic?.components?.length,
        pcb: project.pcb
          ? {
              size_mm: `${project.pcb.outline.width_mm}x${project.pcb.outline.height_mm}`,
              layers: project.pcb.layers,
              placements: project.pcb.placements?.length
            }
          : null,
        reviews: project.reviews?.length || 0,
        needs_human: !!project.escalation
      },
      project
    });
  } catch (err) {
    console.error("[api/agents/run]", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/projects
 * List saved projects from disk.
 */
router.get("/projects", (req, res) => {
  try {
    const projects = listSavedProjects();
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/projects/:id
 * Load a full project by id.
 */
router.get("/projects/:id", (req, res) => {
  try {
    const { loadProject } = require("./langgraphOrchestrator");
    const project = loadProject(req.params.id);
    res.json({ success: true, project });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/status
 * Health / capability info.
 */
router.get("/status", (req, res) => {
  const { isLLMEnabled } = require("./llm");
  res.json({
    success: true,
    agents: [
      "SpecAgent",
      "ArchitectureAgent",
      "ComponentAgent",
      "SchematicAgent",
      "PCBLayoutAgent",
      "SchematicReviewer",
      "LayoutReviewer",
      "PowerThermalReviewer",
      "DFMReviewer",
      "HumanEscalationAgent"
    ],
    llm_enabled: isLLMEnabled(),
    orchestrator: "langgraph-v1.3"
  });
});

module.exports = router;
