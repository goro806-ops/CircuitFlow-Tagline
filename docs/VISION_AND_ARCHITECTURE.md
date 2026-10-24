# CircuitFlow – Vision & Architecture (Detailed)

**Last updated:** October 2026  
This is the living source of truth for the product direction and technical architecture. Keep it updated as decisions evolve so we never lose context.

---

## 1. Core Vision

CircuitFlow turns a natural-language hardware idea into a complete, manufacturing-ready package:

- Electrical design (schematic + multi-layer PCB)
- Live BOM with supply-chain awareness
- Firmware scaffolding
- Parametric enclosure
- DFM / manufacturing files
- Pre-compliance and test guidance

**Critical architectural decision:**  
We will **not** build one giant monolithic AI that tries to do everything.  
We will build a **team of specialized AI agents** that cooperate through a shared Project State, with a strong layer of **AI Expert Reviewers**, and real human senior engineers only as the final safety net.

This approach is more realistic, more controllable, easier to improve incrementally, and maps naturally to how real hardware engineering teams already work.

---

## 2. Shared Project State (The Digital Twin)

The Project State is the single source of truth. Every agent reads from it and writes structured updates back to it. It must be versioned and fully auditable.

### High-level structure (conceptual)

```json
{
  "project_id": "uuid",
  "created_at": "...",
  "updated_at": "...",
  "status": "in_progress | needs_human | approved | exported | failed",
  
  "user_intent": {
    "raw_text": "...",
    "parsed_constraints": {
      "target_cost": null,
      "form_factor": null,
      "power": null,
      "wireless": null,
      "sensors": [],
      "other": {}
    }
  },

  "architecture": { ... },
  "bom": { ... },
  "schematic": {
    "netlist": ...,
    "components": ...,
    "confidence": 0.0,
    "issues": []
  },
  "pcb": {
    "layout": ...,
    "layers": 2,
    "drc_status": "pass | fail | unknown",
    "confidence": 0.0
  },
  "firmware": { ... },
  "enclosure": { ... },
  "dfm": { ... },
  "simulations": { ... },

  "reviews": [
    {
      "agent": "SchematicReviewer",
      "status": "approved | needs_changes | rejected",
      "confidence": 0.87,
      "risk_level": "low | medium | high",
      "issues": [ ... ],
      "timestamp": "..."
    }
  ],

  "history": [ ... ],          // full audit trail of every agent action
  "escalation": null           // populated when sent to a real human
}
```

Every agent must return structured data + confidence score + risk flags.  
The Orchestrator uses these scores to decide whether to continue, loop for revision, or escalate to a human.

---

## 3. The Agents (AI Employees)

### 3.1 Design / Builder Agents

| Agent                  | Primary Responsibility                                      | Key Inputs                     | Key Outputs                          | Notes |
|------------------------|-------------------------------------------------------------|--------------------------------|--------------------------------------|-------|
| **SpecAgent**          | Parse natural language / sketches into clean requirements   | User prompt                    | Structured constraints + goals       | First agent in almost every flow |
| **ArchitectureAgent**  | System topology, power budget, MCU/SoC selection            | Spec                           | Block diagram + key decisions        | Critical early decision point |
| **ComponentAgent**     | Part selection + live pricing, stock, lifecycle, alternates | Architecture + constraints     | Preliminary + refined BOM            | Should call real distributor APIs |
| **SchematicAgent**     | Generate and refine electrical schematic / netlist          | Architecture + BOM             | Netlist + schematic representation   | Must respect electrical rules |
| **PCBLayoutAgent**     | Component placement + routing + basic DRC                   | Netlist + constraints          | Board layout                         | Hardest technical agent |
| **FirmwareAgent**      | HAL, drivers, board support package, secure boot config     | Netlist + MCU choice           | Source code + build files            | Templates + generation |
| **EnclosureAgent**     | Parametric mechanical design (snap-fit, vents, cutouts)     | PCB dimensions + connectors    | STEP / parametric model              | Can run in parallel with firmware |
| **DFMAgent**           | Design-for-manufacturing and assembly checks                | Layout + BOM                   | DFM report + recommended fixes       | Should know real fab-house rules |
| **SimulationAgent**    | Basic electrical, thermal, and signal-integrity checks      | Schematic + layout             | Simulation results + warnings        | Start simple (Ngspice etc.) |

### 3.2 AI Expert Reviewer Agents

These agents act as the first strong quality gate (AI HITL).

| Reviewer Agent              | What it critiques                              | Typical issues it looks for |
|-----------------------------|------------------------------------------------|-----------------------------|
| **SchematicReviewer**       | Electrical correctness                         | Missing decoupling, wrong pin usage, power path problems, floating nets |
| **LayoutReviewer**          | PCB quality, SI / EMC heuristics               | Trace width, clearance, return paths, antenna keep-out, via stitching |
| **PowerThermalReviewer**    | Power integrity and thermal                    | Voltage drop, current density, hot spots, copper pour issues |
| **DFMReviewer**             | Manufacturability and assembly                 | Via sizes, solder mask, component spacing, panelization, stencil |
| **FirmwareReviewer**        | Code quality, security, correctness            | Missing init, race conditions, secure boot gaps, pin conflicts |
| **ComplianceReviewer**      | Pre-certification risks                        | Antenna placement, emissions risk, safety isolation, labeling |
| **ChiefEngineerAgent**      | Overall judgment                               | Weighs all specialist reviews, decides “approve / revise / escalate” |

### 3.3 Coordination Agents

- **OrchestratorAgent**  
  The project manager. It owns the control flow, decides which agent runs next, handles revision loops, and decides when to escalate to a real human.

- **HumanEscalationAgent**  
  When the ChiefEngineer (or any high-risk flag) decides a real human is needed, this agent packages the current Project State + all AI reviews into a clean, readable brief for a senior hardware engineer.

---

## 4. Cooperation & Control Flow

### High-level workflow

```
User Prompt
    ↓
Orchestrator
    ↓
SpecAgent → ArchitectureAgent → ComponentAgent
    ↓
SchematicAgent → SchematicReviewer  ←── (can loop back)
    ↓
PCBLayoutAgent → LayoutReviewer + PowerThermalReviewer + DFMReviewer
    ↓
FirmwareAgent + EnclosureAgent          (can run in parallel)
    ↓
FirmwareReviewer + ComplianceReviewer
    ↓
ChiefEngineerAgent
    ↓
   ┌────────────────────────────────────┐
   │ Confidence high enough & risk low? │
   └────────────────────────────────────┘
            │                    │
           Yes                  No
            ↓                    ↓
     Approve & Export     Human Escalation
```

### Key behaviors
- Any Reviewer can send work back to a Design Agent with specific comments.
- Agents communicate only through the shared Project State (no hidden side channels).
- Every action is logged in the history for full auditability.
- Confidence and risk scores are mandatory outputs from every agent.
- The Orchestrator is deliberately “thin” — it routes and decides, but does not do domain work itself.

---

## 5. Technical Foundation

### Orchestration Framework
**Primary choice: LangGraph**

Reasons:
- Explicit graph + typed shared state (perfect match for our Project State)
- Native checkpointing (long-running designs can pause and resume)
- First-class human-in-the-loop interrupts
- Excellent observability (LangSmith)
- Production-proven for complex, auditable workflows

**Secondary / prototyping option:** CrewAI (very fast for role-based agent teams). Many teams prototype individual agents in CrewAI and then move the overall control flow into LangGraph.

### Other technical notes
- Project State should live in a real database (Postgres + JSONB is a good starting point) with proper versioning.
- External tools (Octopart / DigiKey / Mouser, KiCad DRC, Ngspice, CadQuery / OpenCASCADE style generation, fab-house APIs, etc.) will be called by the relevant specialist agents.
- All agents should be designed to be replaceable — we can improve or swap one agent without rewriting the whole system.

---

## 6. Guiding Philosophy

1. **Start narrow and real** — ship useful value early (e.g. Spec → Architecture → BOM → basic Schematic) instead of waiting for the full dream system.
2. AI does the majority of the work.
3. AI Expert Reviewers provide a strong first quality filter.
4. Real senior engineers only handle the difficult / high-risk cases.
5. Every human intervention becomes training signal to improve the agents over time.
6. Prefer explicit control and auditability over “magic” autonomy.
7. Keep the Orchestrator thin and the specialist agents focused.

---

## 7. Current Repository Reality (as of this document)

- The existing codebase is a lightweight Node/Express application with mostly simulated / placeholder logic in `src/engine/`.
- The README is still largely a pitch deck and has disordered section numbering.
- There is not yet a real multi-agent system, no LangGraph integration, and no proper shared Project State.

This document describes the **target architecture**, not the current implementation.

---

## 8. Immediate Next Steps

1. Define a concrete TypeScript/JSON schema for the Project State.
2. Implement a minimal LangGraph-based Orchestrator that can run a simple linear flow.
3. Build the first two real agents (SpecAgent + ArchitectureAgent) so we can see an end-to-end working path.
4. Add basic confidence scoring and a placeholder human-escalation path.
5. Gradually replace the old simulated engine modules with real agent implementations.

---

*This is the detailed source of truth. Update it whenever we make significant architectural or product decisions.*
