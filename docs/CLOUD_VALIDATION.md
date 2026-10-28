# Cloud Validation Paths

CircuitFlow now supports two phone-friendly cloud execution paths.

## 1. Official KiCad Docker CI

`.github/workflows/kicad-validation.yml` runs on pushes, pull requests, and manual dispatch. It uses the official `kicad/kicad:9.0.7-amd64-full` container, verifies `kicad-cli`, generates a CircuitFlow fixture, runs headless PCB DRC and schematic ERC with `--exit-code-violations`, and uploads the reports as GitHub Actions artifacts.

Exit code `5` means KiCad found design violations and is preserved in the report artifact. Other non-zero codes are treated as tool or input failures and fail the workflow. This makes the workflow useful immediately while keeping the violation report visible for engineering cleanup.

No software is required on the phone. GitHub runs the container in the cloud and the reports can be downloaded from the GitHub mobile app or browser.

## 2. Render Docker runtime

`render.docker.yaml` is a separate Blueprint for creating `circuitflow-docker`. It uses the repository `Dockerfile`, which includes Node, Python, ngspice, and KiCad packages. It is intentionally separate from `render.yaml` so the current live service is not changed automatically.

To activate it in Render, create or sync a Blueprint using `render.docker.yaml`, copy the existing environment variables and secrets, connect the existing Postgres database, and verify `/ready`, `/api/agents/status`, one design run, and one KiCad export. The first deployment may take longer because the image installs EDA packages.

The Docker runtime is the path for real ngspice execution inside the service. The CI workflow is the stronger path for reproducible KiCad CLI validation because it uses KiCad’s official image.

## Still needed for engineering-grade results

The tools are now available, but accurate hardware conclusions still require real inputs. Each design should provide vendor SPICE models for the selected regulator, sensors, protection devices, and any power-critical ICs. The BOM needs verified manufacturer part numbers, footprints, tolerances, voltage/current ratings, alternates, and lifecycle status. The schematic and PCB generator needs complete net connectivity and verified libraries rather than placeholders.

A qualified engineer must review DRC/ERC reports, worst-case power and thermal results, EMC/ESD risks, battery safety, DFM/DFA, and regulatory requirements. Prototype measurements must be correlated with the simulation. The hardware release checklist records those approvals.

Operationally, the scheduled backup workflow still needs the production `DATABASE_URL` added as a GitHub repository secret. A restore rehearsal and an encrypted off-provider backup copy should be completed before commercial launch.
