# Validation Matrix

| Area | Automated now | Required production evidence |
|---|---|---|
| API/runtime | Tests, health, readiness, dependency audit, CI | Load, failover, monitoring, incident rehearsal |
| Persistence | Postgres readiness and durable LangGraph checkpoints | Backup restore test, retention policy, RPO/RTO sign-off |
| SPICE | Real ngspice when available; explicit analytical fallback otherwise | Solver convergence review, worst-case models, bench correlation |
| KiCad export | Structural format validation; optional CLI DRC/ERC | Zero unexplained DRC/ERC, verified libraries and footprints |
| Firmware | Generated scaffold and pipeline review | Hardware-in-loop, boot/update/security testing |
| Mechanical | Generated geometry/export artifacts | Tolerance stack, prototype fit, DFM/DFA, environmental testing |
| Safety/regulatory | Checklist and evidence slots | Qualified lab reports and market-specific approvals |

A green automated check is not a manufacturing, safety, or regulatory certification.
