# Automated Evidence Snapshot

**Snapshot date:** 2026-10-29  
**Application version:** 1.10.0  
**Live service:** `circuitflow-docker.onrender.com`  
**Live build:** `73ef02fb9ca1a3ee76c99c23e06086e6e36b53a9`

This snapshot records automated engineering checks only. It is not a safety certificate, regulatory authorization, Declaration of Conformity, FCC authorization, or production-release approval. The KiCad result below is for the disposable generated validation project and does not prove that an unreviewed customer design is safe or market-compliant.

## Automated results

| Evidence ID | Check | Result | Scope / limitation |
|---|---|---|---|
| AUTO-001 | Local application test suite | PASS | Engine, health, authentication, SPICE, and KiCad structural tests passed. |
| AUTO-002 | Release-evidence package validator | PASS | Required files/sections present; human sign-off remains required. |
| AUTO-003 | GitHub Actions release-evidence workflow | PASS | Latest recorded release-evidence workflow run passed; the workflow is path-triggered for evidence-package changes. |
| AUTO-004 | Render readiness | PASS | Live service reports PostgreSQL-backed store and readiness true. |
| AUTO-005 | Live KiCad CLI validation | PASS | Disposable generated project: PCB DRC 0 violations, 0 unconnected pads; schematic ERC 0 errors and 0 warnings. |
| AUTO-006 | Live ngspice simulation | PASS | `ngspice`, `CONVERGED`, analytical fallback false for the submitted voltage-divider request. |
| AUTO-007 | Fresh generated-project placement coverage | PASS | Disposable project `proj_mvwjheaaj7jg02`: 13 schematic components, 13 PCB placements, no missing or duplicate references. |

## Interpretation

The runtime and validation pipeline are operational. The KiCad result confirms that the current generated fixture can be parsed and checked by the real KiCad CLI. It does not confirm verified manufacturer symbols, exact component ratings, thermal margins, RF compliance, battery safety, EMC performance, or market authorization.

The live SPICE result confirms solver execution and convergence for the submitted test circuit. It does not replace licensed vendor macromodels, worst-case analysis, bench correlation, safety testing, or laboratory reports for the final BOM.

## Human gates still open

- Final product scope, intended use, foreseeable misuse, and target markets.
- Final schematic, PCB, BOM, symbols, footprints, component ratings, and revision traceability.
- Electrical, thermal, battery, enclosure, fire, and fault-containment review.
- RF/EMC laboratory plan and market-specific authorization route.
- RoHS/material declarations, WEEE obligations, battery and transport evidence where applicable.
- User warnings, labeling, instructions, and disposal information.
- Named electrical, firmware, mechanical, manufacturing, safety/regulatory, and product-owner reviewers.

Use this snapshot with the [Regulatory Evidence Index](REGULATORY_EVIDENCE_INDEX.md) and [Safety and Regulatory Review Package](SAFETY_REGULATORY_REVIEW_PACKAGE.md). Replace it when the release candidate, target markets, or final hardware revision changes.
