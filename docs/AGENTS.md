# CircuitFlow Multi-Agent System

**Status: v1.7**  
Entry document for the multi-agent pipeline.

---

## What it does

1. **SpecAgent** – constraints (optional LLM)
2. **ArchitectureAgent** – MCU / power / wireless blocks
3. **ComponentAgent** – BOM + pricing (mock or live DigiKey/Mouser)
4. **SchematicAgent** – pin-aware netlist
5. **PCBLayoutAgent** – board size, layers, placements
6. **FirmwareAgent** – firmware scaffold
7. **EnclosureAgent** – parametric enclosure + OpenSCAD export
8. **Reviewers** – Schematic, Layout, PowerThermal, DFM (+ optional LLM)
9. **Revision loops** – up to 2 automatic rework cycles
10. **Risk aggregation** → **Human escalation**
11. **Persistence** + LangGraph checkpoints
12. **Optional API-key auth** for project ownership

---

## Quick start

```bash
npm install
npm run test:agents
npm run agents:example
npm start
```

| Surface | URL / command |
|---------|----------------|
| Web UI | http://localhost:3000/agents.html |
| Register user | `POST /api/agents/auth/register` `{ "name": "alice" }` |
| Run pipeline | `POST /api/agents/run` `{ "prompt": "..." }` |
| List projects | `GET /api/agents/projects` |
| Load project | `GET /api/agents/projects/:id` |
| Enclosure SCAD | `GET /api/agents/projects/:id/enclosure.scad` |
| Human decision | `POST /api/agents/projects/:id/review` |
| Export JSON | `GET /api/agents/projects/:id/export` |
| Status | `GET /api/agents/status` |

### Optional env

```bash
export OPENAI_API_KEY=sk-...
export DIGIKEY_CLIENT_ID=...
export DIGIKEY_CLIENT_SECRET=...
export MOUSER_API_KEY=...
export CIRCUITFLOW_CHECKPOINT_DB=./data/checkpoints.sqlite
```

---

## Auth (optional)

```bash
curl -X POST http://localhost:3000/api/agents/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"alice"}'
# → { api_key: "cf_..." }

curl -X POST http://localhost:3000/api/agents/run \
  -H "Authorization: Bearer cf_..." \
  -H "Content-Type: application/json" \
  -d '{"prompt":"BLE wearable with IMU under $15"}'
```

---

## Source map

| Path | Role |
|------|------|
| `src/agents/state.js` | Digital twin |
| `src/agents/*Agent.js` | Design agents |
| `src/agents/reviewers.js` | AI expert reviewers |
| `src/agents/pricing.js` | Mock + live distributor pricing |
| `src/agents/auth.js` | Optional API-key auth |
| `src/agents/langgraphOrchestrator.js` | Main orchestrator |
| `src/agents/api.js` | HTTP routes |
| `public/agents.html` | UI |
| `docs/VISION_AND_ARCHITECTURE.md` | Vision |
| `docs/BUILD_LOG.md` | History |

---

## Intentionally still future

- Full password / OAuth accounts + multi-tenant DB
- Server-side STEP/STL generation
- Production KiCad project with footprints & routing
- Broader live distributor coverage (Octopart fully wired)

---

## Philosophy

- Specialized agents, not one monolith
- Shared project state as source of truth
- AI reviewers first; humans only for hard cases
- Start narrow and real; improve from feedback
