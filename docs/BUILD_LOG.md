# CircuitFlow Build Log

## 2026-10-24 – Multi-agent foundation started

### What was added

- `src/agents/state.js`  
  Shared Project State factory + helpers for history and reviews.

- `src/agents/specAgent.js`  
  First real agent. Parses natural language into structured constraints (cost, form factor, power, wireless, sensors, MCU preference). Still rule-based; ready to be upgraded to LLM later.

- `src/agents/architectureAgent.js`  
  Proposes a high-level block diagram / architecture from the parsed constraints.

- `src/agents/orchestrator.js`  
  Simple linear orchestrator that runs the current agent pipeline.

- `src/agents/run.js`  
  CLI entry point to test the pipeline.

### How to run

```bash
node src/agents/run.js "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM"
```

or

```bash
npm run agents:example
```

---

## 2026-10-24 – ComponentAgent added

### What was added

- `src/agents/componentAgent.js`  
  Selects concrete parts from a small internal knowledge base and builds a first-pass BOM.  
  Includes MCU, sensors, power management, and a passives budget.  
  Calculates estimated total cost range and checks against the user’s target cost.

- Orchestrator updated to run:  
  **SpecAgent → ArchitectureAgent → ComponentAgent**

### Current pipeline output includes
- Parsed constraints
- Proposed architecture (block diagram level)
- First-pass BOM with approximate prices and total cost range

### Next planned steps
1. Add basic confidence / risk aggregation and a placeholder human-escalation path
2. Add SchematicAgent (even if still very simple)
3. Move the orchestrator to LangGraph for real control flow, branching, and revision loops
4. Replace rule-based logic with LLM + tool calling (starting with SpecAgent and ComponentAgent)
5. Connect live distributor pricing (Octopart / DigiKey / Mouser)
