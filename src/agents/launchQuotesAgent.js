/**
 * Launch, Pricing & Quotes agent (v1).
 */

function bomUnitCost(state) {
  const bom = state.bom;
  if (!bom) return 0;
  if (state.bomMeta && state.bomMeta.totalEstimate != null) {
    return Number(state.bomMeta.totalEstimate) || 0;
  }
  if (bom.estimated_total) {
    const hi = Number(bom.estimated_total.high);
    const lo = Number(bom.estimated_total.low);
    if (Number.isFinite(hi) && Number.isFinite(lo)) return (hi + lo) / 2;
    if (Number.isFinite(hi)) return hi;
    if (Number.isFinite(lo)) return lo;
  }
  const items = Array.isArray(bom.line_items)
    ? bom.line_items
    : Array.isArray(bom)
      ? bom
      : [];
  return items.reduce(
    (s, i) =>
      s +
      (Number(i.unit_price_usd || i.unitPrice) || 0) *
        (Number(i.qty || i.quantity) || 1),
    0
  );
}

async function runLaunchQuotesAgent(state) {
  const unitBom = Math.round(bomUnitCost(state) * 100) / 100;
  const constraints =
    state.constraints ||
    (state.user_intent && state.user_intent.parsed_constraints) ||
    {};
  const target = Number(constraints.target_cost || constraints.estimatedBom || 0) || null;

  const volumes = [1, 10, 100, 1000, 5000];
  const quotes = volumes.map((qty) => {
    const discount =
      qty >= 5000 ? 0.72 : qty >= 1000 ? 0.8 : qty >= 100 ? 0.88 : qty >= 10 ? 0.95 : 1;
    const unit = Math.round(unitBom * discount * 100) / 100;
    return {
      quantity: qty,
      unitCost: unit,
      extended: Math.round(unit * qty * 100) / 100,
      notes:
        qty === 1
          ? "Prototype / sample"
          : qty >= 1000
            ? "Production-oriented"
            : "Small batch"
    };
  });

  state.launchQuotes = {
    bomUnitCost: unitBom,
    targetUnitCost: target,
    overTarget: target != null ? unitBom > target : false,
    volumeQuotes: quotes,
    gtm: {
      positioning: "Hardware product from CircuitFlow multi-agent design",
      channels: ["Direct", "Distributor"],
      risks: ["Certifications (FCC/CE) not yet estimated"],
      nextMilestones: ["Prototype build", "DFM review", "Pilot run"]
    },
    currency: (state.bom && state.bom.currency) || "USD",
    meta: { generatedAt: new Date().toISOString() }
  };

  return state;
}

module.exports = { runLaunchQuotesAgent };
