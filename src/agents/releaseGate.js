'use strict';

const { assessDesignReadiness } = require('./exportKicad');

const REQUIRED_REVIEW_ROLES = [
  'electrical_engineer',
  'firmware_engineer',
  'mechanical_dfa_engineer',
  'manufacturing_test_engineer',
  'safety_regulatory_reviewer',
  'product_owner'
];

function evaluateReleaseReadiness(project = {}) {
  const blockers = [];
  const design = assessDesignReadiness(project);
  const exportReadiness = project.kicad_validation || {};
  const signoff = project.release_signoff || {};
  const evidence = project.release_evidence || {};

  if (design.errors.length) blockers.push(...design.errors.map(message => `design: ${message}`));
  if (design.warnings.length && evidence.design_warnings_resolved !== true) {
    blockers.push(...design.warnings.map(message => `design: ${message}`));
  }
  if (exportReadiness.pcb?.status !== 'PASSED') blockers.push('validation: KiCad PCB DRC is not recorded as passed for this project');
  if (exportReadiness.schematic?.status !== 'PASSED') blockers.push('validation: KiCad schematic ERC is not recorded as passed for this project');
  if (evidence.applicability_confirmed !== true) blockers.push('compliance: target markets and applicable requirements are not confirmed');
  if (evidence.part_verification_complete !== true) blockers.push('bom: manufacturer part numbers, datasheets, lifecycle status, and footprints are not verified');
  if (evidence.spice_model_provenance_complete !== true) blockers.push('simulation: vendor-model provenance and license records are not complete, or not-applicable rationale is missing');
  if (evidence.lab_reports_complete !== true) blockers.push('compliance: required laboratory reports are not recorded as complete');
  if (evidence.material_battery_complete !== true) blockers.push('compliance: material, battery, and transport evidence is not complete or marked not applicable');
  if (evidence.user_docs_complete !== true) blockers.push('compliance: user warnings, labels, and instructions are not approved');

  for (const role of REQUIRED_REVIEW_ROLES) {
    const entry = signoff[role];
    if (!entry || entry.decision !== 'approved' || !entry.name || !entry.evidence) {
      blockers.push(`human sign-off: ${role} requires an approver, approved decision, and evidence link`);
    }
  }

  return {
    production_ready: blockers.length === 0,
    status: blockers.length === 0 ? 'PRODUCTION_READY_PENDING_RELEASE_RECORD' : 'BLOCKED_PENDING_HUMAN_AND_EVIDENCE_GATES',
    blockers,
    required_review_roles: REQUIRED_REVIEW_ROLES,
    automated_design_assessment: design
  };
}

module.exports = { REQUIRED_REVIEW_ROLES, evaluateReleaseReadiness };
