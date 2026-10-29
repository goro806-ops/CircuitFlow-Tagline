# Safety and Compliance Test Plan

This is a planning document for a qualified electrical, RF/EMC, battery, and regulatory team. It does not replace the applicable standard, accredited laboratory method, or engineering judgment. Freeze the product configuration before testing.

## Configuration to freeze

Record the exact PCB revision, BOM revision, radio module and antenna, enclosure, power supply, battery/cell, firmware, bootloader, radio country settings, cable set, accessories, and operating modes. Define the worst-case sample configuration before booking a laboratory.

## Engineering pre-compliance checks

| Test family | Minimum preparation | Evidence |
|---|---|---|
| Power and fault behavior | Measure startup, steady state, sleep, peak radio, short-circuit response, brownout, reverse input, and connector abuse within safe limits. | Raw waveforms, setup, limits, disposition |
| Thermal | Run maximum computational/radio load, charging if applicable, blocked ventilation, warm ambient, and enclosure-installed conditions. | Thermocouple/IR records, calibration, thermal map |
| ESD and transients | Define user-touch points, cable paths, supply transients, and recovery behavior. | Test matrix and fault logs |
| RF configuration | Verify antenna part, cable, enclosure, transmit power, channel plan, country profile, and simultaneous radios. | Configuration manifest |
| EMC pre-scan | Test representative cable and enclosure configurations before formal lab work. | Pre-scan plots and corrective actions |
| Firmware resilience | Interrupt update, remove power, corrupt image, lock debug access, and test recovery. | Test record and signed firmware hashes |
| Battery, if applicable | Verify cell identity, protection, charger limits, temperature cutoffs, short/overcharge behavior, and shipping configuration. | Cell/pack documents and test evidence |

## Formal lab planning

The compliance reviewer must select the actual standards and edition based on the final markets and product classification. Do not infer that a radio module approval automatically covers the finished product. Confirm antenna, enclosure, host integration, simultaneous transmission, labeling, user instructions, and any conditions attached to the module approval.

For the EU, determine the applicable RED route for radio equipment and document safety/health, EMC, spectrum, and any applicable cybersecurity or software-update considerations. The European Commission notes that RED conformity assessment and CE marking are legal conformity steps, not optional third-party certificates.

For the United States, determine the appropriate FCC equipment authorization path for both intentional radio functions and any unintentional radiator aspects. Wi-Fi and Bluetooth are intentional-radiator examples in FCC guidance. The final product classification and procedure must be confirmed by a competent FCC test lab or compliance specialist.

For each target market, create a laboratory statement of work that names the exact standards, test levels, configurations, sample count, pass/fail criteria, and report deliverables. Keep the quotation and final report in the evidence index.

## Exit criteria

The safety/compliance gate can be accepted only when:

- the final configuration is frozen and traceable;
- every applicable test has a result and raw evidence;
- deviations have owners and corrective-action dates;
- regulatory route and labeling obligations are documented;
- a qualified reviewer signs the evidence index; and
- the product owner accepts only documented residual risk.
