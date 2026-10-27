/**
 * SPICE & Thermals agent (v1 – estimate / advisory, not a full simulator).
 *
 * Writes state.spiceThermals:
 * {
 *   powerBudget: { totalMw, byBlock: {} },
 *   thermal: { estimatedDeltaC, hotspotNotes: [] },
 *   spice: { suggestedNetlistSnippet, notes },
 *   confidence, risks
 * }
 */

import { callLlm } from './llm.js';

export async function runSpiceThermalsAgent(state) {
  const bom = state.bom || [];
  const architecture = state.architecture || {};
  const constraints = state.constraints || {};
  const schematic = state.schematic || {};

  const prompt = `
You are the SPICE & Thermals agent. Given architecture, BOM and schematic summary,
return ONLY JSON:
{
  "powerBudget": { "totalMw": number, "byBlock": { "mcu": number, "radio": number, "sensors": number, "other": number } },
  "thermal": {
    "estimatedDeltaC": number,
    "hotspotNotes": ["string"],
    "recommendedCopperPour": boolean,
    "needsHeatSink": boolean
  },
  "spice": {
    "suggestedNetlistSnippet": "string (short SPICE-like fragment or comment)",
    "notes": ["string"]
  },
  "confidence": 0-1,
  "risks": ["string"]
}

Architecture: ${JSON.stringify(architecture).slice(0, 2000)}
BOM count: ${bom.length}
Schematic nets: ${(schematic.nets || []).length}
Constraints: ${JSON.stringify(constraints).slice(0, 800)}
`.trim();

  let result;
  try {
    result = await callLlm(prompt, { json: true });
  } catch (e) {
    result = null;
  }

  if (!result || typeof result !== 'object') {
    result = heuristicPowerThermal(bom, architecture);
  }

  state.spiceThermals = {
    ...result,
    meta: { generatedAt: new Date().toISOString(), mode: result._heuristic ? 'heuristic' : 'llm' },
  };

  if (!state.reviews) state.reviews = [];
  const risks = result.risks || [];
  if (risks.length || (result.thermal && result.thermal.needsHeatSink)) {
    state.reviews.push({
      agent: 'SpiceThermals',
      severity: result.thermal?.needsHeatSink ? 'warning' : 'info',
      message: risks[0] || `Thermal ΔT ~${result.thermal?.estimatedDeltaC ?? '?'}°C`,
      details: risks,
      ts: Date.now(),
    });
  }

  return state;
}

function heuristicPowerThermal(bom, architecture) {
  let totalMw = 0;
  const byBlock = { mcu: 15, radio: 0, sensors: 5, other: 5 };

  for (const i of bom) {
    const cat = (i.category || '').toLowerCase();
    const desc = `${i.description || ''} ${i.mpn || ''}`.toLowerCase();
    if (cat.includes('mcu') || /nrf|stm32|esp32|rp2040/.test(desc)) {
      byBlock.mcu = 25;
    }
    if (cat.includes('rf') || /ble|wifi|lora|nrf52|esp32/.test(desc)) {
      byBlock.radio = 40;
    }
    if (cat.includes('sensor')) byBlock.sensors += 3;
  }

  totalMw = Object.values(byBlock).reduce((a, b) => a + b, 0);
  const deltaC = Math.min(35, Math.round(totalMw / 8));

  return {
    _heuristic: true,
    powerBudget: { totalMw, byBlock },
    thermal: {
      estimatedDeltaC: deltaC,
      hotspotNotes: deltaC > 20 ? ['Consider thermal vias under regulator / MCU'] : [],
      recommendedCopperPour: true,
      needsHeatSink: totalMw > 500,
    },
    spice: {
      suggestedNetlistSnippet: '* CircuitFlow power estimate only – not a full SPICE deck\nVDD 3V3 0 DC 3.3',
      notes: ['Full SPICE simulation not run; estimates only'],
    },
    confidence: 0.45,
    risks: totalMw > 200 ? ['Peak radio current may need local bulk cap'] : [],
  };
}
