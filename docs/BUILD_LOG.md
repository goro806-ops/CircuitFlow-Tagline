# CircuitFlow Build Log

## Multi-agent system (current)

### Design agents
- SpecAgent (rule-based + optional LLM)
- ArchitectureAgent
- ComponentAgent
- SchematicAgent
- PCBLayoutAgent

### Reviewer agents
- SchematicReviewer
- LayoutReviewer
- PowerThermalReviewer
- DFMReviewer

### Infrastructure
- LangGraph orchestrator with revision loops (max 2)
- Risk aggregation + Human Escalation
- MemorySaver checkpointing
- Project persistence to `data/projects/*.json`
- HTTP API under `/api/agents`

---

## 2026-10-24 – LLM + more reviewers + API

### 1. Optional LLM layer (`src/agents/llm.js`)
- If `OPENAI_API_KEY` (or `CIRCUITFLOW_OPENAI_KEY`) is set, SpecAgent uses the model to extract constraints
- Otherwise falls back to deterministic rules
- Easy to extend to other agents later

### 2. Extra reviewers
- **PowerThermalReviewer** – wearable + ESP32, missing power parts, GPS battery drain
- **DFMReviewer** – density vs layers, small boards, module/RF stackup hints

### 3. HTTP API (`src/agents/api.js`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agents/run` | Run full pipeline `{ "prompt": "..." }` |
| GET | `/api/agents/projects` | List saved projects |
| GET | `/api/agents/projects/:id` | Load one project |
| GET | `/api/agents/status` | Capability / health info |

### How to run

```bash
npm install

# CLI
npm run agents:example

# API server
npm start
# then:
curl -X POST http://localhost:3000/api/agents/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"BLE wearable tracker with IMU, battery, under $15"}'
```

### Enable LLM (optional)

```bash
export OPENAI_API_KEY=sk-...
npm run agents:example
```

### Next possible steps
- Wire LLM into ComponentAgent / Reviewers
- Add FirmwareAgent + EnclosureAgent
- SqliteSaver for durable graph checkpoints
- Frontend UI that calls `/api/agents/run`
