const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runSimulationAndThermal } = require('../src/engine/spice');
const { auditVendorModels } = require('../src/engine/vendorModels');
const { ingest } = require('../scripts/ingest-spice-model');

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

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'circuitflow-spice-'));
const sourceModel = path.join(tempRoot, 'vendor.lib');
fs.writeFileSync(sourceModel, '* private test model\n.model TEST D(Is=1e-12)\n');
const manifest = ingest({
  file: sourceModel,
  id: 'test-private-model',
  'source-url': 'https://vendor.example/model',
  'license-status': 'private-use-approved',
  dialect: 'ngspice',
  'pin-order': '1=anode,2=cathode',
  'validation-evidence-id': 'SPICE-001',
  root: tempRoot
});
assert.ok(/^[a-f0-9]{64}$/.test(manifest.sha256));
assert.ok(fs.existsSync(manifest.artifact_path));
assert.ok(fs.existsSync(manifest.manifest_path));
const blockedArtifact = auditVendorModels({ spice_models: [{
  id: 'renesas-raa214023', ref: 'U_REG', source_url: 'https://vendor.example/model',
  license_status: 'private-use-approved', dialect: 'ngspice', pin_order: '1=VIN',
  artifact_path: path.join(tempRoot, 'missing.lib'), sha256: manifest.sha256,
  validation_evidence_id: 'SPICE-001', pin_map_verified: true, validation_evidence: ['SPICE-001']
}] });
assert.strictEqual(blockedArtifact.verified, false);
assert.ok(blockedArtifact.blockers.some(item => item.includes('not accessible')));

console.log(`SPICE validation mode: ${result.simulation.engine} (${result.simulation.status})`);
