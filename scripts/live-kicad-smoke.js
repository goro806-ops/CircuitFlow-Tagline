'use strict';

const crypto = require('crypto');

const baseUrl = (process.env.LIVE_BASE_URL || 'https://circuitflow-docker.onrender.com').replace(/\/$/, '');
const projectId = process.env.LIVE_PROJECT_ID || 'proj_mvwjheaaj7jg02';
const cacheBust = `live-kicad-${Date.now()}`;
const checks = [];

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json,text/plain' } });
  const body = await response.arrayBuffer();
  const bytes = Buffer.from(body);
  const contentType = response.headers.get('content-type') || '';
  let json = null;
  if (contentType.includes('application/json')) json = JSON.parse(bytes.toString('utf8'));
  const check = {
    path,
    http_status: response.status,
    passed: response.ok,
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
  const project = await request(`/api/agents/projects/${projectId}?cachebust=${cacheBust}`);
  assert(project.json?.success === true, 'project retrieval failed');

  const bundle = await request(`/api/agents/projects/${projectId}/kicad?cachebust=${cacheBust}`);
  assert(bundle.json?.success === true, 'KiCad bundle generation failed');
  const files = bundle.json.kicad?.files || {};
  const schematicName = Object.keys(files).find(name => name.endsWith('.kicad_sch'));
  const pcbName = Object.keys(files).find(name => name.endsWith('.kicad_pcb'));
  const netlistName = Object.keys(files).find(name => name.endsWith('.netlist.json'));
  assert(schematicName && pcbName && netlistName, 'KiCad bundle is missing an expected file');
  const validation = bundle.json.validation || {};
  assert(validation.engine === 'kicad-cli' && validation.available === true, 'live KiCad CLI is unavailable');
  assert(validation.status === 'PASSED', `live KiCad bundle validation was ${validation.status}`);
  assert(validation.pcb?.status === 'PASSED', 'live PCB DRC did not pass');
  assert(validation.schematic?.status === 'PASSED', 'live schematic ERC did not pass');
  assert(String(files[schematicName]).startsWith('(kicad_sch '), 'schematic S-expression header is invalid');
  assert(String(files[pcbName]).startsWith('(kicad_pcb '), 'PCB S-expression header is invalid');

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

  const report = {
    base_url: baseUrl,
    project_id: projectId,
    build_commit: health.json.build_commit || null,
    passed: true,
    checks,
    summary: {
      bundle_files: [schematicName, pcbName, netlistName].sort(),
      bundle_validation: validation.status,
      pcb_drc: validation.pcb.status,
      schematic_erc: validation.schematic.status,
      release_gate_blocked_safely: readiness.json.production_ready === false,
      secret_fields_exposed: false
    }
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(`Live KiCad smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
