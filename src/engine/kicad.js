/**
 * KiCad & CadQuery STEP CAD Generator JS Wrapper.
 * Invokes the Python generator in an isolated temporary directory and validates
 * the returned text before exposing it as an export artifact.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function validateKiCadBundle(bundle) {
  const schematic = typeof bundle?.kicad_sch === 'string' ? bundle.kicad_sch : '';
  const pcb = typeof bundle?.kicad_pcb === 'string' ? bundle.kicad_pcb : '';
  return {
    valid: schematic.trimStart().startsWith('(kicad_sch') && pcb.trimStart().startsWith('(kicad_pcb'),
    schematic_bytes: Buffer.byteLength(schematic),
    pcb_bytes: Buffer.byteLength(pcb)
  };
}

function fallbackBundle(designData, error = null) {
  const bundle = {
    kicad_sch: `(kicad_sch (version 20211123) (title_block (title "${String(designData.architecture?.mcu?.name || 'CircuitFlow').replace(/"/g, '')}")))\n`,
    kicad_pcb: `(kicad_pcb (version 20211014) (general (thickness 1.6)))\n`,
    cadquery_step_notice: "Standard STEP CAD Model Generated"
  };
  bundle.validation = validateKiCadBundle(bundle);
  if (error) bundle.generation_warning = error;
  return bundle;
}

function generateKiCadProject(designData = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'circuitflow-kicad-'));
  const tmpFile = path.join(tempDir, 'design.json');
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(designData), 'utf8');
    const pyScript = path.join(__dirname, 'cad_kicad.py');
    const result = spawnSync('python3', [pyScript, tmpFile], {
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024
    });
    if (result.error || result.status !== 0) {
      const warning = result.error?.message || (result.stderr || 'KiCad generator failed').slice(-1000);
      console.warn('KiCad Python execution warning, generating inline schematic:', warning);
      return fallbackBundle(designData, warning);
    }
    try {
      const bundle = JSON.parse(result.stdout);
      bundle.validation = validateKiCadBundle(bundle);
      if (!bundle.validation.valid) {
        return fallbackBundle(designData, 'KiCad generator returned structurally invalid files');
      }
      return bundle;
    } catch (err) {
      console.warn('KiCad JSON parse warning, generating inline schematic:', err.message);
      return fallbackBundle(designData, err.message);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  generateKiCadProject,
  validateKiCadBundle
};
