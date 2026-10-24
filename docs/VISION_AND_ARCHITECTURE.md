# CircuitFlow – Vision & Architecture

**Last updated:** October 2026  
This document captures the agreed direction so we don’t lose track as we build.

---

## Core Vision

CircuitFlow is an AI-powered platform that turns a hardware idea into a production-ready package (schematic, PCB, BOM, firmware, enclosure, manufacturing files).

We will **not** build one giant monolithic AI.

Instead we will build a **multi-agent system** of specialized AI agents that cooperate, with AI Expert Reviewers acting as the first quality gate, and real human experts only as the final safety net.

---

## 1. Shared Project State (The Digital Twin)

Everything lives in one structured, versioned project state.  
This is the single source of truth that all agents read from and write to.

Key contents (high level):
- User intent & constraints
- Architecture
- BOM / components
- Schematic / netlist
- PCB layout
- Firmware
- Enclosure
- DFM & manufacturing data
- Simulation results
- All reviews + confidence/risk scores
- Full history / audit trail
- Current status (in_progress / needs_human / approved / exported)

---

## 2. The Agents (AI Employees)

### Design / Builder Agents
- **SpecAgent** – Understand user request → clean requirements
- **ArchitectureAgent** – Block diagram, power budget, MCU/SoC choice
- **ComponentAgent** – Part selection + live supply chain / pricing / lifecycle
- **SchematicAgent** – Generate & refine netlist + schematic
- **PCBLayoutAgent** – Placement, routing, basic DRC
- **FirmwareAgent** – HAL, drivers, RTOS config, secure boot
- **EnclosureAgent** – Parametric mechanical design
- **DFMAgent** – Manufacturing & assembly checks
- **SimulationAgent** – SPICE / basic SI / thermal estimates

### AI Expert Reviewer Agents
- **SchematicReviewer**
- **LayoutReviewer**
- **PowerThermalReviewer**
- **DFMReviewer**
- **FirmwareReviewer**
- **ComplianceReviewer**
- **ChiefEngineerAgent** – Weighs all reviews and makes the final AI-level decision

### Coordination Agents
- **OrchestratorAgent** – Project manager. Decides sequence, calls agents, handles loops and escalation.
- **HumanEscalationAgent** – Packages the current state + AI reviews into a clean brief for a real senior engineer.

---

## 3. How the Agents Cooperate

1. Orchestrator controls the overall flow.
2. Agents read from and write to the shared Project State.
3. Reviewer agents can send work back for revision.
4. Every agent returns **confidence** and **risk** scores.
5. Low confidence or high risk → escalate to real human.
6. Full audit trail of every decision and change is kept.

Typical high-level flow:

```
User Prompt
    ↓
Orchestrator
    ↓
Spec → Architecture → Component
    ↓
Schematic → SchematicReviewer (can loop)
    ↓
PCB Layout → Layout + Power/Thermal + DFM Reviewers
    ↓
Firmware + Enclosure (can run in parallel)
    ↓
Firmware + Compliance Reviewers
    ↓
ChiefEngineerAgent
    ↓
High confidence? → Approve & Export
Low confidence / high risk? → Human Escalation
```

---

## 4. Recommended Technical Foundation

- **Primary orchestration framework**: LangGraph  
  (Best fit for stateful, controllable, production-grade workflows with native human-in-the-loop support)

- Possible early prototyping with CrewAI for speed on individual agents.

- Shared state stored in a proper database with versioning.

- External tools (distributor APIs, CAD/DRC engines, simulators, etc.) will be called by the relevant agents.

---

## 5. Guiding Philosophy

- Start narrow and real — don’t try to do everything at once.
- AI does the bulk of the work.
- AI Expert Reviewers act as the first strong quality gate.
- Real humans only handle the hard / edge cases.
- Continuously improve the agents from human feedback over time.

---

## Current Repository Status (as of this document)

- Lightweight Node/Express demo with mostly simulated / placeholder engine modules.
- README is still a pitch deck (and section ordering is broken).
- No real multi-agent system, no LangGraph, no proper shared Project State yet.

---

## Next Immediate Steps

1. Define and implement the Project State schema.
2. Build a minimal LangGraph Orchestrator.
3. Implement the first 1–2 real agents (SpecAgent + ArchitectureAgent) so we can see an end-to-end flow.

---

*This document is the source of truth for the current agreed direction. Update it as decisions evolve.*
