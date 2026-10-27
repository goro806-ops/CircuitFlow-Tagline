/**
 * Factory Test Jig agent (v1).
 * Produces a test-point / fixture checklist from schematic + BOM.
 */

function asLineItems(bom) {
  if (!bom) return [];
  if (Array.isArray(bom)) return bom;
  if (Array.isArray(bom.line_items)) return bom.line_items;
  if (Array.isArray(bom.items)) return bom.items;
  return [];
}

function asNets(schematic) {
  if (!schematic) return [];
  if (Array.isArray(schematic.nets)) return schematic.nets;
  if (Array.isArray(schematic.netlist)) return schematic.netlist;
  return [];
}

async function runFactoryJigAgent(state) {
  const schematic = state.schematic || {};
  const lineItems = asLineItems(state.bom);
  const nets = asNets(schematic);

  const powerNets = nets.filter((n) =>
    /vcc|vdd|3v3|5v|vbat|gnd/i.test((n && n.name) || "")
  );
  const testPoints = [];

  for (const n of powerNets) {
    testPoints.push({
      net: n.name,
      type: /gnd/i.test(n.name) ? "GND" : "POWER",
      access: "pad or pogo",
      priority: "high"
    });
  }

  for (const n of nets) {
    if (/swd|swclk|swdio|uart|tx|rx|usb|dp|dm/i.test((n && n.name) || "")) {
      testPoints.push({
        net: n.name,
        type: "DEBUG",
        access: "pogo or header",
        priority: "high"
      });
    }
  }

  // Fallback test points if schematic has no nets yet
  if (testPoints.length === 0) {
    testPoints.push(
      { net: "3V3", type: "POWER", access: "pad or pogo", priority: "high" },
      { net: "GND", type: "GND", access: "pad or pogo", priority: "high" }
    );
  }

  const hasMcu = lineItems.some((i) =>
    /mcu|nrf|stm|esp|rp2040/i.test(
      `${i.category || ""} ${i.mpn || ""} ${i.description || ""}`
    )
  );

  state.factoryJig = {
    testPoints: testPoints.slice(0, 24),
    fixture: {
      type: hasMcu ? "pogo + bed-of-nails (prototype)" : "basic continuity",
      needsProgrammingFixture: hasMcu,
      suggestedHeader: hasMcu ? "2x5 SWD or Tag-Connect style" : null
    },
    checklist: [
      "Power rail presence and voltage",
      "GND continuity",
      hasMcu ? "SWD / programming interface" : null,
      "Current draw at idle",
      "Key sensor / radio bring-up smoke test"
    ].filter(Boolean),
    meta: { generatedAt: new Date().toISOString() }
  };

  return state;
}

module.exports = { runFactoryJigAgent };
