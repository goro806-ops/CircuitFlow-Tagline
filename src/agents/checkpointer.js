/**
 * Checkpointer factory.
 *
 * Postgres is used when DATABASE_URL is configured so an in-flight graph can
 * resume after a process restart. MemorySaver remains the local/test fallback.
 */

const { MemorySaver } = require("@langchain/langgraph");

function memoryCheckpointer() {
  console.warn("[checkpointer] Using MemorySaver (no DATABASE_URL or Postgres setup failed)");
  return {
    checkpointer: new MemorySaver(),
    type: "memory",
    path: null,
    ready: Promise.resolve(true)
  };
}

function createCheckpointer() {
  if (!process.env.DATABASE_URL) return memoryCheckpointer();

  try {
    const { PostgresSaver } = require("@langchain/langgraph-checkpoint-postgres");
    const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL, {
      schema: process.env.LANGGRAPH_CHECKPOINT_SCHEMA || "langgraph"
    });
    const ready = checkpointer.setup()
      .then(() => {
        console.log("[checkpointer] Using PostgresSaver");
        return true;
      })
      .catch((err) => {
        console.warn("[checkpointer] Postgres setup failed:", err.message);
        return false;
      });
    return { checkpointer, type: "postgres", path: null, ready };
  } catch (err) {
    console.warn("[checkpointer] PostgresSaver unavailable:", err.message);
    return memoryCheckpointer();
  }
}

module.exports = { createCheckpointer, memoryCheckpointer };
