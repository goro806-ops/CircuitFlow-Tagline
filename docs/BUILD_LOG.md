# CircuitFlow Build Log

## 2026-10-24 – Multi-agent foundation

- Shared Project State
- SpecAgent, ArchitectureAgent, ComponentAgent, SchematicAgent
- Confidence/risk aggregation + Human Escalation
- Classic linear orchestrator

---

## 2026-10-24 – LangGraph migration (v1)

- Real StateGraph with nodes and conditional edges
- Pipeline: Spec → Architecture → Component → Schematic → Risk → (Escalate | Finish)

---

## 2026-10-24 – Checkpointing & Persistence (v1.1)

### What was added

1. **LangGraph Checkpointer (MemorySaver)**
   - Graph state is checkpointed under a `thread_id`
   - Allows inspection and (within the same process) resumption of a run
   - Foundation for future human-in-the-loop interrupts and time-travel

2. **Project State persistence to disk**
   - Final project is saved as JSON under `data/projects/<project_id>.json`
   - Survives process restarts
   - Can be loaded later with:
     ```bash
     node src/agents/run.js --load proj_xxxxx
     ```

3. **Updated CLI**
   - Shows `thread_id` and save path
   - Supports `--load <project_id>`

### How to run

```bash
npm install
npm run agents:example
```

After a run you will see something like:
```
Project state saved to: data/projects/proj_xxxx.json
```

Load it later:
```bash
node src/agents/run.js --load proj_xxxx
```

### Notes on persistence levels

| Layer                    | Scope                         | Survives process restart? |
|--------------------------|-------------------------------|---------------------------|
| MemorySaver (checkpointer) | Graph state for one thread   | No (in-memory only)      |
| `data/projects/*.json`   | Full Project State            | Yes                      |

For production we can later swap MemorySaver for SqliteSaver or PostgresSaver.

### Next planned steps
1. Start replacing rule-based logic with real LLM calls
2. Add PCBLayoutAgent
3. Add revision loops (Reviewer agents)
4. Optional: switch to SqliteSaver for durable graph checkpoints
