/**
 * Pricing / Distributor service (v1.7)
 *
 * - Mock catalogue (always available)
 * - Optional live adapters for DigiKey / Mouser / Octopart
 *   when the corresponding env vars are set.
 *
 * Env vars (any one enables live mode):
 *   DIGIKEY_CLIENT_ID + DIGIKEY_CLIENT_SECRET
 *   MOUSER_API_KEY
 *   OCTOPART_API_KEY
 */

const MOCK_CATALOGUE = {
  "ESP32-WROOM-32E": { mpn: "ESP32-WROOM-32E", manufacturer: "Espressif", unit_price_usd: 2.75, stock: 12500, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "nRF52840": { mpn: "nRF52840", manufacturer: "Nordic Semiconductor", unit_price_usd: 3.45, stock: 4200, lead_weeks: 2, lifecycle: "Active", distributor: "mock" },
  "STM32L4": { mpn: "STM32L476RGT6", manufacturer: "STMicroelectronics", unit_price_usd: 2.15, stock: 8900, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "STM32L476RGT6": { mpn: "STM32L476RGT6", manufacturer: "STMicroelectronics", unit_price_usd: 2.15, stock: 8900, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "RP2040": { mpn: "RP2040", manufacturer: "Raspberry Pi", unit_price_usd: 0.78, stock: 50000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "BMI270": { mpn: "BMI270", manufacturer: "Bosch", unit_price_usd: 1.72, stock: 3100, lead_weeks: 1, lifecycle: "Active", distributor: "mock" },
  "TMP117": { mpn: "TMP117AIDRVR", manufacturer: "Texas Instruments", unit_price_usd: 1.35, stock: 6700, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "TMP117AIDRVR": { mpn: "TMP117AIDRVR", manufacturer: "Texas Instruments", unit_price_usd: 1.35, stock: 6700, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "SHT40": { mpn: "SHT40-AD1B-R2", manufacturer: "Sensirion", unit_price_usd: 1.55, stock: 2400, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "SHT40-AD1B-R2": { mpn: "SHT40-AD1B-R2", manufacturer: "Sensirion", unit_price_usd: 1.55, stock: 2400, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "MAX30102": { mpn: "MAX30102EFD+", manufacturer: "Analog Devices", unit_price_usd: 3.10, stock: 1800, lead_weeks: 3, lifecycle: "Active", distributor: "mock" },
  "MAX30102EFD+": { mpn: "MAX30102EFD+", manufacturer: "Analog Devices", unit_price_usd: 3.10, stock: 1800, lead_weeks: 3, lifecycle: "Active", distributor: "mock" },
  "MAX-M10S": { mpn: "MAX-M10S", manufacturer: "u-blox", unit_price_usd: 8.20, stock: 650, lead_weeks: 4, lifecycle: "Active", distributor: "mock" },
  "TP4056 + DW01": { mpn: "TP4056", manufacturer: "Various", unit_price_usd: 0.32, stock: 100000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "TP4056": { mpn: "TP4056", manufacturer: "Various", unit_price_usd: 0.32, stock: 100000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "AP2112K-3.3": { mpn: "AP2112K-3.3TRG1", manufacturer: "Diodes Inc", unit_price_usd: 0.22, stock: 45000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" },
  "AP2112K-3.3TRG1": { mpn: "AP2112K-3.3TRG1", manufacturer: "Diodes Inc", unit_price_usd: 0.22, stock: 45000, lead_weeks: 0, lifecycle: "Active", distributor: "mock" }
};

function isLivePricingEnabled() {
  return Boolean(
    (process.env.DIGIKEY_CLIENT_ID && process.env.DIGIKEY_CLIENT_SECRET) ||
    process.env.MOUSER_API_KEY ||
    process.env.OCTOPART_API_KEY
  );
}

function getLiveProviders() {
  const providers = [];
  if (process.env.DIGIKEY_CLIENT_ID && process.env.DIGIKEY_CLIENT_SECRET) providers.push("digikey");
  if (process.env.MOUSER_API_KEY) providers.push("mouser");
  if (process.env.OCTOPART_API_KEY) providers.push("octopart");
  return providers;
}

/**
 * Live DigiKey product search (simplified).
 * Docs: https://developer.digikey.com/
 * Returns null on any failure so callers fall back to mock.
 */
async function lookupDigiKey(mpn) {
  const clientId = process.env.DIGIKEY_CLIENT_ID;
  const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    // Token
    const tokenRes = await fetch("https://api.digikey.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });
    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return null;

    // Keyword search
    const searchRes = await fetch(
      `https://api.digikey.com/products/v4/search/keyword`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-DIGIKEY-Client-Id": clientId,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          Keywords: mpn,
          RecordCount: 3
        })
      }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const product = searchData?.Products?.[0] || searchData?.products?.[0];
    if (!product) return null;

    const priceBreaks = product.PriceBreaks || product.StandardPricing || [];
    const unitPrice = priceBreaks[0]?.Price || priceBreaks[0]?.UnitPrice || null;
    const qtyAvailable = product.QuantityAvailable ?? product.QuantityAvailableForSale ?? null;

    return {
      mpn: product.ManufacturerProductNumber || product.DigiKeyProductNumber || mpn,
      manufacturer: product.Manufacturer?.Name || product.ManufacturerName || "Unknown",
      unit_price_usd: unitPrice ? Number(unitPrice) : null,
      stock: qtyAvailable,
      lead_weeks: null,
      lifecycle: product.ProductStatus || "Unknown",
      distributor: "digikey",
      source: "digikey_live"
    };
  } catch (err) {
    console.warn("[pricing] DigiKey lookup failed:", err.message);
    return null;
  }
}

/**
 * Live Mouser search (simplified).
 * Docs: https://api.mouser.com/
 */
async function lookupMouser(mpn) {
  const apiKey = process.env.MOUSER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.mouser.com/api/v1/search/keyword?apiKey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SearchByKeywordRequest: {
          keyword: mpn,
          records: 3,
          startingRecord: 0
        }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const part = data?.SearchResults?.Parts?.[0];
    if (!part) return null;

    const priceBreaks = part.PriceBreaks || [];
    const unitPrice = priceBreaks[0]?.Price ? Number(String(priceBreaks[0].Price).replace(/[^0-9.]/g, "")) : null;

    return {
      mpn: part.ManufacturerPartNumber || mpn,
      manufacturer: part.Manufacturer || "Unknown",
      unit_price_usd: unitPrice,
      stock: part.AvailabilityInStock ? Number(part.AvailabilityInStock) : null,
      lead_weeks: part.LeadTime ? parseInt(String(part.LeadTime), 10) || null : null,
      lifecycle: part.LifecycleStatus || "Unknown",
      distributor: "mouser",
      source: "mouser_live"
    };
  } catch (err) {
    console.warn("[pricing] Mouser lookup failed:", err.message);
    return null;
  }
}

async function lookupMock(mpn) {
  if (!mpn) return null;
  const key = String(mpn).trim();
  if (MOCK_CATALOGUE[key]) return { ...MOCK_CATALOGUE[key], source: "mock_catalogue" };
  const found = Object.values(MOCK_CATALOGUE).find(
    p => p.mpn.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(p.mpn.toLowerCase())
  );
  if (found) return { ...found, source: "mock_catalogue" };
  return null;
}

/**
 * Unified lookup: tries live providers first, then mock.
 */
async function lookupPart(mpn) {
  if (!mpn || mpn === "TBD" || mpn === "Various") return null;

  if (process.env.DIGIKEY_CLIENT_ID && process.env.DIGIKEY_CLIENT_SECRET) {
    const dk = await lookupDigiKey(mpn);
    if (dk && dk.unit_price_usd != null) return dk;
  }
  if (process.env.MOUSER_API_KEY) {
    const m = await lookupMouser(mpn);
    if (m && m.unit_price_usd != null) return m;
  }

  return lookupMock(mpn);
}

async function enrichBomLineItems(lineItems) {
  const enriched = [];
  let pricedCount = 0;
  let liveCount = 0;

  for (const item of lineItems) {
    const quote = await lookupPart(item.mpn);
    if (quote && quote.unit_price_usd != null) {
      pricedCount++;
      if (quote.source && quote.source.includes("live")) liveCount++;
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

  return { lineItems: enriched, pricedCount, liveCount };
}

module.exports = {
  lookupPart,
  enrichBomLineItems,
  isLivePricingEnabled,
  getLiveProviders,
  MOCK_CATALOGUE
};
