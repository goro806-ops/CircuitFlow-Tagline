# CircuitFlow Multi-Agent System

**Status: v1.8**

---

## Pipeline

1. SpecAgent → ArchitectureAgent → ComponentAgent (pricing)
2. SchematicAgent (pin-aware) → PCBLayoutAgent
3. FirmwareAgent → EnclosureAgent
4. Reviewers + revision loops
5. Risk → Human escalation
6. Exports: JSON, OpenSCAD, **STL**, **KiCad sch/pcb**

---

## Quick start

```bash
npm install
npm run agents:example
npm start
```

### Auth

```bash
# API key only
curl -X POST localhost:3000/api/agents/auth/register -H 'Content-Type: application/json' -d '{"name":"alice"}'

# Email + password
curl -X POST localhost:3000/api/agents/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"alice","email":"a@example.com","password":"secret12"}'

curl -X POST localhost:3000/api/agents/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"secret12"}'
# → { token: "tok_..." }
```

### Exports

```
GET /api/agents/projects/:id/export          # full JSON
GET /api/agents/projects/:id/enclosure.scad
GET /api/agents/projects/:id/enclosure.stl   # server-generated STL
GET /api/agents/projects/:id/kicad           # bundle
GET /api/agents/projects/:id/kicad.sch
GET /api/agents/projects/:id/kicad.pcb
```

### Live pricing env

```bash
export DIGIKEY_CLIENT_ID=...
export DIGIKEY_CLIENT_SECRET=...
export MOUSER_API_KEY=...
export NEXAR_TOKEN=...   # or OCTOPART_API_KEY
export OPENAI_API_KEY=...
```

---

## Source map

| Path | Role |
|------|------|
| `src/agents/auth.js` | Register / login / API keys / sessions |
| `src/agents/pricing.js` | Mock + DigiKey + Mouser + Octopart |
| `src/agents/exportStl.js` | ASCII STL generator |
| `src/agents/exportKicad.js` | KiCad sch/pcb exporter |
| `src/agents/langgraphOrchestrator.js` | Orchestrator |
| `src/agents/api.js` | HTTP API |

---

## Honest limits

- KiCad export uses **placeholder footprints** – assign real ones in KiCad
- STL is a **simple enclosure shell**, not a full product assembly
- User store is **JSON files** – fine for demo / small teams, not large multi-tenant SaaS
- No Google/GitHub OAuth yet
