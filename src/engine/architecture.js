/**
 * Core Architecture & System Topology Engine
 * CircuitFlow Platform
 */

function generateArchitecture(prompt = '', constraints = {}) {
  const lower = prompt.toLowerCase();

  // Detect microcontroller/SoC architecture
  let mcu = {
    name: 'ESP32-S3-WROOM-1',
    family: 'ESP32',
    core: 'Dual-core Xtensa LX7 @ 240MHz',
    wireless: ['Wi-Fi 802.11 b/g/n', 'Bluetooth 5.0 LE'],
    flash: '8MB',
    ram: '512KB SRAM',
    package: 'QFN-56'
  };

  if (lower.includes('stm32') || lower.includes('industrial') || lower.includes('precision')) {
    mcu = {
      name: 'STM32F411CEU6',
      family: 'STM32',
      core: 'ARM Cortex-M4 @ 100MHz',
      wireless: ['None (Add-on SPI/UART Module)'],
      flash: '512KB',
      ram: '128KB SRAM',
      package: 'UFQFPN-48'
    };
  } else if (lower.includes('rp2040') || lower.includes('raspberry pi')) {
    mcu = {
      name: 'RP2040',
      family: 'Raspberry Pi',
      core: 'Dual ARM Cortex-M0+ @ 133MHz',
      wireless: ['Optional ESP8266/CYW43439'],
      flash: '16MB External QSPI',
      ram: '264KB SRAM',
      package: 'QFN-56'
    };
  }

  // Detect Sensors & Peripherals
  const peripherals = [];

  if (lower.includes('imu') || lower.includes('accel') || lower.includes('motion') || lower.includes('tracker')) {
    peripherals.push({
      id: 'imu_1',
      type: 'Motion Sensor',
      name: 'MPU-6050 / BMI270',
      interface: 'I2C',
      address: '0x68',
      power_mW: 15
    });
  }

  if (lower.includes('display') || lower.includes('screen') || lower.includes('oled')) {
    peripherals.push({
      id: 'disp_1',
      type: 'Display',
      name: '0.96" SSD1306 OLED',
      interface: 'I2C / SPI',
      address: '0x3C',
      power_mW: 80
    });
  }

  if (lower.includes('temp') || lower.includes('environment') || lower.includes('climate')) {
    peripherals.push({
      id: 'env_1',
      type: 'Environmental Sensor',
      name: 'BME280',
      interface: 'I2C',
      address: '0x76',
      power_mW: 5
    });
  }

  if (lower.includes('gps') || lower.includes('location')) {
    peripherals.push({
      id: 'gps_1',
      type: 'GPS / GNSS',
      name: 'NEO-6M / QUECTEL L76-L',
      interface: 'UART',
      power_mW: 120
    });
  }

  // Default battery / power subsystem
  const powerSystem = {
    type: lower.includes('battery') || lower.includes('wearable') ? 'LiPo Battery (3.7V 500mAh)' : '5V USB-C Bus Powered',
    regulator: 'AMS1117-3.3 / LDO 3.3V',
    pmic: lower.includes('battery') ? 'TP4056 LiPo Charge IC' : 'None',
    estimatedOperatingHours: lower.includes('battery') ? 24 : 'Continuous USB Power'
  };

  // Construct Block Diagram Nodes & Edges
  const blocks = [
    { id: 'POWER', label: 'Power Management (USB/LiPo -> 3.3V LDO)', category: 'Power' },
    { id: 'MCU', label: `${mcu.name} (${mcu.core})`, category: 'Processor' }
  ];

  peripherals.forEach(p => {
    blocks.push({ id: p.id, label: `${p.name} (${p.type})`, category: 'Peripheral' });
  });

  const connections = peripherals.map(p => ({
    from: 'MCU',
    to: p.id,
    bus: p.interface
  }));

  connections.unshift({ from: 'POWER', to: 'MCU', bus: '3.3V VCC / GND' });

  return {
    projectName: 'CircuitFlow-Generated-Device',
    prompt,
    constraints,
    mcu,
    peripherals,
    powerSystem,
    systemTopology: {
      blocks,
      connections
    },
    powerBudget: {
      mcuPower_mW: 150,
      peripheralsPower_mW: peripherals.reduce((acc, p) => acc + p.power_mW, 0),
      totalPower_mW: 150 + peripherals.reduce((acc, p) => acc + p.power_mW, 0)
    }
  };
}

module.exports = {
  generateArchitecture
};
