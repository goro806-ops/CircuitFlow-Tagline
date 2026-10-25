# CircuitFlow Multi-Agent System

**Status: v1.6** (foundation complete + pricing layer)  
This is the entry document for the multi-agent pipeline. You should not need to reverse-engineer the design from chat history.

---

## What it does

Turns a natural-language hardware idea into a structured project state:

1. **SpecAgent** – constraints (optional LLM)
2. **ArchitectureAgent** – MCU / power / wireless blocks
3. **ComponentAgent** – first-pass BOM + pricing enrichment (optional LLM)
4. **SchematicAgent** – simplified netlist
5. **PCBLayoutAgent** – board size, layers, placements
6. **FirmwareAgent** – firmware scaffold
7. **EnclosureAgent** – parametric enclosure
8. **Reviewers** – Schematic, Layout, PowerThermal, DFM (+ optional LLM)
9. **Revision loops** – up to 2 automatic rework cycles (improved targeting)
10. **Risk aggregation** → **Human escalation** when needed
11. **Persistence** – JSON under `data/projects/` + LangGraph checkpoints
12. **Pricing service** – mock catalogue today, live distributor-ready interface

---

## Quick start

```bash
npm install
npm run test:agents          # smoke test
npm run agents:example       # CLI
npm start                    # server
```

| Surface | URL / command |
|---------|----------------|
| Web UI | http://localhost:3000/agents.html |
| Run pipeline | `POST /api/agents/run` `{ "prompt": "..." }` |
| List projects | `GET /api/agents/projects` |
| Load project | `GET /api/agents/projects/:id` |
| Human decision | `POST /api/agents/projects/:id/review` |
| Export JSON | `GET /api/agents/projects/:id/export` |
| Status | `GET /api/agents/status` |

Optional LLM:

```bash
export OPENAI_API_KEY=sk-...
```

Optional checkpoint DB path:

```bash
export CIRCUITFLOW_CHECKPOINT_DB=./data/checkpoints.sqlite
```

Future live pricing (interface already present):

```bash
export DIGIKEY_CLIENT_ID=...
export MOUSER_API_KEY=...
export OCTOPART_API_KEY=...
```

---

## Source map

| Path | Role |
|------|------|
| `src/agents/state.js` | Project state (digital twin) |
| `src/agents/*Agent.js` | Design agents |
| `src/agents/reviewers.js` | AI expert reviewers |
| `src/agents/risk.js` | Confidence / risk aggregation |
| `src/agents/humanEscalationAgent.js` | Human brief packaging |
| `src/agents/pricing.js` | Part pricing & availability service |
| `src/agents/langgraphOrchestrator.js` | Main LangGraph orchestrator |
| `src/agents/orchestrator.js` | Classic fallback pipeline |
| `src/agents/llm.js` | Optional OpenAI helpers |
| `src/agents/checkpointer.js` | Sqlite / Memory checkpointer |
| `src/agents/api.js` | HTTP routes |
| `public/agents.html` | Multi-agent UI |
| `docs/VISION_AND_ARCHITECTURE.md` | Product / architecture vision |
| `docs/BUILD_LOG.md` | Build history |

---

## Human-in-the-loop

When overall risk is high or confidence is low, `status` becomes `needs_human` and `escalation` is filled.

Record a human decision:

```bash
curl -X POST http://localhost:3000/api/agents/projects/PROJECT_ID/review \
  -H "Content-Type: application/json" \
  -d '{"decision":"approved","comments":"OK to proceed","reviewed_by":"alice"}'
```

`decision`: `approved` | `changes_requested` | `rejected`

---

## What is intentionally not done yet

- Pin-accurate / production KiCad schematics and autorouting
- Live distributor API calls (interface ready; keys not yet wired)
- Multi-user auth and cloud DB
- Full mechanical CAD (STEP/STL export)

These are **next product phases**, not missing pieces of the current foundation.

---

## Philosophy (unchanged)

- Specialized agents, not one monolith
- Shared project state as source of truth
- AI reviewers first; humans only for hard cases
- Start narrow and real; improve agents from feedback
