# CircuitFlow Build Log

## Current system (v1.4 + UI)

### Design agents
Spec, Architecture, Component, Schematic, PCB, Firmware, Enclosure

### Reviewers
Schematic, Layout, PowerThermal, DFM + revision loops

### Infrastructure
LangGraph, risk/escalation, MemorySaver, disk persistence, HTTP API

### Web UI
- **`/agents.html`** – Multi-agent designer UI
  - Prompt input + example chips
  - Runs `POST /api/agents/run`
  - Shows constraints, architecture, BOM, PCB, firmware, enclosure, reviews
  - Lists and reloads saved projects from disk

### How to use
```bash
npm install
npm start
# open http://localhost:3000/agents.html
```

CLI still works:
```bash
npm run agents:example
```

### Next ideas
- More LLM in ComponentAgent / Reviewers
- SqliteSaver durable checkpoints
- Polish legacy index.html to link to agents UI
