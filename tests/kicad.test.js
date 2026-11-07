const assert = require('assert');
const { generateKiCadProject, validateKiCadBundle } = require('../src/engine/kicad');
const { assessKicadSemantics } = require('../src/engine/kicadCli');
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

const semantic = assessKicadSemantics({
  'design.kicad_sch': '(kicad_sch (lib_symbols))',
  'design.kicad_pcb': '(kicad_pcb (footprint "Generated"))'
});
assert.strictEqual(semantic.meaningful, false);
assert.strictEqual(semantic.symbol_instances, 0);
assert.strictEqual(semantic.pcb_pads, 0);
assert.strictEqual(semantic.issues.length, 2);

const meaningfulSemantic = assessKicadSemantics({
  'design.kicad_sch': '(kicad_sch\n  (symbol (lib_id "Vendor:MCU"))\n)',
  'design.kicad_pcb': '(kicad_pcb\n  (footprint "Vendor:QFN"\n    (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu" "F.Paste" "F.Mask"))\n  )\n)'
});
assert.strictEqual(meaningfulSemantic.meaningful, true);
assert.strictEqual(meaningfulSemantic.symbol_instances, 1);
assert.strictEqual(meaningfulSemantic.pcb_pads, 1);
assert.deepStrictEqual(meaningfulSemantic.issues, []);

console.log('KiCad structural validation passed.');
