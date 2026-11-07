'use strict';

const crypto = require('crypto');
const { assessDesignReadiness } = require('./exportKicad');
const { auditBom } = require('./bomVerification');
const { auditVendorModels } = require('../engine/vendorModels');

const REQUIRED_REVIEW_ROLES = [
  'electrical_engineer',
  'firmware_engineer',
  'mechanical_dfa_engineer',
  'manufacturing_test_engineer',
  'safety_regulatory_reviewer',
  'product_owner'
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

function designFingerprint(project = {}) {
  const designState = {
    architecture: project.architecture || null,
    bom: project.bom || null,
    schematic: project.schematic || null,
    pcb: project.pcb || null,
    firmware: project.firmware || null,
    enclosure: project.enclosure || null,
    spice_models: project.spice_models || project.spiceModels || null
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(designState))).digest('hex');
}

function releaseFingerprint(project = {}) {
  const validation = project.kicad_validation || {};
  const releaseState = {
    architecture: project.architecture || null,
    bom: project.bom || null,
    schematic: project.schematic || null,
    pcb: project.pcb || null,
    firmware: project.firmware || null,
    enclosure: project.enclosure || null,
    kicad_validation: validation && Object.keys(validation).length ? {
      status: validation.status || null,
      available: validation.available === true,
      bundle_sha256: validation.bundle_sha256 || null,
      pcb_status: validation.pcb?.status || null,
      schematic_status: validation.schematic?.status || null,
      semantic: validation.semantic || null
    } : null,
    release_evidence: project.release_evidence || null,
    spice_models: project.spice_models || project.spiceModels || null,
    spice_validation: project.spice_validation ? {
      status: project.spice_validation.status || null,
      engine: project.spice_validation.engine || null,
      analytical_fallback: project.spice_validation.analytical_fallback === true,
      netlist_sha256: project.spice_validation.netlist_sha256 || null,
      source_design_fingerprint: project.spice_validation.source_design_fingerprint || null
    } : null
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(releaseState))).digest('hex');
}

function evaluateReleaseReadiness(project = {}) {
  const blockers = [];
  const design = assessDesignReadiness(project);
  const exportReadiness = project.kicad_validation || {};
  const signoff = project.release_signoff || {};
  const evidence = project.release_evidence || {};
  const bomAudit = auditBom(project);
  const spiceAudit = auditVendorModels(project);
  const release_revision = releaseFingerprint(project);

  if (design.errors.length) blockers.push(...design.errors.map(message => `design: ${message}`));
  if (design.warnings.length && evidence.design_warnings_resolved !== true) {
    blockers.push(...design.warnings.map(message => `design: ${message}`));
  }
  if (!bomAudit.verified) blockers.push(...bomAudit.blockers.map(message => `bom: ${message}`));
  if (!spiceAudit.verified) blockers.push(...spiceAudit.blockers.map(message => `simulation: ${message}`));
  if (exportReadiness.pcb?.status !== 'PASSED') blockers.push('validation: KiCad PCB DRC is not recorded as passed for this project');
  if (exportReadiness.schematic?.status !== 'PASSED') blockers.push('validation: KiCad schematic ERC is not recorded as passed for this project');
  if (exportReadiness.semantic?.meaningful !== true) blockers.push('validation: KiCad semantic validation is not meaningful; instantiated symbols and PCB pads must be present');
  if (exportReadiness.source_design_fingerprint !== designFingerprint(project)) blockers.push('validation: recorded KiCad result is stale; re-run server validation for the current design inputs');
  const spiceValidation = project.spice_validation || {};
  if (spiceValidation.status !== 'CONVERGED' || spiceValidation.analytical_fallback === true) blockers.push('validation: a current real-solver SPICE result is not recorded for this design');
  if (spiceValidation.source_design_fingerprint !== designFingerprint(project)) blockers.push('validation: recorded SPICE result is stale; re-run server validation for the current design inputs');
  if (evidence.applicability_confirmed !== true) blockers.push('compliance: target markets and applicable requirements are not confirmed');
  if (evidence.part_verification_complete !== true) blockers.push('bom: manufacturer part numbers, datasheets, lifecycle status, and footprints are not verified');
  if (evidence.spice_model_provenance_complete !== true) blockers.push('simulation: vendor-model provenance and license records are not complete, or not-applicable rationale is missing');
  if (evidence.lab_reports_complete !== true) blockers.push('compliance: required laboratory reports are not recorded as complete');
  if (evidence.material_battery_complete !== true) blockers.push('compliance: material, battery, and transport evidence is not complete or marked not applicable');
  if (evidence.user_docs_complete !== true) blockers.push('compliance: user warnings, labels, and instructions are not approved');

  for (const role of REQUIRED_REVIEW_ROLES) {
    const entry = signoff[role];
    if (!entry || entry.decision !== 'approved' || !entry.name || !entry.evidence || entry.conflict_disclosed !== true || entry.reviewed_revision !== release_revision || !entry.signed_by || !entry.signed_at) {
      blockers.push(`human sign-off: ${role} requires authenticated reviewer identity, timestamp, approval, evidence, conflict disclosure, and a reviewed revision matching ${release_revision}`);
    }
  }

  return {
    production_ready: blockers.length === 0,
    status: blockers.length === 0 ? 'PRODUCTION_READY_PENDING_RELEASE_RECORD' : 'BLOCKED_PENDING_HUMAN_AND_EVIDENCE_GATES',
    blockers,
    release_revision,
    required_review_roles: REQUIRED_REVIEW_ROLES,
    automated_design_assessment: design,
    automated_bom_audit: bomAudit,
    automated_spice_model_audit: spiceAudit
  };
}

module.exports = { REQUIRED_REVIEW_ROLES, canonicalize, designFingerprint, releaseFingerprint, evaluateReleaseReadiness };
