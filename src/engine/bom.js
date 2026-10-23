/**
 * Component Intelligence & Live BOM Engine
 * CircuitFlow Platform
 */

function generateBOM(architecture = {}) {
  const mcuName = architecture.mcu ? architecture.mcu.name : 'ESP32-S3-WROOM-1';
  const peripherals = architecture.peripherals || [];

  const items = [];

  // 1. MCU / Core IC
  items.push({
    itemNo: 1,
    designator: 'U1',
    mpn: mcuName === 'ESP32-S3-WROOM-1' ? 'ESP32-S3-WROOM-1-N8' : 'STM32F411CEU6',
    manufacturer: mcuName.includes('ESP32') ? 'Espressif Systems' : 'STMicroelectronics',
    description: `Microcontroller Unit (${mcuName})`,
    package: architecture.mcu ? architecture.mcu.package : 'QFN-56',
    quantity: 1,
    unitPriceUSD: mcuName.includes('ESP32') ? 2.85 : 4.50,
    stockStatus: 'In Stock (12,400+ available)',
    distributors: ['DigiKey', 'Mouser', 'LCSC'],
    lifecycle: 'Active'
  });

  // 2. Power Management & Regulation IC
  items.push({
    itemNo: 2,
    designator: 'U2',
    mpn: 'AMS1117-3.3',
    manufacturer: 'Advanced Monolithic Systems',
    description: '3.3V 1A Low Dropout Voltage Regulator',
    package: 'SOT-223',
    quantity: 1,
    unitPriceUSD: 0.18,
    stockStatus: 'In Stock (85,000+ available)',
    distributors: ['DigiKey', 'Mouser', 'LCSC', 'Arrow'],
    lifecycle: 'Active'
  });

  // 3. USB Interface Connector
  items.push({
    itemNo: 3,
    designator: 'J1',
    mpn: 'TYPE-C-31-M-12',
    manufacturer: 'Shou Han',
    description: 'USB Type-C Female 16-Pin Receptacle',
    package: 'SMD-16',
    quantity: 1,
    unitPriceUSD: 0.35,
    stockStatus: 'In Stock (45,000+ available)',
    distributors: ['LCSC', 'DigiKey'],
    lifecycle: 'Active'
  });

  let designatorCount = 4;

  // 4. Peripherals
  peripherals.forEach((p) => {
    let mpn = 'MPU-6050';
    let mfr = 'InvenSense';
    let pkg = 'QFN-24';
    let price = 1.20;

    if (p.type.includes('Display')) {
      mpn = 'SSD1306-OLED-0.96';
      mfr = 'Solomon Systech';
      pkg = 'FPC-30';
      price = 2.10;
    } else if (p.type.includes('Environmental')) {
      mpn = 'BME280';
      mfr = 'Bosch Sensortec';
      pkg = 'LGA-8';
      price = 3.40;
    } else if (p.type.includes('GPS')) {
      mpn = 'QUECTEL L76-L';
      mfr = 'Quectel';
      pkg = 'LCC-18';
      price = 6.80;
    }

    items.push({
      itemNo: designatorCount++,
      designator: `U${items.length + 1}`,
      mpn,
      manufacturer: mfr,
      description: p.type,
      package: pkg,
      quantity: 1,
      unitPriceUSD: price,
      stockStatus: 'In Stock',
      distributors: ['Mouser', 'DigiKey'],
      lifecycle: 'Active'
    });
  });

  // 5. Passives (Capacitors, Resistors, Crystal)
  items.push({
    itemNo: designatorCount++,
    designator: 'C1, C2, C3, C4',
    mpn: 'CL21B105KBFNNNE',
    manufacturer: 'Samsung Electro-Mechanics',
    description: '1uF 50V X7R 0805 Ceramic Capacitor',
    package: '0805',
    quantity: 4,
    unitPriceUSD: 0.02,
    stockStatus: 'In Stock',
    distributors: ['DigiKey', 'Mouser', 'LCSC'],
    lifecycle: 'Active'
  });

  items.push({
    itemNo: designatorCount++,
    designator: 'R1, R2',
    mpn: 'RC0805FR-0710KL',
    manufacturer: 'Yageo',
    description: '10k Ohm 1% 1/8W 0805 Chip Resistor',
    package: '0805',
    quantity: 2,
    unitPriceUSD: 0.01,
    stockStatus: 'In Stock',
    distributors: ['DigiKey', 'Mouser', 'LCSC'],
    lifecycle: 'Active'
  });

  // Calculate total unit price
  const totalBOMCostUSD = items.reduce((sum, item) => sum + (item.unitPriceUSD * item.quantity), 0);

  return {
    items,
    summary: {
      totalComponentCount: items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueMPNCount: items.length,
      unitCostUSD: parseFloat(totalBOMCostUSD.toFixed(2)),
      estimated1kVolumeUnitCostUSD: parseFloat((totalBOMCostUSD * 0.68).toFixed(2)),
      currency: 'USD',
      supplyChainRiskLevel: 'LOW'
    }
  };
}

module.exports = {
  generateBOM
};
