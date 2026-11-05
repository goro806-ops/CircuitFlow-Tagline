const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const registryPath = path.join(__dirname, '..', '..', 'models', 'spice', 'registry.json');
const PLACEHOLDER = /^(?:tbd|to[-_ ]?be[-_ ]?determined|generic|unknown|n\/a|na|pending|not[-_ ]?ingested|source[-_ ]?available[-_ ]?not[-_ ]?ingested)$/i;

function loadVendorModelRegistry() {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    if (!registry || !Array.isArray(registry.models)) throw new Error('invalid vendor model registry');
    return registry;
  } catch (error) {
    return { schema_version: 1, models: [], error: error.message };
  }
}

function getVendorModel(id) {
  return loadVendorModelRegistry().models.find((model) => model.id === id) || null;
}

function present(value) {
  return value !== undefined && value !== null && String(value).trim() !== '' && !PLACEHOLDER.test(String(value).trim());
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isWithinRoot(filePath, root) {
  const relative = path.relative(path.resolve(root), path.resolve(filePath));
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function collectModelReferences(project = {}) {
  const components = [
    ...(project.bom?.line_items || project.bom?.items || []),
    ...(project.schematic?.components || [])
  ];
  const references = [];
  for (const component of components) {
    const model = component.spice_model || component.spiceModel;
    if (model) references.push({ ref: component.ref || component.reference || 'UNREFERENCED', model });
  }
  for (const model of project.spice_models || project.spiceModels || []) {
    references.push({ ref: model.ref || model.reference || model.id || 'PROJECT_MODEL', model });
  }
  return references;
}

function auditVendorModels(project = {}) {
  const references = collectModelReferences(project);
  const evidence = project.release_evidence || {};
  const blockers = [];
  const warnings = [];
  if (!references.length) {
    const rationale = evidence.spice_model_not_applicable_rationale;
    if (evidence.spice_model_not_applicable !== true || !present(rationale)) {
      blockers.push('No vendor SPICE models are recorded and no approved not-applicable rationale is present');
    }
    return {
      gate: 'vendor-spice-model-provenance', status: blockers.length ? 'BLOCKED' : 'NOT_APPLICABLE',
      verified: blockers.length === 0, model_count: 0, blockers, warnings, models: []
    };
  }

  const models = references.map(({ ref, model }) => {
    const issues = [];
    const registry = model.id ? getVendorModel(model.id) : null;
    if (!registry) issues.push('model ID is not present in the approved vendor registry');
    if (registry && registry.status !== 'private-ingested-validated') {
      issues.push(`registry status is not private-ingested-validated: ${registry.status}`);
    }
    for (const [field, label] of [
      ['source_url', 'official source URL'], ['license_status', 'license status'],
      ['dialect', 'simulator dialect'], ['pin_order', 'verified pin order'],
      ['artifact_path', 'private artifact path'], ['validation_evidence_id', 'validation evidence ID']
    ]) {
      if (!present(model[field])) issues.push(`${label} is missing or placeholder`);
    }
    if (model.source_url && !/^https:\/\/[^\s]+$/i.test(String(model.source_url))) issues.push('source URL must use HTTPS');
    if (!/^[a-f0-9]{64}$/i.test(String(model.sha256 || ''))) issues.push('artifact SHA-256 is missing or invalid');
    if (present(model.artifact_path)) {
      try {
        const modelRoot = process.env.SPICE_MODEL_ROOT || '/var/lib/circuitflow/spice';
        if (!isWithinRoot(model.artifact_path, modelRoot)) issues.push('private artifact path is outside the configured model volume');
        if (!fs.statSync(model.artifact_path).isFile()) issues.push('private artifact path is not a regular file');
        else if (fileSha256(model.artifact_path).toLowerCase() !== String(model.sha256).toLowerCase()) issues.push('private artifact SHA-256 does not match the recorded digest');
      } catch (error) {
        issues.push('private model artifact is not accessible in the configured model volume');
      }
    }
    if (model.pin_map_verified !== true) issues.push('pin-map verification is not approved');
    if (!Array.isArray(model.validation_evidence) || model.validation_evidence.length === 0) {
      issues.push('model-specific validation evidence is missing');
    }
    return { ref, id: model.id || null, status: issues.length ? 'BLOCKED' : 'VERIFIED_CANDIDATE', issues, registry_status: registry?.status || null, source_url: model.source_url || registry?.source_url || null };
  });
  blockers.push(...models.flatMap(model => model.issues.map(issue => `${model.ref}: ${issue}`)));
  return { gate: 'vendor-spice-model-provenance', status: blockers.length ? 'BLOCKED' : 'PASS', verified: blockers.length === 0, model_count: models.length, blockers, warnings, models };
}

module.exports = { loadVendorModelRegistry, getVendorModel, collectModelReferences, auditVendorModels };
