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
  Simple linear orchestrator (v0) that runs Spec → Architecture. Designed so it can later be replaced by a LangGraph graph with branching, revision loops, and human-in-the-loop.

- `src/agents/run.js`  
  CLI entry point to test the pipeline.

### How to run the first slice

```bash
node src/agents/run.js "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM"
```

### Next planned steps
1. Add ComponentAgent (BOM + basic part selection)
2. Introduce proper confidence / risk handling and a placeholder human-escalation path
3. Move the orchestrator to LangGraph for real control flow
4. Gradually replace rule-based logic with LLM + tool calling
