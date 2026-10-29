# Safety and Regulatory Review Package

**Document status:** Draft for qualified human review  
**Product profile used for this draft:** low-voltage consumer electronic device with a digital controller, Wi-Fi/Bluetooth-capable radio, USB power input, temperature sensing, and a possible battery variant. Confirm the actual final configuration before selecting standards or making any market claim.

This package organizes evidence for human safety, compliance, and market-access review. It is not a certification, Declaration of Conformity, FCC authorization, CE authorization, or legal opinion. A qualified compliance engineer and the product owner must confirm the final product scope, markets, radio module, power source, enclosure, intended use, and applicable standards.

## Release identity

| Field | Value | Owner |
|---|---|---|
| Product name |  | Product owner |
| Hardware revision |  | Electrical engineer |
| Firmware revision |  | Firmware engineer |
| BOM revision |  | Manufacturing engineer |
| Radio module and antenna |  | RF/compliance engineer |
| Power configuration | USB / battery / both | Electrical engineer |
| Target markets |  | Product owner/compliance |
| Intended use and foreseeable misuse |  | Product safety reviewer |
| Review date |  | Coordinator |

## Scope and applicability decisions

Complete every row. Use **Applicable**, **Not applicable**, or **Pending decision**. A not-applicable decision requires a written rationale and reviewer name.

| Area | Why it may apply to this product | Decision | Required evidence / owner |
|---|---|---|---|
| EU Radio Equipment Directive 2014/53/EU | Applies if the finished product contains radio equipment such as Wi-Fi or Bluetooth. | Pending | RF, EMC, safety, spectrum, software/configuration evidence; compliance engineer |
| EU EMC requirements | Digital electronics and radio equipment can create or tolerate electromagnetic disturbance. | Pending | EMC test plan and lab report; EMC engineer |
| EU electrical safety requirements | USB-powered or battery-powered electronics require a safety assessment appropriate to their supply and accessible parts. | Pending | Electrical safety assessment and test report; safety engineer |
| EU RoHS | Electrical and electronic equipment generally requires restricted-substance evidence unless an exclusion applies. | Pending | Supplier declarations, material declarations, BOM traceability; compliance |
| EU WEEE | Market placement can create producer registration, marking, collection, and reporting obligations. | Pending | Producer-responsibility assessment; legal/compliance |
| EU Battery Regulation | Applies if the product contains or is sold with a battery or battery pack. | Conditional | Cell/pack identity, protection, transport, labeling, safety and supplier evidence |
| US FCC Part 15 | Wi-Fi/Bluetooth are intentional radiators; the finished product may also require unintentional-radiator evaluation. | Pending | Radio authorization path, RF/EMC test reports, labeling and user notices |
| Canada ISED | Applies if the product is marketed in Canada and contains radio equipment. | Conditional | Canadian radio certification and labeling review |
| UK Radio Equipment Regulations | Applies if radio equipment is placed on the Great Britain market. | Conditional | UKCA/market-specific assessment; compliance engineer |
| Bluetooth SIG | Applies if Bluetooth branding or Bluetooth qualification obligations are triggered by the product and use of the technology. | Conditional | Qualification and listing decision; wireless program owner |
| Transport of lithium batteries | Applies to lithium cells or packs shipped with or inside the product. | Conditional | UN 38.3 evidence, packaging, shipping classification, SDS and carrier rules |
| Medical-device rules | Applies only if claims, intended use, or marketing place the product in a medical-device category. | Decision required | Regulatory classification memo; regulatory specialist |

The European Commission describes RED as covering safety and health, EMC, efficient spectrum use, and additional radio-equipment requirements. It also states that CE marking follows completion of the applicable conformity-assessment procedure; a voluntary certificate is not a substitute for that process. See the official sources in the References section.

## Minimum safety evidence before release review

The following evidence must be attached or explicitly marked not applicable:

1. Final schematic, PCB, stack-up, verified footprints, and controlled BOM from the same revision.
2. Power-tree review covering USB input, protection, regulator limits, startup, short circuit, reverse polarity, brownout, and any battery path.
3. Worst-case electrical analysis for voltage, current, component dissipation, temperature, tolerances, and operating modes.
4. Real SPICE or equivalent solver evidence for safety- or performance-critical rails, with the exact model revision and limitations recorded.
5. Prototype measurements correlated to simulation, including test equipment identity, calibration status, setup, sample count, and raw data location.
6. Thermal test evidence for normal operation, blocked ventilation, enclosure, charging, and foreseeable fault conditions.
7. ESD, surge, EFT, conducted-emissions, radiated-emissions, radiated-immunity, and conducted-immunity plan as applicable to the target markets.
8. Battery cell and pack evidence if applicable, including protection, charging, abuse, transport, and supplier documentation.
9. Mechanical safety evidence covering accessible conductive parts, sharp edges, fasteners, enclosure integrity, strain relief, ingress assumptions, and foreseeable misuse.
10. Firmware security and update evidence where the radio or connected product is in scope, including signed firmware, rollback/recovery, debug-lock policy, credentials, and vulnerability handling.
11. User instructions, warnings, rating label, radio identifiers, disposal marks, and required market notices.
12. Laboratory quotation or booking and a named compliance engineer who owns the final test matrix.

## Human review gates

### Gate A — Product safety classification

The safety reviewer confirms intended use, users, environment, foreseeable misuse, energy sources, accessible parts, thermal hazards, battery hazards, and whether any medical or safety-related claim changes the regulatory classification.

**Decision:** Pending  
**Reviewer:**  
**Evidence:**  
**Date:**  

### Gate B — Electrical and thermal safety

The electrical engineer confirms that the final schematic and PCB implement current limiting, protection, grounding/return paths, creepage and clearance appropriate to the actual voltages, thermal limits, connector ratings, and fault containment. The reviewer must not rely on nominal-only simulation results.

**Decision:** Pending  
**Reviewer:**  
**Evidence:**  
**Date:**  

### Gate C — Radio and EMC

The RF/EMC reviewer confirms radio module identity, antenna configuration, approved operating modes, country bands, firmware-controlled radio settings, enclosure effects, co-location conditions, test modes, and whether modular approval can be relied on for the finished product. Final-market lab testing remains a human/compliance decision.

**Decision:** Pending  
**Reviewer:**  
**Evidence:**  
**Date:**  

### Gate D — Materials, battery, and environment

The compliance reviewer confirms RoHS/material evidence, WEEE obligations, battery applicability, transport evidence, supplier declarations, and traceability to the final BOM and manufacturing revision.

**Decision:** Pending  
**Reviewer:**  
**Evidence:**  
**Date:**  

### Gate E — Release authorization

The product owner authorizes release only after all applicable gates are accepted, all unexplained DRC/ERC and test issues are closed or formally dispositioned, and the technical file/evidence index is frozen.

**Decision:** Pending  
**Reviewer:**  
**Evidence:**  
**Date:**  

## Open hazards and required controls

| Hazard | Trigger / foreseeable misuse | Required control | Verification evidence | Owner | Status |
|---|---|---|---|---|---|
| Overheating | Regulator overload, blocked enclosure, charging fault | Derating, thermal shutdown, copper area, enclosure limits | Thermal analysis and test | Electrical | Open |
| Fire or battery event | Damaged, overcharged, shorted, or incorrect cell | Certified cell/pack, protection, charger limits, enclosure and shipping controls | Battery test and supplier records | Safety | Conditional |
| Electric shock | External supply fault or accessible conductive parts | Low-voltage architecture, insulation/clearance review, approved supply assumptions | Safety assessment | Electrical | Open |
| RF exposure or interference | Radio operation, antenna change, co-location | Approved antenna/configuration, RF assessment, market testing | RF report | RF/EMC | Open |
| ESD or surge damage | User touch, cable insertion, supply transients | TVS/protection/grounding and robust recovery | Immunity test | EMC | Open |
| Unsafe firmware update | Malicious or interrupted update | Authentication, signed image, rollback and recovery | Security test record | Firmware | Open |
| Wrong measurement or alarm | Sensor fault, calibration drift, software error | Plausibility checks, calibration, fail-safe behavior, user warning | Accuracy and fault-injection test | Firmware/product | Open |

## Release decision

The device is **not approved for production or market placement** until the applicable regulatory route is selected, evidence is attached, a qualified reviewer accepts each gate, and the product owner records the final decision in the controlled release record.

## References

- [1]: https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en "European Commission Radio Equipment Directive"
- [2]: https://www.fcc.gov/oet/ea/rfdevice "FCC RF Device Equipment Authorization Guidance"
- [3]: https://environment.ec.europa.eu/topics/waste-and-recycling/rohs-directive_en "European Commission RoHS Directive"
- [4]: https://environment.ec.europa.eu/topics/waste-and-recycling/waste-electrical-and-electronic-equipment-weee_en "European Commission WEEE Overview"
