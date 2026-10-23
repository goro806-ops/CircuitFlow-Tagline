/**
 * Parametric Enclosure CAD Generator Engine
 * CircuitFlow Platform
 */

function generateEnclosure(pcb = {}, consumer = {}, options = {}) {
  const boardDims = pcb.boardDimensions || { width_mm: 50, height_mm: 40, thickness_mm: 1.6 };

  const minConsumerWall = consumer.minWallThickness_mm || 2.0;
  const wallThickness_mm = Math.max(minConsumerWall, parseFloat(options.wallThickness_mm || minConsumerWall));
  const clearance_mm = 1.5;

  const enclosureOuterWidth_mm = boardDims.width_mm + (2 * (wallThickness_mm + clearance_mm));
  const enclosureOuterHeight_mm = boardDims.height_mm + (2 * (wallThickness_mm + clearance_mm));
  const enclosureOuterDepth_mm = parseFloat(options.height_mm || 18.0);

  const requiresGasket = consumer.derivedSpecs ? consumer.derivedSpecs.requiresGasketSeal : false;

  // OpenSCAD Parametric Script Generation
  const scadScript = `// CircuitFlow Parametric Enclosure
// Profile: ${consumer.profileName || 'Standard'} (IP Rating: ${consumer.ipRating || 'IP54'})
board_w = ${boardDims.width_mm};
board_h = ${boardDims.height_mm};
board_t = ${boardDims.thickness_mm};
wall_t = ${wallThickness_mm};
clearance = ${clearance_mm};
depth = ${enclosureOuterDepth_mm};

module bottom_shell() {
    difference() {
        cube([board_w + 2*(wall_t+clearance), board_h + 2*(wall_t+clearance), depth], center=true);
        translate([0, 0, wall_t])
            cube([board_w + 2*clearance, board_h + 2*clearance, depth], center=true);

        // USB Cutout
        translate([-(board_w/2 + wall_t + clearance), 0, 0])
            cube([wall_t*2+2, 10, 6], center=true);

        ${requiresGasket ? '// O-Ring Gasket Channel Perimeter\n        translate([0, 0, depth/2 - 1]) difference() { cube([board_w+4, board_h+4, 2], center=true); cube([board_w+2, board_h+2, 2], center=true); }' : ''}
    }
}

bottom_shell();
`;

  // Simulated STL ASCII format representation
  const stlContent = `solid CircuitFlow_Enclosure_Bottom
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex ${enclosureOuterWidth_mm} 0 0
    vertex ${enclosureOuterWidth_mm} ${enclosureOuterHeight_mm} 0
  endloop
endfacet
endsolid CircuitFlow_Enclosure_Bottom
`;

  return {
    dimensions_mm: {
      outerWidth: enclosureOuterWidth_mm,
      outerHeight: enclosureOuterHeight_mm,
      outerDepth: enclosureOuterDepth_mm,
      wallThickness: wallThickness_mm,
      mountHoleDiameter: 2.5
    },
    consumerFeatures: {
      profileName: consumer.profileName || 'Standard',
      ipRating: consumer.ipRating || 'IP54',
      requiresGasketSeal: requiresGasket
    },
    materials: consumer.materialRequirements || ['ABS plastic', 'PETG 3D printing'],
    cadFiles: {
      'enclosure_bottom.scad': scadScript,
      'enclosure_bottom.stl': stlContent,
      'enclosure_specs.json': JSON.stringify({
        ipRating: consumer.ipRating || 'IP54',
        fasteners: consumer.fastenerSecurity || '4x M2.5 Screws',
        cutouts: [
          { name: 'USB-C', position: 'Left Panel', width_mm: 9.0, height_mm: 3.5 }
        ]
      }, null, 2)
    }
  };
}

module.exports = {
  generateEnclosure
};
