# Hardware Release Checklist

This checklist is the release gate for any CircuitFlow-generated design. Generated artifacts are engineering aids until every applicable item has a named reviewer and evidence attached.

## 1. Requirements and architecture

- [ ] Product requirements, operating modes, environmental limits, lifetime, and target cost are baselined.
- [ ] Power budget includes active, sleep, peak radio, startup, and battery-end-of-life conditions.
- [ ] Component availability, lifecycle, alternates, and minimum order quantities are checked.
- [ ] MCU, radio, memory, security, clocking, reset, and boot assumptions are reviewed by an electrical engineer.

## 2. Schematic and PCB

- [ ] KiCad schematic ERC completes with no unexplained errors or warnings.
- [ ] KiCad PCB DRC completes with no unexplained violations.
- [ ] Every symbol has a verified manufacturer part number and footprint.
- [ ] Pin mappings, power rails, decoupling, pull-ups, protection, test points, and programming access are reviewed.
- [ ] Stack-up, impedance-controlled nets, return paths, antenna keep-outs, creepage, and clearance are approved.
- [ ] Gerbers, drill files, pick-and-place, assembly drawings, and a verified BOM are exported from the same revision.

## 3. Electrical and thermal validation

- [ ] Real ngspice or equivalent solver results are attached for every safety- or performance-critical rail.
- [ ] Worst-case voltage, current, dissipation, inrush, brownout, and battery conditions are tested.
- [ ] Thermal model is correlated with a prototype or justified by a qualified engineer.
- [ ] EMC/EMI risks, ESD, surge, reverse polarity, and fault containment are reviewed.
- [ ] Firmware watchdog, update path, secure boot, and recovery behavior are tested where applicable.

## 4. Mechanical and manufacturing

- [ ] Enclosure tolerances, wall thickness, fasteners, seals, material, and assembly sequence are reviewed.
- [ ] DFM/DFA review is complete with the selected PCB and assembly supplier.
- [ ] Test fixture, programming fixture, calibration procedure, and end-of-line test limits are defined.
- [ ] Prototype build has documented deviations and corrective actions.
- [ ] Pilot build yield, rework limits, and traceability fields are defined.

## 5. Safety and regulatory

- [ ] Applicable CE/FCC/UKCA/IC/RED/Bluetooth or other market requirements are identified.
- [ ] Battery, charger, transport, thermal, fire, and material compliance requirements are documented.
- [ ] Required lab tests and accredited reports are scheduled or complete.
- [ ] User instructions, warnings, labels, and service information are reviewed.

## 6. Release sign-off

| Role | Name | Evidence / link | Date | Decision |
|---|---|---|---|---|
| Electrical engineer |  |  |  |  |
| Firmware engineer |  |  |  |  |
| Mechanical/DFM engineer |  |  |  |  |
| Manufacturing/test engineer |  |  |  |  |
| Safety/regulatory reviewer |  |  |  |  |
| Product owner |  |  |  |  |

**Release rule:** do not label a design production-ready until all applicable rows are signed and all unexplained DRC/ERC, simulation, DFM, safety, and regulatory issues are closed or formally accepted.
