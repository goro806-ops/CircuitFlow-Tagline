/**
 * Server-side ASCII STL generator for enclosure (v1.8)
 * Generates a simple hollow box with optional corner posts.
 * No external CAD library required.
 */

function facet(n, v1, v2, v3) {
  return [
    `  facet normal ${n[0]} ${n[1]} ${n[2]}`,
    "    outer loop",
    `      vertex ${v1[0]} ${v1[1]} ${v1[2]}`,
    `      vertex ${v2[0]} ${v2[1]} ${v2[2]}`,
    `      vertex ${v3[0]} ${v3[1]} ${v3[2]}`,
    "    endloop",
    "  endfacet"
  ].join("\n");
}

function quad(n, a, b, c, d) {
  return facet(n, a, b, c) + "\n" + facet(n, a, c, d);
}

/**
 * Build ASCII STL for a hollow rectangular enclosure.
 * Dimensions in mm (converted to same units in STL).
 */
function generateEnclosureStl(enclosure) {
  if (!enclosure || !enclosure.outer_mm) {
    throw new Error("enclosure.outer_mm required");
  }

  const W = enclosure.outer_mm.width;
  const H = enclosure.outer_mm.height;
  const D = enclosure.outer_mm.depth;
  const wall = enclosure.wall_mm || 1.5;
  const iw = Math.max(0.1, (enclosure.inner_mm?.width ?? W - 2 * wall));
  const ih = Math.max(0.1, (enclosure.inner_mm?.height ?? H - 2 * wall));

  // Outer box corners
  const o = [
    [0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0], // bottom z=0
    [0, 0, D], [W, 0, D], [W, H, D], [0, H, D]  // top z=D
  ];

  // Inner cavity (open top – lid separate in real designs)
  const ox = wall;
  const oy = wall;
  const oz = wall;
  const i = [
    [ox, oy, oz], [ox + iw, oy, oz], [ox + iw, oy + ih, oz], [ox, oy + ih, oz],
    [ox, oy, D], [ox + iw, oy, D], [ox + iw, oy + ih, D], [ox, oy + ih, D]
  ];

  const parts = [];
  parts.push("solid circuitflow_enclosure");

  // Outer faces (outward normals)
  parts.push(quad([0, 0, -1], o[0], o[3], o[2], o[1])); // bottom
  // sides (keep top open for cavity access simplified: close top of outer)
  parts.push(quad([0, 0, 1], o[4], o[5], o[6], o[7])); // top
  parts.push(quad([0, -1, 0], o[0], o[1], o[5], o[4])); // front
  parts.push(quad([0, 1, 0], o[3], o[7], o[6], o[2])); // back
  parts.push(quad([-1, 0, 0], o[0], o[4], o[7], o[3])); // left
  parts.push(quad([1, 0, 0], o[1], o[2], o[6], o[5])); // right

  // Inner cavity walls (inverted normals so shell has thickness)
  // We subtract by adding inward-facing faces of the cavity
  parts.push(quad([0, 0, 1], i[0], i[1], i[2], i[3])); // cavity floor (up)
  parts.push(quad([0, 1, 0], i[0], i[4], i[5], i[1])); // cavity front inward
  parts.push(quad([0, -1, 0], i[3], i[2], i[6], i[7]));
  parts.push(quad([1, 0, 0], i[0], i[3], i[7], i[4]));
  parts.push(quad([-1, 0, 0], i[1], i[5], i[6], i[2]));

  parts.push("endsolid circuitflow_enclosure");
  return parts.join("\n");
}

module.exports = { generateEnclosureStl };
