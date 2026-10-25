# CircuitFlow Build Log

## Foundation COMPLETE (v1.5)

Human review API, export, UI, docs.

---

## v1.6 – Pricing service, smarter BOM, better revisions

- `pricing.js` mock catalogue
- ComponentAgent enrichment
- Improved revision targeting
- API status reports pricing mode

---

## v1.7 – Live pricing adapters, pin-aware schematic, auth, mechanical export

### 1. Live distributor adapters
- DigiKey OAuth + keyword search (when `DIGIKEY_CLIENT_ID` + `DIGIKEY_CLIENT_SECRET` set)
- Mouser keyword search (when `MOUSER_API_KEY` set)
- Automatic fallback to mock catalogue
- `/api/agents/status` reports active providers

### 2. Pin-aware SchematicAgent
- Explicit pin maps for ESP32 / nRF52 / STM32 / RP2040
- Nets use real pin names (e.g. `U1.GPIO21`, `U1.P0.26`)
- Format bumped to `circuitflow-netlist-v1`

### 3. Basic multi-user auth
- `POST /api/agents/auth/register` → returns API key
- Optional `Authorization: Bearer <key>` or `X-API-Key`
- Projects get `owner_id`; list/get respect ownership when authenticated

### 4. Mechanical export
- EnclosureAgent now emits an OpenSCAD script
- `GET /api/agents/projects/:id/enclosure.scad` downloads it
- Paste into OpenSCAD → STL

### Still future
- Full OAuth / password accounts
- Real STEP/STL generation server-side
- Full KiCad project export with footprints & routing
- Production-grade multi-tenant DB

### Run
```bash
npm install
npm run agents:example
npm start
# POST /api/agents/auth/register
# GET  /api/agents/status
```
