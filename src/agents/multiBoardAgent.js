/**
 * Multi-Board Systems agent (v1 – scaffold).
 */

async function runMultiBoardAgent(state) {
  const architecture = state.architecture || {};
  const constraints =
    state.constraints ||
    (state.user_intent && state.user_intent.parsed_constraints) ||
    {};
  const text = JSON.stringify({ architecture, constraints }).toLowerCase();

  const hints =
    /main.?board|daughter|module|flex|wearable.?band|separate.?radio|carrier/.test(
      text
    ) ||
    (Array.isArray(architecture.boards) && architecture.boards.length > 1);

  let proposal = {
    multiBoard: false,
    boards: [{ id: "MAIN", role: "main", notes: "Single board design" }],
    interconnects: [],
    confidence: 0.7
  };

  if (hints) {
    proposal = {
      multiBoard: true,
      boards: [
        { id: "MAIN", role: "compute + power", notes: "MCU, power, connectors" },
        { id: "SENS", role: "sensors", notes: "Optional rigid-flex or daughter" }
      ],
      interconnects: [
        { from: "MAIN", to: "SENS", type: "FPC", signals: ["I2C", "3V3", "GND"] }
      ],
      confidence: 0.55
    };
  }

  state.multiBoard = {
    ...proposal,
    meta: { generatedAt: new Date().toISOString() }
  };

  return state;
}

module.exports = { runMultiBoardAgent };
