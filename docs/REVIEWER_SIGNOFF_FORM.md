# Hardware Release Reviewer Sign-off Form

This form is for a qualified reviewer who has actually examined the frozen release package. Completing a field requires the reviewer to provide truthful evidence; an automated test result is not a substitute for professional review.

## Release identity

| Field | Entry |
|---|---|
| Product / model | ______________________________ |
| Project ID | ______________________________ |
| Hardware / PCB revision | ______________________________ |
| BOM revision and checksum | ______________________________ |
| Firmware / bootloader hashes | ______________________________ |
| Target markets | ______________________________ |
| Review date | ______________________________ |

The readiness endpoint returns a SHA-256 `release_revision` fingerprint for the frozen architecture, BOM, schematic, PCB, firmware, enclosure, KiCad validation, SPICE references, and release evidence. Copy that exact value into every sign-off request as `reviewed_revision`. Any subsequent change to those release inputs produces a new fingerprint and automatically makes earlier approvals stale. The API also records the authenticated account as `signed_by` and the server timestamp as `signed_at`; both are required by the release gate and cannot be supplied by the request body.

## Reviewer decision

| Role | Reviewer name / organization | Decision | Evidence IDs | Conflict disclosed? | Signature / approval reference |
|---|---|---|---|---|---|
| Electrical engineer | | approved / changes requested / rejected | | yes / no | |
| Firmware engineer | | approved / changes requested / rejected | | yes / no | |
| Mechanical / DFM engineer | | approved / changes requested / rejected | | yes / no | |
| Manufacturing / test engineer | | approved / changes requested / rejected | | yes / no | |
| Safety / regulatory reviewer | | approved / changes requested / rejected | | yes / no | |
| Product owner | | approved / changes requested / rejected | | yes / no | |

## Reviewer attestations

Each reviewer should state which artifacts were reviewed, identify open deviations, and state whether the decision applies only to the frozen configuration. A reviewer must not approve an alternate component, firmware image, antenna, enclosure, or market without updating the configuration record.

- Reviewed evidence index revision: ____________________
- Open deviations and owners: __________________________
- Residual risks accepted by product owner: ______________
- Conditions on approval: _______________________________
- Required re-review trigger: ___________________________

## Release decision record

The product owner may record a release decision only after every applicable role has approved, all required evidence is indexed, and open deviations have documented disposition. The API release gate requires a reviewer name, `approved` decision, evidence reference, explicit `conflict_disclosed: true|false`, and the exact frozen `reviewed_revision` for each role. A reviewer must submit `conflict_disclosed` even when no conflict exists. This form itself does not grant legal authorization or replace a required declaration, laboratory report, or regulatory filing.
