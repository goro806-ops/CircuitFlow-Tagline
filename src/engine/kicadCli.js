const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function runCli(args, reportPath) {
  const result = spawnSync('kicad-cli', args, {
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.error) return { available: false, status: 'KICAD_CLI_UNAVAILABLE', error_code: result.error.code || 'spawn_error' };
  let report = null;
  let reportText = null;
  if (reportPath && fs.existsSync(reportPath)) {
    try {
      reportText = fs.readFileSync(reportPath, 'utf8');
      try { report = JSON.parse(reportText); } catch (_) { /* KiCad may emit text reports. */ }
    } catch (_) { reportText = null; }
  }
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  return {
    available: true,
    status: result.status === 0 ? 'PASSED' : 'FAILED',
    exit_code: result.status,
    report,
    diagnostics: `${stderr || stdout}\n${reportText || ''}`.trim().slice(-8000) || null
  };
}

function assessKicadSemantics(files = {}) {
  const pcbName = Object.keys(files).find(name => name.endsWith('.kicad_pcb'));
  const schName = Object.keys(files).find(name => name.endsWith('.kicad_sch'));
  const pcb = pcbName ? String(files[pcbName]) : '';
  const schematic = schName ? String(files[schName]) : '';
  const symbolInstances = (schematic.match(/\n\s*\(symbol\s/g) || []).length;
  const pads = (pcb.match(/\n\s*\(pad\s/g) || []).length;
  const issues = [];
  if (!symbolInstances) issues.push('schematic contains no instantiated KiCad symbols');
  if (!pads) issues.push('PCB contains no copper pads');
  return { meaningful: issues.length === 0, symbol_instances: symbolInstances, pcb_pads: pads, issues };
}

function validateKicadBundle(files = {}) {
  const pcbName = Object.keys(files).find((name) => name.endsWith('.kicad_pcb'));
  const schName = Object.keys(files).find((name) => name.endsWith('.kicad_sch'));
  if (!pcbName || !schName) {
    return { engine: 'kicad-cli', status: 'INVALID_BUNDLE', available: false, semantic: { meaningful: false, issues: ['schematic or PCB file is missing'] } };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'circuitflow-kicad-cli-'));
  const pcbPath = path.join(tempDir, 'design.kicad_pcb');
  const schPath = path.join(tempDir, 'design.kicad_sch');
  const pcbReport = path.join(tempDir, 'pcb-drc.json');
  const schReport = path.join(tempDir, 'sch-erc.json');
  try {
    fs.writeFileSync(pcbPath, files[pcbName], 'utf8');
    fs.writeFileSync(schPath, files[schName], 'utf8');
    const pcb = runCli(['pcb', 'drc', '--exit-code-violations', '--output', pcbReport, pcbPath], pcbReport);
    const sch = runCli(['sch', 'erc', '--exit-code-violations', '--output', schReport, schPath], schReport);
    if (!pcb.available || !sch.available) {
      return { engine: 'kicad-cli', status: 'KICAD_CLI_UNAVAILABLE', available: false, pcb, schematic: sch };
    }
    const semantic = assessKicadSemantics(files);
    const cliPassed = pcb.status === 'PASSED' && sch.status === 'PASSED';
    return {
      engine: 'kicad-cli',
      status: cliPassed ? (semantic.meaningful ? 'PASSED' : 'STRUCTURAL_ONLY') : 'FAILED',
      available: true,
      semantic,
      pcb,
      schematic: sch
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = { assessKicadSemantics, validateKicadBundle };
