import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertTriangle, Building2, DollarSign, BarChart2 } from "lucide-react";
import ProgressStepper from "../components/ProgressStepper";
import VerdictCard from "../components/VerdictCard";
import ResearchSection from "../components/ResearchSection";
import HistoryPanel from "../components/HistoryPanel";
import { API_BASE_URL } from "../config";

const STEP_ORDER = ["companyInfo", "financials", "marketPosition", "risks", "verdict"];

export default function ResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const company = searchParams.get("company") || "";
  const fromHistory = location.state?.fromHistory === true;

  const [status, setStatus]               = useState("idle");
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep]       = useState(null);
  const [tokenSteps, setTokenSteps]       = useState([]);
  const [finalData, setFinalData]         = useState({});
  const [streamData, setStreamData]       = useState({});
  const [sourcesData, setSourcesData]     = useState({});
  const [verdict, setVerdict]             = useState(null);
  const [error, setError]                 = useState(null);
  const [historyKey, setHistoryKey]       = useState(0);

  const doneRef = useRef(false);
  const esRef   = useRef(null);

  const startResearch = () => {
    if (esRef.current) esRef.current.close();
    doneRef.current = false;

    setStatus("loading");
    setCompletedSteps([]);
    setActiveStep(null);
    setTokenSteps([]);
    setFinalData({});
    setStreamData({});
    setSourcesData({});
    setVerdict(null);
    setError(null);

    const es = new EventSource(`${API_BASE_URL}/api/research/stream?company=${encodeURIComponent(company)}`);
    esRef.current = es;

    es.addEventListener("step_start", (e) => {
      const { step } = JSON.parse(e.data);
      setActiveStep(step);
    });

    es.addEventListener("token", (e) => {
      const { step, token } = JSON.parse(e.data);
      setActiveStep(step);
      setTokenSteps((prev) => prev.includes(step) ? prev : [...prev, step]);
      setStreamData((prev) => ({ ...prev, [step]: (prev[step] || "") + token }));
    });

    es.addEventListener("step", (e) => {
      const { step, data, sources } = JSON.parse(e.data);
      setFinalData((prev) => ({ ...prev, [step]: data }));
      setCompletedSteps((prev) => prev.includes(step) ? prev : [...prev, step]);
      if (sources?.length) setSourcesData((prev) => ({ ...prev, [step]: sources }));
      const nextIdx = STEP_ORDER.indexOf(step) + 1;
      setActiveStep(nextIdx < STEP_ORDER.length ? STEP_ORDER[nextIdx] : null);
    });

    es.addEventListener("verdict", (e) => {
      const data = JSON.parse(e.data);
      setVerdict(data);
      setCompletedSteps((prev) => prev.includes("verdict") ? prev : [...prev, "verdict"]);
      setActiveStep(null);
    });

    es.addEventListener("done", () => {
      doneRef.current = true;
      setStatus("done");
      setHistoryKey((k) => k + 1);
      es.close();
    });

    es.addEventListener("error", (e) => {
      try {
        const d = JSON.parse(e.data);
        setError(d.message || "Research failed.");
      } catch {
        setError("Research failed. Please try again.");
      }
      setStatus("error");
      es.close();
    });

    es.onerror = () => {
      if (!doneRef.current) {
        setError("Connection lost. Please try again.");
        setStatus("error");
        es.close();
      }
    };
  };

  const loadCached = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/research/cached?company=${encodeURIComponent(company)}`);
      if (!res.ok) { startResearch(); return; }
      const record = await res.json();
      setFinalData({
        companyInfo:    record.company_info,
        financials:     record.financials,
        marketPosition: record.market_position,
        risks:          record.risks,
      });
      setVerdict({
        verdict:        record.verdict,
        confidence:     record.confidence,
        summary:        record.summary,
        strengths:      record.strengths,
        weaknesses:     record.weaknesses,
        finalReasoning: record.final_reasoning,
      });
      setCompletedSteps(["companyInfo", "financials", "marketPosition", "risks", "verdict"]);
      setStatus("done");
    } catch { startResearch(); }
  };

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) {
        if (fromHistory) loadCached();
        else startResearch();
      }
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (esRef.current) esRef.current.close();
    };
  }, [company]);

  if (!company) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>No company specified.</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>Go to Search</button>
      </div>
    );
  }

  const isRunning = status === "loading";
  const isDone    = status === "done";

  const sections = [
    { key: "companyInfo",    icon: Building2,     title: "Company Overview",   color: "#4f46e5" },
    { key: "financials",     icon: DollarSign,    title: "Financial Analysis", color: "#16a34a" },
    { key: "marketPosition", icon: BarChart2,     title: "Market Position",    color: "#8b5cf6" },
    { key: "risks",          icon: AlertTriangle, title: "Risk Assessment",    color: "#dc2626" },
  ];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          <ArrowLeft size={13} strokeWidth={2} />
          Back
        </button>
        <div style={{ height: 18, width: 1, background: "var(--color-border)" }} />
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {company}
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>Investment Research Report</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {isDone && (
            <button
              className="btn"
              onClick={startResearch}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                fontWeight: 600,
                fontSize: 13,
                gap: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.querySelector("svg").style.animation = "spin 0.6s linear infinite";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(79,70,229,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.querySelector("svg").style.animation = "none";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(79,70,229,0.35)";
              }}
            >
              <RefreshCw size={13} strokeWidth={2.5} style={{ transition: "animation 0.2s" }} />
              Re-run Analysis
            </button>
          )}
          {isRunning && (() => {
            const stepLabels = { companyInfo: "Company Overview", financials: "Financials", marketPosition: "Market Position", risks: "Risk Assessment", verdict: "AI Verdict" };
            const phase = activeStep && tokenSteps.includes(activeStep) ? "Generating" : "Searching";
            const label = activeStep ? `${phase}: ${stepLabels[activeStep] ?? activeStep}` : "StartingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦";
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--radius)", background: tokenSteps.includes(activeStep) ? "var(--color-accent-light)" : "#fffbeb", border: `1px solid ${tokenSteps.includes(activeStep) ? "var(--color-accent-border)" : "#fde68a"}` }}>
                <div className="anim-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: tokenSteps.includes(activeStep) ? "var(--color-accent)" : "#d97706" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: tokenSteps.includes(activeStep) ? "var(--color-accent)" : "#92400e" }}>{label}</span>
              </div>
            );
          })()}
        </div>
      </div>

      {isRunning && (() => {
        const msgs = [
          "This analysis may take a moment ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â we are pulling live data to ensure every insight is accurate and current",
          "Great research takes time. A full 5-stage pipeline is running to deliver the most reliable perspective possible",
          "Please hold on ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â real-time financial data, competitive intelligence, and risk factors are being cross-referenced",
          "Patience is the first virtue of a great investor. Your report is being carefully assembled",
          "Analysing financials, market position, competitive moats, and risks in real time ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â thank you for your patience",
        ];
        return (
          <div style={{
            overflow: "hidden",
            borderRadius: "var(--radius)",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            marginBottom: 16,
            padding: "9px 0",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              animation: "marqueeLoop 28s linear infinite",
              willChange: "transform",
              width: "max-content",
            }}>
              {[...msgs, ...msgs].map((msg, i) => (
                <span key={i} style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.92)",
                  letterSpacing: "0.01em",
                  paddingRight: 56,
                }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", marginRight: 10 }}>ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚Â </span>
                  {msg}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: "var(--radius)", background: "var(--color-pass-bg)", border: "1px solid var(--color-pass-border)", marginBottom: 20 }}>
          <AlertTriangle size={15} color="var(--color-pass)" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-pass-text)" }}>Research Failed</p>
            <p style={{ fontSize: 12, color: "var(--color-pass)", marginTop: 1 }}>{error}</p>
          </div>
          <button className="btn btn-secondary" onClick={startResearch}>Try Again</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "252px 1fr 208px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 70 }}>
          <ProgressStepper completedSteps={completedSteps} activeStep={activeStep} tokenSteps={tokenSteps} />
          <div className="surface" style={{ padding: "14px 16px" }}>
            <p className="label" style={{ marginBottom: 10 }}>Run Details</p>
            {[
              { k: "Company", v: company },
              { k: "Status",  v: isDone ? "Complete" : isRunning ? "In Progress" : error ? "Failed" : "Idle" },
              { k: "Steps",   v: `${completedSteps.length} / 5` },
              { k: "Verdict", v: verdict?.verdict ?? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â" },
            ].map((row, i, arr) => (
              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{row.k}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  fontFamily: row.k === "Verdict" || row.k === "Steps" ? "var(--font-mono)" : "inherit",
                  color: row.k === "Verdict" && verdict?.verdict === "INVEST" ? "var(--color-invest-text)"
                       : row.k === "Verdict" && verdict?.verdict === "PASS"   ? "var(--color-pass-text)"
                       : "var(--color-text-primary)",
                }}>
                  {row.v}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!verdict && isRunning && !Object.keys(streamData).length && (
            <div className="surface" style={{ padding: "44px 24px", textAlign: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--color-accent-border)", borderTopColor: "var(--color-accent)", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Searching for {company}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 5 }}>Fetching real-time web data</p>
            </div>
          )}

          {sections.map((s) => {
            const isActive = activeStep === s.key;
            const isStreaming = isActive;
            const streaming = isActive ? streamData[s.key] || "" : null;
            const done = finalData[s.key];
            const sources = sourcesData[s.key] || [];
            return (
              <ResearchSection
                key={s.key}
                icon={s.icon}
                title={s.title}
                color={s.color}
                content={done}
                streamingText={streaming}
                isStreaming={isStreaming}
                sources={sources}
                defaultOpen={!!done && !verdict}
              />
            );
          })}

          {verdict && <VerdictCard verdict={verdict} company={company} />}
        </div>

        <div style={{ position: "sticky", top: 70 }}>
          <HistoryPanel refreshKey={historyKey} currentCompany={company} isRunning={isRunning} />
        </div>
      </div>
    </main>
  );
}
