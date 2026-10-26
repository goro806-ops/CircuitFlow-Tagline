# LLM providers for CircuitFlow

When OpenAI / Anthropic have no credits, use **Groq** or **xAI (Grok)**.

## Recommended: Groq (often free tier)

1. Sign up: https://console.groq.com  
2. Create an API key  
3. On Render → Environment:

| Key | Value |
|-----|--------|
| `GROQ_API_KEY` | your key |
| `LLM_PROVIDER` | `groq` (optional; auto if only Groq is set) |

Optional model: `GROQ_MODEL=llama-3.3-70b-versatile`

Redeploy, then check `/api/agents/status` → `"provider": "groq"`.

## xAI Grok

1. https://console.x.ai  
2. Create API key  
3. Render env:

| Key | Value |
|-----|--------|
| `XAI_API_KEY` | your key |
| `LLM_PROVIDER` | `xai` (optional) |

Optional: `XAI_MODEL=grok-2-latest`

## Provider priority (if several keys exist)

1. `LLM_PROVIDER` override  
2. Groq  
3. xAI  
4. Anthropic  
5. OpenAI  

If Anthropic/OpenAI keys are set but out of credits, either **remove them** from Render or set `LLM_PROVIDER=groq` so the app does not try the empty accounts first.

## Rules-only mode

With no working LLM key, the pipeline still runs on rules (nRF52 wearable path, etc.).
