# CircuitFlow Build Log

## v1.5 – LLM, durable checkpoints, UI link

### 1. More LLM usage
- **ComponentAgent**: optional `llmSuggestBom` merges LLM part suggestions into the rule-based BOM
- **Reviewers**: optional **LLMReviewer** adds an overall design critique when `OPENAI_API_KEY` is set
- SpecAgent still uses LLM for constraint extraction

### 2. Durable checkpoints
- `src/agents/checkpointer.js`
- Tries **SqliteSaver** (`@langchain/langgraph-checkpoint-sqlite`) → `data/checkpoints.sqlite`
- Falls back to **MemorySaver** if the package is missing
- Override path with `CIRCUITFLOW_CHECKPOINT_DB`

### 3. Homepage → agents UI
- Legacy `index.html` header links to **Multi-Agent Designer** (`/agents.html`)

### Run
```bash
npm install
npm start
# http://localhost:3000/agents.html
# http://localhost:3000/  (legacy + link)

export OPENAI_API_KEY=sk-...   # optional LLM
npm run agents:example
```
