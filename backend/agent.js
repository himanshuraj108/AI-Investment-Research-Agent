import "dotenv/config";
import { StateGraph, START, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";

const makeFastModel = (apiKey) => new ChatGroq({ model: "llama-3.1-8b-instant", temperature: 0.1, apiKey });
const makeSmartModel = (apiKey) => new ChatGroq({ model: "llama-3.3-70b-versatile", temperature: 0.1, apiKey });

const primaryKey   = process.env.GROQ_API_KEY;
const fallbackKey  = process.env.GROQ_API_KEY_FALLBACK;

const fastModelPrimary  = makeFastModel(primaryKey);
const fastModelFallback = fallbackKey ? makeFastModel(fallbackKey) : null;
const smartModelPrimary  = makeSmartModel(primaryKey);
const smartModelFallback = fallbackKey ? makeSmartModel(fallbackKey) : null;

async function tavilySearch(query) {
  const keys = [process.env.TAVILY_API_KEY, process.env.TAVILY_API_KEY_FALLBACK].filter(Boolean);
  let lastError;
  for (const api_key of keys) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key, query, max_results: 6, search_depth: "basic", include_answer: true }),
      });
      if (res.status === 401 || res.status === 429) { lastError = res.status; continue; }
      const data = await res.json();
      if (!data.results || data.results.length === 0) return { text: "No recent data found.", sources: [] };
      const answer = data.answer ? `Key finding: ${data.answer}\n\n` : "";
      const text = answer + data.results.map((r) => `[${r.title}]\n${r.content}`).join("\n\n---\n\n");
      const sources = data.results.map((r) => ({ title: r.title, url: r.url })).filter((s) => s.url);
      return { text, sources };
    } catch (e) { lastError = e; }
  }
  return { text: `Search unavailable (${lastError}). Proceed with general knowledge.`, sources: [] };
}

async function streamGroq(primaryModel, fallbackModel, prompt, onToken) {
  const models = [primaryModel, fallbackModel].filter(Boolean);
  let lastError;
  for (const model of models) {
    try {
      const stream = await model.stream(prompt);
      let full = "";
      for await (const chunk of stream) {
        const token = chunk.content || "";
        if (token) { full += token; if (onToken) onToken(token); }
      }
      return full;
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("rate") || msg.includes("429") || msg.includes("401")) {
        lastError = e; continue;
      }
      throw e;
    }
  }
  throw lastError || new Error("All Groq keys exhausted");
}

const ResearchState = Annotation.Root({
  company: Annotation(),
  companyInfo: Annotation(),
  financials: Annotation(),
  marketPosition: Annotation(),
  risks: Annotation(),
  verdict: Annotation(),
});

export async function runResearchAgent(company, onStepDone, onToken, onStepStart) {
  const graph = new StateGraph(ResearchState)

    .addNode("node_companyInfo", async (state) => {
      if (onStepStart) onStepStart("companyInfo");
      const { text: raw, sources } = await tavilySearch(
        `${state.company} company overview founded CEO headquarters products services business model employees 2024`
      );
      const companyInfo = await streamGroq(fastModelPrimary, fastModelFallback,
        `You are a Goldman Sachs equity analyst. Write a structured company overview for ${state.company} based on the data below. Be factual and precise — no marketing language.

**Business Overview**
[3 sentences: what the company does, sector, value proposition, founded/HQ]

**Corporate Facts**
- Founded: [year] | HQ: [location] | CEO: [name] | Employees: [count] | Ticker: [exchange:symbol]
- Market Cap: [figure or N/A]

**Business Segments**
[List each major segment with revenue % if available, otherwise describe]
- [Segment]: [description]

**Core Products & Services**
- [Product/Service]: [one-line description]

**Strategic Edge**
[2 sentences on the company's key competitive differentiator]

DATA:
${raw}`,
        (token) => onToken && onToken("companyInfo", token)
      );
      if (onStepDone) onStepDone("companyInfo", companyInfo, sources);
      return { companyInfo };
    })

    .addNode("node_financials", async (state) => {
      if (onStepStart) onStepStart("financials");
      const { text: raw, sources } = await tavilySearch(
        `${state.company} revenue net income profit margin EBITDA free cash flow debt earnings 2023 2024 annual results`
      );
      const financials = await streamGroq(fastModelPrimary, fastModelFallback,
        `You are a Goldman Sachs financial analyst. Write a structured financial analysis of ${state.company}. Use ONLY real numbers from the data — write "N/A" if unavailable, never fabricate figures.

**Revenue & Growth**
- Latest Annual Revenue: [figure + YoY%]
- Revenue Trend: [Growing/Declining/Stable — 1 sentence]

**Profitability**
- Gross Margin: [%] | Operating Margin: [%] | Net Margin: [%]
- EBITDA: [figure / margin%]
- Profitability Assessment: [1 sentence]

**Balance Sheet & Cash Flow**
- Free Cash Flow: [figure or N/A]
- Cash & Equivalents: [figure or N/A]
- Total Debt: [figure or N/A] | D/E Ratio: [ratio or N/A]

**Valuation**
- P/E: [ratio] | P/S: [ratio] | EV/EBITDA: [ratio]
- Valuation: [Overvalued / Fair / Undervalued — brief reason]

**Forward Outlook**
[Management guidance + analyst consensus if available. Any earnings surprises?]

**Financial Health Summary**
[3 sentences: overall strength, sustainability, capital allocation quality, red flags if any]

DATA:
${raw}`,
        (token) => onToken && onToken("financials", token)
      );
      if (onStepDone) onStepDone("financials", financials, sources);
      return { financials };
    })

    .addNode("node_marketPosition", async (state) => {
      if (onStepStart) onStepStart("marketPosition");
      const { text: raw, sources } = await tavilySearch(
        `${state.company} market share competitors industry position competitive advantage moat barriers 2024`
      );
      const marketPosition = await streamGroq(fastModelPrimary, fastModelFallback,
        `You are a Morgan Stanley strategy analyst. Write a structured market position analysis for ${state.company}.

**Market Size & Share**
- TAM: [figure or estimate] | Company Market Share: [% or range]
- Market Growth Rate: [CAGR%] | Maturity: [Emerging/Growing/Mature/Declining]

**Competitive Landscape**
[Top 3-4 direct competitors with one-line head-to-head comparison]
- vs [Competitor]: [who wins and why]

**Economic Moat**
Rate each (Strong/Moderate/Weak/None):
- Brand Power: [rating] — [reason]
- Switching Costs: [rating] — [reason]
- Network Effects: [rating] — [reason]
- Cost Advantage: [rating] — [reason]
- IP / Patents: [rating] — [reason]
- **Overall Moat: [Wide / Narrow / None]** — [2-sentence justification]

**Porter's Five Forces**
- New Entrants: [Low/Med/High] | Supplier Power: [L/M/H] | Buyer Power: [L/M/H]
- Substitutes: [L/M/H] | Rivalry: [L/M/H]

**Tailwinds & Headwinds**
Tailwinds: [2 bullet points]
Headwinds: [2 bullet points]

**Market Position Verdict**
[3 sentences: leader/challenger/follower, strengthening or weakening, 3-5yr trajectory]

DATA:
${raw}`,
        (token) => onToken && onToken("marketPosition", token)
      );
      if (onStepDone) onStepDone("marketPosition", marketPosition, sources);
      return { marketPosition };
    })

    .addNode("node_risks", async (state) => {
      if (onStepStart) onStepStart("risks");
      const { text: raw, sources } = await tavilySearch(
        `${state.company} risks challenges regulatory investigation lawsuit competition threats headwinds problems 2024`
      );
      const risks = await streamGroq(fastModelPrimary, fastModelFallback,
        `You are a hedge fund risk analyst. Write a brutally honest structured risk assessment for ${state.company}. Rate each risk using: [Critical] / [High] / [Medium] / [Low].

**Regulatory & Legal**
- [Risk] [rating]: [specific description — what, impact, probability]

**Competitive & Disruption**
- [Risk] [rating]: [what could erode market share and by how much]

**Financial & Macro**
- [Risk] [rating]: [debt, rates, FX, margin compression]

**Operational & Execution**
- [Risk] [rating]: [supply chain, talent, tech debt, key-person]

**ESG & Reputational**
- [Risk] [rating]: [environmental, social, governance controversies]

**Black Swan Scenario**
- [Unlikely but catastrophic scenario and estimated impact]

**Overall Risk Profile**
- Risk Level: [Conservative / Moderate / Elevated / High]
- #1 Risk: [one sentence on the biggest single risk]
- Risk Trend: [Increasing / Stable / Decreasing — why]

DATA:
${raw}`,
        (token) => onToken && onToken("risks", token)
      );
      if (onStepDone) onStepDone("risks", risks, sources);
      return { risks };
    })

    .addNode("node_verdict", async (state) => {
      if (onStepStart) onStepStart("verdict");
      const prompt = `You are the CIO of a $10B hedge fund. Make a final investment decision on ${state.company}.

RESEARCH DOSSIER:
[COMPANY] ${state.companyInfo}
[FINANCIALS] ${state.financials}
[MARKET] ${state.marketPosition}
[RISKS] ${state.risks}

STEP 1 — Score each dimension honestly from 0 to 100 based ONLY on evidence in the dossier above:
- Business Quality (model strength, moat, management): ?/100
- Financial Health (revenue growth, margins, FCF, debt): ?/100
- Market Position (share, competitive advantage, TAM): ?/100
- Risk Profile (regulatory, competitive, macro — lower score = more risk): ?/100
- Valuation (price vs intrinsic value — higher = more attractive): ?/100
- Growth Outlook (3-5yr trajectory): ?/100

STEP 2 — Compute weighted confidence:
confidence = round((BusinessQuality*0.20 + FinancialHealth*0.25 + MarketPosition*0.15 + RiskProfile*0.20 + Valuation*0.10 + GrowthOutlook*0.10))

STEP 3 — Verdict rule:
- confidence >= 60 → INVEST
- confidence < 60 → PASS

IMPORTANT RULES:
- Scores MUST reflect the actual evidence. A distressed company like Byju's should score 10-25. A dominant compounder like Apple should score 75-90. An average company should score 50-65.
- DO NOT default to 85. Use the full 1-100 range honestly.
- If risks section mentions lawsuits, insolvency, fraud, regulatory action → Risk score must be below 40.
- If financials show losses, negative FCF, high debt → Financial Health must be below 50.

Respond ONLY with valid JSON — no markdown, no text outside the JSON:
{
  "verdict": "INVEST" or "PASS",
  "confidence": <integer 1-100 computed from the weighted formula above>,
  "scores": {
    "businessQuality": <0-100>,
    "financialHealth": <0-100>,
    "marketPosition": <0-100>,
    "riskProfile": <0-100>,
    "valuation": <0-100>,
    "growthOutlook": <0-100>
  },
  "summary": "<3-4 sentence executive summary — specific, quantified, no generic statements>",
  "strengths": [
    "<specific strength with a number or data point from the research>",
    "<specific strength with a number or data point from the research>",
    "<specific strength with a number or data point from the research>",
    "<specific strength with a number or data point from the research>"
  ],
  "weaknesses": [
    "<specific weakness with a number or data point from the research>",
    "<specific weakness with a number or data point from the research>",
    "<specific weakness with a number or data point from the research>",
    "<specific weakness with a number or data point from the research>"
  ],
  "finalReasoning": "<4-5 sentences: bull case, bear case, what would change the verdict, #1 risk to monitor>"
}`;
      const models = [smartModelPrimary, smartModelFallback].filter(Boolean);
      let res;
      for (const m of models) {
        try { res = await m.invoke(prompt); break; }
        catch (e) {
          const msg = e?.message || "";
          if (msg.includes("rate") || msg.includes("429") || msg.includes("401")) continue;
          throw e;
        }
      }
      if (!res) throw new Error("All smart model keys exhausted");
      let parsed;
      try {
        const match = res.content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : res.content);
      } catch {
        parsed = {
          verdict: "PASS",
          confidence: 50,
          summary: "Analysis complete but verdict parsing encountered an issue.",
          strengths: ["Established market presence", "Revenue base", "Brand recognition", "Operational scale"],
          weaknesses: ["Requires deeper analysis", "Data limitations", "Market uncertainty", "Execution risk"],
          finalReasoning: res.content.slice(0, 600),
        };
      }
      if (onStepDone) onStepDone("verdict", parsed);
      return { verdict: parsed };
    })

    .addEdge(START, "node_companyInfo")
    .addEdge("node_companyInfo", "node_financials")
    .addEdge("node_financials", "node_marketPosition")
    .addEdge("node_marketPosition", "node_risks")
    .addEdge("node_risks", "node_verdict")
    .addEdge("node_verdict", END);

  const compiled = graph.compile();
  const finalState = await compiled.invoke({ company });
  return finalState;
}
