# CircuitFlow Build Log

## 2026-10-24 – Multi-agent foundation started

- Shared Project State (`state.js`)
- SpecAgent
- ArchitectureAgent
- Simple Orchestrator + CLI runner

---

## 2026-10-24 – ComponentAgent added

- First-pass BOM generation from architecture
- Cost estimation + target cost checking
- Pipeline: Spec → Architecture → Component

---

## 2026-10-24 – Confidence / Risk + Human Escalation

- `risk.js` – aggregates confidence & risk from all agents
- `humanEscalationAgent.js` – creates structured briefing for senior engineer
- Orchestrator decides whether to escalate

---

## 2026-10-24 – SchematicAgent added

### What was added

- `src/agents/schematicAgent.js`  
  Generates a simplified first-pass schematic representation (component list + nets).  
  Creates basic power nets, I2C bus for sensors, and a few standard passives.  
  Reports issues (e.g. too many sensors on one bus, power concerns for wearables).

- Orchestrator updated to **v0.4**

### Current full pipeline

```
SpecAgent
    ↓
ArchitectureAgent
    ↓
ComponentAgent
    ↓
SchematicAgent
    ↓
Risk Aggregation
    ↓
Human Escalation (if needed)
```

### How to test

```bash
node src/agents/run.js "Bluetooth Low Energy wearable tracker with 6-axis IMU, battery powered, under $15 BOM"
```

### Next planned steps
1. Move the orchestrator to LangGraph (real control flow, branching, revision loops)
2. Start replacing rule-based logic with LLM + tool calling
3. Add PCBLayoutAgent (even if very basic)
4. Connect live distributor pricing
