/**
 * Optional ngspice batch adapter.
 * The application remains portable when ngspice is not installed, but never
 * labels analytical fallback values as a real solver result.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function parseOperatingPoint(output) {
  const voltages = {};
  const tableMatch = output.match(/Node\s+Voltage\s+\n([\s\S]*?)(?:\n\s*\n|Source\s+Current|Total analysis time)/i);
  const table = tableMatch ? tableMatch[1] : output;
  for (const line of table.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][\w()\-]*)\s+([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/);
    if (match) voltages[match[1]] = Number(match[2]);
  }
  return voltages;
}

function solveSpiceNetlist(netlistStr) {
  const netlist = String(netlistStr || "").trim() + "\n";
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "circuitflow-ngspice-"));
  const inputPath = path.join(workDir, "circuit.cir");
  try {
    fs.writeFileSync(inputPath, netlist, "utf8");
    const result = spawnSync("ngspice", ["-b", inputPath], {
      encoding: "utf8",
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024
    });
    if (result.error) {
      return {
        available: false,
        engine: "analytical_estimate",
        status: "NGSPICE_UNAVAILABLE",
        error_code: result.error.code || "spawn_error",
        nodalVoltages: {}
      };
    }
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    if (result.status !== 0) {
      return {
        available: true,
        engine: "ngspice",
        status: "NGSPICE_FAILED",
        exit_code: result.status,
        error: output.slice(-1000),
        nodalVoltages: {}
      };
    }
    return {
      available: true,
      engine: "ngspice",
      status: "CONVERGED",
      nodalVoltages: parseOperatingPoint(output)
    };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

module.exports = { solveSpiceNetlist, parseOperatingPoint };
