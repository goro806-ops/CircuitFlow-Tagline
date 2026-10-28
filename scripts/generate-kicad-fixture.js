const fs = require('fs');
const path = require('path');
const { generateKicadProject } = require('../src/agents/exportKicad');

const outputDir = process.argv[2] || path.join(process.cwd(), 'artifacts', 'kicad');
fs.mkdirSync(outputDir, { recursive: true });
const project = {
  project_id: 'circuitflow-ci-fixture',
  architecture: { mcu: { name: 'MCU_Generic' } },
  schematic: { components: [], nets: [] },
  pcb: {},
  bom: { line_items: [] }
};
const bundle = generateKicadProject(project);
for (const [name, content] of Object.entries(bundle.files)) {
  if (name.endsWith('.kicad_sch') || name.endsWith('.kicad_pcb')) {
    fs.writeFileSync(path.join(outputDir, name), content, 'utf8');
  }
}
console.log(`Generated KiCad fixture in ${outputDir}`);
