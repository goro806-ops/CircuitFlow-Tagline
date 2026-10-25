# CircuitFlow Build Log

## v1.8 – Password auth, STL, KiCad, Octopart

### Auth
- Email + password register/login (scrypt hashing)
- Session tokens (`tok_…`) + existing API keys (`cf_…`)
- `POST /api/agents/auth/login`

### Mechanical
- Server-side ASCII **STL** generation (`GET .../enclosure.stl`)
- OpenSCAD still available

### KiCad
- `GET /api/agents/projects/:id/kicad` – JSON bundle
- `GET .../kicad.sch` and `.../kicad.pcb` – downloadable S-expression files
- Placeholder footprints; open in KiCad 6+ and assign real libraries

### Pricing
- DigiKey + Mouser + **Octopart/Nexar** adapters
- Parallel live lookup, mock fallback

### Still imperfect (honest limits)
- KiCad footprints are placeholders (not pin-accurate production boards)
- STL is a simple hollow box (not full mechanical assembly)
- Auth is file-based JSON (not Postgres multi-tenant yet)
- OAuth social login not included

---

## v1.7 – Live adapters, pin-aware schematic, API-key auth, OpenSCAD

## v1.6 – Pricing service, smarter BOM, revision targeting

## v1.5 – Foundation complete (LangGraph, reviewers, HITL, UI)
