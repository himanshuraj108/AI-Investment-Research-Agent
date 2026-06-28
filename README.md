# AlphaLens â€” AI Investment Research Agent

> **InsideIIM Ã— Altuni AI Labs â€” AI Engineer Intern Assignment**

An AI-powered investment research agent that takes a company name, runs a multi-stage research pipeline, and delivers an intelligent **INVEST** or **PASS** verdict with detailed reasoning â€” streamed live to the UI.

---

## Overview

AlphaLens uses a 5-stage LangGraph.js pipeline to systematically research any company:

1. **Company Overview** â€” business model, founding, products, scale, leadership
2. **Financial Performance** â€” revenue, profitability, margins, cash flow, valuation
3. **Market Position** â€” competitors, market share, economic moat, Porter's Five Forces
4. **Risk Analysis** â€” regulatory, competitive, macro, ESG, and black swan risks
5. **AI Verdict** â€” Groq LLM synthesizes all data into an INVEST/PASS decision with confidence score

Results are streamed live to the UI via Server-Sent Events (SSE), with each section appearing token-by-token. All research is saved to a PostgreSQL database (Supabase) for history â€” clicking a past report loads instantly from the DB without re-running the pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express |
| AI Orchestration | LangGraph.js (StateGraph, sequential 5-node pipeline) |
| LLM â€” Research | Groq `llama-3.1-8b-instant` (fast, for 4 research nodes) |
| LLM â€” Verdict | Groq `llama-3.3-70b-versatile` (high accuracy, for final verdict) |
| Web Search | Tavily API (real-time, AI-optimised search) |
| Database | Supabase (PostgreSQL) |
| Streaming | Server-Sent Events (SSE) |
| Typography | Outfit (headings) + Poppins (body) via Google Fonts |

---

## How to Run

### Prerequisites
- Node.js 18+
- Groq API key â†’ [console.groq.com](https://console.groq.com) (free)
- Tavily API key â†’ [tavily.com](https://tavily.com) (free)
- Supabase project â†’ [supabase.com](https://supabase.com) (free)

### 1. Supabase Setup (one-time)
1. Create a free project at supabase.com
2. Go to **SQL Editor** and run the contents of `supabase_setup.sql`
3. Go to **Settings â†’ API** and copy your Project URL and anon key

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```
GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY_FALLBACK=your_groq_fallback_key
TAVILY_API_KEY=your_tavily_api_key
TAVILY_API_KEY_FALLBACK=your_tavily_fallback_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

```bash
npm run dev
```
Backend runs at `http://localhost:3001`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

---

## How It Works

### Architecture

```
User enters company name
        â†“
React Frontend (SSE EventSource)
        â†“ GET /api/research/stream?company=Tesla
Express Backend
        â†“
LangGraph StateGraph (5 sequential nodes)
   â”œâ”€â”€ node_companyInfo    â†’ Tavily search â†’ llama-3.1-8b-instant summarize â†’ SSE stream
   â”œâ”€â”€ node_financials     â†’ Tavily search â†’ llama-3.1-8b-instant summarize â†’ SSE stream
   â”œâ”€â”€ node_marketPosition â†’ Tavily search â†’ llama-3.1-8b-instant summarize â†’ SSE stream
   â”œâ”€â”€ node_risks          â†’ Tavily search â†’ llama-3.1-8b-instant summarize â†’ SSE stream
   â””â”€â”€ node_verdict        â†’ llama-3.3-70b-versatile final JSON decision â†’ SSE emit
        â†“
Final state saved to Supabase (full research + verdict + sources)
        â†“
React UI renders progressively â€” sections stream token-by-token and auto-collapse when done
```

### LangGraph Pipeline
Each of the first 4 nodes:
1. Calls Tavily's search API to fetch real-time web data (with source URL attribution)
2. Passes raw results to Groq (`llama-3.1-8b-instant`) for structured summarization using analyst-grade prompts (Goldman Sachs / Morgan Stanley style)
3. Emits SSE `step_start` (triggers UI spinner), `token` (streams text), and `step` events (with sources array)

The final `node_verdict` receives all four summaries and uses `llama-3.3-70b-versatile` to produce a structured JSON decision with: verdict, confidence score (1â€“100), executive summary, strengths (Ã—4), weaknesses (Ã—4), and final reasoning.

### Streaming (SSE)
The backend uses Server-Sent Events with the following event types:
- `step_start` â†’ UI activates the spinner for that step
- `token` â†’ individual LLM tokens streamed to the section in real-time
- `step` â†’ full section data + Tavily source URLs
- `verdict` â†’ final INVEST/PASS JSON
- `done` â†’ pipeline complete, history refreshed
- `error` â†’ surfaced cleanly to the user

### API Key Fallback
Both Groq and Tavily support primary + fallback key rotation. If the primary key hits a rate limit (HTTP 429) or auth error (401), the system automatically retries with the fallback key â€” zero downtime for the user.

### Cached History
When a user clicks a past report from **Recent Analyses**, the full research data is loaded instantly from Supabase (`/api/research/cached?company=X`) without re-running the LLM pipeline. Only **Re-run Analysis** triggers a fresh pipeline.

---

## Key Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------| 
| **Groq over OpenAI** | Free tier, significantly faster inference via LPU hardware | Fewer model options; no GPT-4 quality on free tier |
| **Two Groq models** | `llama-3.1-8b-instant` for speed on research nodes; `llama-3.3-70b` for accuracy on verdict | Slightly more complex initialisation |
| **Tavily for search** | Purpose-built for AI agents, structured results with source URLs | 1000 free searches/month limit |
| **LangGraph sequential graph** | Each step builds on the last; easy to reason about and debug | Slower than parallel (but more coherent output) |
| **SSE over WebSockets** | Simpler server implementation, native browser `EventSource` API, no extra libraries | One-directional only â€” fine for this use case |
| **Supabase (PostgreSQL)** | Free hosted DB, instant setup, excellent JS client, full research data persisted | Requires internet connection |
| **Cached DB load from history** | Clicking past reports is instant â€” no wasted API calls | Data is point-in-time; click Re-run for latest |
| **API key fallback rotation** | Zero-downtime resilience against rate limits | Slightly more complex key management |
| **No Redux/Zustand** | Simple `useState` + props is sufficient for this app size | Would need state management at larger scale |

---

## Example Runs

### Apple Inc.
**Verdict: INVEST | Confidence: 82%**
> Apple maintains a dominant market position with exceptional brand loyalty, strong Services revenue growth (~$85B annually), and a $162B net cash position. Despite premium pricing pressure and China dependency risks, its ecosystem moat and consistent shareholder returns make it a compelling long-term hold.

---

### Byju's
**Verdict: PASS | Confidence: 91%**
> Byju's faces a severe liquidity crisis, multiple regulatory investigations across India and the US, and creditor lawsuits totaling over $1.5B. Revenue recognition irregularities and a valuation collapse from $22B to near-zero signal fundamental business model failure with no clear recovery path.

---

### Reliance Industries
**Verdict: INVEST | Confidence: 76%**
> Reliance's diversified conglomerate model spanning Jio (telecom), retail (~$35B revenue), and petrochemicals provides resilience. Strong domestic demand tailwinds and aggressive digital infrastructure investment position it well for India's growth decade, though succession risk and regulatory complexity warrant monitoring.

---

## What I Would Add With More Time

1. **Real financial data API** â€” Integrate Yahoo Finance or Alpha Vantage for actual live stock prices and financial statements
2. **PDF export** â€” One-click report download with all research formatted professionally
3. **Historical comparison** â€” Chart confidence scores over time for the same company to see sentiment shifts
4. **Sector benchmarking** â€” Compare the company against its industry peers on key metrics
5. **LangSmith tracing** â€” Add observability to monitor the AI pipeline in production
6. **Authentication** â€” User sessions so each user sees only their own research history
7. **Redis caching** â€” Cache pipeline results for 24 hours to avoid duplicate API calls on popular companies

---

## LLM Chat Session

All AI-assisted development chat logs are documented in [`llm_chat_transcript.md`](./llm_chat_transcript.md) as required by the assignment bonus criteria.


## Deployment Status
- Backend: Render
- Frontend: Vercel
