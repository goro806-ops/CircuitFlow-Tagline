const assert = require('assert');
const { generateKiCadProject, validateKiCadBundle } = require('../src/engine/kicad');

const bundle = generateKiCadProject({ architecture: { mcu: { name: 'Safe "MCU"' } } });
assert.ok(bundle.kicad_sch.startsWith('(kicad_sch'));
assert.ok(bundle.kicad_pcb.startsWith('(kicad_pcb'));
assert.deepStrictEqual(bundle.validation, validateKiCadBundle(bundle));
assert.strictEqual(bundle.validation.valid, true);
assert.ok(bundle.validation.schematic_bytes > 0);
assert.ok(bundle.validation.pcb_bytes > 0);

console.log('KiCad structural validation passed.');
