/**
 * Adaptive Shape & AI Design Conflict Negotiator Engine
 * CircuitFlow Platform
 */

function evaluateShapeChangeAndNegotiate(currentDesign = {}, requestedShapeChange = {}) {
  const pcb = currentDesign.pcb || {};
  const enclosure = currentDesign.enclosure || {};
  const consumer = currentDesign.consumer || {};
  const spice = currentDesign.spice || {};

  const minWallRequired = consumer.minWallThickness_mm || 2.0;
  const requiresWaterproof = consumer.derivedSpecs ? consumer.derivedSpecs.requiresGasketSeal : false;

  const newHeight_mm = requestedShapeChange.height_mm !== undefined ? requestedShapeChange.height_mm : 12.0;
  const newWall_mm = requestedShapeChange.wallThickness_mm !== undefined ? requestedShapeChange.wallThickness_mm : 2.5;
  const hasVentHoles = requestedShapeChange.hasVentHoles !== undefined ? requestedShapeChange.hasVentHoles : false;

  const conflicts = [];

  // Conflict 1: Thermal Suffocation Audit
  if (newHeight_mm < 10.0 && !hasVentHoles) {
    conflicts.push({
      id: 'THERMAL_SUFFOCATION',
      severity: 'CRITICAL',
      title: 'Enclosure Height Reduction Suffocates Active Components',
      message: `Reducing enclosure height to ${newHeight_mm}mm without thermal vents traps heat around the LDO Regulator (estimated junction temp will spike above 105°C).`,
      impact: 'Product will overheat and trigger thermal shutdown during continuous operation.'
    });
  }

  // Conflict 2: Fragility & Wall Thickness Audit
  if (newWall_mm < minWallRequired) {
    conflicts.push({
      id: 'STRUCTURAL_FRAGILITY',
      severity: 'HIGH',
      title: 'Wall Thickness Violates Consumer Durability Spec',
      message: `Requested wall thickness (${newWall_mm}mm) is lower than required for profile "${consumer.profileName || 'Rugged'}" (${minWallRequired}mm minimum).`,
      impact: 'Enclosure will crack during drop testing (MIL-STD-810H specification failure).'
    });
  }

  // Conflict 3: IP Rating Waterproof Seal Conflict
  if (requiresWaterproof && hasVentHoles) {
    conflicts.push({
      id: 'IP_SEAL_VIOLATION',
      severity: 'CRITICAL',
      title: 'Vent Grilles Violate Submersible Waterproof Spec',
      message: `Adding open air vent grilles conflicts with target rating "${consumer.ipRating || 'IP68'}".`,
      impact: 'Water ingress will short-circuit internal electronics.'
    });
  }

  // AI Negotiator Suggested Alternative Shapes & Trade-Offs
  const suggestedAlternatives = [
    {
      suggestionId: 'SUGGESTION_A_THERMAL_FINS',
      title: 'Option A: Perimeter Heat Sink Fins + Internal Heat Spreader',
      description: 'Keeps your requested ultra-thin height (8mm) while adding perimeter aluminum heat sink fins and an internal copper spreader pad.',
      tradeOffs: {
        height_mm: 8.0,
        thermalStatus: 'SAFE (68°C Junction Temp)',
        durabilityStatus: 'PASSED',
        costImpactUSD: '+$1.20 per unit'
      }
    },
    {
      suggestionId: 'SUGGESTION_B_FLEX_SPLIT',
      title: 'Option B: Flex-Rigid Dual Board Architecture',
      description: 'Splits components onto two stacked 2-layer boards connected by an FPC flex ribbon to distribute thermal hotspots evenly.',
      tradeOffs: {
        height_mm: 10.0,
        thermalStatus: 'OPTIMAL (54°C Junction Temp)',
        durabilityStatus: 'EXCELLENT',
        costImpactUSD: '+$2.50 per unit'
      }
    }
  ];

  const overallHealthScore = conflicts.length === 0 ? 100 : Math.max(30, 100 - (conflicts.length * 25));

  return {
    hasConflicts: conflicts.length > 0,
    overallHealthScore,
    conflicts,
    negotiatedAlternatives: suggestedAlternatives
  };
}

module.exports = {
  evaluateShapeChangeAndNegotiate
};
