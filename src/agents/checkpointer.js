/**
 * Checkpointer factory
 * - Prefer SqliteSaver (durable) when package is available
 * - Fall back to MemorySaver
 *
 * Env:
 *   CIRCUITFLOW_CHECKPOINT_DB=./data/checkpoints.sqlite  (optional path)
 */

const path = require("path");
const fs = require("fs");
const { MemorySaver } = require("@langchain/langgraph");

function getCheckpointDbPath() {
  return (
    process.env.CIRCUITFLOW_CHECKPOINT_DB ||
    path.join(process.cwd(), "data", "checkpoints.sqlite")
  );
}

function createCheckpointer() {
  const dbPath = getCheckpointDbPath();

  try {
    const { SqliteSaver } = require("@langchain/langgraph-checkpoint-sqlite");
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // API: fromConnString for file path
    const saver = SqliteSaver.fromConnString(dbPath);
    console.log(`[checkpointer] Using SqliteSaver → ${dbPath}`);
    return { checkpointer: saver, type: "sqlite", path: dbPath };
  } catch (err) {
    console.log("[checkpointer] SqliteSaver not available, using MemorySaver");
    console.log("  Optional: npm install @langchain/langgraph-checkpoint-sqlite");
    return { checkpointer: new MemorySaver(), type: "memory", path: null };
  }
}

module.exports = { createCheckpointer, getCheckpointDbPath };
