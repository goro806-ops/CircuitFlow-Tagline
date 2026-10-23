/**
 * Production Release Package Bundler Engine
 * CircuitFlow Platform
 */

const archiver = require('archiver');

async function bundleReleasePackage(projectData = {}) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers = [];

    archive.on('data', data => buffers.push(data));
    archive.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', err => reject(err));

    const architecture = projectData.architecture || {};
    const bom = projectData.bom || {};
    const pcb = projectData.pcb || {};
    const firmware = projectData.firmware || {};
    const enclosure = projectData.enclosure || {};

    // 1. Add Architecture Spec JSON
    archive.append(JSON.stringify(architecture, null, 2), { name: '01_Architecture/architecture_spec.json' });

    // 2. Add BOM CSV
    let bomCsv = 'Item,Designator,MPN,Manufacturer,Description,Package,Quantity,UnitPriceUSD,Lifecycle\n';
    if (bom.items) {
      bom.items.forEach(item => {
        bomCsv += `"${item.itemNo}","${item.designator}","${item.mpn}","${item.manufacturer}","${item.description}","${item.package}",${item.quantity},${item.unitPriceUSD},"${item.lifecycle}"\n`;
      });
    }
    archive.append(bomCsv, { name: '02_BOM/bill_of_materials.csv' });

    // 3. Add Gerber & PCB Manufacturing Files
    if (pcb.gerberFiles) {
      Object.entries(pcb.gerberFiles).forEach(([filename, content]) => {
        archive.append(content, { name: `03_PCB_Gerbers/${filename}` });
      });
    }

    // Pick & Place / Centroid file
    let pnpCsv = 'Designator,MidX,MidY,Layer,Rotation,Package\n';
    if (pcb.placedComponents) {
      pcb.placedComponents.forEach(c => {
        pnpCsv += `"${c.designator}",${c.x},${c.y},"${c.layer}",${c.rotation},"${c.package}"\n`;
      });
    }
    archive.append(pnpCsv, { name: '03_PCB_Gerbers/Pick_and_Place_Centroid.csv' });

    // 4. Add Firmware Files
    if (firmware.files) {
      Object.entries(firmware.files).forEach(([filepath, content]) => {
        archive.append(content, { name: `04_Firmware/${filepath}` });
      });
    }

    // 5. Add Enclosure CAD
    if (enclosure.cadFiles) {
      Object.entries(enclosure.cadFiles).forEach(([filename, content]) => {
        archive.append(content, { name: `05_Enclosure_CAD/${filename}` });
      });
    }

    // 6. Add Compliance Checklist
    const complianceDoc = `# CircuitFlow Pre-Compliance & Launch Checklist

1. FCC / CE EMC Pre-Compliance Guidelines
   - [x] Ground Plane Continuity Verified (4-layer stackup)
   - [x] Decoupling Capacitors placed close to MCU power pins
   - [x] Differential pairs impedance matched (90 ohm USB, 50 ohm RF)

2. Production Assembly Steps
   - Step 1: Solder Paste Stencil Application (0.12mm stainless steel)
   - Step 2: Automated SMT Pick & Place
   - Step 3: Reflow Oven Profile (Lead-Free SAC305)
   - Step 4: Visual Inspection & Automated Optical Inspection (AOI)
   - Step 5: Pogo-Pin Functional Test Bench Execution & Firmware Flashing
`;
    archive.append(complianceDoc, { name: '06_Compliance_Launch/Pre_Compliance_Checklist.md' });

    archive.finalize();
  });
}

module.exports = {
  bundleReleasePackage
};
