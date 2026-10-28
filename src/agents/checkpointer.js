/**
 * Checkpointer factory.
 *
 * Postgres is used when DATABASE_URL is configured so an in-flight graph can
 * resume after a process restart. MemorySaver remains the local/test fallback.
 */

const { MemorySaver } = require("@langchain/langgraph");

let state = {
  backend: "unknown",
  ready: false,
  error: null,
  checked_at: null
};

function memoryCheckpointer(reason = null) {
  state = {
    backend: "memory",
    ready: true,
    error: reason ? "postgres_setup_failed" : null,
    checked_at: new Date().toISOString()
  };
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
    const schema = process.env.LANGGRAPH_CHECKPOINT_SCHEMA;
    const checkpointer = schema
      ? PostgresSaver.fromConnString(process.env.DATABASE_URL, { schema })
      : PostgresSaver.fromConnString(process.env.DATABASE_URL);
    state = { backend: "postgres", ready: false, error: null, checked_at: null };
    const ready = checkpointer.setup()
      .then(() => {
        state = { backend: "postgres", ready: true, error: null, checked_at: new Date().toISOString() };
        console.log("[checkpointer] Using PostgresSaver");
        return true;
      })
      .catch((err) => {
        state = { backend: "postgres", ready: false, error: "postgres_setup_failed", checked_at: new Date().toISOString() };
        console.warn("[checkpointer] Postgres setup failed:", err.message);
        return false;
      });
    return { checkpointer, type: "postgres", path: null, ready };
  } catch (err) {
    console.warn("[checkpointer] PostgresSaver unavailable:", err.message);
    return memoryCheckpointer("postgres_setup_failed");
  }
}

function getCheckpointerInfo() {
  return { ...state };
}

module.exports = { createCheckpointer, memoryCheckpointer, getCheckpointerInfo };
