/**
 * Pricing / Distributor service (v1)
 *
 * Provides a clean interface for looking up part pricing and availability.
 * Currently uses a realistic mock catalogue. Designed so DigiKey / Mouser /
 * Octopart adapters can be plugged in later without changing agents.
 */

const MOCK_CATALOGUE = {
  "ESP32-WROOM-32E": { mpn: "ESP32-WROOM-32E", manufacturer: "Espressif", unit_price_usd: 2.75, stock: 12500, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "nRF52840": { mpn: "nRF52840", manufacturer: "Nordic Semiconductor", unit_price_usd: 3.45, stock: 4200, lead_weeks: 2, lifecycle: "Active", distributor: "mock" },
  "STM32L4": { mpn: "STM32L476RGT6", manufacturer: "STMicroelectronics", unit_price_usd: 2.15, stock: 8900, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "RP2040": { mpn: "RP2040", manufacturer: "Raspberry Pi", unit_price_usd: 0.78, stock: 50000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "BMI270": { mpn: "BMI270", manufacturer: "Bosch", unit_price_usd: 1.72, stock: 3100, lead_weeks: 1, lifecycle: "Active", distributor: "mock" },
  "TMP117": { mpn: "TMP117AIDRVR", manufacturer: "Texas Instruments", unit_price_usd: 1.35, stock: 6700, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "SHT40": { mpn: "SHT40-AD1B-R2", manufacturer: "Sensirion", unit_price_usd: 1.55, stock: 2400, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "MAX30102": { mpn: "MAX30102EFD+", manufacturer: "Analog Devices", unit_price_usd: 3.10, stock: 1800, lead_weeks: 3, lifecycle: "Active", distributor: "mock" },
  "MAX-M10S": { mpn: "MAX-M10S", manufacturer: "u-blox", unit_price_usd: 8.20, stock: 650, lead_weeks: 4, lifecycle: "Active", distributor: "mock" },
  "TP4056 + DW01": { mpn: "TP4056", manufacturer: "Various", unit_price_usd: 0.32, stock: 100000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "AP2112K-3.3": { mpn: "AP2112K-3.3TRG1", manufacturer: "Diodes Inc", unit_price_usd: 0.22, stock: 45000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" }
};

/**
 * Look up a single MPN. Returns null if unknown.
 * Later: call real distributor APIs here.
 */
async function lookupPart(mpn) {
  if (!mpn) return null;
  const key = String(mpn).trim();
  // Exact match first
  if (MOCK_CATALOGUE[key]) {
    return { ...MOCK_CATALOGUE[key], source: "mock_catalogue" };
  }
  // Fuzzy: try to find by partial MPN
  const found = Object.values(MOCK_CATALOGUE).find(
    p => p.mpn.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(p.mpn.toLowerCase())
  );
  if (found) return { ...found, source: "mock_catalogue" };
  return null;
}

/**
 * Enrich an array of BOM line items with live-style pricing.
 * Mutates prices where a match is found and adds stock/lead info.
 */
async function enrichBomLineItems(lineItems) {
  const enriched = [];
  let pricedCount = 0;

  for (const item of lineItems) {
    const quote = await lookupPart(item.mpn);
    if (quote) {
      pricedCount++;
      enriched.push({
        ...item,
        unit_price_usd: quote.unit_price_usd,
        stock: quote.stock,
        lead_weeks: quote.lead_weeks,
        lifecycle: quote.lifecycle || item.lifecycle || "Active",
        manufacturer: quote.manufacturer || item.manufacturer,
        pricing_source: quote.source || "mock",
        distributor: quote.distributor || "mock"
      });
    } else {
      enriched.push({
        ...item,
        stock: null,
        lead_weeks: null,
        pricing_source: "estimate",
        distributor: null
      });
    }
  }

  return { lineItems: enriched, pricedCount };
}

function isLivePricingEnabled() {
  // Future: return true when real API keys are present
  return Boolean(process.env.DIGIKEY_CLIENT_ID || process.env.MOUSER_API_KEY || process.env.OCTOPART_API_KEY);
}

module.exports = {
  lookupPart,
  enrichBomLineItems,
  isLivePricingEnabled,
  MOCK_CATALOGUE // exported for tests
};
