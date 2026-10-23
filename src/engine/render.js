/**
 * Photorealistic 3D Product Rendering Engine with 360-Degree Disassembly View
 * CircuitFlow Platform
 */

function generate3DRender(pcb = {}, enclosure = {}, options = {}) {
  const boardDims = pcb.boardDimensions || { width_mm: 50, height_mm: 40, thickness_mm: 1.6 };
  const enclosureDims = enclosure.dimensions_mm || { outerWidth: 57, outerHeight: 47, outerDepth: 18 };

  const isExploded = options.exploded === true || options.exploded === 'true';
  const rotationDeg = parseInt(options.rotation || '0', 10);

  // Exploded offsets (mm) when disassembly view is active
  const topShellOffset_y = isExploded ? 60 : 0;
  const pcbOffset_y = isExploded ? 20 : 0;
  const bottomShellOffset_y = isExploded ? -40 : 0;

  // Three.js Scene Configuration
  const threeScene = {
    metadata: { version: 4.5, type: 'Object', generator: 'CircuitFlow 3D Render Engine' },
    assemblyState: {
      isExploded,
      rotationAngleDeg: rotationDeg,
      explodedOffsets: {
        topCasingY: topShellOffset_y,
        pcbY: pcbOffset_y,
        bottomCasingY: bottomShellOffset_y
      }
    },
    materials: [
      { uuid: 'mat_casing', name: 'ABS Casing Plastic', color: 0x1e293b, roughness: 0.3, metalness: 0.1 },
      { uuid: 'mat_pcb', name: 'FR4 Soldermask Green', color: 0x064e3b, roughness: 0.4, metalness: 0.2 },
      { uuid: 'mat_copper', name: 'Gold Flash / ENIG', color: 0xd97706, roughness: 0.2, metalness: 0.9 },
      { uuid: 'mat_mcu_black', name: 'QFN Epoxy Plastic', color: 0x090d16, roughness: 0.5, metalness: 0.1 }
    ],
    geometries: [
      { uuid: 'geo_enclosure', type: 'BoxGeometry', width: enclosureDims.outerWidth, height: enclosureDims.outerHeight, depth: enclosureDims.outerDepth },
      { uuid: 'geo_pcb', type: 'BoxGeometry', width: boardDims.width_mm, height: boardDims.height_mm, depth: boardDims.thickness_mm }
    ],
    cameraConfig: {
      fov: 45,
      position: [Math.sin(rotationDeg * Math.PI / 180) * 140, 100, Math.cos(rotationDeg * Math.PI / 180) * 140],
      lookAt: [0, 0, 0]
    }
  };

  // SVG Render Asset supporting 360 Rotation and Exploded Disassembly View
  const svgRenderAsset = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="casingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background Studio Lighting -->
  <rect width="800" height="500" fill="#0b1120"/>
  <circle cx="400" cy="250" r="300" fill="#06b6d4" opacity="0.05" />

  <!-- Rotated & Exploded Product Group -->
  <g transform="translate(400, 250) rotate(${rotationDeg}) translate(-200, -150)">

    <!-- 1. Bottom Enclosure Shell (Separated in Exploded Mode) -->
    <g transform="translate(0, ${bottomShellOffset_y + 120})" filter="url(#dropShadow)">
      <rect x="0" y="0" width="400" height="100" rx="16" fill="url(#casingGrad)" stroke="#334155" stroke-width="2"/>
      <text x="200" y="55" fill="#94a3b8" font-family="sans-serif" font-size="12" text-anchor="middle">Bottom ABS Enclosure Base</text>
    </g>

    <!-- 2. Internal PCB & Components Assembly (Disassembled Middle Layer) -->
    <g transform="translate(30, ${pcbOffset_y + 40})" filter="url(#dropShadow)">
      <rect x="0" y="0" width="340" height="140" rx="12" fill="url(#pcbGrad)" stroke="#10b981" stroke-width="2"/>
      <!-- MCU Chip -->
      <rect x="120" y="25" width="100" height="90" rx="6" fill="#090d16" stroke="#475569" stroke-width="2"/>
      <text x="170" y="75" fill="#f8fafc" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${pcb.placedComponents && pcb.placedComponents[0] ? pcb.placedComponents[0].mpn : 'ESP32-S3'}</text>
      <!-- Status Indicators -->
      <circle cx="300" cy="30" r="6" fill="#10b981"/>
      <circle cx="320" cy="30" r="6" fill="#06b6d4"/>
    </g>

    <!-- 3. Top Enclosure Shell (Separated in Exploded Mode) -->
    <g transform="translate(0, ${topShellOffset_y - 40})" opacity="${isExploded ? 0.85 : 0.95}" filter="url(#dropShadow)">
      <rect x="0" y="0" width="400" height="120" rx="20" fill="url(#casingGrad)" stroke="#06b6d4" stroke-width="2"/>
      <!-- Window cutout -->
      <rect x="40" y="20" width="320" height="80" rx="10" fill="none" stroke="#06b6d4" stroke-dasharray="4" stroke-width="1.5"/>
      <text x="200" y="65" fill="#06b6d4" font-family="sans-serif" font-size="12" text-anchor="middle">Top Enclosure Casing Cover ${isExploded ? '(Disassembled View)' : ''}</text>
    </g>

  </g>
</svg>`;

  return {
    renderFormat: 'WebGL / Three.js Scene + Exploded SVG Render',
    cameraPreset: `Orbit Rotation ${rotationDeg}° | Exploded Disassembly: ${isExploded ? 'ON' : 'OFF'}`,
    threeScene,
    svgRenderAsset
  };
}

module.exports = {
  generate3DRender
};
