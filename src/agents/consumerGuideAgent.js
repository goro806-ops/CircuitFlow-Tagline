/**
 * Consumer Guide & Localization agent (v1 – scaffold).
 */

async function runConsumerGuideAgent(state) {
  const architecture = state.architecture || {};
  const constraints =
    state.constraints ||
    (state.user_intent && state.user_intent.parsed_constraints) ||
    {};
  const promptText =
    (state.user_intent && state.user_intent.raw_text) ||
    constraints.prompt ||
    constraints.description ||
    architecture.summary ||
    "hardware product";

  const guide = {
    productName: "CircuitFlow Product",
    oneLiner: String(promptText).slice(0, 120),
    quickStart: [
      "Charge or insert battery",
      "Power on",
      "Follow companion app if any"
    ],
    safety: [
      "Do not expose to water unless rated",
      "Use only the specified charger"
    ],
    locales: ["en"],
    supportUrl: null
  };

  state.consumerGuide = {
    ...guide,
    meta: { generatedAt: new Date().toISOString() }
  };

  return state;
}

module.exports = { runConsumerGuideAgent };
