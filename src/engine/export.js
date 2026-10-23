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
    const render = projectData.render || {};
    const testfixture = projectData.testfixture || {};
    const spice = projectData.spice || {};
    const distributor = projectData.distributor || {};
    const multiboard = projectData.multiboard || {};
    const consumer = projectData.consumer || {};
    const negotiator = projectData.negotiator || {};

    // 1. Add Architecture Spec JSON
    archive.append(JSON.stringify(architecture, null, 2), { name: '01_Architecture/architecture_spec.json' });

    // 2. Add Consumer Profile & Shape Negotiation Audit
    if (consumer.profileName) {
      archive.append(JSON.stringify(consumer, null, 2), { name: '01_Architecture/consumer_target_profile.json' });
    }
    if (negotiator.conflicts) {
      archive.append(JSON.stringify(negotiator, null, 2), { name: '01_Architecture/ai_shape_negotiation_audit.json' });
    }

    // 3. Add BOM CSV
    let bomCsv = 'Item,Designator,MPN,Manufacturer,Description,Package,Quantity,UnitPriceUSD,Lifecycle\n';
    if (bom.items) {
      bom.items.forEach(item => {
        bomCsv += `"${item.itemNo}","${item.designator}","${item.mpn}","${item.manufacturer}","${item.description}","${item.package}",${item.quantity},${item.unitPriceUSD},"${item.lifecycle}"\n`;
      });
    }
    archive.append(bomCsv, { name: '02_BOM/bill_of_materials.csv' });

    // 4. Add Gerber & PCB Manufacturing Files
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

    // 5. Add Firmware Files
    if (firmware.files) {
      Object.entries(firmware.files).forEach(([filepath, content]) => {
        archive.append(content, { name: `04_Firmware/${filepath}` });
      });
    }

    // 6. Add Enclosure CAD
    if (enclosure.cadFiles) {
      Object.entries(enclosure.cadFiles).forEach(([filename, content]) => {
        archive.append(content, { name: `05_Enclosure_CAD/${filename}` });
      });
    }

    // 7. Add Photorealistic 3D Renders & Disassembly Scene
    if (render.svgRenderAsset) {
      archive.append(render.svgRenderAsset, { name: '06_3D_Renders/product_exploded_view.svg' });
    }
    if (render.threeScene) {
      archive.append(JSON.stringify(render.threeScene, null, 2), { name: '06_3D_Renders/three_js_scene.json' });
    }

    // 8. Add Bed-of-Nails Factory Test Fixture
    if (testfixture.cadFiles) {
      Object.entries(testfixture.cadFiles).forEach(([filename, content]) => {
        archive.append(content, { name: `07_Test_Fixture/${filename}` });
      });
    }

    // 9. Add SPICE & Thermal Reports
    if (spice.spiceNetlist) {
      archive.append(spice.spiceNetlist, { name: '08_Simulations/circuit_simulation.cir' });
    }
    if (spice.thermalAnalysis) {
      archive.append(JSON.stringify(spice.thermalAnalysis, null, 2), { name: '08_Simulations/thermal_hotspots.json' });
    }

    // 10. Add Multi-Board System Topology & Distributor Quotes
    if (multiboard.subBoards) {
      archive.append(JSON.stringify(multiboard, null, 2), { name: '09_MultiBoard/multiboard_system_topology.json' });
    }
    if (distributor.turnkeyQuotes) {
      archive.append(JSON.stringify(distributor, null, 2), { name: '10_Manufacturing_Quotes/turnkey_fab_quotes.json' });
    }

    // 11. Add Compliance Checklist
    const complianceDoc = `# CircuitFlow Pre-Compliance & Launch Checklist

1. Consumer Profile & Environmental Compliance
   - Profile: ${consumer.profileName || 'Standard'}
   - Ingress Protection: ${consumer.ipRating || 'IP54'}
   - Drop Specification: ${consumer.dropTestRating || '1.5M'}

2. Production Assembly & Factory QA Steps
   - Step 1: Solder Paste Stencil Application (0.12mm stainless steel)
   - Step 2: Automated SMT Pick & Place
   - Step 3: Reflow Oven Profile (Lead-Free SAC305)
   - Step 4: Visual Inspection & Automated Optical Inspection (AOI)
   - Step 5: Factory Bed-of-Nails Pogo-Pin Test Bench Execution & Firmware Flashing
`;
    archive.append(complianceDoc, { name: '11_Compliance_Launch/Pre_Compliance_Checklist.md' });

    archive.finalize();
  });
}

module.exports = {
  bundleReleasePackage
};
