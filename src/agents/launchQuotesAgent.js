/**
 * Launch, Pricing & Quotes agent (v1).
 * Builds a simple go-to-market / cost pack from BOM + constraints.
 */

import { callLlm } from './llm.js';

export async function runLaunchQuotesAgent(state) {
  const bomMeta = state.bomMeta || {};
  const bom = state.bom || [];
  const constraints = state.constraints || {};
  const architecture = state.architecture || {};

  const unitBom = Number(bomMeta.totalEstimate || 0);
  const target = Number(constraints.estimatedBom || constraints.targetBomCost || 0);

  const volumes = [1, 10, 100, 1000, 5000];
  const quotes = volumes.map((qty) => {
    const discount = qty >= 5000 ? 0.72 : qty >= 1000 ? 0.8 : qty >= 100 ? 0.88 : qty >= 10 ? 0.95 : 1;
    const unit = Number((unitBom * discount).toFixed(2));
    return {
      quantity: qty,
      unitCost: unit,
      extended: Number((unit * qty).toFixed(2)),
      notes: qty === 1 ? 'Prototype / sample' : qty >= 1000 ? 'Production-oriented' : 'Small batch',
    };
  });

  let gtm = null;
  try {
    gtm = await callLlm(
      `Given this product concept, return JSON only:
{ "positioning": "one line", "channels": ["..."], "risks": ["..."], "nextMilestones": ["..."] }
Architecture: ${JSON.stringify(architecture).slice(0, 1200)}
BOM total: $${unitBom}
Target: $${target}`,
      { json: true }
    );
  } catch {
    gtm = {
      positioning: 'Hardware product from CircuitFlow multi-agent design',
      channels: ['Direct', 'Distributor'],
      risks: ['Certifications (FCC/CE) not yet estimated'],
      nextMilestones: ['Prototype build', 'DFM review', 'Pilot run'],
    };
  }

  state.launchQuotes = {
    bomUnitCost: unitBom,
    targetUnitCost: target || null,
    overTarget: target > 0 ? unitBom > target : false,
    volumeQuotes: quotes,
    gtm: gtm || {},
    currency: bomMeta.currency || 'USD',
    meta: { generatedAt: new Date().toISOString() },
  };

  if (!state.reviews) state.reviews = [];
  state.reviews.push({
    agent: 'LaunchQuotes',
    severity: state.launchQuotes.overTarget ? 'warning' : 'info',
    message: `Unit BOM ~$${unitBom}${target ? ` (target $${target})` : ''}`,
    ts: Date.now(),
  });

  return state;
}
