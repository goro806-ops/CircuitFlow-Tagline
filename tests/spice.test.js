const assert = require('assert');
const { runSimulationAndThermal } = require('../src/engine/spice');
const { auditVendorModels } = require('../src/engine/vendorModels');

const result = runSimulationAndThermal(
  { mcu: { name: 'nRF52840' }, powerBudget: { totalPower_mW: 120 } },
  {},
  {},
  { height_mm: 12 }
);

assert.ok(result.spiceNetlist.includes('.OP'));
assert.ok(result.simulation);
assert.strictEqual(typeof result.simulation.available, 'boolean');
assert.strictEqual(typeof result.simulation.analytical_fallback, 'boolean');
assert.ok(['ngspice', 'analytical_estimate'].includes(result.simulation.engine));
assert.ok(result.nodeVoltages['VCC (3.3V Rail)']);

assert.strictEqual(auditVendorModels({}).verified, false);
assert.strictEqual(auditVendorModels({ release_evidence: {
  spice_model_not_applicable: true,
  spice_model_not_applicable_rationale: 'No vendor macromodel is used; analytical checks are documented.'
} }).status, 'NOT_APPLICABLE');

console.log(`SPICE validation mode: ${result.simulation.engine} (${result.simulation.status})`);
