/**
 * Multi-Board Systems agent (v1 – scaffold).
 * Detects whether the architecture implies multiple boards and proposes a split.
 */

import { callLlm } from './llm.js';

export async function runMultiBoardAgent(state) {
  const architecture = state.architecture || {};
  const constraints = state.constraints || {};
  const text = JSON.stringify({ architecture, constraints }).toLowerCase();

  const hints =
    /main.?board|daughter|module|flex|wearable.?band|separate.?radio|carrier/.test(text) ||
    (architecture.boards && architecture.boards.length > 1);

  let proposal = {
    multiBoard: false,
    boards: [{ id: 'MAIN', role: 'main', notes: 'Single board design' }],
    interconnects: [],
    confidence: 0.7,
  };

  if (hints) {
    try {
      const llm = await callLlm(
        `Propose a multi-board split as JSON only:
{ "multiBoard": true, "boards": [{"id":"MAIN","role":"...","notes":"..."}], "interconnects": [{"from":"MAIN","to":"...","type":"FPC|pin-header|BTB","signals":["..."]}], "confidence": 0-1 }
Architecture: ${JSON.stringify(architecture).slice(0, 2000)}`,
        { json: true }
      );
      if (llm && llm.boards) proposal = llm;
    } catch {
      proposal = {
        multiBoard: true,
        boards: [
          { id: 'MAIN', role: 'compute + power', notes: 'MCU, power, connectors' },
          { id: 'SENS', role: 'sensors', notes: 'Optional rigid-flex or daughter' },
        ],
        interconnects: [{ from: 'MAIN', to: 'SENS', type: 'FPC', signals: ['I2C', '3V3', 'GND'] }],
        confidence: 0.5,
      };
    }
  }

  state.multiBoard = {
    ...proposal,
    meta: { generatedAt: new Date().toISOString() },
  };

  return state;
}
