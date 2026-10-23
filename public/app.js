/**
 * CircuitFlow Platform Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let projectData = {
    architecture: null,
    bom: null,
    pcb: null,
    firmware: null,
    enclosure: null
  };

  // Tab Navigation Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabViews = document.querySelectorAll('.tab-view');
  const currentTabTitle = document.getElementById('current-tab-title');
  const currentTabSubtitle = document.getElementById('current-tab-subtitle');

  const tabTitlesMap = {
    prompt: { title: '1. Device Concept & Vision', subtitle: 'Specify your electronic device requirements or use a quick preset.' },
    architecture: { title: '2. Architecture & Topology', subtitle: 'View auto-selected MCU, peripherals, and power subsystem.' },
    bom: { title: '3. Bill of Materials & Live Supply Chain', subtitle: 'Real-time component stock, lifecycle, and cost estimation.' },
    pcb: { title: '4. PCB Placement & Layer Stackup', subtitle: '2D placement visualizer, layer stackup, and DRC pass check.' },
    firmware: { title: '5. Auto-Generated Firmware & Drivers', subtitle: 'C/C++ Board Support Packages (BSP) and HAL drivers.' },
    enclosure: { title: '6. 3D Parametric CAD Enclosure', subtitle: 'Custom 3D printable enclosure dimensions and OpenSCAD script.' },
    export: { title: '7. Production Package Launch', subtitle: 'Download turn-key production release package zip archive.' }
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

      // 2. BOM
      btnGenerateAll.textContent = '⚡ Querying Live Supply Chain & BOM...';
      const bomRes = await fetch('/api/generate/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture })
      });
      const bomData = await bomRes.json();
      projectData.bom = bomData.bom;
      renderBOM(bomData.bom);

      // 3. PCB
      btnGenerateAll.textContent = '⚡ Auto-Routing PCB & Generating Gerbers...';
      const pcbRes = await fetch('/api/generate/pcb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture, bom: projectData.bom })
      });
      const pcbData = await pcbRes.json();
      projectData.pcb = pcbData.pcb;
      renderPCB(pcbData.pcb);

      // 4. Firmware
      btnGenerateAll.textContent = '⚡ Scaffolding C/C++ HAL Firmware...';
      const fwRes = await fetch('/api/generate/firmware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: projectData.architecture, bom: projectData.bom })
      });
      const fwData = await fwRes.json();
      projectData.firmware = fwData.firmware;
      renderFirmware(fwData.firmware);

      // 5. Enclosure
      btnGenerateAll.textContent = '⚡ Synthesizing 3D Parametric CAD Enclosure...';
      const encRes = await fetch('/api/generate/enclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcb: projectData.pcb })
      });
      const encData = await encRes.json();
      projectData.enclosure = encData.enclosure;
      renderEnclosure(encData.enclosure);

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
});
