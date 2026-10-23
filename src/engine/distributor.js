/**
 * Live Distributor Cart Sync & Instant Turnkey Quote Engine
 * CircuitFlow Platform
 */

function generateDistributorQuotes(bom = {}, pcb = {}) {
  const bomCostUSD = bom.summary ? bom.summary.unitCostUSD : 10.0;
  const boardCount = 10; // Default small batch prototype size

  // 1. Distributor Cart Sync Stubs
  const distributorCarts = [
    {
      distributor: 'DigiKey',
      cartUrl: 'https://www.digikey.com/en/cart/sync?id=CF_7894231',
      supportedItems: bom.items ? bom.items.length : 5,
      totalComponentCostUSD: parseFloat((bomCostUSD * boardCount * 1.05).toFixed(2)),
      estimatedDeliveryDays: 2
    },
    {
      distributor: 'Mouser Electronics',
      cartUrl: 'https://www.mouser.com/cart/import?id=CF_7894231',
      supportedItems: bom.items ? bom.items.length : 5,
      totalComponentCostUSD: parseFloat((bomCostUSD * boardCount * 1.08).toFixed(2)),
      estimatedDeliveryDays: 2
    }
  ];

  // 2. Turnkey PCB Fab & Assembly Quotes (JLCPCB & PCBWay)
  const turnkeyQuotes = [
    {
      manufacturer: 'JLCPCB',
      pcbFabCostUSD: 5.00,
      pcbaAssemblySetupUSD: 30.00,
      componentsCostUSD: parseFloat((bomCostUSD * boardCount * 0.95).toFixed(2)),
      totalTurnkeyCostUSD: parseFloat((5.00 + 30.00 + (bomCostUSD * boardCount * 0.95)).toFixed(2)),
      turnaroundDays: 5,
      shippingCarrier: 'DHL Express ($22.00)'
    },
    {
      manufacturer: 'PCBWay',
      pcbFabCostUSD: 10.00,
      pcbaAssemblySetupUSD: 35.00,
      componentsCostUSD: parseFloat((bomCostUSD * boardCount * 1.02).toFixed(2)),
      totalTurnkeyCostUSD: parseFloat((10.00 + 35.00 + (bomCostUSD * boardCount * 1.02)).toFixed(2)),
      turnaroundDays: 4,
      shippingCarrier: 'FedEx International ($25.00)'
    }
  ];

  return {
    batchQuantity: boardCount,
    distributorCarts,
    turnkeyQuotes
  };
}

module.exports = {
  generateDistributorQuotes
};
