/**
 * Multi-agent HTTP API – /api/agents  (v1.10)
 */

const express = require("express");
const {
  optionalAuth,
  registerUser,
  loginUser,
  getGoogleAuthUrl,
  loginWithGoogleCode,
  isGoogleOAuthConfigured,
  getGoogleRedirectUri
} = require("./auth");
const store = require("./store");
const { generateEnclosureStl } = require("./exportStl");
const { generateKicadProject } = require("./exportKicad");

const router = express.Router();

router.use(optionalAuth);

async function loadProjectOrThrow(id) {
  const project = await store.loadProject(id);
  if (!project) {
    const err = new Error(`Project not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return project;
}

function assertOwner(req, project) {
  if (req.user && project.owner_id && project.owner_id !== req.user.user_id) {
    const err = new Error("Not your project");
    err.status = 403;
    throw err;
  }
}

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const user = await registerUser({ name, email, password });
    res.json({
      success: true,
      user,
      usage: {
        api_key: "Authorization: Bearer <api_key>",
        login: email && password ? "POST /api/agents/auth/login" : null
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "email and password required" });
    }
    const result = await loginUser(email, password);
    res.json({ success: true, ...result, usage: "Authorization: Bearer <token>" });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/auth/google", (req, res) => {
  try {
    const url = getGoogleAuthUrl(req);
    res.redirect(url);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return res.redirect(`/agents.html?auth_error=${encodeURIComponent(String(error))}`);
    }
    const result = await loginWithGoogleCode(code, req);
    const q = new URLSearchParams({
      token: result.token,
      name: result.user.name || "",
      email: result.user.email || ""
    });
    res.redirect(`/agents.html?google_auth=1&${q.toString()}`);
  } catch (err) {
    console.error("[auth/google/callback]", err);
    res.redirect(`/agents.html?auth_error=${encodeURIComponent(err.message || "oauth_failed")}`);
  }
});

router.get("/auth/google/status", (req, res) => {
  res.json({
    success: true,
    configured: isGoogleOAuthConfigured(),
    redirect_uri_hint: getGoogleRedirectUri(req),
    start_url: "/api/agents/auth/google"
  });
});

router.get("/llm/test", async (req, res) => {
  try {
    const { getLLMInfo, callLLM } = require("./llm");
    const info = getLLMInfo();
    if (!info.enabled) {
      return res.json({ success: false, error: "No LLM provider configured", llm: info });
    }
    const text = await callLLM(
      "You are a test assistant. Reply with ONLY valid JSON.",
      'Return exactly: {"ok": true, "provider_check": "pass"}',
      { json: true, temperature: 0 }
    );
    res.json({
      success: Boolean(text),
      llm: info,
      raw_response: text,
      message: text
        ? "LLM call succeeded – pipeline can use this provider"
        : "LLM call returned empty – check Render logs for [LLM] error lines"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

    if (req.user) {
      project.owner_id = req.user.user_id;
      project.owner_name = req.user.name;
    }
    await store.saveProject(project);

    res.json({
      success: true,
      project_id: project.project_id,
      status: project.status,
      owner_id: project.owner_id || null,
      summary: {
        constraints: project.user_intent?.parsed_constraints,
        architecture_mcu: project.architecture?.mcu_family,
        bom_estimate: project.bom?.estimated_total,
        bom_source: project.bom?.source,
        priced_items: project.bom?.priced_items,
        schematic_components: project.schematic?.components?.length,
        schematic_pin_aware: !!project.schematic?.pin_maps_used,
        pcb: project.pcb
          ? {
              size_mm: `${project.pcb.outline.width_mm}x${project.pcb.outline.height_mm}`,
              layers: project.pcb.layers,
              placements: project.pcb.placements?.length
            }
          : null,
        firmware_modules: project.firmware?.modules?.length,
        enclosure: project.enclosure?.outer_mm,
        enclosure_has_openscad: !!project.enclosure?.export?.openscad,
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

router.get("/projects", async (req, res) => {
  try {
    const userId = req.user ? req.user.user_id : null;
    const projects = await store.listProjects(userId);
    res.json({ success: true, projects, filtered_by_owner: !!userId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    res.json({ success: true, project });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/export", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${project.project_id}.json"`);
    res.send(JSON.stringify(project, null, 2));
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/enclosure.scad", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    const scad = project.enclosure?.export?.openscad;
    if (!scad) return res.status(404).json({ success: false, error: "No OpenSCAD export" });
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${project.project_id}_enclosure.scad"`);
    res.send(scad);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/enclosure.stl", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    if (!project.enclosure) return res.status(404).json({ success: false, error: "No enclosure" });
    const stl = generateEnclosureStl(project.enclosure);
    res.setHeader("Content-Type", "application/sla");
    res.setHeader("Content-Disposition", `attachment; filename="${project.project_id}_enclosure.stl"`);
    res.send(stl);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/kicad", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    if (!project.schematic || !project.pcb) {
      return res.status(404).json({ success: false, error: "Need schematic and PCB" });
    }
    res.json({ success: true, kicad: generateKicadProject(project) });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/kicad.sch", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    const bundle = generateKicadProject(project);
    const name = Object.keys(bundle.files).find(f => f.endsWith(".kicad_sch"));
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(bundle.files[name]);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/projects/:id/kicad.pcb", async (req, res) => {
  try {
    const project = await loadProjectOrThrow(req.params.id);
    assertOwner(req, project);
    const bundle = generateKicadProject(project);
    const name = Object.keys(bundle.files).find(f => f.endsWith(".kicad_pcb"));
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(bundle.files[name]);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.post("/projects/:id/review", async (req, res) => {
  try {
    const { decision, comments, reviewed_by } = req.body || {};
    const allowed = ["approved", "changes_requested", "rejected"];
    if (!allowed.includes(decision)) {
      return res.status(400).json({ success: false, error: `decision must be one of: ${allowed.join(", ")}` });
    }
    const project = await loadProjectOrThrow(req.params.id);
    if (!project.escalation) {
      project.escalation = {
        project_id: project.project_id,
        status: "manual_review",
        summary: { reasons_for_escalation: ["Manual review via API"] }
      };
    }
    project.escalation.human_decision = decision;
    project.escalation.human_comments = comments || null;
    project.escalation.reviewed_by = reviewed_by || (req.user && req.user.name) || "anonymous";
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
    await store.saveProject(project);
    res.json({ success: true, project_id: project.project_id, status: project.status, escalation: project.escalation });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.get("/status", async (req, res) => {
  let llmInfo = { enabled: false, provider: null, model: null };
  let checkpointer = "memory";
  let pricingLive = false;
  let liveProviders = [];
  try {
    llmInfo = require("./llm").getLLMInfo();
  } catch (_) {}
  try {
    checkpointer = require("./checkpointer").createCheckpointer().type;
  } catch (_) {}
  try {
    const pricing = require("./pricing");
    pricingLive = pricing.isLivePricingEnabled();
    liveProviders = pricing.getLiveProviders();
  } catch (_) {}

  try {
    await store.initPostgres();
  } catch (_) {}

  res.json({
    success: true,
    version: "1.10.0",
    foundation: "complete",
    orchestrator: "langgraph",
    llm_enabled: llmInfo.enabled,
    llm: llmInfo,
    store: store.getStoreInfo(),
    pricing: {
      mode: pricingLive ? "live" : "mock",
      providers: liveProviders
    },
    auth: {
      modes: ["api_key", "password", "google_oauth"],
      google_configured: isGoogleOAuthConfigured(),
      google_start: "/api/agents/auth/google",
      register: "POST /api/agents/auth/register",
      login: "POST /api/agents/auth/login"
    },
    exports: ["json", "openscad", "stl", "kicad_sch", "kicad_pcb"],
    checkpointer,
    endpoints: {
      google: "GET /api/agents/auth/google",
      run: "POST /api/agents/run",
      status: "GET /api/agents/status",
      llm_test: "GET /api/agents/llm/test",
      ui: "/agents.html"
    }
  });
});

module.exports = router;
