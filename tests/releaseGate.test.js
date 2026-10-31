const assert = require('assert');
const { evaluateReleaseReadiness, REQUIRED_REVIEW_ROLES } = require('../src/agents/releaseGate');

const blocked = evaluateReleaseReadiness({
  schematic: { components: [{ ref: 'U1', mpn: 'TBD', footprint: 'Module' }], nets: [] },
  pcb: { placements: [] }
});
assert.strictEqual(blocked.production_ready, false);
assert.strictEqual(blocked.status, 'BLOCKED_PENDING_HUMAN_AND_EVIDENCE_GATES');
assert.ok(blocked.blockers.some(item => item.includes('human sign-off')));
assert.ok(blocked.blockers.some(item => item.includes('target markets')));

const complete = {
  schematic: {
    components: [{ ref: 'U1', mpn: 'ABC-123', footprint: 'Generated_Footprint', pins: { '1': 'VCC' } }],
    nets: [{ name: 'VCC', connected: ['U1.1'] }]
  },
  pcb: { placements: [{ ref: 'U1', x_mm: 10, y_mm: 10 }] },
  kicad_validation: {
    pcb: { status: 'PASSED' },
    schematic: { status: 'PASSED' }
  },
  release_evidence: {
    design_warnings_resolved: true,
    applicability_confirmed: true,
    lab_reports_complete: true,
    material_battery_complete: true,
    user_docs_complete: true
  },
  release_signoff: Object.fromEntries(REQUIRED_REVIEW_ROLES.map(role => [role, {
    name: `Reviewer for ${role}`,
    evidence: `EVID-${role}`,
    decision: 'approved'
  }]))
};
const ready = evaluateReleaseReadiness(complete);
assert.strictEqual(ready.production_ready, true);
assert.strictEqual(ready.blockers.length, 0);

console.log('Release readiness gate tests passed.');
