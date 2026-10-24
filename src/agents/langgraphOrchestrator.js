/**
 * LangGraph Orchestrator (v1.3)
 * With Reviewer agents + simple revision loops.
 *
 * Pipeline:
 *   Spec → Architecture → Component → Schematic → PCB
 *        → Reviewers → (revise Schematic/PCB if needed, max 2 times)
 *        → Risk → (Escalate | Finish)
 */

const fs = require("fs");
const path = require("path");
const { StateGraph, END, START, Annotation, MemorySaver } = require("@langchain/langgraph");
const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { runSchematicAgent } = require("./schematicAgent");
const { runPCBLayoutAgent } = require("./pcbLayoutAgent");
const { runReviewers } = require("./reviewers");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");
const MAX_REVISIONS = 2;

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

function saveProjectToDisk(project) {
  ensureProjectsDir();
  const filePath = path.join(PROJECTS_DIR, `${project.project_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), "utf8");
  return filePath;
}

function loadProjectFromDisk(projectId) {
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
  revisionTarget: Annotation({ reducer: (c, u) => u ?? c, default: () => null }),
  logs: Annotation({
    reducer: (c, u) => [...(c || []), ...(Array.isArray(u) ? u : [u])],
    default: () => []
  })
});

// ---------- Design nodes ----------
function specNode(state) {
  const r = runSpecAgent(state.project);
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

function componentNode(state) {
  const r = runComponentAgent(state.project);
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

// ---------- Review + revision ----------
function reviewNode(state) {
  const r = runReviewers(state.project);
  return {
    project: r.project,
    revisionTarget: r.needsRevision ? r.revisionTarget : null,
    agentResults: {
      agent: "Reviewers",
      confidence: r.confidence,
      risk_level: r.risk_level,
      summary: r.summary
    },
    logs: [`Reviewers → ${r.summary}`]
  };
}

function shouldRevise(state) {
  if (!state.revisionTarget) return "risk";
  if ((state.revisionCount || 0) >= MAX_REVISIONS) {
    return "risk"; // give up revising and continue to risk/escalation
  }
  if (state.revisionTarget === "schematic") return "revise_schematic";
  if (state.revisionTarget === "pcb") return "revise_pcb";
  return "risk";
}

function incrementRevision(state) {
  const count = (state.revisionCount || 0) + 1;
  addHistory(state.project, "Orchestrator", "revision_loop", {
    count,
    target: state.revisionTarget
  });
  return {
    revisionCount: count,
    logs: [`Revision loop #${count} (target: ${state.revisionTarget})`]
  };
}

// ---------- Risk & finish ----------
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

function finishNode(state) {
  const project = state.project;
  if (project.status !== "needs_human") {
    project.status = "in_progress";
    addHistory(project, "Orchestrator", "auto_approved_for_now", {
      overall_confidence: state.aggregation?.overall_confidence,
      overall_risk: state.aggregation?.overall_risk,
      revisions: state.revisionCount || 0
    });
  }

  addHistory(project, "Orchestrator", "pipeline_complete_langgraph_v1.3", {
    agents_run: (state.agentResults || []).map(r => r.agent),
    overall_confidence: state.aggregation?.overall_confidence,
    overall_risk: state.aggregation?.overall_risk,
    needs_human: state.aggregation?.needs_human,
    revision_count: state.revisionCount || 0
  });

  const savedPath = saveProjectToDisk(project);
  return {
    project,
    logs: [`Pipeline finished. Status: ${project.status}`, `Saved: ${savedPath}`]
  };
}

// ---------- Build graph ----------
function buildGraph(checkpointer = null) {
  const graph = new StateGraph(GraphState)
    .addNode("spec", specNode)
    .addNode("architecture", architectureNode)
    .addNode("component", componentNode)
    .addNode("schematic", schematicNode)
    .addNode("pcb", pcbNode)
    .addNode("review", reviewNode)
    .addNode("inc_revision", incrementRevision)
    .addNode("risk", riskNode)
    .addNode("escalate", escalationNode)
    .addNode("finish", finishNode)

    .addEdge(START, "spec")
    .addEdge("spec", "architecture")
    .addEdge("architecture", "component")
    .addEdge("component", "schematic")
    .addEdge("schematic", "pcb")
    .addEdge("pcb", "review")

    .addConditionalEdges("review", shouldRevise, {
      revise_schematic: "inc_revision",
      revise_pcb: "inc_revision",
      risk: "risk"
    })

    // After incrementing, go back to the appropriate design stage
    .addConditionalEdges("inc_revision", (state) => {
      if (state.revisionTarget === "schematic") return "schematic";
      if (state.revisionTarget === "pcb") return "pcb";
      return "risk";
    }, {
      schematic: "schematic",
      pcb: "pcb",
      risk: "risk"
    })

    .addConditionalEdges("risk", shouldEscalate, {
      escalate: "escalate",
      finish: "finish"
    })
    .addEdge("escalate", "finish")
    .addEdge("finish", END);

  if (checkpointer) return graph.compile({ checkpointer });
  return graph.compile();
}

async function runPipeline(userPrompt, options = {}) {
  const threadId = options.threadId || `thread_${Date.now().toString(36)}`;

  console.log("\n=== CircuitFlow LangGraph Orchestrator (v1.3) ===");
  console.log(`User prompt: "${userPrompt}"`);
  console.log(`Thread ID:   ${threadId}\n`);

  const project = createEmptyProject(userPrompt);
  console.log(`Project ID:  ${project.project_id}`);

  const checkpointer = new MemorySaver();
  const app = buildGraph(checkpointer);

  const finalState = await app.invoke(
    {
      project,
      agentResults: [],
      aggregation: null,
      revisionCount: 0,
      revisionTarget: null,
      logs: []
    },
    { configurable: { thread_id: threadId } }
  );

  console.log("\n--- Agent Log ---");
  (finalState.logs || []).forEach(line => console.log(line));

  console.log("\n=== Pipeline finished (LangGraph v1.3) ===");
  console.log(`Final status: ${finalState.project.status}`);
  console.log(`Revisions:    ${finalState.revisionCount || 0}`);
  console.log(`History:      ${finalState.project.history.length} entries`);
  if (finalState.project.escalation) {
    console.log(`Escalation:   ${finalState.project.escalation.status}`);
  }

  finalState.project._thread_id = threadId;
  return finalState.project;
}

function loadProject(projectId) {
  return loadProjectFromDisk(projectId);
}

module.exports = { runPipeline, buildGraph, loadProject, saveProjectToDisk };
