# Regulatory Evidence Index

Use one row per evidence artifact. Store controlled files outside the public application repository when they contain supplier confidential information, personal data, test credentials, or unreleased product details. Link to the controlled document-management location, not to a temporary phone download.

| ID | Evidence artifact | Revision/date | Product/BOM revision | Market or standard | Owner | Reviewer | Result | Controlled link | Status |
|---|---|---|---|---|---|---|---|---|---|
| SAF-001 | Product safety classification and intended-use memo |  |  | All target markets |  |  |  |  | Open |
| ELEC-001 | Final schematic and power-tree review |  |  | Internal safety gate |  |  |  |  | Open |
| ELEC-002 | Final PCB, stack-up, creepage/clearance review |  |  | Internal safety gate |  |  |  |  | Open |
| SIM-001 | SPICE deck, exact model provenance, convergence and limitations |  |  | Internal evidence |  |  |  |  | Open |
| THM-001 | Thermal analysis and prototype correlation |  |  | Internal safety gate |  |  |  |  | Open |
| EMC-001 | EMC/RF test plan and laboratory quotation |  |  | EU/US/other |  |  |  |  | Open |
| EMC-002 | EMC/RF laboratory report |  |  | EU/US/other |  |  |  |  | Open |
| RF-001 | Radio module, antenna, bands, firmware settings and grant review |  |  | EU/US/other |  |  |  |  | Open |
| MAT-001 | RoHS/material declarations mapped to final BOM |  |  | EU |  |  |  |  | Open |
| WEEE-001 | WEEE producer responsibility and marking decision |  |  | EU |  |  |  |  | Open |
| BAT-001 | Cell/pack specification, protection and charging evidence |  |  | Battery markets |  |  |  |  | Conditional |
| BAT-002 | UN 38.3 / transport and packaging evidence |  |  | Battery shipping |  |  |  |  | Conditional |
| FW-001 | Secure update, rollback, debug-lock and vulnerability test record |  |  | Connected product |  |  |  |  | Open |
| MFG-001 | DFM/DFA, assembly, test fixture and traceability approval |  |  | Manufacturing |  |  |  |  | Open |
| USER-001 | User manual, warnings, labels and disposal notices |  |  | Target markets |  |  |  |  | Open |
| REG-001 | EU Declaration of Conformity or equivalent market declaration |  |  | EU/EEA |  |  |  |  | Open |
| REG-002 | FCC/ISED/UK market authorization record |  |  | US/Canada/UK |  |  |  |  | Conditional |

## Artifact control rules

Every artifact must identify the tested hardware revision, firmware revision, BOM revision, test setup, and operator. Raw measurements must be retained with the report. A summary without raw data is not sufficient for a safety-critical claim.

A reviewer may mark an item **Accepted**, **Accepted with deviation**, **Rejected**, or **Not applicable**. **Not applicable** requires a rationale. **Accepted with deviation** requires a documented risk owner, corrective action, due date, and explicit product-owner acceptance.

Do not place CE, FCC, UKCA, or other regulatory marks on a product, package, listing, or manual until the responsible compliance process is complete and the required declaration or authorization exists.
