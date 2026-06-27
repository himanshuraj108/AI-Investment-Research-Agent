# AlphaLens — AI Investment Research Agent

> **InsideIIM × Altuni AI Labs — AI Engineer Intern Assignment**

### [Live → aiinvestmentresearchagent.vercel.app](https://aiinvestmentresearchagent.vercel.app)

> **Try it now — search any company (Apple, Byju's, TCS, Reliance) and get a full AI investment report in seconds!**

An AI-powered investment research agent that takes a company name, runs a multi-stage research pipeline, and delivers an intelligent **INVEST** or **PASS** verdict with detailed reasoning — streamed live to the UI.

---

## Overview — What It Does

AlphaLens uses a **5-stage LangGraph.js pipeline** to systematically research any company:

1. **Company Overview** — business model, founding, products, scale, leadership
2. **Financial Performance** — revenue, profitability, margins, cash flow, valuation
3. **Market Position** — competitors, market share, economic moat, Porter's Five Forces
4. **Risk Analysis** — regulatory, competitive, macro, ESG, and black swan risks
5. **AI Verdict** — Groq LLM synthesizes all data into an INVEST/PASS decision with confidence score

Results are streamed **live token-by-token** to the UI via Server-Sent Events (SSE). Each section appears progressively as the LLM generates it. All research is saved to PostgreSQL (Supabase) — clicking a past report loads instantly without re-running the pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Styling | Custom CSS (enterprise SaaS dark mode design system) |
| Charts | Recharts (Radar chart for dimension scores) |
| Backend | Node.js + Express |
| AI Orchestration | LangGraph.js (StateGraph, 5-node sequential pipeline) |
| LLM — Research nodes | Groq `llama-3.1-8b-instant` (speed-optimized) |
| LLM — Verdict node | Groq `llama-3.3-70b-versatile` (accuracy-optimized) |
| Web Search | Tavily API (real-time, AI-optimized search with source URLs) |
| Database | Supabase (PostgreSQL) |
| Streaming | Server-Sent Events (SSE) |

---

## How to Run

### Prerequisites
- Node.js 18+
- Groq API key → [console.groq.com](https://console.groq.com) (free)
- Tavily API key → [tavily.com](https://tavily.com) (free)
- Supabase project → [supabase.com](https://supabase.com) (free)

### 1. Supabase Setup (one-time)
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the full contents of `supabase_setup.sql`
3. Go to **Settings → API** and copy your **Project URL** and **anon key**

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env` with the following keys:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY_FALLBACK=your_groq_fallback_key
TAVILY_API_KEY=your_tavily_api_key
TAVILY_API_KEY_FALLBACK=your_tavily_fallback_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

Start the backend:
```bash
npm run dev
# Server runs at http://localhost:3001
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

> **No `VITE_API_URL` needed locally** — Vite's dev proxy automatically routes `/api/*` to `localhost:3001`.

### For Production Deployment
Set the following environment variable on Vercel (frontend):
```
VITE_API_URL=https://your-render-backend-url.onrender.com
```

---

## How It Works — Approach & Architecture

```
User enters company name
        ↓
React Frontend (SSE EventSource)
        ↓ GET /api/research/stream?company=Apple
Express Backend
        ↓
LangGraph StateGraph (5 sequential nodes)
   ├── node_companyInfo    → Tavily search → llama-3.1-8b-instant → SSE token stream
   ├── node_financials     → Tavily search → llama-3.1-8b-instant → SSE token stream
   ├── node_marketPosition → Tavily search → llama-3.1-8b-instant → SSE token stream
   ├── node_risks          → Tavily search → llama-3.1-8b-instant → SSE token stream
   └── node_verdict        → llama-3.3-70b-versatile chain-of-thought JSON → SSE emit
        ↓
Full research state saved to Supabase (PostgreSQL)
        ↓
React renders progressively — sections stream token-by-token, auto-collapse on completion
```

### LangGraph Pipeline Detail

Each of the **4 research nodes**:
1. Runs **2 parallel Tavily searches** for comprehensive coverage
2. Passes raw search results to `llama-3.1-8b-instant` with Goldman Sachs/Morgan Stanley style analyst prompts
3. Emits 3 SSE event types: `step_start` (spinner), `token` (stream), `step` (sources + full data)

The **verdict node** receives all 4 summaries and uses `llama-3.3-70b-versatile` with a chain-of-thought prompt to produce structured JSON:
```json
{
  "verdict": "INVEST",
  "confidence": 82,
  "summary": "Executive summary...",
  "strengths": ["S1", "S2", "S3", "S4"],
  "weaknesses": ["W1", "W2", "W3", "W4"],
  "finalReasoning": "Analyst note...",
  "scores": {
    "businessQuality": 85,
    "financialHealth": 78,
    "marketPosition": 80,
    "riskProfile": 74,
    "valuation": 65,
    "growthOutlook": 72
  }
}
```

The 6 dimension scores render as a **radar chart** in the Verdict Card.

### SSE Event Types
| Event | Purpose |
|-------|---------|
| `step_start` | Activates spinner for a pipeline step |
| `token` | Streams individual LLM tokens to the UI |
| `step` | Full section content + Tavily source URLs |
| `verdict` | Final INVEST/PASS JSON with all fields |
| `done` | Pipeline complete; triggers history refresh |
| `error` | Error message surfaced cleanly to the user |

### API Key Fallback
Both Groq and Tavily support a primary + fallback key. If the primary key hits a rate limit (HTTP 429) or auth error (401), the system automatically retries with the fallback key — zero downtime for the user.

### Cached History
Clicking a past report from **Recent Analyses** loads the full data instantly from Supabase without re-running the LLM pipeline. Only **Re-run Analysis** triggers a fresh pipeline.

---

## Key Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Groq over OpenAI** | Free tier, significantly faster inference via LPU hardware | Fewer model options; no GPT-4 quality |
| **Two Groq models** | Fast model for research, accurate model for verdict | Slightly more complex setup |
| **Tavily for search** | Purpose-built for AI agents; structured results with source URLs | 1,000 free searches/month |
| **LangGraph sequential graph** | Each node builds on previous outputs; easy to debug | Slower than parallel execution |
| **SSE over WebSockets** | Simpler server, native browser EventSource, no extra libraries | One-directional only (sufficient here) |
| **Supabase PostgreSQL** | Free hosted DB, instant setup, excellent JS client | Requires internet connection |
| **Radar chart for scores** | Instantly shows "shape" of a company — strong vs distressed is visually obvious | Requires structured JSON from LLM |
| **No Redux/Zustand** | useState + props is sufficient for this app size | Would need state management at larger scale |
| **No auth** | Scope-appropriate for assignment; keeps setup friction low | All users share the same history |
| **Left out: real stock prices** | Scope; Yahoo Finance/Alpha Vantage integration is a clear next step | Research uses LLM knowledge + Tavily web results |

---

## Example Runs

### Apple Inc.
**Verdict: INVEST | Confidence: 82%**
> Apple maintains a dominant market position with exceptional brand loyalty, strong Services revenue growth (~$85B annually), and a $162B net cash position. Despite premium pricing pressure and China dependency risks, its ecosystem moat and consistent shareholder returns make it a compelling long-term hold.

**Dimension Scores:** Business Quality: 85 | Financial Health: 78 | Market Position: 80 | Risk Profile: 74 | Valuation: 65 | Growth Outlook: 72

---

### Byju's
**Verdict: PASS | Confidence: 91%**
> Byju's faces a severe liquidity crisis, multiple regulatory investigations across India and the US, and creditor lawsuits totaling over $1.5B. Revenue recognition irregularities and a valuation collapse from $22B to near-zero signal fundamental business model failure with no clear recovery path.

**Dimension Scores:** Business Quality: 18 | Financial Health: 12 | Market Position: 30 | Risk Profile: 8 | Valuation: 15 | Growth Outlook: 20

---

### Reliance Industries
**Verdict: INVEST | Confidence: 76%**
> Reliance's diversified conglomerate model spanning Jio (telecom), retail (~$35B revenue), and petrochemicals provides resilience. Strong domestic demand tailwinds and aggressive digital infrastructure investment position it well for India's growth decade, though succession risk and regulatory complexity warrant monitoring.



## Deployment Status
- Backend: Render
- Frontend: Vercel
