# Cloud Validation Paths

CircuitFlow now supports two phone-friendly cloud execution paths.

## 1. Official KiCad Docker CI

`.github/workflows/kicad-validation.yml` runs on pushes, pull requests, and manual dispatch. It uses the official `kicad/kicad:9.0.7-amd64-full` container, verifies `kicad-cli`, generates a CircuitFlow fixture, runs headless PCB DRC and schematic ERC with `--exit-code-violations`, and uploads the reports as GitHub Actions artifacts.

Exit code `5` means KiCad found design violations and is preserved in the report artifact. Other non-zero codes are treated as tool or input failures and fail the workflow. This makes the workflow useful immediately while keeping the violation report visible for engineering cleanup.

No software is required on the phone. GitHub runs the container in the cloud and the reports can be downloaded from the GitHub mobile app or browser.

## 2. Render Docker runtime

`render.docker.yaml` is a separate Blueprint for creating `circuitflow-docker`. It uses the repository `Dockerfile`, which includes Node, Python, ngspice, and KiCad packages. It is intentionally separate from `render.yaml` so the current live service is not changed automatically.

To activate it in Render, create or sync a Blueprint using `render.docker.yaml`, copy the existing environment variables and secrets, connect the existing Postgres database, and verify `/ready`, `/api/agents/status`, one design run, and one KiCad export. The first deployment may take longer because the image installs EDA packages.

The Docker runtime is now live as `circuitflow-docker` and uses the official KiCad CLI image. The live service has been verified with real ngspice convergence and a PostgreSQL-backed LangGraph checkpointer. The CI workflow remains the reproducible path for validating generated artifacts because it uses the same official KiCad image family.

## Still needed for engineering-grade results

The tools are available and execute in the cloud, but accurate hardware conclusions still require real inputs. Each design should provide a licensed vendor SPICE model for the selected regulator, sensors, protection devices, and other power-critical ICs. The repository records official ROHM, Renesas, and Texas Instruments model sources in `models/spice/registry.json`; the model files themselves must remain in private storage unless redistribution is permitted. The BOM needs verified manufacturer part numbers, footprints, tolerances, voltage/current ratings, alternates, and lifecycle status. The schematic and PCB generator now reports unresolved placeholders explicitly, but it still needs complete net connectivity and verified libraries before a production release.

A qualified engineer must review DRC/ERC reports, worst-case power and thermal results, EMC/ESD risks, battery safety, DFM/DFA, and regulatory requirements. Prototype measurements must be correlated with the simulation. The hardware release checklist records those approvals.

Operationally, the scheduled backup workflow requires the production `DATABASE_URL` GitHub repository secret. The manual `Postgres Restore Rehearsal` workflow requires a separate non-production `RESTORE_DATABASE_URL`; run it with a completed backup workflow run ID and the exact confirmation string `RESTORE_REHEARSAL`. An encrypted off-provider backup copy and a successful rehearsal should be completed before commercial launch.
