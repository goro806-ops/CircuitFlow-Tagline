'use strict';

const PLACEHOLDER = /^(?:tbd|to[-_ ]?be[-_ ]?determined|generic|various|unknown|n\/a|na|module|pending|select)$/i;
const URL_RE = /^https:\/\/[^\s]+$/i;
const REQUIRED_FIELDS = [
  ['manufacturer', 'manufacturer/vendor'],
  ['mpn', 'exact manufacturer part number'],
  ['datasheet_url', 'manufacturer datasheet URL'],
  ['package', 'manufacturer package'],
  ['footprint', 'reviewed KiCad footprint'],
  ['lifecycle_status', 'lifecycle status'],
  ['verification_evidence_id', 'verification evidence ID']
];

function valueOf(item, keys) {
  for (const key of keys) {
    if (item && item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') return item[key];
  }
  return null;
}

function isPlaceholder(value) {
  return value === null || value === undefined || PLACEHOLDER.test(String(value).trim());
}

function auditComponent(item = {}, source = 'bom.line_items') {
  const ref = String(item.ref || item.reference || 'UNREFERENCED').trim();
  const issues = [];
  const warnings = [];
  const manufacturer = valueOf(item, ['manufacturer', 'vendor', 'maker']);
  const mpn = valueOf(item, ['mpn', 'manufacturer_part_number', 'part_number']);
  const footprint = valueOf(item, ['footprint', 'kicad_footprint']);
  const packageName = valueOf(item, ['package', 'package_name', 'package_type']);
  const datasheet = valueOf(item, ['datasheet_url', 'datasheet', 'datasheetUrl']);
  const evidenceId = valueOf(item, ['verification_evidence_id', 'evidence_id', 'verificationEvidenceId']);
  const lifecycle = valueOf(item, ['lifecycle_status', 'lifecycle', 'status']);
  const category = String(item.category || '').trim();
  const safetyCritical = Boolean(item.safety_critical || /battery|charger|power|protection|isolation|rf|radio|thermal/i.test(category));

  for (const [keys, label] of REQUIRED_FIELDS) {
    const aliases = [keys];
    const field = valueOf(item, aliases);
    if (isPlaceholder(field)) issues.push(`${label} is missing or placeholder`);
  }
  if (datasheet && !URL_RE.test(String(datasheet))) issues.push('datasheet URL must use HTTPS');
  if (evidenceId && String(evidenceId).length < 3) issues.push('verification evidence ID is too short');
  if (lifecycle && /unknown|tbd|obsolete|eol|pending/i.test(String(lifecycle))) warnings.push(`lifecycle status requires disposition: ${lifecycle}`);
  if (!item.package && item.footprint) warnings.push('package field is absent even though a footprint is present');
  if (safetyCritical && !valueOf(item, ['ratings', 'electrical_ratings', 'rating_evidence_id'])) {
    issues.push('safety-critical component lacks ratings or rating evidence');
  }

  const spice = item.spice_model || item.spiceModel;
  if (spice) {
    for (const [field, label] of [
      ['id', 'SPICE model ID'],
      ['source_url', 'SPICE model source URL'],
      ['license_status', 'SPICE model license status'],
      ['pin_map_verified', 'SPICE model pin-map verification']
    ]) {
      if (field === 'pin_map_verified' ? spice[field] !== true : isPlaceholder(spice[field])) {
        issues.push(`${label} is missing or unverified`);
      }
    }
    if (spice.source_url && !URL_RE.test(String(spice.source_url))) issues.push('SPICE model source URL must use HTTPS');
  }

  return {
    ref,
    category: category || null,
    source,
    manufacturer: manufacturer || null,
    mpn: mpn || null,
    footprint: footprint || null,
    datasheet_url: datasheet || null,
    evidence_id: evidenceId || null,
    safety_critical: safetyCritical,
    status: issues.length ? 'BLOCKED' : warnings.length ? 'REVIEW_REQUIRED' : 'VERIFIED_CANDIDATE',
    issues,
    warnings
  };
}

function collectComponents(project = {}) {
  const lineItems = Array.isArray(project)
    ? project
    : project.bom?.line_items || project.bom?.items || project.line_items || project.items || [];
  const schematic = project.schematic?.components || [];
  const byRef = new Map();
  for (const item of lineItems) byRef.set(item.ref || item.reference, { ...item });
  for (const component of schematic) {
    const key = component.ref || component.reference;
    if (!key) continue;
    byRef.set(key, { ...(byRef.get(key) || {}), ...component });
  }
  return [...byRef.values()];
}

function auditBom(project = {}) {
  const components = collectComponents(project);
  const componentReports = components.map(item => auditComponent(item));
  const missingRefs = componentReports.filter(report => report.ref === 'UNREFERENCED').length;
  const blockers = componentReports.flatMap(report => report.issues.map(issue => `${report.ref}: ${issue}`));
  const warnings = componentReports.flatMap(report => report.warnings.map(warning => `${report.ref}: ${warning}`));
  if (!components.length) blockers.push('BOM contains no components');
  if (missingRefs) blockers.push(`${missingRefs} component(s) have no reference designator`);
  return {
    gate: 'manufacturer-part-verification',
    verified: blockers.length === 0,
    status: blockers.length ? 'BLOCKED' : warnings.length ? 'REVIEW_REQUIRED' : 'PASS',
    component_count: components.length,
    blocked_count: componentReports.filter(report => report.status === 'BLOCKED').length,
    warning_count: warnings.length,
    blockers,
    warnings,
    components: componentReports
  };
}

module.exports = { auditBom, auditComponent, collectComponents, REQUIRED_FIELDS };
