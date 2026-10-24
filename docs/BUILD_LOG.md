# CircuitFlow Build Log

## 2026-10-24 – Multi-agent foundation started

- Shared Project State (`state.js`)
- SpecAgent, ArchitectureAgent
- Simple linear Orchestrator + CLI

---

## 2026-10-24 – ComponentAgent + SchematicAgent

- First-pass BOM generation
- First-pass schematic / netlist generation
- Confidence/risk aggregation
- Human escalation path

Pipeline became:
```
Spec → Architecture → Component → Schematic → Risk → (Escalate | Finish)
```

---

## 2026-10-24 – LangGraph Migration (v1)

### What changed

- New file: `src/agents/langgraphOrchestrator.js`
  - Real **LangGraph StateGraph**
  - Each agent is a proper graph node
  - Conditional edge after risk aggregation:
    - `needs_human === true` → HumanEscalationAgent
    - otherwise → finish
  - Shared graph state holds the full Project + agentResults + aggregation + logs

- `src/agents/run.js` updated
  - Uses LangGraph orchestrator by default
  - Falls back to classic orchestrator if LangGraph packages are missing
  - `USE_CLASSIC=1` forces the old linear orchestrator

- `package.json` updated with:
  - `@langchain/langgraph`
  - `@langchain/core`

### How to run

```bash
# Install the new dependencies first
npm install

# Run with LangGraph (default)
npm run agents:example

# Or with a custom prompt
node src/agents/run.js "Your idea here"

# Force classic orchestrator
npm run agents:classic
```

### Graph structure (v1)

```
START
  → spec
  → architecture
  → component
  → schematic
  → risk
       ├─ (needs human) → escalate → finish → END
       └─ (ok)          → finish → END
```

### Next planned steps
1. Add checkpointing / persistence (so long-running designs can pause & resume)
2. Introduce real LLM calls inside SpecAgent and ComponentAgent
3. Add PCBLayoutAgent
4. Add revision loops (Reviewer agents that can send work back)
5. Expose the graph via an API endpoint
