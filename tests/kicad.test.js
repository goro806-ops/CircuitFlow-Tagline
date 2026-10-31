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

console.log('KiCad structural validation passed.');
