# CircuitFlow Build Log

## 2026-10-24 – Multi-agent foundation started

### What was added

- `src/agents/state.js`  
  Shared Project State factory + helpers for history and reviews.

- `src/agents/specAgent.js`  
  First real agent. Parses natural language into structured constraints.

- `src/agents/architectureAgent.js`  
  Proposes a high-level system architecture.

- `src/agents/orchestrator.js`  
  Simple linear orchestrator.

- `src/agents/run.js`  
  CLI entry point.

---

## 2026-10-24 – ComponentAgent added

- `src/agents/componentAgent.js`  
  Builds a first-pass BOM from architecture + small internal knowledge base.  
  Estimates cost range and checks against user target.

- Pipeline became: **Spec → Architecture → Component**

---

## 2026-10-24 – Confidence / Risk + Human Escalation

### What was added

- `src/agents/risk.js`  
  Aggregates confidence scores and risk levels from all agents.  
  Decides whether the project needs human review using simple but clear rules.

- `src/agents/humanEscalationAgent.js`  
  Placeholder Human Escalation agent.  
  When triggered, it creates a structured briefing containing:
  - User request
  - Overall confidence & risk
  - Reasons for escalation
  - Key artifacts (constraints, architecture summary, BOM preview)
  - Results from every agent
  - Empty fields for the human decision

- Orchestrator (v0.3) now:
  1. Runs Spec → Architecture → Component
  2. Aggregates confidence & risk
  3. Either continues or escalates to human review
  4. Sets project.status = `needs_human` when escalated

### Current decision rules (can be tuned)
- Overall confidence < 0.55 → escalate
- Any agent reports `high` risk → escalate
- ComponentAgent reports high risk (usually cost target missed) → escalate

### How to test

```bash
node src/agents/run.js "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM"
```

Try also a harder target to force escalation:

```bash
node src/agents/run.js "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $6 BOM"
```

### Next planned steps
1. Add a basic SchematicAgent
2. Move the orchestrator to LangGraph
3. Start replacing rule-based logic with LLM + tool calling
4. Connect live distributor pricing
