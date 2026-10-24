/**
 * CircuitFlow - Business Model & Monetization Engine
 * Implements Section 8 of README.md:
 * 1. Developer Tier ($0/mo, $49 pay-per-export)
 * 2. Pro Tier ($199/mo, 5 free exports/mo, $39 additional)
 * 3. Enterprise Tier ($999/mo, unlimited exports, custom SLAs & dedicated HITL review)
 * 4. Turnkey Fulfillment & Sourcing Margin (5%-15% NRE & sourcing markup)
 */

const TIERS = {
  developer: {
    id: 'developer',
    name: 'Developer / Creator Tier',
    monthlyPrice: 0,
    freeExportsPerMonth: 0,
    exportFee: 49.00,
    fulfillmentMarginRate: 0.15, // 15% sourcing & fab margin
    features: [
      'Unlimited Block Diagrams & Specs Synthesis',
      'Community Forum Access & Public Project Hosting',
      'Standard AI Generation & SPICE Thermal Simulation',
      'Pay-per-export download ($49 / package)'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro Hardware Engineer Tier',
    monthlyPrice: 199.00,
    freeExportsPerMonth: 5,
    exportFee: 39.00,
    fulfillmentMarginRate: 0.10, // 10% sourcing & fab margin
    features: [
      'Everything in Developer Tier',
      '5 Included Production Release Package Exports / month',
      'Private Hardware Repositories & Cloud Firmware Compilation',
      'KiCad Native Gerber & CadQuery STEP CAD Export',
      'Real-Time BOM Stock & Price Tracking'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise / Hardware Team Tier',
    monthlyPrice: 999.00,
    freeExportsPerMonth: Infinity,
    exportFee: 0.00,
    fulfillmentMarginRate: 0.05, // 5% bulk sourcing & fab margin
    features: [
      'Unlimited Private Release Exports & Custom Component Library Hosting',
      'Dedicated Human-In-The-Loop (HITL) Senior EE Review & Sign-Off',
      'Multi-Board & Rigid-Flex Systems Engine Access',
      'Dedicated SLA, SOC2 Security, SSO & Team Collaboration Logs',
      'Preferred Turnkey Assembly & Fab Discounts (5% margin)'
    ]
  }
};

/**
 * Gets available subscription tiers and pricing
 */
function getSubscriptionTiers() {
  return TIERS;
}

/**
 * Validates export eligibility for a given user tier and monthly export usage count.
 * @param {string} tierId - 'developer' | 'pro' | 'enterprise'
 * @param {number} currentMonthExports - number of exports performed this month
 */
function calculateExportCost(tierId = 'developer', currentMonthExports = 0) {
  const tier = TIERS[tierId] || TIERS.developer;

  if (currentMonthExports < tier.freeExportsPerMonth) {
    return {
      tierId: tier.id,
      tierName: tier.name,
      chargeAmount: 0.00,
      isFreeExport: true,
      remainingFreeExports: tier.freeExportsPerMonth === Infinity ? 'Unlimited' : tier.freeExportsPerMonth - currentMonthExports - 1,
      message: `Export included in your ${tier.name} plan subscription.`
    };
  }

  return {
    tierId: tier.id,
    tierName: tier.name,
    chargeAmount: tier.exportFee,
    isFreeExport: false,
    remainingFreeExports: 0,
    message: `Pay-per-export fee of $${tier.exportFee.toFixed(2)} USD applies for ${tier.name}.`
  };
}

/**
 * Calculates turn-key manufacturing order quote including component sourcing,
 * PCB fabrication, PCBA assembly, and CircuitFlow fulfillment margin.
 * @param {Object} projectData - BOM cost, unit quantity, board dimensions
 * @param {string} tierId - User subscription tier
 */
function calculateTurnkeyQuote(projectData = {}, tierId = 'developer') {
  const tier = TIERS[tierId] || TIERS.developer;
  const quantity = projectData.quantity || 100;
  const bomUnitCost = projectData.bomUnitCost || 12.50;

  const totalBOMCost = bomUnitCost * quantity;
  const pcbFabCost = Math.max(50, quantity * 2.50); // $2.50 / board, min $50
  const pcbaAssemblyCost = Math.max(100, quantity * 4.00); // $4.00 / board assembly, min $100
  const nreSetupFee = quantity >= 1000 ? 0 : 150.00; // $150 stencil & tooling NRE under 1k units

  const subtotalDirectCost = totalBOMCost + pcbFabCost + pcbaAssemblyCost + nreSetupFee;
  const fulfillmentMargin = subtotalDirectCost * tier.fulfillmentMarginRate;
  const totalTurnkeyCost = subtotalDirectCost + fulfillmentMargin;
  const unitTurnkeyCost = totalTurnkeyCost / quantity;

  return {
    tierId: tier.id,
    quantity,
    costBreakdown: {
      bomComponentsCost: Math.round(totalBOMCost * 100) / 100,
      pcbFabricationCost: Math.round(pcbFabCost * 100) / 100,
      pcbaAssemblyCost: Math.round(pcbaAssemblyCost * 100) / 100,
      nreToolingFee: Math.round(nreSetupFee * 100) / 100,
      subtotalDirectCost: Math.round(subtotalDirectCost * 100) / 100,
      circuitflowFulfillmentMargin: Math.round(fulfillmentMargin * 100) / 100,
      marginPercentage: `${(tier.fulfillmentMarginRate * 100).toFixed(0)}%`
    },
    totalTurnkeyCost: Math.round(totalTurnkeyCost * 100) / 100,
    unitTurnkeyCost: Math.round(unitTurnkeyCost * 100) / 100,
    estimatedTurnaroundDays: quantity <= 100 ? 7 : (quantity <= 1000 ? 12 : 20)
  };
}

module.exports = {
  TIERS,
  getSubscriptionTiers,
  calculateExportCost,
  calculateTurnkeyQuote
};
