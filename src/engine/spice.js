const { solveSpiceNetlist } = require("./ngspice");
const { loadVendorModelRegistry } = require("./vendorModels");

/**
 * SPICE Circuit Simulation & Thermal Analysis Engine
 * CircuitFlow Platform
 */

function runSimulationAndThermal(architecture = {}, bom = {}, consumer = {}, shape = {}) {
  const mcuName = architecture.mcu ? architecture.mcu.name : 'ESP32-S3';
  const totalPower_mW = architecture.powerBudget ? architecture.powerBudget.totalPower_mW : 165;

  // SPICE Netlist Simulation
  const spiceNetlist = `* CircuitFlow SPICE Operating Point Simulation
V_USB VBUS 0 DC 5.0V
* Idealized 3.3V regulator model for portable operating-point validation
V_REG VCC 0 DC 3.3V
C_DEC VCC 0 1uF
R_PULLUP_SDA VCC SDA 4.7k
R_PULLUP_SCL VCC SCL 4.7k
.OP
.END
`;

  const solver = solveSpiceNetlist(spiceNetlist);

  const nodeVoltages = {
    'VBUS (USB)': '5.00 V',
    'VCC (3.3V Rail)': '3.31 V',
    'SDA (I2C)': '3.29 V',
    'SCL (I2C)': '3.29 V',
    'GND': '0.00 V'
  };

  // Ambient temperature derived from consumer profile
  let ambientTemp_C = 25.0;
  if (consumer.operatingTempRange_C) {
    const parts = consumer.operatingTempRange_C.split('to');
    if (parts.length > 1) {
      ambientTemp_C = parseFloat(parts[1].trim());
    }
  }

  // Thermal Dissipation Analysis factoring Enclosure Geometry
  const height_mm = shape.height_mm !== undefined ? shape.height_mm : 12.0;
  const thermalResistanceMultiplier = height_mm < 10.0 ? 1.6 : 1.0; // Reduced airflow increases thermal resistance

  const regPower_mW = (5.0 - 3.3) * (totalPower_mW / 3.3);
  const mcuPower_mW = 0.8 * totalPower_mW;

  const mcuJunctionTemp_C = parseFloat((ambientTemp_C + (mcuPower_mW * 0.045 * thermalResistanceMultiplier)).toFixed(1));
  const regJunctionTemp_C = parseFloat((ambientTemp_C + (regPower_mW * 0.085 * thermalResistanceMultiplier)).toFixed(1));

  const thermalHotspots = [
    {
      component: 'U2 (AMS1117-3.3 LDO Regulator)',
      powerDissipated_mW: parseFloat(regPower_mW.toFixed(1)),
      estimatedJunctionTemp_C: regJunctionTemp_C,
      maxAllowedTemp_C: 125.0,
      riskLevel: regJunctionTemp_C > 85 ? 'HIGH' : 'NORMAL'
    },
    {
      component: `U1 (${mcuName} MCU/SoC)`,
      powerDissipated_mW: parseFloat(mcuPower_mW.toFixed(1)),
      estimatedJunctionTemp_C: mcuJunctionTemp_C,
      maxAllowedTemp_C: 105.0,
      riskLevel: 'NORMAL'
    }
  ];

  const solvedNodeVoltages = { ...nodeVoltages };
  if (solver.available && solver.status === 'CONVERGED') {
    const labels = {
      vbus: 'VBUS (USB)',
      vcc: 'VCC (3.3V Rail)',
      sda: 'SDA (I2C)',
      scl: 'SCL (I2C)',
      gnd: 'GND'
    };
    for (const [node, voltage] of Object.entries(solver.nodalVoltages)) {
      if (labels[node]) solvedNodeVoltages[labels[node]] = `${voltage.toFixed(3)} V`;
    }
  }

  return {
    spiceNetlist,
    modelProvenance: {
      registry_schema_version: loadVendorModelRegistry().schema_version,
      selected_model: null,
      note: "This baseline deck uses idealized sources. Select and license an exact vendor model before safety- or performance-critical release simulation."
    },
    nodeVoltages: solvedNodeVoltages,
    simulation: {
      engine: solver.engine,
      status: solver.status,
      available: solver.available,
      analytical_fallback: !(solver.available && solver.status === 'CONVERGED')
    },
    thermalAnalysis: {
      ambientTemp_C,
      maxSystemTemp_C: Math.max(mcuJunctionTemp_C, regJunctionTemp_C),
      thermalHotspots,
      coolingRecommendation: regJunctionTemp_C > 75 ? 'Perimeter heat sink fins or thermal vias under LDO required' : 'Standard PCB copper pour adequate'
    }
  };
}

module.exports = {
  runSimulationAndThermal
};
