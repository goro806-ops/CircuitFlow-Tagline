const assert = require('assert');
const { evaluateReleaseReadiness, releaseFingerprint, designFingerprint, REQUIRED_REVIEW_ROLES } = require('../src/agents/releaseGate');

const blocked = evaluateReleaseReadiness({
  schematic: { components: [{ ref: 'U1', mpn: 'TBD', footprint: 'Module' }], nets: [] },
  pcb: { placements: [] }
});
assert.strictEqual(blocked.production_ready, false);
assert.strictEqual(blocked.status, 'BLOCKED_PENDING_HUMAN_AND_EVIDENCE_GATES');
assert.ok(blocked.blockers.some(item => item.includes('human sign-off')));
assert.ok(blocked.blockers.some(item => item.includes('target markets')));

const complete = {
  bom: { line_items: [{
    ref: 'U1',
    category: 'MCU',
    manufacturer: 'Example Semiconductor',
    mpn: 'ABC-123',
    datasheet_url: 'https://vendor.example/ABC-123.pdf',
    package: 'QFN-16',
    footprint: 'Vendor:QFN-16_3x3mm_P0.5mm',
    lifecycle_status: 'active',
    verification_evidence_id: 'BOM-001'
  }] },
  schematic: {
    components: [{
      ref: 'U1', mpn: 'ABC-123', footprint: 'Vendor:QFN-16_3x3mm_P0.5mm', footprint_verified: true,
      symbol_library_id: 'Vendor_MCU:ABC-123', symbol_name: 'ABC-123', pin_map_verified: true,
      pins: { '1': 'VCC' }
    }],
    nets: [{ name: 'VCC', connected: ['U1.1'] }]
  },
  pcb: { placements: [{ ref: 'U1', x_mm: 10, y_mm: 10 }] },
  kicad_validation: {
    pcb: { status: 'PASSED' },
    schematic: { status: 'PASSED' },
    semantic: { meaningful: true, symbol_instances: 1, pcb_pads: 1, issues: [] }
  },
  release_evidence: {
    design_warnings_resolved: true,
    applicability_confirmed: true,
    part_verification_complete: true,
    spice_model_provenance_complete: true,
    spice_model_not_applicable: true,
    spice_model_not_applicable_rationale: 'No vendor macromodel is used in this validated fixture; analytical checks are documented.',
    lab_reports_complete: true,
    material_battery_complete: true,
    user_docs_complete: true
  },
  release_signoff: {}
};
complete.kicad_validation.source_design_fingerprint = designFingerprint(complete);
complete.release_signoff = Object.fromEntries(REQUIRED_REVIEW_ROLES.map(role => [role, {
  name: `Reviewer for ${role}`,
  evidence: `EVID-${role}`,
  decision: 'approved',
  conflict_disclosed: true,
  reviewed_revision: releaseFingerprint(complete),
  signed_by: `usr-${role}`,
  signed_at: '2026-11-06T00:00:00.000Z'
}]));
const ready = evaluateReleaseReadiness(complete);
assert.strictEqual(ready.production_ready, true);
assert.strictEqual(ready.blockers.length, 0);

const changed = JSON.parse(JSON.stringify(complete));
changed.bom.line_items[0].mpn = 'ABC-124';
const stale = evaluateReleaseReadiness(changed);
assert.notStrictEqual(stale.release_revision, ready.release_revision);
assert.ok(stale.blockers.some(item => item.includes('reviewed revision matching')));
assert.ok(stale.blockers.some(item => item.includes('recorded KiCad result is stale')));

const unaudited = JSON.parse(JSON.stringify(complete));
delete unaudited.release_signoff.electrical_engineer.signed_by;
const unauditedResult = evaluateReleaseReadiness(unaudited);
assert.ok(unauditedResult.blockers.some(item => item.includes('authenticated reviewer identity')));

const structuralOnly = JSON.parse(JSON.stringify(complete));
structuralOnly.kicad_validation.semantic = { meaningful: false, symbol_instances: 0, pcb_pads: 0, issues: ['schematic contains no instantiated KiCad symbols'] };
const structuralOnlyResult = evaluateReleaseReadiness(structuralOnly);
assert.ok(structuralOnlyResult.blockers.some(item => item.includes('KiCad semantic validation is not meaningful')));

const sameEvidence = JSON.parse(JSON.stringify(complete));
sameEvidence.kicad_validation.recorded_at = '2030-01-01T00:00:00.000Z';
sameEvidence.kicad_validation.recorded_by = 'usr-different-recorder';
assert.strictEqual(releaseFingerprint(sameEvidence), releaseFingerprint(complete));

console.log('Release readiness gate tests passed.');
