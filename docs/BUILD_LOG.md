# CircuitFlow Build Log

## 2026-10-24 – Core multi-agent pipeline

- Spec, Architecture, Component, Schematic, PCBLayout agents
- Risk aggregation + Human Escalation
- LangGraph orchestrator + MemorySaver checkpointing
- Project state saved to `data/projects/*.json`

---

## 2026-10-24 – Reviewer agents + revision loops (v1.3)

### What was added

- `src/agents/reviewers.js`
  - **SchematicReviewer** – checks for missing power/ground, sparse nets, generation issues
  - **LayoutReviewer** – checks placement count, board size, density, generation issues
  - Combined `runReviewers()` that decides whether revision is needed and which stage to re-run

- LangGraph orchestrator updated to **v1.3**:
  - After PCB → Reviewers
  - If reviewers request changes → revision loop (max 2 times)
  - Can send back to Schematic or PCB stage
  - Then continues to Risk → Escalation / Finish

### Current graph

```
START
  → spec → architecture → component → schematic → pcb
  → review
       ├─ needs revision (and under limit) → inc_revision → schematic or pcb → review ...
       └─ ok or max revisions reached → risk
            ├─ needs human → escalate → finish → END
            └─ ok → finish → END
```

### How to test

```bash
npm install
npm run agents:example
```

Watch the log for “Reviewers → …” and possible “Revision loop #1 …” messages.

### Next planned steps
1. Introduce real LLM calls into SpecAgent / ComponentAgent / Reviewers
2. Add more specialized reviewers (PowerThermal, DFM, Firmware…)
3. Expose the pipeline via an HTTP API
4. Optional: durable SqliteSaver checkpoints
