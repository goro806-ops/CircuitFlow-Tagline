/**
 * KiCad exporter (v1.8)
 * Generates basic KiCad 6/7 style S-expression schematic + PCB
 * from CircuitFlow project state. Not production-perfect, but
 * openable in KiCad for further work.
 */

function esc(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function assessDesignReadiness(project) {
  const components = project.schematic?.components || [];
  const nets = project.schematic?.nets || [];
  const warnings = [];
  const errors = [];
  for (const component of components) {
    const ref = component.ref || "unknown";
    const mpn = String(component.mpn || "").trim();
    const footprint = String(component.footprint || "").trim();
    if (!mpn || /^(tbd|various|generic|unknown)$/i.test(mpn)) {
      warnings.push(`${ref}: manufacturer part number is missing or generic`);
    }
    if (!footprint || /^(tbd|module)$/i.test(footprint)) {
      warnings.push(`${ref}: verified KiCad footprint is missing`);
    }
    if (!component.pins || Object.keys(component.pins).length === 0) {
      warnings.push(`${ref}: pin mapping is incomplete`);
    }
  }
  if (components.length) {
    warnings.push("Schematic export is netlist-only until verified KiCad symbols and pin mappings are assigned");
  }
  if (components.length === 0) warnings.push("No schematic components were supplied");
  if (nets.length === 0) warnings.push("No electrical nets were supplied");
  if ((project.pcb?.placements || []).length < components.length) {
    errors.push("PCB placements do not cover all schematic components");
  }
  return {
    status: errors.length ? "BLOCKED" : warnings.length ? "REVIEW_REQUIRED" : "READY_FOR_CLI_VALIDATION",
    errors,
    warnings,
    production_ready: false
  };
}

function generateKicadSchematic(project) {
  const sch = project.schematic;
  const components = sch?.components || [];
  const nets = sch?.nets || [];
  const date = new Date().toISOString().slice(0, 10);
  const netSummary = nets.length ? `${nets.length} logical nets` : "no logical nets";
  const componentSummary = components.length ? `${components.length} components in netlist.json` : "no components";
  // Keep the file parseable by KiCad. The full pin-aware component data is
  // retained in netlist.json until verified library symbols are assigned.
  return `(kicad_sch (version 20231120) (generator "circuitflow") (generator_version "1.10.0")
  (uuid "00000000-0000-0000-0000-000000000001")
  (paper "A4")
  (title_block
    (title "${esc(project.project_id || "CircuitFlow")}")
    (date "${date}")
    (comment 1 "Netlist-only export: ${esc(componentSummary)}; ${esc(netSummary)}")
    (comment 2 "Assign verified KiCad symbols and pins before production release")
  )
  (lib_symbols)
  (sheet_instances (path "/" (page "1")))
)\n`;
}

function generateKicadPcb(project) {
  const pcb = project.pcb;
  if (!pcb) throw new Error("No PCB data");

  const w = pcb.outline?.width_mm || 40;
  const h = pcb.outline?.height_mm || 30;
  const layers = pcb.layers || 2;
  const placements = pcb.placements || [];
  const date = new Date().toISOString().slice(0, 10);

  // Board outline (Edge.Cuts)
  const outline = `
  (gr_line (start 0 0) (end ${w} 0) (layer "Edge.Cuts") (width 0.1))
  (gr_line (start ${w} 0) (end ${w} ${h}) (layer "Edge.Cuts") (width 0.1))
  (gr_line (start ${w} ${h}) (end 0 ${h}) (layer "Edge.Cuts") (width 0.1))
  (gr_line (start 0 ${h}) (end 0 0) (layer "Edge.Cuts") (width 0.1))`;

  const footprints = placements.map((p, i) => {
    const ref = p.ref || `U${i + 1}`;
    const rot = p.rotation || 0;
    const side = p.side === "bottom" ? "B.Cu" : "F.Cu";
    return `
  (footprint "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm" (layer "${side}")
    (at ${p.x_mm || 10} ${p.y_mm || 10} ${rot})
    (attr smd)
    (fp_text reference "${esc(ref)}" (at 0 -2.5) (layer "F.SilkS")
      (effects (font (size 0.8 0.8) (thickness 0.12)))
    )
    (fp_text value "${esc(ref)}" (at 0 2.5) (layer "F.Fab")
      (effects (font (size 0.8 0.8) (thickness 0.12)))
    )
  )`;
  }).join("\n");

  const layerDefs = layers >= 4
    ? `
    (0 "F.Cu" signal)
    (1 "In1.Cu" signal)
    (2 "In2.Cu" signal)
    (31 "B.Cu" signal)`
    : `
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)`;

  return `(kicad_pcb (version 20221018) (generator circuitflow)
  (general
    (thickness 1.6)
  )
  (paper "A4")
  (title_block
    (title "${esc(project.project_id || "CircuitFlow")}")
    (date "${date}")
    (comment 1 "CircuitFlow heuristic layout – replace footprints & route in KiCad")
  )
  (layers${layerDefs}
    (32 "B.Adhes" user "B.Adhesive")
    (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (44 "Edge.Cuts" user)
  )
  (setup
    (pad_to_mask_clearance 0.05)
  )
${outline}
${footprints}
)
`;
}

/**
 * Bundle schematic + PCB + netlist summary as separate files content
 */
function generateKicadProject(project) {
  const name = (project.project_id || "circuitflow").replace(/[^a-zA-Z0-9_-]/g, "_");
  const readiness = assessDesignReadiness(project);
  return {
    name,
    files: {
      [`${name}.kicad_sch`]: generateKicadSchematic(project),
      [`${name}.kicad_pcb`]: generateKicadPcb(project),
      [`${name}.netlist.json`]: JSON.stringify(
        {
          components: project.schematic?.components || [],
          nets: project.schematic?.nets || [],
          bom: project.bom?.line_items || []
        },
        null,
        2
      )
    },
    readiness,
    notes: [
      "Open the .kicad_sch / .kicad_pcb in KiCad 6+",
      "KiCad CLI validation is authoritative for ERC/DRC; this export is not production-ready until readiness warnings are closed",
      "Nets are documented in comments and netlist.json"
    ]
  };
}

module.exports = {
  generateKicadSchematic,
  generateKicadPcb,
  generateKicadProject,
  assessDesignReadiness
};
