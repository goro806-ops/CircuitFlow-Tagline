/**
 * Checkpointer factory
 * Uses MemorySaver only (no native sqlite) so Render/Node builds stay clean.
 * Projects are still persisted as JSON under data/projects/.
 */

const { MemorySaver } = require("@langchain/langgraph");

function createCheckpointer() {
  console.log("[checkpointer] Using MemorySaver (portable, no native deps)");
  return { checkpointer: new MemorySaver(), type: "memory", path: null };
}

module.exports = { createCheckpointer };
