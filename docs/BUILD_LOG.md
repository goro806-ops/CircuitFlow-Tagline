# CircuitFlow Build Log

## Foundation COMPLETE (v1.5)

Closed-out with:
- Human review API `POST /api/agents/projects/:id/review`
- Export `GET /api/agents/projects/:id/export`
- Human review controls in `/agents.html`
- Entry doc `docs/AGENTS.md`
- Vision doc marked foundation-complete

---

## v1.6 – Pricing, smarter BOM, better revisions, API polish

### What was added / improved

1. **Pricing service** (`src/agents/pricing.js`)
   - Clean interface for part lookup + BOM enrichment
   - Realistic mock catalogue (stock, lead time, lifecycle)
   - Ready for DigiKey / Mouser / Octopart adapters (keys auto-detected)

2. **ComponentAgent upgraded**
   - Now enriches BOM line items with pricing data
   - Reports `priced_items` count and pricing source
   - Flags long lead times as risk

3. **Reviewers – improved revision targeting**
   - Clearer priority: Schematic → PCB/DFM → Power → LLM
   - More deterministic revision loops

4. **API polish**
   - Version bumped to 1.6
   - `/api/agents/status` now reports pricing mode (mock vs live)
   - Project list includes BOM estimate and is sorted by updated_at
   - Run response includes `bom_source` and `priced_items`

### Still intentionally deferred (next product phases)
- Real DigiKey / Mouser / Octopart live calls
- Pin-accurate KiCad schematic & autorouting
- Multi-user auth + cloud DB
- Full mechanical CAD export

### Run
```bash
npm install
npm run test:agents
npm run agents:example
npm start
# http://localhost:3000/agents.html
# GET /api/agents/status
```
