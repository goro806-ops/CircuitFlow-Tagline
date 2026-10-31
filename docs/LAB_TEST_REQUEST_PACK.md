# Laboratory Test Request Pack

**Status:** Preparation template — not a laboratory report or certification.  
**Owner:** ____________________  **Revision:** ______  **Date:** ______

## 1. Product and configuration

- Product name / model: ____________________
- Intended use: ____________________
- Target markets: ____________________
- Hardware revision: ____________________
- BOM revision and checksum: ____________________
- PCB revision: ____________________
- Firmware and bootloader hashes: ____________________
- Radio module, antenna, cable, and enclosure: ____________________
- Power supply / battery / charger configuration: ____________________
- Operating modes and worst-case configuration: ____________________
- Sample count requested: ____________________

Attach the frozen configuration manifest, schematic, PCB, BOM, user manual draft, labels, and known-risk register.

## 2. Request the laboratory to confirm

Ask the laboratory or compliance specialist to identify the applicable standards and editions rather than supplying assumed standards. Request written confirmation of:

- Product classification and conformity route for each target market.
- Required safety, EMC, RF, environmental, battery, and radio tests.
- Sample count, fixtures, cable configurations, antenna configurations, and operating modes.
- Test levels, pass/fail criteria, deviations, and pre-scan requirements.
- Accreditation/scope relevant to the requested tests.
- Report format, raw-data availability, photographs, calibration references, and retention period.

## 3. Candidate test families

| Family | Questions for laboratory / specialist | Deliverable |
|---|---|---|
| Electrical safety | Which low-voltage, power-supply, battery, charging, fault, and touch-accessible tests apply? | Approved test matrix and report |
| RF / radio | Which intentional-radiator, antenna, host-integration, spectrum, and exposure tests apply? | RF test report and configuration record |
| EMC emissions | Which conducted/radiated emissions limits and cable modes apply? | Plots, setup photos, raw data, report |
| EMC immunity | Which ESD, EFT, surge, radiated, conducted, and performance criteria apply? | Test log, deviations, report |
| Thermal / fire | What abnormal operation, charging, blocked ventilation, and enclosure conditions apply? | Thermal/fault report |
| Battery / transport | Which cell, pack, charger, abuse, shipping, and documentation evidence applies? | Battery/transport evidence |
| Environmental | Which temperature, humidity, vibration, drop, ingress, or mechanical tests apply? | Environmental qualification report |

## 4. Pre-test acceptance checklist

- [ ] Configuration frozen and traceable.
- [ ] Samples match the frozen BOM and PCB revision.
- [ ] Debug/test access and firmware mode documented.
- [ ] Worst-case radio, power, load, and charging modes identified.
- [ ] User documentation and labels provided as draft controlled documents.
- [ ] Safety hazards and emergency handling instructions provided.
- [ ] Calibration and sample handling responsibilities agreed.
- [ ] Deviations and corrective-action process agreed.

## 5. Evidence to obtain after testing

Obtain the signed final report, raw plots/data where available, setup photographs, sample/configuration identifiers, calibration references, deviations, corrective actions, and laboratory accreditation/scope statement. Index every artifact in `REGULATORY_EVIDENCE_INDEX.md`.

A laboratory quotation or pre-scan is not a final compliance result. Do not set `lab_reports_complete: true` until the final applicable reports are reviewed and accepted by the qualified safety/regulatory reviewer.
