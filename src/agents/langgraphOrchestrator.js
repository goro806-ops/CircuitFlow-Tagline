/**
 * LangGraph Orchestrator (v1.10.1)
 * - recursionLimit 50
 * - Hard stop after MAX_REVISIONS
 * - Saves via store (Postgres or JSON)
 * - Includes MultiBoard, SPICE, FactoryJig, ConsumerGuide, LaunchQuotes
 */

const fs = require("fs");
const path = require("path");
const { StateGraph, END, START, Annotation } = require("@langchain/langgraph");
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
const { createCheckpointer, memoryCheckpointer } = require("./checkpointer");
const store = require("./store");

// Optional new agents (soft-load)
function tryRequire(p) { try { return require(p); } catch { return null; } }
const multiBoardMod = tryRequire("./multiBoardAgent");
const spiceMod = tryRequire("./spiceThermalsAgent");
const jigMod = tryRequire("./factoryJigAgent");
const guideMod = tryRequire("./consumerGuideAgent");
const launchMod = tryRequire("./launchQuotesAgent");

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");
const MAX_REVISIONS = 2;
const RECURSION_LIMIT = 50;

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}
function saveProjectToDisk(project) {
  ensureProjectsDir();
  const filePath = path.join(PROJECTS_DIR, `${project.project_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), "utf8");
  return filePath;
}
async function saveProject(project) {
  try {
    await store.saveProject(project);
    return `store:${store.getStoreInfo().backend}`;
  } catch (err) {
    console.warn("[orchestrator] store.saveProject failed, falling back to disk:", err.message);
    return saveProjectToDisk(project);
  }
}
async function loadProject(projectId) {
  const fromStore = await store.loadProject(projectId);
  if (fromStore) return fromStore;
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Project not found: ${projectId}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const GraphState = Annotation.Root({
  project: Annotation({ reducer: (c, u) => u ?? c, default: () => null }),
  agentResults: Annotation({
    reducer: (c, u) => {
      if (!u) return c || [];
      if (Array.isArray(u)) return [...(c || []), ...u];
      return [...(c || []), u];
    },
    default: () => []
  }),
  aggregation: Annotation({ reducer: (c, u) => u ?? c, default: () => null }),
  revisionCount: Annotation({ reducer: (c, u) => (u === undefined ? c : u), default: () => 0 }),
  revisionTarget: Annotation({ reducer: (c, u) => (u === undefined ? c : u), default: () => null }),
  logs: Annotation({
    reducer: (c, u) => [...(c || []), ...(Array.isArray(u) ? u : [u])],
    default: () => []
  })
});

async function specNode(state) {
  const r = await runSpecAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "SpecAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`SpecAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}
function architectureNode(state) {
  const r = runArchitectureAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "ArchitectureAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`ArchitectureAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}
async function componentNode(state) {
  const r = await runComponentAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "ComponentAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`ComponentAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}
function schematicNode(state) {
  const r = runSchematicAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "SchematicAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`SchematicAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}
function pcbNode(state) {
  const r = runPCBLayoutAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "PCBLayoutAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`PCBLayoutAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}
function firmwareNode(state) {
  const r = runFirmwareAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "FirmwareAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`FirmwareAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}
function enclosureNode(state) {
  const r = runEnclosureAgent(state.project);
  return {
    project: r.project,
    agentResults: { agent: "EnclosureAgent", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`EnclosureAgent → ${r.confidence.toFixed(2)} | ${r.summary}`]
  };
}

async function wrapNewAgent(name, mod, exportName, state) {
  if (!mod || !mod[exportName]) {
    return { project: state.project, agentResults: { agent: name, confidence: 0.5, risk_level: "low", summary: `${name} skipped` }, logs: [`${name} → skipped (not loaded)`] };
  }
  const project = state.project;
  const flat = {
    ...project,
    bom: project.bom || project.components || [],
    bomMeta: project.bomMeta || {},
    schematic: project.schematic || {},
    architecture: project.architecture || {},
    constraints: project.constraints || { prompt: project.user_prompt },
    enclosure: project.enclosure || {},
    pcb: project.pcb || {},
    reviews: project.reviews || []
  };
  const out = await mod[exportName](flat);
  for (const k of ["bom","bomMeta","schematic","pcb","pcbLayout","spiceThermals","multiBoard","factoryJig","consumerGuide","launchQuotes","enclosure","reviews","firmware"]) {
    if (out[k] !== undefined) project[k] = out[k];
  }
  return { project, agentResults: { agent: name, confidence: 0.7, risk_level: "low", summary: `${name} completed` }, logs: [`${name} → completed`] };
}
async function multiBoardNode(state) { return wrapNewAgent("MultiBoardAgent", multiBoardMod, "runMultiBoardAgent", state); }
async function spiceNode(state) { return wrapNewAgent("SpiceThermalsAgent", spiceMod, "runSpiceThermalsAgent", state); }
async function factoryJigNode(state) { return wrapNewAgent("FactoryJigAgent", jigMod, "runFactoryJigAgent", state); }
async function consumerGuideNode(state) { return wrapNewAgent("ConsumerGuideAgent", guideMod, "runConsumerGuideAgent", state); }
async function launchQuotesNode(state) { return wrapNewAgent("LaunchQuotesAgent", launchMod, "runLaunchQuotesAgent", state); }

async function reviewNode(state) {
  const r = await runReviewers(state.project);
  const atCap = (state.revisionCount || 0) >= MAX_REVISIONS;
  const target = atCap || !r.needsRevision ? null : r.revisionTarget;
  if (atCap && r.needsRevision) {
    return {
      project: r.project,
      revisionTarget: null,
      agentResults: { agent: "Reviewers", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary + " (revision cap reached)" },
      logs: [`Reviewers → ${r.summary}`, `Revision cap (${MAX_REVISIONS}) reached – proceeding to risk`]
    };
  }
  return {
    project: r.project,
    revisionTarget: target,
    agentResults: { agent: "Reviewers", confidence: r.confidence, risk_level: r.risk_level, summary: r.summary },
    logs: [`Reviewers → ${r.summary}`]
  };
}
function shouldRevise(state) {
  if (!state.revisionTarget) return "risk";
  if ((state.revisionCount || 0) >= MAX_REVISIONS) return "risk";
  if (state.revisionTarget === "architecture") return "revise_architecture";
  if (state.revisionTarget === "schematic") return "revise_schematic";
  if (state.revisionTarget === "pcb") return "revise_pcb";
  return "risk";
}
function incrementRevision(state) {
  const count = (state.revisionCount || 0) + 1;
  addHistory(state.project, "Orchestrator", "revision_loop", { count, target: state.revisionTarget });
  return { revisionCount: count, logs: [`Revision loop #${count} (target: ${state.revisionTarget})`] };
}
function riskNode(state) {
  const aggregation = aggregateRisk(state.agentResults || []);
  return {
    aggregation,
    logs: [
      `Risk → conf ${aggregation.overall_confidence} | risk ${aggregation.overall_risk} | human: ${aggregation.needs_human}`,
      ...aggregation.reasons.map(r => `  - ${r}`)
    ]
  };
}
function shouldEscalate(state) {
  return state.aggregation?.needs_human ? "escalate" : "finish";
}
function escalationNode(state) {
  const r = runHumanEscalationAgent(state.project, state.aggregation, state.agentResults || []);
  return { project: r.project, logs: [r.message] };
}
async function finishNode(state) {
  const project = state.project;
  if (project.status !== "needs_human") {
    project.status = "completed";
    addHistory(project, "Orchestrator", "pipeline_completed", {
      overall_confidence: state.aggregation?.overall_confidence,
      overall_risk: state.aggregation?.overall_risk,
      revisions: state.revisionCount || 0
    });
  }
  addHistory(project, "Orchestrator", "pipeline_complete_langgraph", {
    agents_run: (state.agentResults || []).map(r => r.agent),
    overall_confidence: state.aggregation?.overall_confidence,
    overall_risk: state.aggregation?.overall_risk,
    needs_human: state.aggregation?.needs_human,
    revision_count: state.revisionCount || 0
  });
  const saved = await saveProject(project);
  return { project, logs: [`Pipeline finished. Status: ${project.status}`, `Saved: ${saved}`] };
}

function buildGraph(checkpointer = null) {
  const graph = new StateGraph(GraphState)
    .addNode("spec", specNode)
    .addNode("architecture", architectureNode)
    .addNode("multiBoard", multiBoardNode)
    .addNode("component", componentNode)
    .addNode("schematic", schematicNode)
    .addNode("pcb", pcbNode)
    .addNode("spice", spiceNode)
    .addNode("firmware", firmwareNode)
    .addNode("enclosure", enclosureNode)
    .addNode("factoryJig", factoryJigNode)
    .addNode("consumerGuide", consumerGuideNode)
    .addNode("launchQuotes", launchQuotesNode)
    .addNode("review", reviewNode)
    .addNode("inc_revision", incrementRevision)
    .addNode("risk", riskNode)
    .addNode("escalate", escalationNode)
    .addNode("finish", finishNode)

    .addEdge(START, "spec")
    .addEdge("spec", "architecture")
    .addEdge("architecture", "multiBoard")
    .addEdge("multiBoard", "component")
    .addEdge("component", "schematic")
    .addEdge("schematic", "pcb")
    .addEdge("pcb", "spice")
    .addEdge("spice", "firmware")
    .addEdge("firmware", "enclosure")
    .addEdge("enclosure", "factoryJig")
    .addEdge("factoryJig", "consumerGuide")
    .addEdge("consumerGuide", "launchQuotes")
    .addEdge("launchQuotes", "review")

    .addConditionalEdges("review", shouldRevise, {
      revise_architecture: "inc_revision",
      revise_schematic: "inc_revision",
      revise_pcb: "inc_revision",
      risk: "risk"
    })
    .addConditionalEdges("inc_revision", (state) => {
      if (state.revisionTarget === "architecture") return "architecture";
      if (state.revisionTarget === "schematic") return "schematic";
      if (state.revisionTarget === "pcb") return "pcb";
      return "risk";
    }, { architecture: "architecture", schematic: "schematic", pcb: "pcb", risk: "risk" })
    .addConditionalEdges("risk", shouldEscalate, { escalate: "escalate", finish: "finish" })
    .addEdge("escalate", "finish")
    .addEdge("finish", END);

  if (checkpointer) return graph.compile({ checkpointer });
  return graph.compile();
}

async function runPipeline(userPrompt, options = {}) {
  const threadId = options.threadId || `thread_${Date.now().toString(36)}`;
  console.log("\n=== CircuitFlow LangGraph Orchestrator ===");
  console.log(`User prompt: "${userPrompt}"`);
  console.log(`Thread ID:   ${threadId}\n`);
  const project = createEmptyProject(userPrompt);
  console.log(`Project ID:  ${project.project_id}`);
  let checkpoint = createCheckpointer();
  if (!(await checkpoint.ready)) checkpoint = memoryCheckpointer();
  const { checkpointer, type } = checkpoint;
  const app = buildGraph(checkpointer);
  const finalState = await app.invoke(
    { project, agentResults: [], aggregation: null, revisionCount: 0, revisionTarget: null, logs: [] },
    { configurable: { thread_id: threadId }, recursionLimit: RECURSION_LIMIT }
  );
  console.log("\n--- Agent Log ---");
  (finalState.logs || []).forEach(line => console.log(line));
  console.log("\n=== Pipeline finished ===");
  console.log(`Checkpointer: ${type}`);
  console.log(`Final status: ${finalState.project.status}`);
  finalState.project._thread_id = threadId;
  finalState.project._checkpointer = type;
  return finalState.project;
}

module.exports = { runPipeline, buildGraph, loadProject, saveProjectToDisk };
