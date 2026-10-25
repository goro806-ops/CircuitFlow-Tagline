/**
 * Multi-agent HTTP API – /api/agents  (v1.6)
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
          prompt: data.user_intent?.raw_text?.slice(0, 120),
          needs_human: data.status === "needs_human" || !!data.escalation,
          bom_total: data.bom?.estimated_total || null
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

function loadProjectFile(id) {
  const filePath = path.join(PROJECTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    const err = new Error(`Project not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return { filePath, project: JSON.parse(fs.readFileSync(filePath, "utf8")) };
}

function saveProjectFile(project) {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const filePath = path.join(PROJECTS_DIR, `${project.project_id}.json`);
  project.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), "utf8");
  return filePath;
}

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
        bom_source: project.bom?.source,
        priced_items: project.bom?.priced_items,
        schematic_components: project.schematic?.components?.length,
        pcb: project.pcb
          ? {
              size_mm: `${project.pcb.outline.width_mm}x${project.pcb.outline.height_mm}`,
              layers: project.pcb.layers,
              placements: project.pcb.placements?.length
            }
          : null,
        firmware_modules: project.firmware?.modules?.length,
        enclosure: project.enclosure?.outer_mm,
        reviews: project.reviews?.length || 0,
        needs_human: !!project.escalation || project.status === "needs_human"
      },
      project
    });
  } catch (err) {
    console.error("[api/agents/run]", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/projects", (req, res) => {
  try {
    res.json({ success: true, projects: listSavedProjects() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id", (req, res) => {
  try {
    const { project } = loadProjectFile(req.params.id);
    res.json({ success: true, project });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/export", (req, res) => {
  try {
    const { project } = loadProjectFile(req.params.id);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${project.project_id}.json"`
    );
    res.send(JSON.stringify(project, null, 2));
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.post("/projects/:id/review", (req, res) => {
  try {
    const { decision, comments, reviewed_by } = req.body || {};
    const allowed = ["approved", "changes_requested", "rejected"];
    if (!allowed.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: `decision must be one of: ${allowed.join(", ")}`
      });
    }

    const { project } = loadProjectFile(req.params.id);

    if (!project.escalation) {
      project.escalation = {
        project_id: project.project_id,
        status: "manual_review",
        summary: { reasons_for_escalation: ["Manual review submitted via API"] }
      };
    }

    project.escalation.human_decision = decision;
    project.escalation.human_comments = comments || null;
    project.escalation.reviewed_by = reviewed_by || "anonymous";
    project.escalation.reviewed_at = new Date().toISOString();
    project.escalation.status =
      decision === "approved" ? "human_approved" : decision === "rejected" ? "human_rejected" : "human_changes_requested";

    if (decision === "approved") project.status = "approved";
    else if (decision === "rejected") project.status = "failed";
    else project.status = "in_progress";

    project.history = project.history || [];
    project.history.push({
      timestamp: new Date().toISOString(),
      agent: "HumanReviewer",
      action: "human_decision",
      details: { decision, reviewed_by: project.escalation.reviewed_by }
    });

    saveProjectFile(project);

    res.json({
      success: true,
      project_id: project.project_id,
      status: project.status,
      escalation: project.escalation
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/status", (req, res) => {
  let llm = false;
  let checkpointer = "unknown";
  let pricingLive = false;
  try {
    llm = require("./llm").isLLMEnabled();
  } catch (_) {}
  try {
    checkpointer = require("./checkpointer").createCheckpointer().type;
  } catch (_) {
    checkpointer = "memory";
  }
  try {
    pricingLive = require("./pricing").isLivePricingEnabled();
  } catch (_) {}

  res.json({
    success: true,
    version: "1.6",
    foundation: "complete",
    orchestrator: "langgraph-v1.5+",
    llm_enabled: llm,
    pricing: {
      mode: pricingLive ? "live" : "mock",
      note: pricingLive
        ? "Real distributor keys detected"
        : "Using mock catalogue – set DIGIKEY_CLIENT_ID / MOUSER_API_KEY / OCTOPART_API_KEY for live"
    },
    checkpointer,
    agents: [
      "SpecAgent",
      "ArchitectureAgent",
      "ComponentAgent",
      "SchematicAgent",
      "PCBLayoutAgent",
      "FirmwareAgent",
      "EnclosureAgent",
      "SchematicReviewer",
      "LayoutReviewer",
      "PowerThermalReviewer",
      "DFMReviewer",
      "LLMReviewer (optional)",
      "HumanEscalationAgent"
    ],
    endpoints: {
      run: "POST /api/agents/run",
      projects: "GET /api/agents/projects",
      project: "GET /api/agents/projects/:id",
      export: "GET /api/agents/projects/:id/export",
      review: "POST /api/agents/projects/:id/review",
      status: "GET /api/agents/status",
      ui: "/agents.html",
      docs: "docs/AGENTS.md"
    }
  });
});

module.exports = router;
