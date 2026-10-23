/**
 * Automated Test Suite for CircuitFlow Platform Engines
 */

const assert = require('assert');
const architectureEngine = require('../src/engine/architecture');
const bomEngine = require('../src/engine/bom');
const pcbEngine = require('../src/engine/pcb');
const firmwareEngine = require('../src/engine/firmware');
const enclosureEngine = require('../src/engine/enclosure');
const exportEngine = require('../src/engine/export');

async function runTests() {
  console.log('--- RUNNING CIRCUITFLOW ENGINE TEST SUITE ---');

  // Test 1: Architecture Engine
  console.log('Testing Architecture Engine...');
  const archPrompt = 'BLE Wearable step counter with IMU motion sensor and OLED screen';
  const arch = architectureEngine.generateArchitecture(archPrompt, { maxBOMCostUSD: 20 });
  assert.strictEqual(typeof arch.mcu.name, 'string');
  assert.ok(arch.peripherals.length >= 2, 'Should detect IMU and OLED peripherals');
  assert.ok(arch.powerBudget.totalPower_mW > 0, 'Power budget should be > 0');
  console.log('✓ Architecture Engine Passed!');

  // Test 2: BOM Engine
  console.log('Testing BOM Engine...');
  const bom = bomEngine.generateBOM(arch);
  assert.ok(Array.isArray(bom.items), 'BOM items should be an array');
  assert.ok(bom.summary.unitCostUSD > 0, 'BOM unit cost should be > 0');
  assert.strictEqual(bom.summary.supplyChainRiskLevel, 'LOW');
  console.log('✓ BOM Engine Passed!');

  // Test 3: PCB Engine
  console.log('Testing PCB Engine...');
  const pcb = pcbEngine.generatePCB(arch, bom);
  assert.ok(pcb.boardDimensions.width_mm >= 30, 'Width should be valid');
  assert.ok(pcb.placedComponents.length > 0, 'Should place components');
  assert.ok(pcb.gerberFiles['GTL_Top_Copper.gtl'], 'Should contain top copper Gerber');
  console.log('✓ PCB Engine Passed!');

  // Test 4: Firmware Engine
  console.log('Testing Firmware Engine...');
  const fw = firmwareEngine.generateFirmware(arch, bom);
  assert.strictEqual(typeof fw.files['main/main.c'], 'string');
  assert.ok(fw.files['main/main.c'].includes('i2c_master_init'), 'Should generate I2C init logic');
  console.log('✓ Firmware Engine Passed!');

  // Test 5: Enclosure Engine
  console.log('Testing Enclosure Engine...');
  const enc = enclosureEngine.generateEnclosure(pcb);
  assert.ok(enc.dimensions_mm.outerWidth > pcb.boardDimensions.width_mm, 'Enclosure width > PCB width');
  assert.ok(enc.cadFiles['enclosure_bottom.stl'], 'STL output present');
  console.log('✓ Enclosure Engine Passed!');

  // Test 6: Production Package Bundler Engine
  console.log('Testing Production Release Package Exporter...');
  const zipBuffer = await exportEngine.bundleReleasePackage({
    architecture: arch,
    bom,
    pcb,
    firmware: fw,
    enclosure: enc
  });
  assert.ok(Buffer.isBuffer(zipBuffer), 'Release package output should be a Buffer');
  assert.ok(zipBuffer.length > 500, 'Zip buffer should contain archive content');
  console.log('✓ Production Release Package Exporter Passed!');

  console.log('\n==========================================');
  console.log(' ALL 6 CIRCUITFLOW ENGINE TESTS PASSED! 🎉');
  console.log('==========================================');
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
