/**
 * Consumer Guide & Localization agent (v1 – scaffold).
 * Drafts a short user-facing guide outline from the product concept.
 */

import { callLlm } from './llm.js';

export async function runConsumerGuideAgent(state) {
  const architecture = state.architecture || {};
  const constraints = state.constraints || {};
  const promptText =
    constraints.prompt || constraints.description || architecture.summary || 'hardware product';

  let guide;
  try {
    guide = await callLlm(
      `Write a concise consumer product guide outline as JSON only:
{
  "productName": "...",
  "oneLiner": "...",
  "quickStart": ["step1", "step2", "step3"],
  "safety": ["..."],
  "locales": ["en", "es", "fr"],
  "supportUrl": null
}
Product context: ${String(promptText).slice(0, 800)}
Architecture: ${JSON.stringify(architecture).slice(0, 1000)}`,
      { json: true }
    );
  } catch {
    guide = null;
  }

  if (!guide || typeof guide !== 'object') {
    guide = {
      productName: 'CircuitFlow Product',
      oneLiner: 'AI-designed hardware device',
      quickStart: ['Charge or insert battery', 'Power on', 'Follow companion app if any'],
      safety: ['Do not expose to water unless rated', 'Use only the specified charger'],
      locales: ['en'],
      supportUrl: null,
    };
  }

  state.consumerGuide = {
    ...guide,
    meta: { generatedAt: new Date().toISOString() },
  };

  return state;
}
