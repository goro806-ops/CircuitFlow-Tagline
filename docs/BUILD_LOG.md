# CircuitFlow Build Log

## 2026-10-24 – Multi-agent foundation

- Shared Project State
- SpecAgent, ArchitectureAgent, ComponentAgent, SchematicAgent
- Confidence/risk aggregation + Human Escalation
- Classic linear orchestrator

---

## 2026-10-24 – LangGraph + Checkpointing

- Real StateGraph
- MemorySaver checkpointer
- Project state persisted to `data/projects/*.json`

---

## 2026-10-24 – PCBLayoutAgent added (v1.2)

### What was added

- `src/agents/pcbLayoutAgent.js`
  - Estimates board size from form-factor + component count
  - Chooses 2 or 4 layers
  - Places MCU, power, sensors and other parts into simple regions
  - Records basic layout issues / DRC-style notes
  - Returns confidence + risk

- Integrated into both:
  - LangGraph orchestrator (v1.2)
  - Classic orchestrator (v0.5)

### Current full pipeline

```
SpecAgent
  → ArchitectureAgent
  → ComponentAgent
  → SchematicAgent
  → PCBLayoutAgent
  → Risk Aggregation
  → Human Escalation (if needed)
  → Persist project to disk
```

### How to test

```bash
npm install
npm run agents:example
```

You should now also see PCB size, layer count and placement count in the final summary.

### Next planned steps
1. Start replacing rule-based logic with real LLM calls
2. Add revision loops (Reviewer agents that can send work back)
3. Optional: SqliteSaver for durable graph checkpoints
4. Expose the pipeline via an API endpoint
