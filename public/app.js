/**
 * CircuitFlow Platform Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let projectData = {
    architecture: null,
    bom: null,
    pcb: null,
    firmware: null,
    enclosure: null,
    render: null,
    testfixture: null,
    spice: null,
    distributor: null,
    multiboard: null
  };

  // Tab Navigation Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabViews = document.querySelectorAll('.tab-view');
  const currentTabTitle = document.getElementById('current-tab-title');
  const currentTabSubtitle = document.getElementById('current-tab-subtitle');

  const tabTitlesMap = {
    prompt: { title: '1. Device Concept & Vision', subtitle: 'Specify your electronic device requirements or use a quick preset.' },
    architecture: { title: '2. Architecture & Topology', subtitle: 'View auto-selected MCU, peripherals, and power subsystem.' },
    multiboard: { title: '3. Multi-Board Systems', subtitle: 'Multi-board motherboard/daughterboard split & FPC ribbon links.' },
    bom: { title: '4. Bill of Materials & Cart Sync', subtitle: 'Real-time component stock, lifecycle, and instant distributor cart sync.' },
    pcb: { title: '5. PCB Placement & Layer Stackup', subtitle: '2D placement visualizer, layer stackup, and DRC pass check.' },
    spice: { title: '6. SPICE Simulation & Thermal Analysis', subtitle: 'Nodal voltage checks and power thermal dissipation hotspots.' },
    firmware: { title: '7. Auto-Generated Firmware & Drivers', subtitle: 'C/C++ Board Support Packages (BSP) and HAL drivers.' },
    enclosure: { title: '8. 3D Parametric CAD Enclosure', subtitle: 'Custom 3D printable enclosure dimensions and OpenSCAD script.' },
    render: { title: '9. 3D Studio Render & 360 Disassembly View', subtitle: '360° orbital rotation & exploded disassembly view.' },
    testfixture: { title: '10. Factory Bed-of-Nails Test Jig', subtitle: 'Automated pogo-pin test point map & factory QA fixture CAD.' },
    export: { title: '11. Production Package Launch', subtitle: 'Download turn-key production release package zip archive.' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(i => i.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      item.classList.add('active');
      const viewElem = document.getElementById(`view-${targetTab}`);
      if (viewElem) viewElem.classList.add('active');

      if (tabTitlesMap[targetTab]) {
        currentTabTitle.textContent = tabTitlesMap[targetTab].title;
        currentTabSubtitle.textContent = tabTitlesMap[targetTab].subtitle;
      }
    });
  });

  // Prompt Presets
  const promptInput = document.getElementById('prompt-input');
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      if (preset === 'ble_tracker') {
        promptInput.value = 'A wearable BLE fitness tracker with a 6-axis IMU motion sensor, 0.96 OLED screen, 3.7V LiPo battery, and USB-C charger.';
      } else if (preset === 'stm32_industrial') {
        promptInput.value = 'An industrial STM32 precision sensor node with BME280 temperature sensor, RS485 UART interface, and 5V power regulator.';
      } else if (preset === 'rp2040_display') {
        promptInput.value = 'An RP2040 microcontroller smart display board with dual ARM Cortex-M0+, SPI display, and rotary encoder input.';
      }
    });
  });

  // Interactive 360 Disassembly Controls
  const chkExplode = document.getElementById('chk-explode-disassembly');
  const slider360 = document.getElementById('slider-360-rotation');
  const lbl360Deg = document.getElementById('lbl-360-deg');

  const update3DRender = async () => {
    if (!projectData.pcb || !projectData.enclosure) return;
    const isExploded = chkExplode.checked;
    const rotation = slider360.value;
    lbl360Deg.textContent = `${rotation}°`;

    try {
      const renderRes = await fetch('/api/generate/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcb: projectData.pcb, enclosure: projectData.enclosure, options: { exploded: isExploded, rotation } })
      });
      const renderData = await renderRes.json();
      projectData.render = renderData.render;
      renderProductRender(renderData.render);
    } catch (err) {
      console.error('3D Render update failed:', err);
    }
  };

  chkExplode.addEventListener('change', update3DRender);
  slider360.addEventListener('input', update3DRender);

  // Generate Action
  const btnGenerateAll = document.getElementById('btn-generate-all');
  const btnExportPkg = document.getElementById('btn-export-pkg');
  const btnDownloadZip = document.getElementById('btn-download-zip');

  btnGenerateAll.addEventListener('click', async () => {
    const prompt = promptInput.value || 'Compact BLE IoT device with IMU motion sensor';
    const maxCost = document.getElementById('cost-constraint').value;

    btnGenerateAll.disabled = true;
    btnGenerateAll.textContent = '⚡ Synthesizing Electronics Architecture...';

    try {
      // 1. Architecture
      const archRes = await fetch('/api/generate/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, constraints: { maxBOMCostUSD: maxCost } })
      });
      const archData = await archRes.json();
      projectData.architecture = archData.architecture;
      renderArchitecture(archData.architecture);

      // 2. Multi-Board Subsystems
      btnGenerateAll.textContent = '⚡ Analyzing Multi-Board Subsystem Split...';
      const mbRes = await fetch('/api/generate/multiboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture })
      });
      const mbData = await mbRes.json();
      projectData.multiboard = mbData.multiboard;
      renderMultiBoard(mbData.multiboard);

      // 3. BOM & Distributor Quotes
      btnGenerateAll.textContent = '⚡ Querying Live Supply Chain & Distributor Carts...';
      const bomRes = await fetch('/api/generate/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture })
      });
      const bomData = await bomRes.json();
      projectData.bom = bomData.bom;
      renderBOM(bomData.bom);

      const distRes = await fetch('/api/generate/distributor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bom: projectData.bom, pcb: projectData.pcb })
      });
      const distData = await distRes.json();
      projectData.distributor = distData.distributor;
      renderDistributorQuotes(distData.distributor);

      // 4. PCB
      btnGenerateAll.textContent = '⚡ Auto-Routing PCB & Generating Gerbers...';
      const pcbRes = await fetch('/api/generate/pcb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture, bom: projectData.bom })
      });
      const pcbData = await pcbRes.json();
      projectData.pcb = pcbData.pcb;
      renderPCB(pcbData.pcb);

      // 5. SPICE Simulation & Thermals
      btnGenerateAll.textContent = '⚡ Running SPICE Simulation & Thermal Dissipation Analysis...';
      const spiceRes = await fetch('/api/generate/spice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture, bom: projectData.bom })
      });
      const spiceData = await spiceRes.json();
      projectData.spice = spiceData.spice;
      renderSpiceAndThermal(spiceData.spice);

      // 6. Firmware
      btnGenerateAll.textContent = '⚡ Scaffolding C/C++ HAL Firmware...';
      const fwRes = await fetch('/api/generate/firmware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture, bom: projectData.bom })
      });
      const fwData = await fwRes.json();
      projectData.firmware = fwData.firmware;
      renderFirmware(fwData.firmware);

      // 7. Enclosure
      btnGenerateAll.textContent = '⚡ Synthesizing 3D Parametric CAD Enclosure...';
      const encRes = await fetch('/api/generate/enclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcb: projectData.pcb })
      });
      const encData = await encRes.json();
      projectData.enclosure = encData.enclosure;
      renderEnclosure(encData.enclosure);

      // 8. Photorealistic Render (Exploded/Disassembly View Ready)
      btnGenerateAll.textContent = '⚡ Generating 360° Studio Assembly Render...';
      const renderRes = await fetch('/api/generate/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcb: projectData.pcb, enclosure: projectData.enclosure, options: { exploded: chkExplode.checked, rotation: slider360.value } })
      });
      const renderData = await renderRes.json();
      projectData.render = renderData.render;
      renderProductRender(renderData.render);

      // 9. Factory Test Fixture
      btnGenerateAll.textContent = '⚡ Mapping Bed-of-Nails Test Fixture...';
      const tfRes = await fetch('/api/generate/testfixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcb: projectData.pcb })
      });
      const tfData = await tfRes.json();
      projectData.testfixture = tfData.testfixture;
      renderTestFixture(tfData.testfixture);

      btnGenerateAll.disabled = false;
      btnGenerateAll.textContent = '⚡ Generation Complete! Click tabs to inspect.';
      btnExportPkg.disabled = false;

      // Switch to Architecture View automatically
      document.querySelector('[data-tab="architecture"]').click();

    } catch (err) {
      alert('Generation error: ' + err.message);
      btnGenerateAll.disabled = false;
      btnGenerateAll.textContent = '⚡ Generate Complete Hardware Package';
    }
  });

  // Export handlers
  btnExportPkg.addEventListener('click', triggerExport);
  btnDownloadZip.addEventListener('click', triggerExport);

  async function triggerExport() {
    if (!projectData.architecture) {
      alert('Please generate a hardware design first!');
      return;
    }
    try {
      const res = await fetch('/api/export/package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CircuitFlow_Production_Package.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  // Render Functions
  function renderArchitecture(arch) {
    document.getElementById('arch-mcu-details').innerHTML = `
      <p><strong>Selected MCU/SoC:</strong> ${arch.mcu.name}</p>
      <p><strong>Core Specs:</strong> ${arch.mcu.core}</p>
      <p><strong>Package:</strong> ${arch.mcu.package}</p>
      <p><strong>Wireless Interfaces:</strong> ${arch.mcu.wireless.join(', ')}</p>
      <p><strong>Power Source:</strong> ${arch.powerSystem.type}</p>
    `;

    document.getElementById('arch-power-budget').innerHTML = `
      <p><strong>MCU Active Consumption:</strong> ${arch.powerBudget.mcuPower_mW} mW</p>
      <p><strong>Peripherals Total:</strong> ${arch.powerBudget.peripheralsPower_mW} mW</p>
      <p><strong>Total System Power:</strong> ${arch.powerBudget.totalPower_mW} mW</p>
      <p><strong>Battery Run Time Est.:</strong> ${arch.powerSystem.estimatedOperatingHours} hrs</p>
    `;

    const canvas = document.getElementById('block-diagram-canvas');
    canvas.innerHTML = '';
    arch.systemTopology.blocks.forEach(block => {
      const node = document.createElement('div');
      node.style.cssText = 'background:#1e293b; border:1px solid #06b6d4; padding:8px 12px; margin:6px; border-radius:6px; display:inline-block; font-size:12px;';
      node.innerHTML = `<strong>[${block.category}]</strong> ${block.label}`;
      canvas.appendChild(node);
    });
  }

  function renderMultiBoard(mbData) {
    document.getElementById('multiboard-details').innerHTML = mbData.subBoards.map(b => `
      <p><strong>${b.name} (${b.boardId}):</strong> ${b.type} | ${b.dimensions_mm.width}mm x ${b.dimensions_mm.height}mm</p>
    `).join('');

    document.getElementById('multiboard-connections').innerHTML = mbData.interconnections.map(c => `
      <p>🔌 <strong>${c.type}:</strong> ${c.fromBoard} ➔ ${c.toBoard} (${c.pinCount}-pin, ${c.pitch_mm}mm pitch)</p>
      <p><strong>Signals Passed:</strong> ${c.signalsPassed.join(', ')}</p>
    `).join('');
  }

  function renderBOM(bom) {
    document.getElementById('bom-summary-badge').textContent = `BOM Unit Cost: $${bom.summary.unitCostUSD} (${bom.summary.currency})`;
    const tbody = document.querySelector('#bom-table tbody');
    tbody.innerHTML = '';

    bom.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.itemNo}</td>
        <td><strong>${item.designator}</strong></td>
        <td>${item.mpn}</td>
        <td>${item.manufacturer}</td>
        <td>${item.description}</td>
        <td>${item.package}</td>
        <td>${item.quantity}</td>
        <td>$${item.unitPriceUSD.toFixed(2)}</td>
        <td><span class="badge">${item.stockStatus}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderDistributorQuotes(distData) {
    const quotesBar = document.getElementById('distributor-quotes-bar');
    quotesBar.innerHTML = distData.turnkeyQuotes.map(q => `
      <div class="quote-card">
        <p><strong>${q.manufacturer} Turnkey Quote (10 units):</strong> $${q.totalTurnkeyCostUSD} USD</p>
        <p>Fab: $${q.pcbFabCostUSD} | Assembly Setup: $${q.pcbaAssemblySetupUSD} | Lead Time: ${q.turnaroundDays} days</p>
      </div>
    `).join('');
  }

  function renderPCB(pcb) {
    document.getElementById('pcb-stackup-details').innerHTML = `
      <p><strong>Board Dimensions:</strong> ${pcb.boardDimensions.width_mm}mm x ${pcb.boardDimensions.height_mm}mm x ${pcb.boardDimensions.thickness_mm}mm</p>
      <p><strong>Layers:</strong> ${pcb.boardDimensions.layerCount}-Layer FR4</p>
      <p><strong>DRC Check Status:</strong> <span style="color:#10b981;">${pcb.drcRules.status}</span></p>
      <p><strong>Generated Gerber Layers:</strong> ${Object.keys(pcb.gerberFiles).join(', ')}</p>
    `;

    const pcbCanvas = document.getElementById('pcb-canvas');
    pcbCanvas.innerHTML = '';
    const board = document.createElement('div');
    board.style.cssText = `width:${pcb.boardDimensions.width_mm * 3}px; height:${pcb.boardDimensions.height_mm * 3}px; background:#064e3b; border:2px solid #10b981; position:relative; border-radius:6px;`;

    pcb.placedComponents.forEach(comp => {
      const cBox = document.createElement('div');
      cBox.style.cssText = `position:absolute; background:#3b82f6; color:#fff; font-size:9px; padding:2px; border-radius:2px; transform:translate(-50%, -50%); left:${50 + (comp.x * 2)}%; top:${50 + (comp.y * 2)}%;`;
      cBox.textContent = comp.designator;
      board.appendChild(cBox);
    });

    pcbCanvas.appendChild(board);
  }

  function renderSpiceAndThermal(spiceData) {
    document.getElementById('spice-node-details').innerHTML = Object.entries(spiceData.nodeVoltages).map(([node, val]) => `
      <p>⚡ <strong>${node}:</strong> ${val}</p>
    `).join('');

    document.getElementById('thermal-hotspot-details').innerHTML = `
      <p><strong>Max System Temp:</strong> ${spiceData.thermalAnalysis.maxSystemTemp_C}°C (Ambient: ${spiceData.thermalAnalysis.ambientTemp_C}°C)</p>
      <p><strong>Cooling Advice:</strong> ${spiceData.thermalAnalysis.coolingRecommendation}</p>
      ${spiceData.thermalAnalysis.thermalHotspots.map(h => `<p>🔥 <strong>${h.component}:</strong> ${h.estimatedJunctionTemp_C}°C (${h.powerDissipated_mW}mW dissipated)</p>`).join('')}
    `;
  }

  function renderFirmware(fw) {
    document.getElementById('firmware-code-block').textContent = fw.files['main/main.c'];
  }

  function renderEnclosure(enc) {
    document.getElementById('enclosure-specs').innerHTML = `
      <p><strong>Outer Dimensions:</strong> ${enc.dimensions_mm.outerWidth}mm x ${enc.dimensions_mm.outerHeight}mm x ${enc.dimensions_mm.outerDepth}mm</p>
      <p><strong>Wall Thickness:</strong> ${enc.dimensions_mm.wallThickness}mm</p>
      <p><strong>Mounting Screw Spec:</strong> M2.5 Self-Tapping</p>
      <p><strong>Recommended Materials:</strong> ${enc.materials.join(', ')}</p>
    `;
    document.getElementById('enclosure-scad-code').textContent = enc.cadFiles['enclosure_bottom.scad'];
  }

  function renderProductRender(renderData) {
    const renderBox = document.getElementById('render-preview-box');
    renderBox.innerHTML = renderData.svgRenderAsset;
  }

  function renderTestFixture(tfData) {
    document.getElementById('testfixture-points').innerHTML = `
      <p><strong>Total Pogo-Pin Test Points:</strong> ${tfData.testPointCount}</p>
      <p><strong>Pogo Pin Model:</strong> ${tfData.fixtureSpecs.pogoPinType}</p>
      <p><strong>Guide Plate Spec:</strong> ${tfData.fixtureSpecs.plateDimensions_mm.width}mm x ${tfData.fixtureSpecs.plateDimensions_mm.height}mm x ${tfData.fixtureSpecs.plateDimensions_mm.thickness}mm</p>
      ${tfData.testPoints.map(tp => `<p>📍 <strong>${tp.id}:</strong> ${tp.name} (${tp.x}mm, ${tp.y}mm)</p>`).join('')}
    `;
    document.getElementById('testfixture-scad-code').textContent = tfData.cadFiles['pogo_test_jig.scad'];
  }
});
