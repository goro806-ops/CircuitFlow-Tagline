# CircuitFlow Build Log

## Current multi-agent system (v1.4)

### Design agents
- SpecAgent (rules + optional LLM)
- ArchitectureAgent
- ComponentAgent
- SchematicAgent
- PCBLayoutAgent
- **FirmwareAgent** (scaffold)
- **EnclosureAgent** (parametric shell)

### Reviewers
- Schematic, Layout, PowerThermal, DFM

### Infrastructure
- LangGraph + revision loops + risk + human escalation
- Checkpointing (MemorySaver) + disk persistence
- HTTP API `/api/agents/*`

### Pipeline
```
Spec → Architecture → Component → Schematic → PCB
  → Firmware → Enclosure → Reviewers → (revise) → Risk → Escalate|Finish
```

### Run
```bash
npm install
npm run agents:example
npm start   # API on :3000
```

### Optional LLM
```bash
export OPENAI_API_KEY=sk-...
```

### Next ideas
- Simple web UI for `/api/agents/run`
- More LLM in ComponentAgent / Reviewers
- SqliteSaver durable checkpoints
