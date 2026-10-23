/**
 * Automated Test Suite for CircuitFlow Platform Engines
 */

const assert = require('assert');
const architectureEngine = require('../src/engine/architecture');
const bomEngine = require('../src/engine/bom');
const pcbEngine = require('../src/engine/pcb');
const firmwareEngine = require('../src/engine/firmware');
const enclosureEngine = require('../src/engine/enclosure');
const renderEngine = require('../src/engine/render');
const testfixtureEngine = require('../src/engine/testfixture');
const spiceEngine = require('../src/engine/spice');
const distributorEngine = require('../src/engine/distributor');
const multiboardEngine = require('../src/engine/multiboard');
const consumerEngine = require('../src/engine/consumer');
const negotiatorEngine = require('../src/engine/negotiator');
const exportEngine = require('../src/engine/export');

async function runTests() {
  console.log('--- RUNNING CIRCUITFLOW ALL 13 ENGINES TEST SUITE ---');

  // Test 1: Architecture Engine
  console.log('Testing Architecture Engine...');
  const archPrompt = 'BLE Wearable step counter with IMU motion sensor and OLED screen';
  const arch = architectureEngine.generateArchitecture(archPrompt, { maxBOMCostUSD: 20 });
  assert.strictEqual(typeof arch.mcu.name, 'string');
  assert.ok(arch.peripherals.length >= 2, 'Should detect IMU and OLED peripherals');
  assert.ok(arch.powerBudget.totalPower_mW > 0, 'Power budget should be > 0');
  console.log('✓ Architecture Engine Passed!');

  // Test 2: Consumer Characteristics Engine
  console.log('Testing Consumer Target Characteristics Engine...');
  const consumer = consumerEngine.processConsumerProfile('outdoor_sports');
  assert.strictEqual(consumer.ipRating, 'IP68 (Submersible Waterproof)');
  assert.ok(consumer.derivedSpecs.requiresGasketSeal, 'Gasket seal required for IP68');
  console.log('✓ Consumer Characteristics Engine Passed!');

  // Test 3: BOM Engine
  console.log('Testing BOM Engine...');
  const bom = bomEngine.generateBOM(arch);
  assert.ok(Array.isArray(bom.items), 'BOM items should be an array');
  assert.ok(bom.summary.unitCostUSD > 0, 'BOM unit cost should be > 0');
  assert.strictEqual(bom.summary.supplyChainRiskLevel, 'LOW');
  console.log('✓ BOM Engine Passed!');

  // Test 4: PCB Engine
  console.log('Testing PCB Engine...');
  const pcb = pcbEngine.generatePCB(arch, bom);
  assert.ok(pcb.boardDimensions.width_mm >= 30, 'Width should be valid');
  assert.ok(pcb.placedComponents.length > 0, 'Should place components');
  assert.ok(pcb.gerberFiles['GTL_Top_Copper.gtl'], 'Should contain top copper Gerber');
  console.log('✓ PCB Engine Passed!');

  // Test 5: Firmware Engine
  console.log('Testing Firmware Engine...');
  const fw = firmwareEngine.generateFirmware(arch, bom);
  assert.strictEqual(typeof fw.files['main/main.c'], 'string');
  assert.ok(fw.files['main/main.c'].includes('i2c_master_init'), 'Should generate I2C init logic');
  console.log('✓ Firmware Engine Passed!');

  // Test 6: Enclosure Engine
  console.log('Testing Enclosure Engine...');
  const enc = enclosureEngine.generateEnclosure(pcb, consumer);
  assert.ok(enc.dimensions_mm.outerWidth > pcb.boardDimensions.width_mm, 'Enclosure width > PCB width');
  assert.ok(enc.cadFiles['enclosure_bottom.stl'], 'STL output present');
  assert.strictEqual(enc.consumerFeatures.ipRating, 'IP68 (Submersible Waterproof)');
  console.log('✓ Enclosure Engine Passed!');

  // Test 7: Adaptive Shape AI Conflict Negotiator Engine
  console.log('Testing Adaptive Shape AI Conflict Negotiator Engine...');
  const negotiation = negotiatorEngine.evaluateShapeChangeAndNegotiate(
    { pcb, enclosure: enc, consumer },
    { height_mm: 7.0, wallThickness_mm: 1.0, hasVentHoles: true }
  );
  assert.strictEqual(negotiation.hasConflicts, true, 'Conflicts should be detected for 7mm height + vent holes with IP68');
  assert.ok(negotiation.conflicts.length >= 2, 'Should flag thermal and IP seal violations');
  assert.ok(negotiation.negotiatedAlternatives.length >= 2, 'Should propose trade-off shape alternatives');
  console.log('✓ AI Conflict Negotiator Engine Passed!');

  // Test 8: 3D Render Engine with Disassembly 360 View
  console.log('Testing 3D Photorealistic Render Engine (Orbit 360 & Disassembly)...');
  const renderNormal = renderEngine.generate3DRender(pcb, enc, { exploded: false, rotation: 45 });
  const renderExploded = renderEngine.generate3DRender(pcb, enc, { exploded: true, rotation: 180 });
  assert.ok(renderNormal.svgRenderAsset.includes('rotate(45)'), 'Rotation angle applied');
  assert.ok(renderExploded.svgRenderAsset.includes('Disassembled View'), 'Disassembly view generated');
  console.log('✓ 3D Photorealistic Render Engine Passed!');

  // Test 9: Bed-of-Nails Test Fixture Engine
  console.log('Testing Factory Bed-of-Nails Test Fixture Engine...');
  const tf = testfixtureEngine.generateTestFixture(pcb);
  assert.ok(tf.testPointCount >= 4, 'At least 4 test points generated');
  assert.ok(tf.cadFiles['pogo_test_jig.scad'], 'Pogo pin CAD script generated');
  console.log('✓ Factory Test Fixture Engine Passed!');

  // Test 10: SPICE & Thermal Engine
  console.log('Testing SPICE Simulation & Thermal Analysis Engine...');
  const spice = spiceEngine.runSimulationAndThermal(arch, bom, consumer, { height_mm: 7.0 });
  assert.ok(spice.spiceNetlist.includes('.OP'), 'SPICE netlist contains OP card');
  assert.ok(spice.thermalAnalysis.thermalHotspots.length > 0, 'Hotspots calculated');
  console.log('✓ SPICE Simulation & Thermal Analysis Engine Passed!');

  // Test 11: Distributor Engine
  console.log('Testing Live Distributor Cart Sync & Turnkey Quotes Engine...');
  const dist = distributorEngine.generateDistributorQuotes(bom, pcb);
  assert.ok(dist.distributorCarts.length >= 2, 'Carts generated for DigiKey & Mouser');
  assert.ok(dist.turnkeyQuotes.length >= 2, 'Turnkey quotes generated for JLCPCB & PCBWay');
  console.log('✓ Live Distributor Cart Sync Engine Passed!');

  // Test 12: Multi-Board System Engine
  console.log('Testing Multi-Board & Flex-Rigid System Engine...');
  const mb = multiboardEngine.generateMultiBoardSystem(arch);
  assert.strictEqual(mb.isMultiBoardSystem, true);
  assert.ok(mb.subBoards.length >= 2, 'Multiple sub-boards generated');
  assert.ok(mb.interconnections[0].type.includes('FPC'), 'Flex ribbon connection present');
  console.log('✓ Multi-Board & Flex-Rigid System Engine Passed!');

  // Test 13: Production Package Bundler Engine
  console.log('Testing Production Release Package Exporter...');
  const zipBuffer = await exportEngine.bundleReleasePackage({
    architecture: arch,
    bom,
    pcb,
    firmware: fw,
    enclosure: enc,
    render: renderExploded,
    testfixture: tf,
    spice,
    distributor: dist,
    multiboard: mb,
    consumer,
    negotiator: negotiation
  });
  assert.ok(Buffer.isBuffer(zipBuffer), 'Release package output should be a Buffer');
  assert.ok(zipBuffer.length > 2000, 'Zip buffer should contain full archive content');
  console.log('✓ Production Release Package Exporter Passed!');

  console.log('\n=============================================================');
  console.log(' ALL 13 CIRCUITFLOW ENGINE MODULE TESTS PASSED CLEANLY! 🎉');
  console.log('=============================================================');
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
