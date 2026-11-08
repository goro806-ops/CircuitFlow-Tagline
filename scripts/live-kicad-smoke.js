'use strict';

const crypto = require('crypto');

const baseUrl = (process.env.LIVE_BASE_URL || 'https://circuitflow-docker.onrender.com').replace(/\/$/, '');
const projectId = process.env.LIVE_PROJECT_ID || 'proj_mvwjheaaj7jg02';
const cacheBust = `live-kicad-${Date.now()}`;
const checks = [];
const sensitiveKey = /(?:api[_-]?key|password|secret|access[_-]?token|refresh[_-]?token|database[_-]?url)/i;

function findSensitiveData(value, path = '$') {
  if (Array.isArray(value)) return value.flatMap((item, index) => findSensitiveData(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') {
    const text = String(value || '');
    return /postgres(?:ql)?:\/\/|bearer\s+[a-z0-9._-]{20,}/i.test(text) ? [path] : [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const current = `${path}.${key}`;
    return sensitiveKey.test(key) ? [current] : findSensitiveData(child, current);
  });
}

async function request(path, options = {}) {
  const expectedStatus = options.expectedStatus || 200;
  const headers = { accept: 'application/json,text/plain', ...(options.headers || {}) };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body
  });
  const body = await response.arrayBuffer();
  const bytes = Buffer.from(body);
  const contentType = response.headers.get('content-type') || '';
  let json = null;
  if (contentType.includes('application/json')) json = JSON.parse(bytes.toString('utf8'));
  const check = {
    path,
    http_status: response.status,
    expected_status: expectedStatus,
    passed: response.status === expectedStatus,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    content_type: contentType
  };
  if (json) check.json_keys = Object.keys(json).sort();
  checks.push(check);
  return { check, bytes, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await request(`/health?cachebust=${cacheBust}`);
  assert(health.json?.ok === true, 'health check failed');
  const ready = await request(`/ready?cachebust=${cacheBust}`);
  assert(ready.check.passed, 'readiness check failed');
  const status = await request(`/api/agents/status?cachebust=${cacheBust}`);
  assert(status.json?.success === true, 'status check failed');
  const projects = await request(`/api/agents/projects?cachebust=${cacheBust}`);
  assert(projects.json?.ownerless_only === true, 'unauthenticated project listing is not ownerless-only');
  assert((projects.json?.projects || []).every(project => !project.owner_id), 'unauthenticated project listing exposed an owned project');
  const project = await request(`/api/agents/projects/${projectId}?cachebust=${cacheBust}`);
  assert(project.json?.success === true, 'project retrieval failed');
  const unknownProject = await request('/api/agents/projects/live-smoke-unknown-project?cachebust=' + cacheBust, { expectedStatus: 404 });
  assert(unknownProject.json?.success === false && unknownProject.check.passed, 'unknown project did not return a controlled 404');
  const unauthenticatedEvidence = await request(`/api/agents/projects/${projectId}/release-evidence?cachebust=${cacheBust}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ design_warnings_resolved: false }),
    expectedStatus: 401
  });
  assert(unauthenticatedEvidence.json?.success === false && unauthenticatedEvidence.check.passed, 'unauthenticated release write was not rejected');
  const unauthenticatedReview = await request(`/api/agents/projects/${projectId}/review?cachebust=${cacheBust}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'approved', reviewed_by: 'forged-reviewer' }),
    expectedStatus: 401
  });
  assert(unauthenticatedReview.json?.success === false && unauthenticatedReview.check.passed, 'unauthenticated legacy review was not rejected');
  const unauthenticatedKicadRecord = await request(`/api/agents/projects/${projectId}/kicad-validation?cachebust=${cacheBust}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
    expectedStatus: 401
  });
  assert(unauthenticatedKicadRecord.json?.success === false && unauthenticatedKicadRecord.check.passed, 'unauthenticated KiCad validation recording was not rejected');
  const unauthenticatedSpiceRecord = await request(`/api/agents/projects/${projectId}/spice-validation?cachebust=${cacheBust}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
    expectedStatus: 401
  });
  assert(unauthenticatedSpiceRecord.json?.success === false && unauthenticatedSpiceRecord.check.passed, 'unauthenticated SPICE validation recording was not rejected');

  const bundle = await request(`/api/agents/projects/${projectId}/kicad?cachebust=${cacheBust}`);
  assert(bundle.json?.success === true, 'KiCad bundle generation failed');
  const files = bundle.json.kicad?.files || {};
  const schematicName = Object.keys(files).find(name => name.endsWith('.kicad_sch'));
  const pcbName = Object.keys(files).find(name => name.endsWith('.kicad_pcb'));
  const netlistName = Object.keys(files).find(name => name.endsWith('.netlist.json'));
  assert(schematicName && pcbName && netlistName, 'KiCad bundle is missing an expected file');
  const validation = bundle.json.validation || {};
  assert(validation.engine === 'kicad-cli' && validation.available === true, 'live KiCad CLI is unavailable');
  assert(validation.status === 'STRUCTURAL_ONLY', `disposable KiCad bundle should be structural-only, got ${validation.status}`);
  assert(validation.semantic?.meaningful === false, 'structural-only bundle was marked meaningful');
  assert((validation.semantic?.issues || []).some(issue => issue.includes('no instantiated KiCad symbols')), 'missing-symbol semantic diagnostic is absent');
  assert((validation.semantic?.issues || []).some(issue => issue.includes('no copper pads')), 'missing-pad semantic diagnostic is absent');
  assert(validation.pcb?.status === 'PASSED', 'live PCB DRC did not pass');
  assert(validation.schematic?.status === 'PASSED', 'live schematic ERC did not pass');
  assert(String(files[schematicName]).startsWith('(kicad_sch '), 'schematic S-expression header is invalid');
  assert(String(files[pcbName]).startsWith('(kicad_pcb '), 'PCB S-expression header is invalid');
  const designReadiness = bundle.json.kicad?.readiness || {};
  assert(designReadiness.status !== 'READY_FOR_CLI_VALIDATION', 'disposable design unexpectedly has no KiCad readiness warnings');
  assert((designReadiness.warnings || []).some(warning => warning.includes('netlist-only')), 'netlist-only readiness warning is missing');
  assert((designReadiness.warnings || []).some(warning => warning.includes('verified KiCad symbol library assignment')), 'symbol-library readiness warning is missing');

  const schematic = await request(`/api/agents/projects/${projectId}/kicad.sch?cachebust=${cacheBust}`);
  const pcb = await request(`/api/agents/projects/${projectId}/kicad.pcb?cachebust=${cacheBust}`);
  assert(schematic.check.passed && schematic.check.content_type.startsWith('text/plain'), 'schematic download failed');
  assert(pcb.check.passed && pcb.check.content_type.startsWith('text/plain'), 'PCB download failed');
  assert(schematic.bytes.toString('utf8').startsWith('(kicad_sch '), 'downloaded schematic header is invalid');
  assert(pcb.bytes.toString('utf8').startsWith('(kicad_pcb '), 'downloaded PCB header is invalid');

  const readiness = await request(`/api/agents/projects/${projectId}/release-readiness?cachebust=${cacheBust}`);
  assert(readiness.json?.success === true, 'release-readiness request failed');
  assert(readiness.json.production_ready === false, 'disposable project unexpectedly passed production gate');
  assert(/^[a-f0-9]{64}$/.test(readiness.json.release_revision || ''), 'release fingerprint missing');

  const sensitivePaths = checks.flatMap(check => check.json ? findSensitiveData(check.json, check.path) : []);
  assert(sensitivePaths.length === 0, `credential-shaped response data detected at ${sensitivePaths.join(', ')}`);

  const report = {
    base_url: baseUrl,
    project_id: projectId,
    build_commit: health.json.build_commit || null,
    passed: true,
    checks,
    summary: {
      bundle_files: [schematicName, pcbName, netlistName].sort(),
      bundle_validation: validation.status,
      semantic_validation: validation.semantic,
      pcb_drc: validation.pcb.status,
      schematic_erc: validation.schematic.status,
      design_readiness_status: designReadiness.status,
      netlist_only_warning_present: true,
      release_gate_blocked_safely: readiness.json.production_ready === false,
      secret_fields_exposed: sensitivePaths.length > 0,
      sensitive_paths: sensitivePaths
    }
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(`Live KiCad smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
