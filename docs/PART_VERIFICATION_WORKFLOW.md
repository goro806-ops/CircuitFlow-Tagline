# Manufacturer Part and Model Verification Workflow

This workflow prepares the final BOM for engineering and regulatory review. A generated MPN, generic footprint, or vendor-model registry entry is not evidence that a part is approved for production.

## Required record for every BOM line

| Field | Required evidence |
|---|---|
| Reference and quantity | Frozen schematic/PCB/BOM revision |
| Exact manufacturer and MPN | Manufacturer product page or datasheet URL, revision/date, downloaded copy hash |
| Package and footprint | Manufacturer package drawing plus reviewed KiCad footprint/library version |
| Electrical ratings | Absolute maximums, recommended operating range, tolerances, derating basis |
| Lifecycle and sourcing | Lifecycle status, authorized distributor or manufacturer confirmation, approved alternate policy |
| Safety relevance | Battery, isolation, creepage/clearance, thermal, RF, or fault role if applicable |
| SPICE model | Exact model ID, source, license, simulator compatibility, pin-map review, model limitations |
| Approval | Named electrical reviewer, date, disposition, evidence ID |

## Verification procedure

1. Freeze the BOM revision and export the exact component list from the project.
2. Verify each MPN against the manufacturer's current product page and datasheet; do not rely on distributor text alone for safety-critical ratings.
3. Compare the datasheet package drawing to the KiCad footprint pad numbering, courtyard, thermal pad, polarity, and assembly orientation.
4. Check lifecycle, counterfeit risk, authorized sourcing, and approved alternates.
5. For power, battery, protection, isolation, RF, and thermal-critical parts, record derating calculations and worst-case limits.
6. If a SPICE model is used, record the exact source and license, run pin-map and convergence checks, and document parameters the model does not represent.
7. Mark each line `verified`, `blocked`, or `not_applicable` with a reason. A `not_applicable` disposition must be approved by the electrical and safety reviewers.
8. Link each record to the regulatory evidence index and the frozen release package.

## Required completion rule

Set `part_verification_complete: true` only after every BOM line has a complete record and the electrical reviewer has approved the evidence. Set `spice_model_provenance_complete: true` only after every used model has provenance/license evidence or an approved not-applicable rationale. These flags are enforced by the release gate; they are not self-certification.
