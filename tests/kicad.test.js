const assert = require('assert');
const { generateKiCadProject, validateKiCadBundle } = require('../src/engine/kicad');
const { assessDesignReadiness } = require('../src/agents/exportKicad');

const bundle = generateKiCadProject({ architecture: { mcu: { name: 'Safe "MCU"' } } });
assert.ok(bundle.kicad_sch.startsWith('(kicad_sch'));
assert.ok(bundle.kicad_pcb.startsWith('(kicad_pcb'));
assert.deepStrictEqual(bundle.validation, validateKiCadBundle(bundle));
assert.strictEqual(bundle.validation.valid, true);
assert.ok(bundle.validation.schematic_bytes > 0);
assert.ok(bundle.validation.pcb_bytes > 0);

const readiness = assessDesignReadiness({
  schematic: { components: [{ ref: 'U1', mpn: 'TBD', footprint: 'Module' }], nets: [] },
  pcb: { placements: [] }
});
assert.strictEqual(readiness.status, 'BLOCKED');
assert.ok(readiness.errors.length > 0);
assert.ok(readiness.errors.some(error => error.includes('PCB placements missing for: U1')));
assert.ok(readiness.warnings.length > 0);

const verified = assessDesignReadiness({
  schematic: {
    components: [{
      ref: 'U1', mpn: 'ABC-123', footprint: 'Vendor:QFN-16_3x3mm_P0.5mm', footprint_verified: true,
      symbol_library_id: 'Vendor_MCU:ABC-123', symbol_name: 'ABC-123', pin_map_verified: true,
      pins: { '1': 'VCC' }
    }],
    nets: [{ name: 'VCC', connected: ['U1.1'] }]
  },
  pcb: { placements: [{ ref: 'U1', x_mm: 10, y_mm: 10 }] }
});
assert.ok(!verified.warnings.some(warning => warning.includes('verified KiCad symbol library assignment')));
assert.ok(!verified.warnings.some(warning => warning.includes('Schematic export is netlist-only')));

console.log('KiCad structural validation passed.');
