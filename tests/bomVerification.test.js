const assert = require('assert');
const { auditBom } = require('../src/agents/bomVerification');

const blocked = auditBom({
  bom: { line_items: [{ ref: 'U1', category: 'Power', mpn: 'TBD', package: 'Module' }] }
});
assert.strictEqual(blocked.verified, false);
assert.strictEqual(blocked.status, 'BLOCKED');
assert.ok(blocked.blockers.some(item => item.includes('exact manufacturer part number')));
assert.ok(blocked.blockers.some(item => item.includes('ratings or rating evidence')));

const verified = auditBom({
  bom: { line_items: [{
    ref: 'U1',
    category: 'Power',
    manufacturer: 'Example Semiconductor',
    mpn: 'EX-1234',
    datasheet_url: 'https://vendor.example/EX-1234.pdf',
    package: 'QFN-16',
    footprint: 'Vendor:QFN-16_3x3mm_P0.5mm',
    lifecycle_status: 'active',
    verification_evidence_id: 'BOM-001',
    ratings: { vin_max: '6V' },
    spice_model: {
      id: 'example-ex-1234',
      source_url: 'https://vendor.example/models/ex-1234.lib',
      license_status: 'private-vendor-license-recorded',
      pin_map_verified: true
    }
  }] }
});
assert.strictEqual(verified.verified, true);
assert.strictEqual(verified.status, 'PASS');
assert.strictEqual(verified.blocked_count, 0);

const merged = auditBom({
  bom: { line_items: [{ ref: 'U1', manufacturer: 'Example Semiconductor', mpn: 'EX-1234', datasheet_url: 'https://vendor.example/ds.pdf', package: 'QFN', footprint: 'Vendor:QFN', lifecycle_status: 'active', verification_evidence_id: 'BOM-002' }] },
  schematic: { components: [{ ref: 'U1', category: 'MCU', pins: { power: ['VDD'] } }] }
});
assert.strictEqual(merged.component_count, 1);
assert.strictEqual(merged.components[0].category, 'MCU');

console.log('BOM manufacturer-part verification tests passed.');
