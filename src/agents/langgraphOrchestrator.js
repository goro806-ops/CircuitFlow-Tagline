/**
 * LangGraph-based Orchestrator (v1.1) with Checkpointing & Persistence
 *
 * - Uses LangGraph StateGraph
 * - Checkpoints graph state with MemorySaver (in-memory, per process)
 * - Also saves the final Project State to disk as JSON for durability
 *
 * Requires:
 *   npm install @langchain/langgraph @langchain/core
 */

const fs = require("fs");
const path = require("path");
const { StateGraph, END, START, Annotation, MemorySaver } = require("@langchain/langgraph");
const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { runSchematicAgent } = require("./schematicAgent");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

// ---------------------------------------------------------------
// Persistence helpers (project JSON on disk)
// ---------------------------------------------------------------
const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

function saveProjectToDisk(project) {
  ensureProjectsDir();
  const filePath = path.join(PROJECTS_DIR, `${project.project_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), "utf8");
  return filePath;
}

function loadProjectFromDisk(projectId) {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Project not found on disk: ${projectId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// ---------------------------------------------------------------
// Graph State
// ---------------------------------------------------------------
const GraphState = Annotation.Root({
  project: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),
  agentResults: Annotation({
    reducer: (current, update) => {
      if (!update) return current || [];
      if (Array.isArray(update)) return [...(current || []), ...update];
      return [...(current || []), update];
    },
    default: () => []
  }),
  aggregation: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),
  logs: Annotation({
    reducer: (current, update) => [...(current || []), ...(Array.isArray(update) ? update : [update])],
    default: () => []
  })
});

// ---------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------
function specNode(state) {
  const result = runSpecAgent(state.project);
  return {
    project: result.project,
    agentResults: {
      agent: "SpecAgent",
      confidence: result.confidence,
      risk_level: result.risk_level,
      summary: result.summary
    },
    logs: [`SpecAgent → confidence ${result.confidence.toFixed(2)} | ${result.summary}`]
  };
}

function architectureNode(state) {
  const result = runArchitectureAgent(state.project);
  return {
    project: result.project,
    agentResults: {
      agent: "ArchitectureAgent",
      confidence: result.confidence,
      risk_level: result.risk_level,
      summary: result.summary
    },
    logs: [`ArchitectureAgent → confidence ${result.confidence.toFixed(2)} | ${result.summary}`]
  };
}

function componentNode(state) {
  const result = runComponentAgent(state.project);
  return {
    project: result.project,
    agentResults: {
      agent: "ComponentAgent",
      confidence: result.confidence,
      risk_level: result.risk_level,
      summary: result.summary
    },
    logs: [`ComponentAgent → confidence ${result.confidence.toFixed(2)} | ${result.summary}`]
  };
}

function schematicNode(state) {
  const result = runSchematicAgent(state.project);
  return {
    project: result.project,
    agentResults: {
      agent: "SchematicAgent",
      confidence: result.confidence,
      risk_level: result.risk_level,
      summary: result.summary
    },
    logs: [`SchematicAgent → confidence ${result.confidence.toFixed(2)} | ${result.summary}`]
  };
}

function riskNode(state) {
  const aggregation = aggregateRisk(state.agentResults || []);
  return {
    aggregation,
    logs: [
      `Risk aggregation → confidence ${aggregation.overall_confidence} | risk ${aggregation.overall_risk} | needs_human: ${aggregation.needs_human}`,
      ...aggregation.reasons.map(r => `  - ${r}`)
    ]
  };
}

function escalationNode(state) {
  const result = runHumanEscalationAgent(
    state.project,
    state.aggregation,
    state.agentResults || []
  );
  return {
    project: result.project,
    logs: [result.message]
  };
}

function finishNode(state) {
  const project = state.project;
  if (project.status !== "needs_human") {
    project.status = "in_progress";
    addHistory(project, "Orchestrator", "auto_approved_for_now", {
      overall_confidence: state.aggregation?.overall_confidence,
      overall_risk: state.aggregation?.overall_risk
    });
  }

  addHistory(project, "Orchestrator", "pipeline_complete_langgraph_v1.1", {
    agents_run: (state.agentResults || []).map(r => r.agent),
    overall_confidence: state.aggregation?.overall_confidence,
    overall_risk: state.aggregation?.overall_risk,
    needs_human: state.aggregation?.needs_human
  });

  // Persist final project state to disk
  const savedPath = saveProjectToDisk(project);

  return {
    project,
    logs: [
      `Pipeline finished. Final status: ${project.status}`,
      `Project state saved to: ${savedPath}`
    ]
  };
}

function shouldEscalate(state) {
  if (state.aggregation && state.aggregation.needs_human) {
    return "escalate";
  }
  return "finish";
}

// ---------------------------------------------------------------
// Build the graph with checkpointer
// ---------------------------------------------------------------
function buildGraph(checkpointer = null) {
  const graph = new StateGraph(GraphState)
    .addNode("spec", specNode)
    .addNode("architecture", architectureNode)
    .addNode("component", componentNode)
    .addNode("schematic", schematicNode)
    .addNode("risk", riskNode)
    .addNode("escalate", escalationNode)
    .addNode("finish", finishNode)

    .addEdge(START, "spec")
    .addEdge("spec", "architecture")
    .addEdge("architecture", "component")
    .addEdge("component", "schematic")
    .addEdge("schematic", "risk")
    .addConditionalEdges("risk", shouldEscalate, {
      escalate: "escalate",
      finish: "finish"
    })
    .addEdge("escalate", "finish")
    .addEdge("finish", END);

  // Compile with optional checkpointer
  if (checkpointer) {
    return graph.compile({ checkpointer });
  }
  return graph.compile();
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

/**
 * Run a new pipeline with checkpointing enabled.
 * thread_id is used by the checkpointer so the run can be resumed later
 * (within the same process when using MemorySaver).
 */
async function runPipeline(userPrompt, options = {}) {
  const threadId = options.threadId || `thread_${Date.now().toString(36)}`;

  console.log("\n=== CircuitFlow LangGraph Orchestrator (v1.1) ===");
  console.log(`User prompt: "${userPrompt}"`);
  console.log(`Thread ID:   ${threadId}\n`);

  const project = createEmptyProject(userPrompt);
  console.log(`Project ID:  ${project.project_id}`);

  // In-memory checkpointer (survives for the lifetime of the process)
  const checkpointer = new MemorySaver();
  const app = buildGraph(checkpointer);

  const config = {
    configurable: {
      thread_id: threadId
    }
  };

  const finalState = await app.invoke(
    {
      project,
      agentResults: [],
      aggregation: null,
      logs: []
    },
    config
  );

  // Print collected logs
  console.log("\n--- Agent Log ---");
  (finalState.logs || []).forEach(line => console.log(line));

  console.log("\n=== Pipeline finished (LangGraph v1.1) ===");
  console.log(`Final status: ${finalState.project.status}`);
  console.log(`History entries: ${finalState.project.history.length}`);
  if (finalState.project.escalation) {
    console.log(`Escalation status: ${finalState.project.escalation.status}`);
  }

  // Attach thread id for reference
  finalState.project._thread_id = threadId;

  return finalState.project;
}

/**
 * Load a previously saved project from disk.
 */
function loadProject(projectId) {
  return loadProjectFromDisk(projectId);
}

module.exports = {
  runPipeline,
  buildGraph,
  loadProject,
  saveProjectToDisk
};
