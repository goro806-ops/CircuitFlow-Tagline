/**
 * Factory Test Jig agent (v1 – scaffold).
 * Produces a test-point / fixture checklist from schematic + BOM.
 */

export async function runFactoryJigAgent(state) {
  const schematic = state.schematic || {};
  const bom = state.bom || [];
  const nets = schematic.nets || [];

  const powerNets = nets.filter((n) =>
    /vcc|vdd|3v3|5v|vbat|gnd/i.test(n.name || '')
  );
  const testPoints = [];

  for (const n of powerNets) {
    testPoints.push({
      net: n.name,
      type: /gnd/i.test(n.name) ? 'GND' : 'POWER',
      access: 'pad or pogo',
      priority: 'high',
    });
  }

  for (const n of nets) {
    if (/swd|swclk|swdio|uart|tx|rx|usb|dp|dm/i.test(n.name || '')) {
      testPoints.push({
        net: n.name,
        type: 'DEBUG',
        access: 'pogo or header',
        priority: 'high',
      });
    }
  }

  const hasMcu = bom.some((i) =>
    /mcu|nrf|stm|esp|rp2040/i.test(`${i.category} ${i.mpn} ${i.description}`)
  );

  state.factoryJig = {
    testPoints: testPoints.slice(0, 24),
    fixture: {
      type: hasMcu ? 'pogo + bed-of-nails (prototype)' : 'basic continuity',
      needsProgrammingFixture: hasMcu,
      suggestedHeader: hasMcu ? '2x5 SWD or Tag-Connect style' : null,
    },
    checklist: [
      'Power rail presence and voltage',
      'GND continuity',
      hasMcu ? 'SWD / programming interface' : null,
      'Current draw at idle',
      'Key sensor / radio bring-up smoke test',
    ].filter(Boolean),
    meta: { generatedAt: new Date().toISOString() },
  };

  return state;
}
