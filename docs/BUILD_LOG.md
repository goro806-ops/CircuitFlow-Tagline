# CircuitFlow Build Log

## Foundation complete (v1.5 + finishing pass)

The multi-agent vertical slice is in place and usable end-to-end.

### Design agents
Spec (rules + optional LLM) → Architecture → Component (rules + optional LLM) → Schematic → PCB → Firmware → Enclosure

### Reviewers
Schematic, Layout, PowerThermal, DFM, optional LLMReviewer + revision loops (max 2)

### Infrastructure
- LangGraph orchestrator with conditional escalation
- SqliteSaver checkpoints when package installed, else MemorySaver
- Project JSON under `data/projects/`
- HTTP API `/api/agents/*`
- Web UI `/agents.html`
- Classic orchestrator parity (v0.6) as fallback
- Smoke test: `npm run test:agents`

### Run
```bash
npm install
npm run test:agents
npm run agents:example
npm start
# UI: http://localhost:3000/agents.html
```

### Optional LLM
```bash
export OPENAI_API_KEY=sk-...
```

### What “finished” means here
This is a **working foundation**, not a production EDA tool. Agents are still largely heuristic; LLM paths improve Spec/BOM/review when configured. Real autorouting, pin-accurate schematics, and live distributor APIs remain future work.

### Sensible future work (when you resume)
1. Live distributor pricing (DigiKey / Mouser / Octopart)
2. Stronger schematic/PCB generation (KiCad export)
3. Human review UI for `needs_human` projects
4. Auth + multi-user project store
