# CircuitFlow – Vision & Architecture

**Foundation status: COMPLETE (v1.5)**  
See also: [AGENTS.md](./AGENTS.md) for how to run the multi-agent system.

---

## Core Vision

CircuitFlow turns a natural-language hardware idea into a structured, manufacturing-oriented package using a **team of specialized AI agents**, with AI expert reviewers as the first quality gate and real humans only when risk is high.

We do **not** rely on one monolithic AI.

---

## What is built now

| Layer | Status |
|-------|--------|
| Shared Project State | Done |
| Spec → Architecture → Component → Schematic → PCB | Done (heuristic + optional LLM) |
| Firmware + Enclosure scaffolds | Done |
| Reviewers + revision loops | Done |
| Risk aggregation + human escalation | Done |
| Human decision API + UI | Done |
| LangGraph orchestrator + checkpoints | Done |
| Disk persistence + export | Done |
| HTTP API + `/agents.html` UI | Done |
| Classic orchestrator fallback | Done |
| Smoke test | Done |

---

## Agent roster (implemented)

**Design:** SpecAgent, ArchitectureAgent, ComponentAgent, SchematicAgent, PCBLayoutAgent, FirmwareAgent, EnclosureAgent  
**Review:** SchematicReviewer, LayoutReviewer, PowerThermalReviewer, DFMReviewer, optional LLMReviewer  
**Coordination:** Orchestrator (LangGraph), HumanEscalationAgent, human review endpoint

---

## Explicitly out of scope for this foundation

- Production KiCad autorouting / pin-perfect schematics
- Live distributor pricing APIs
- Multi-tenant auth and cloud database
- Full CAD STEP/STL generation

Those are **phase-2 product work**, not incomplete foundation work.

---

## Guiding philosophy

1. Specialized cooperating agents
2. Shared versioned project state
3. Confidence + risk on every step
4. AI reviewers before human escalation
5. Start narrow and real; improve from feedback

---

*Update this file only when the architecture or scope of the foundation changes.*
