/**
 * FirmwareAgent (v0)
 * Generates a first-pass firmware scaffold from architecture + schematic.
 */

const { addHistory } = require("./state");

function runFirmwareAgent(project) {
  if (!project.architecture) {
    throw new Error("FirmwareAgent requires architecture");
  }

  const arch = project.architecture;
  const constraints = project.user_intent.parsed_constraints || {};
  const mcu = arch.mcu_family || "esp32";
  const sensors = constraints.sensors || [];
  const wireless = arch.wireless || constraints.wireless || "ble";

  const boardSupport = {
    mcu_family: mcu,
    framework: mcu === "esp32" ? "esp-idf / Arduino" : mcu === "nrf52" ? "nRF Connect SDK / Zephyr" : "CMSIS / bare-metal or Zephyr",
    rtos: mcu === "rp2040" ? "optional (FreeRTOS)" : "recommended (FreeRTOS / Zephyr)"
  };

  const modules = [
    { name: "board_init", description: "Clock, GPIO, power rails init" },
    { name: "hal", description: "Minimal HAL for UART/I2C/SPI/GPIO" }
  ];

  if (wireless === "ble" || wireless === "wifi") {
    modules.push({ name: "wireless", description: `${wireless.toUpperCase()} stack init + advertising/connect` });
  }
  if (arch.power_architecture === "battery") {
    modules.push({ name: "power", description: "Battery monitor, sleep / wake policies" });
  }
  sensors.forEach(s => {
    modules.push({ name: `sensor_${s}`, description: `Driver stub for ${s}` });
  });
  modules.push({ name: "app_main", description: "Main loop / task structure" });

  // Simple generated header / main sketch (placeholder code)
  const mainC = `
/**
 * Auto-generated firmware scaffold – CircuitFlow FirmwareAgent v0
 * MCU: ${mcu}
 * Wireless: ${wireless}
 */
#include <stdio.h>

void board_init(void);
void app_main(void);

int main(void) {
  board_init();
  app_main();
  return 0;
}
`.trim();

  const readme = `
# Firmware scaffold

- MCU family: ${mcu}
- Framework: ${boardSupport.framework}
- Modules: ${modules.map(m => m.name).join(", ")}

This is a first-pass structure only. Replace stubs with real drivers and RTOS tasks.
`.trim();

  const firmware = {
    format: "circuitflow-firmware-v0",
    board_support: boardSupport,
    modules,
    files: {
      "src/main.c": mainC,
      "README_FIRMWARE.md": readme
    },
    notes: [
      "Scaffold only – not production firmware.",
      "Pin mapping and drivers must be completed against the final schematic."
    ],
    confidence: 0.58
  };

  project.firmware = firmware;

  addHistory(project, "FirmwareAgent", "generated_firmware_scaffold", {
    mcu,
    module_count: modules.length
  });

  return {
    project,
    confidence: firmware.confidence,
    risk_level: "medium",
    summary: `Firmware scaffold for ${mcu} with ${modules.length} modules`
  };
}

module.exports = { runFirmwareAgent };
