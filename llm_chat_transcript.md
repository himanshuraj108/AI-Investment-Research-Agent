# LLM Chat Session Transcript
**Assignment:** InsideIIM × Altuni AI Labs — AI Engineer Intern  
**Project:** AlphaLens — AI Investment Research Agent  
**Date:** June 20, 2026  
**Developer:** Himanshu  
**AI Assistant:** Antigravity (Google DeepMind)

---

## Project Overview

AlphaLens is a full-stack AI investment research agent that accepts any company name, runs a 5-stage LangGraph.js pipeline (Company Overview → Financials → Market Position → Risks → AI Verdict), and delivers a structured INVEST or PASS recommendation — streamed live to the UI via Server-Sent Events and persisted to Supabase PostgreSQL.

---

## Full Development Chat Session

---

### Session 1 — Architecture & Planning

**Developer:** I need to build an AI investment research agent for an internship assignment. It should take a company name and give an INVEST or PASS verdict. Tech stack should use Groq, Tavily, LangGraph, and Supabase.

**Assistant:** Great project. Here's the architecture I'd recommend:

```
User → React Frontend → Express Backend → LangGraph Pipeline
                                              ├── Node 1: Company Overview  (Tavily + Groq)
                                              ├── Node 2: Financials         (Tavily + Groq)
                                              ├── Node 3: Market Position    (Tavily + Groq)
                                              ├── Node 4── Risk Analysis     (Tavily + Groq)
                                              └── Node 5: AI Verdict         (Groq only)
                                         → Supabase (save result)
```

Key decisions:
- **SSE over WebSockets** — one-directional streaming is sufficient; simpler to implement
- **Sequential LangGraph nodes** — each node's output feeds into the next for coherence
- **Two Groq models** — `llama-3.1-8b-instant` for speed on research nodes, `llama-3.3-70b-versatile` for accuracy on the final verdict

Let me scaffold the project structure.

**Developer:** Yes, let's start.

**Assistant:** Creating the project structure:

```
AI_Investment_Research_Agent/
├── backend/
│   ├── agent.js       ← LangGraph pipeline
│   ├── index.js       ← Express + SSE server
│   ├── db.js          ← Supabase client
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   └── ResultPage.jsx
│   │   └── components/
│   │       ├── SearchBar.jsx
│   │       ├── VerdictCard.jsx
│   │       ├── ResearchSection.jsx
│   │       ├── HistoryPanel.jsx
│   │       └── ProgressStepper.jsx
│   └── index.css
└── supabase_setup.sql
```

---

### Session 2 — LangGraph Pipeline Setup

**Developer:** How do I set up LangGraph.js with 5 nodes?

**Assistant:** Install the dependency first:

```bash
npm install @langchain/langgraph @langchain/groq
```

Here's the StateGraph setup:

```javascript
import { StateGraph, Annotation } from "@langchain/langgraph";

const ResearchState = Annotation.Root({
  company:       Annotation(),
  companyInfo:   Annotation(),
  financials:    Annotation(),
  marketPosition: Annotation(),
  risks:         Annotation(),
  verdict:       Annotation(),
});

const graph = new StateGraph(ResearchState)
  .addNode("node_companyInfo",    companyInfoNode)
  .addNode("node_financials",     financialsNode)
  .addNode("node_marketPosition", marketPositionNode)
  .addNode("node_risks",          risksNode)
  .addNode("node_verdict",        verdictNode)
  .addEdge(START, "node_companyInfo")
  .addEdge("node_companyInfo",    "node_financials")
  .addEdge("node_financials",     "node_marketPosition")
  .addEdge("node_marketPosition", "node_risks")
  .addEdge("node_risks",          "node_verdict")
  .addEdge("node_verdict",        END)
  .compile();
```

**Developer:** I'm getting a node name collision error — "node already exists."

**Assistant:** This is a known LangGraph.js issue — if nodes are named without a unique prefix (e.g., just "companyInfo"), they can collide with internal graph state keys. The fix is to prefix all node names:

```javascript
// ❌ Causes collision
.addNode("companyInfo", ...)

// ✅ Use prefixed names
.addNode("node_companyInfo", ...)
```

This separates node identifiers from state keys. The state still uses `companyInfo` as the key, but the node is registered as `node_companyInfo`.

---

### Session 3 — Tavily API Integration

**Developer:** How do I integrate Tavily for real-time web search?

**Assistant:** Tavily has a purpose-built REST API for AI agents:

```javascript
async function tavilySearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 6,
      search_depth: "basic",
      include_answer: true,
    }),
  });
  const data = await res.json();
  const answer = data.answer ? `Key finding: ${data.answer}\n\n` : "";
  const text = answer + data.results.map(r => `[${r.title}]\n${r.content}`).join("\n\n---\n\n");
  const sources = data.results.map(r => ({ title: r.title, url: r.url }));
  return { text, sources };
}
```

The `include_answer` flag gets Tavily's own AI summary as a bonus context injection on top of the raw results.

**Developer:** Add API key fallback rotation so if primary key fails, it tries the fallback.

**Assistant:** Updated `tavilySearch` to iterate over keys:

```javascript
async function tavilySearch(query) {
  const keys = [process.env.TAVILY_API_KEY, process.env.TAVILY_API_KEY_FALLBACK].filter(Boolean);
  let lastError;
  for (const api_key of keys) {
    try {
      const res = await fetch("https://api.tavily.com/search", { ... });
      if (res.status === 401 || res.status === 429) { lastError = res.status; continue; }
      // process and return
    } catch (e) { lastError = e; }
  }
  return { text: `Search unavailable (${lastError})`, sources: [] };
}
```

Same pattern applied to Groq — if the primary Groq key hits a rate limit (429) or auth error (401), it automatically retries with `GROQ_API_KEY_FALLBACK`.

---

### Session 4 — SSE Streaming

**Developer:** How do I stream research results to the React frontend in real-time?

**Assistant:** Use Server-Sent Events (SSE). On the Express side:

```javascript
app.get("/api/research/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Stream events as LangGraph executes each node
  send("step_start", { step: "companyInfo" });   // spinner on
  // ... tokens stream via send("token", ...)
  send("step", { step: "companyInfo", data, sources }); // section done
  send("verdict", verdictJson);
  send("done", {});
  res.end();
});
```

On the React side:

```javascript
const es = new EventSource(`/api/research/stream?company=${company}`);
es.addEventListener("token",      e => { /* append to streaming text */ });
es.addEventListener("step",       e => { /* set final section data   */ });
es.addEventListener("verdict",    e => { /* show verdict card        */ });
es.addEventListener("done",       () => { es.close(); setStatus("done"); });
```

**Developer:** SSE disconnects immediately after the first step.

**Assistant:** This is the React StrictMode double-mount issue. In development, React mounts → unmounts → remounts every component. The first mount opens the SSE connection, unmount closes it, then the second mount tries to open it again — but the first `res.end()` has already been called.

Fix using a `cancelled` flag and `doneRef`:

```javascript
useEffect(() => {
  let cancelled = false;
  const t = setTimeout(() => {
    if (!cancelled) startResearch(); // only runs on real mount
  }, 50);
  return () => {
    cancelled = true;
    clearTimeout(t);
    if (esRef.current) esRef.current.close();
  };
}, [company]);
```

The 50ms delay lets the StrictMode unmount+remount cycle complete before opening the SSE connection.

---

### Session 5 — Supabase Database Setup

**Developer:** How do I set up Supabase to save research history?

**Assistant:** Create the table in Supabase SQL Editor:

```sql
CREATE TABLE research_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company         TEXT NOT NULL,
  verdict         TEXT,
  confidence      INTEGER,
  summary         TEXT,
  strengths       JSONB,
  weaknesses      JSONB,
  final_reasoning TEXT,
  company_info    TEXT,
  financials      TEXT,
  market_position TEXT,
  risks           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

Then the Supabase client:

```javascript
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function saveResearch(data) {
  await supabase.from("research_history").insert({
    company:        data.company,
    verdict:        data.verdict.verdict,
    confidence:     data.verdict.confidence,
    summary:        data.verdict.summary,
    strengths:      data.verdict.strengths,
    weaknesses:     data.verdict.weaknesses,
    final_reasoning: data.verdict.finalReasoning,
    company_info:   data.companyInfo,
    financials:     data.financials,
    market_position: data.marketPosition,
    risks:          data.risks,
  });
}
```

---

### Session 6 — Research Prompts (Goldman Sachs Level)

**Developer:** Make the prompts most most most advanced and accurate — try to 100%.

**Assistant:** Upgraded all 4 research node prompts to Goldman Sachs / Morgan Stanley analyst standard. Example for financials:

```
You are a Goldman Sachs financial analyst writing a structured financial analysis 
of ${company}. Use ONLY real numbers from the data — write "N/A" if unavailable, 
never fabricate figures.

**Revenue & Growth**
- FY[year] Revenue: [figure] | YoY Growth: [%] | 3-yr CAGR: [%]

**Profitability**
- Gross Margin: [%] | EBITDA Margin: [%] | Net Margin: [%]
- Operating Leverage: [improving/declining] with [evidence]

**Cash Flow & Balance Sheet**
- FCF: [figure] | FCF Yield: [%]
- Cash: [figure] | Total Debt: [figure] | Net Debt/EBITDA: [x]

**Valuation**
- P/E: [x] | P/S: [x] | EV/EBITDA: [x] | vs. sector median: [above/below]

**Analyst Assessment**
[2 sentences: financial health rating and key financial risk]
```

For the verdict node — implemented a 3-step chain-of-thought scoring rubric:
- Step 1: Score 6 dimensions (0-100) based on evidence
- Step 2: Compute weighted confidence score
- Step 3: Derive INVEST/PASS from the score (≥60 = INVEST)

This prevents the LLM from anchoring to a safe "85%" every time.

---

### Session 7 — Frontend UI/UX

**Developer:** Frontend should be enterprise SaaS level — not AI-made looking.

**Assistant:** Implemented the following design system:

- **Typography:** `Outfit` for headings, `Poppins` for body (Google Fonts)
- **Color system:** CSS custom properties for light mode — surface, border, accent, invest/pass colors
- **Search bar:** Rotating conic-gradient border animation on focus (rainbow border effect)
- **No icons** — minimalist, text-driven interface
- **Components:** 
  - `ProgressStepper` — 5-step pipeline tracker
  - `ResearchSection` — auto-expands while streaming, auto-collapses when done
  - `VerdictCard` — INVEST/PASS verdict with radar chart, confidence bar, strengths/weaknesses
  - `HistoryPanel` — recent analyses sidebar with delete + cached load
  - `MarkdownText` — inline chip highlighting for key terms, numbers, risk ratings

**Developer:** When delete current chat will also delete.

**Assistant:** Added auto-redirect logic: when a user deletes the company currently being viewed from the history panel, `navigate("/")` is called automatically. When all history is deleted, also redirects to home.

**Developer:** When generation is running and user deletes all history, don't redirect.

**Assistant:** Added `isRunning` prop to `HistoryPanel`. When `isRunning === true`, the navigate call is skipped — deletion still removes the UI row but the research continues uninterrupted.

---

### Session 8 — Cached History Loading

**Developer:** When I click a company from Recent Analyses, it should show the previous result, not re-run the pipeline.

**Assistant:** Implemented a two-path loading strategy:

```javascript
// HomePage / HistoryPanel: pass fromHistory flag
navigate(`/result?company=Apple`, { state: { fromHistory: true } });

// ResultPage: branch on fromHistory
useEffect(() => {
  if (fromHistory) loadCached();   // fetch from DB instantly
  else startResearch();            // run live pipeline
}, [company]);
```

Added `/api/research/cached?company=X` endpoint that fetches the most recent saved record for a company name using `.ilike()` for case-insensitive matching.

Only clicking **Re-run Analysis** triggers a fresh pipeline run.

---

### Session 9 — Source Citations

**Developer:** Show the Tavily source URLs so users can verify data.

**Assistant:** Updated the data flow:

1. `tavilySearch()` returns `{ text, sources }` where `sources = [{ title, url }]`
2. Each node passes sources through `onStepDone(step, content, sources)`
3. Backend includes sources in SSE step event: `send("step", { step, data, sources })`
4. `ResultPage` stores `sourcesData` per step
5. `ResearchSection` renders a **Sources** section with clickable links below each section's content

---

### Session 10 — Smart Text Highlighting

**Developer:** I want important text highlighted between words.

**Assistant:** Implemented auto-highlighting in `MarkdownText`:

- `**Bold text**` → grey chip `#f1f5f9`
- `$2.4B`, `₹450Cr`, `23%` → indigo chip
- `INVEST`, `Strong`, `Wide`, `Leader` → green chip
- `PASS`, `Critical`, `High` → red chip  
- `Moderate`, `Medium`, `Stable` → amber chip
- `[Critical]`, `[High]`, `[Medium]`, `[Low]` (bracket ratings from risk prompt) → colored chips

Built using `new RegExp(...)` constructor to avoid regex escape character issues in JSX.

---

### Session 11 — Radar Chart

**Developer:** Add a radar chart for dimension scores.

**Assistant:** Installed Recharts and added a `RadarChart` to `VerdictCard`:

```javascript
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const data = [
  { subject: "Business",   value: scores.businessQuality },
  { subject: "Financials", value: scores.financialHealth  },
  { subject: "Market",     value: scores.marketPosition   },
  { subject: "Risk",       value: scores.riskProfile      },
  { subject: "Valuation",  value: scores.valuation        },
  { subject: "Growth",     value: scores.growthOutlook    },
];
```

- Strong companies (Apple, Nvidia) → large indigo polygon
- Distressed companies (Byju's) → small collapsed red shape
- Hover any dot → tooltip shows `"Financials: 78/100"`

---

## Key Technical Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Groq over OpenAI** | Free tier, LPU hardware = significantly faster inference | Fewer model options |
| **Two Groq models** | `llama-3.1-8b-instant` for speed (research), `llama-3.3-70b` for accuracy (verdict) | Slightly more complex setup |
| **Tavily for search** | Purpose-built for AI agents, structured results + source URLs | 1000 free searches/month |
| **LangGraph sequential** | Each node's output feeds the next for coherent analysis | Slower than parallel but more accurate |
| **SSE over WebSockets** | Simpler server, native browser `EventSource`, no extra client libraries | One-directional only |
| **Supabase PostgreSQL** | Free hosted DB, instant setup, full research data persisted as text/JSON | Requires internet |
| **Cached DB load** | History loads instantly — no wasted API calls on re-visits | Data is point-in-time snapshot |
| **API key fallback rotation** | Zero-downtime resilience against rate limits (HTTP 429/401) | Requires two API keys per service |
| **Chain-of-thought scoring** | Forces LLM to score each dimension before computing confidence — prevents 85% anchoring | Longer prompt; more tokens |
| **Recharts radar chart** | Visual fingerprint of company quality — strong vs weak immediately obvious | Requires `npm install recharts` |

---

## Bugs Encountered & Fixed

1. **LangGraph node name collision**  
   *Problem:* Nodes named `"companyInfo"` collided with LangGraph state keys.  
   *Fix:* Renamed all nodes to `"node_companyInfo"`, `"node_financials"`, etc.

2. **React StrictMode SSE double-mount**  
   *Problem:* Dev mode mounts → unmounts → remounts, closing SSE on the first unmount.  
   *Fix:* Added `cancelled` flag + 50ms `setTimeout` delay to skip the StrictMode fake unmount.

3. **SSE connection stays open after completion**  
   *Problem:* `es.close()` called in `done` event but the `onerror` handler re-opened it.  
   *Fix:* Added `doneRef` — error handler checks `doneRef.current` and ignores errors after completion.

4. **Confidence score always 85%**  
   *Problem:* LLM anchored to a "safe" middle-high score regardless of company quality.  
   *Fix:* Rewrote verdict prompt with a 3-step chain-of-thought rubric — score 6 dimensions individually, compute weighted average, derive confidence from the math.

5. **History panel stale closure on delete**  
   *Problem:* `handleDelete` async function captured stale `history` state. Rapid or sequential deletes read old list length, breaking the "navigate to / when empty" logic.  
   *Fix:* Added `historyRef` mirroring the state. Async handler reads `historyRef.current` — always the latest value.

6. **Redirect to / during active generation**  
   *Problem:* Deleting all history while research was running redirected away, killing the pipeline.  
   *Fix:* Added `isRunning` prop to `HistoryPanel`. All `navigate()` calls are gated behind `if (isRunning) return`.

7. **High/Medium/Low not highlighted**  
   *Problem:* Split regex only captured bracket forms `[High]`, not standalone words `High`.  
   *Fix:* Added `High`, `Medium`, `Low`, `Critical` to the main split regex. Built regex with `new RegExp()` constructor to avoid escaping issues.

8. **Ticker text blank on start**  
   *Problem:* `marquee` keyframe started at `translateX(100%)` — text was off-screen until it scrolled in.  
   *Fix:* Switched to `marqueeLoop` keyframe (`0% → -50%`) with messages doubled. Text visible from frame 1.

9. **Research sections all open simultaneously**  
   *Problem:* All sections visible at once made it hard to follow the sequential generation.  
   *Fix:* `ResearchSection` auto-collapses when `isStreaming` flips `true → false`, detected via `prevStreamingRef`.

---

## Final Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)               │
│                                                               │
│  HomePage            ResultPage              Components       │
│  ─────────           ──────────              ──────────       │
│  SearchBar     →     ProgressStepper         SearchBar        │
│  HistoryTable        ResearchSection ×4      VerdictCard      │
│  (from DB)           VerdictCard             RadarChart       │
│                      HistoryPanel            MarkdownText     │
│                      (SSE EventSource)       ResearchSection  │
└──────────────────────────────┬──────────────────────────────┘
                               │  SSE / REST
┌──────────────────────────────▼──────────────────────────────┐
│                       BACKEND (Node.js + Express)             │
│                                                               │
│  GET /api/research/stream     GET /api/research/cached        │
│  GET /api/history             DELETE /api/history/:id         │
│  GET /api/history/:id                                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    LANGGRAPH PIPELINE (agent.js)              │
│                                                               │
│  node_companyInfo    → Tavily search → llama-3.1-8b-instant  │
│  node_financials     → Tavily search → llama-3.1-8b-instant  │
│  node_marketPosition → Tavily search → llama-3.1-8b-instant  │
│  node_risks          → Tavily search → llama-3.1-8b-instant  │
│  node_verdict        → llama-3.3-70b-versatile (JSON)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
┌─────────────▼────────┐           ┌────────────▼───────────┐
│  Tavily API           │           │  Supabase PostgreSQL    │
│  Real-time web search │           │  research_history table │
│  + source URLs        │           │  Full data persisted    │
└──────────────────────┘           └────────────────────────┘
```

---

*End of LLM Chat Session Transcript*
