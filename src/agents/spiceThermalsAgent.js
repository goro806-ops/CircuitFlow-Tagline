/**
 * SPICE & Thermals agent (v1 – estimate / advisory, not a full simulator).
 */

function asLineItems(bom) {
  if (!bom) return [];
  if (Array.isArray(bom)) return bom;
  if (Array.isArray(bom.line_items)) return bom.line_items;
  if (Array.isArray(bom.items)) return bom.items;
  return [];
}

function heuristicPowerThermal(lineItems) {
  const byBlock = { mcu: 15, radio: 0, sensors: 5, other: 5 };

  for (const i of lineItems) {
    const cat = (i.category || "").toLowerCase();
    const desc = `${i.description || ""} ${i.mpn || ""}`.toLowerCase();
    if (cat.includes("mcu") || /nrf|stm32|esp32|rp2040/.test(desc)) byBlock.mcu = 25;
    if (cat.includes("rf") || /ble|wifi|lora|nrf52|esp32/.test(desc)) byBlock.radio = 40;
    if (cat.includes("sensor")) byBlock.sensors += 3;
  }

  const totalMw = Object.values(byBlock).reduce((a, b) => a + b, 0);
  const deltaC = Math.min(35, Math.round(totalMw / 8));

  return {
    _heuristic: true,
    powerBudget: { totalMw, byBlock },
    thermal: {
      estimatedDeltaC: deltaC,
      hotspotNotes: deltaC > 20 ? ["Consider thermal vias under regulator / MCU"] : [],
      recommendedCopperPour: true,
      needsHeatSink: totalMw > 500
    },
    spice: {
      suggestedNetlistSnippet:
        "* CircuitFlow power estimate only – not a full SPICE deck\nVDD 3V3 0 DC 3.3",
      notes: ["Full SPICE simulation not run; estimates only"]
    },
    confidence: 0.45,
    risks: totalMw > 200 ? ["Peak radio current may need local bulk cap"] : []
  };
}

async function runSpiceThermalsAgent(state) {
  const lineItems = asLineItems(state.bom);
  const architecture = state.architecture || {};
  const schematic = state.schematic || {};

  let result = null;
  try {
    const { isLLMEnabled, callLLMJson } = require("./llm");
    if (typeof isLLMEnabled === "function" && isLLMEnabled() && typeof callLLMJson === "function") {
      result = await callLLMJson(
        `Return JSON only for power/thermal estimate: {"powerBudget":{"totalMw":number,"byBlock":{"mcu":n,"radio":n,"sensors":n,"other":n}},"thermal":{"estimatedDeltaC":n,"hotspotNotes":[],"recommendedCopperPour":true,"needsHeatSink":false},"spice":{"suggestedNetlistSnippet":"...","notes":[]},"confidence":0-1,"risks":[]}\nArchitecture: ${JSON.stringify(architecture).slice(0, 1500)}\nBOM items: ${lineItems.length}\nNets: ${(schematic.nets || []).length}`
      );
    }
  } catch (_) {
    result = null;
  }

  if (!result || typeof result !== "object") {
    result = heuristicPowerThermal(lineItems);
  }

  state.spiceThermals = {
    ...result,
    meta: {
      generatedAt: new Date().toISOString(),
      mode: result._heuristic ? "heuristic" : "llm"
    }
  };

  return state;
}

module.exports = { runSpiceThermalsAgent };
