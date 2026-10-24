/**
 * LangGraph-based Orchestrator (v1)
 *
 * Replaces the simple linear orchestrator with a proper StateGraph.
 * Each agent is a node. After the design agents we run risk aggregation
 * and conditionally escalate to a human.
 *
 * Requires:
 *   npm install @langchain/langgraph @langchain/core
 */

const { StateGraph, END, START, Annotation } = require("@langchain/langgraph");
const { createEmptyProject, addHistory } = require("./state");
const { runSpecAgent } = require("./specAgent");
const { runArchitectureAgent } = require("./architectureAgent");
const { runComponentAgent } = require("./componentAgent");
const { runSchematicAgent } = require("./schematicAgent");
const { aggregateRisk } = require("./risk");
const { runHumanEscalationAgent } = require("./humanEscalationAgent");

// ---------------------------------------------------------------
// Graph State
// ---------------------------------------------------------------
const GraphState = Annotation.Root({
  // The full CircuitFlow project (digital twin)
  project: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),

  // Results from each agent so far
  agentResults: Annotation({
    reducer: (current, update) => {
      if (!update) return current || [];
      if (Array.isArray(update)) return [...(current || []), ...update];
      return [...(current || []), update];
    },
    default: () => []
  }),

  // Aggregation result
  aggregation: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),

  // Simple log messages for the CLI
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

  addHistory(project, "Orchestrator", "pipeline_complete_langgraph_v1", {
    agents_run: (state.agentResults || []).map(r => r.agent),
    overall_confidence: state.aggregation?.overall_confidence,
    overall_risk: state.aggregation?.overall_risk,
    needs_human: state.aggregation?.needs_human
  });

  return {
    project,
    logs: [`Pipeline finished. Final status: ${project.status}`]
  };
}

// ---------------------------------------------------------------
// Conditional edge: after risk → escalate or finish
// ---------------------------------------------------------------
function shouldEscalate(state) {
  if (state.aggregation && state.aggregation.needs_human) {
    return "escalate";
  }
  return "finish";
}

// ---------------------------------------------------------------
// Build the graph
// ---------------------------------------------------------------
function buildGraph() {
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

  return graph.compile();
}

// ---------------------------------------------------------------
// Public API (same shape as the old orchestrator)
// ---------------------------------------------------------------
async function runPipeline(userPrompt) {
  console.log("\n=== CircuitFlow LangGraph Orchestrator (v1) ===");
  console.log(`User prompt: "${userPrompt}"\n`);

  const project = createEmptyProject(userPrompt);
  console.log(`Project ID: ${project.project_id}`);

  const app = buildGraph();

  const finalState = await app.invoke({
    project,
    agentResults: [],
    aggregation: null,
    logs: []
  });

  // Print collected logs
  console.log("\n--- Agent Log ---");
  (finalState.logs || []).forEach(line => console.log(line));

  console.log("\n=== Pipeline finished (LangGraph v1) ===");
  console.log(`Final status: ${finalState.project.status}`);
  console.log(`History entries: ${finalState.project.history.length}`);
  if (finalState.project.escalation) {
    console.log(`Escalation status: ${finalState.project.escalation.status}`);
  }

  return finalState.project;
}

module.exports = {
  runPipeline,
  buildGraph
};
