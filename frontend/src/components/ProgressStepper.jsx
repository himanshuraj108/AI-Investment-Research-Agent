import { Check, Loader2, Globe, Cpu, Building2, DollarSign, BarChart2, AlertTriangle, Zap } from "lucide-react";

const STEPS = [
  { key: "companyInfo",    label: "Company Overview",   Icon: Building2,     desc: "Business model & history" },
  { key: "financials",     label: "Financial Analysis", Icon: DollarSign,    desc: "Revenue, profit & growth" },
  { key: "marketPosition", label: "Market Position",    Icon: BarChart2,     desc: "Competitors & market share" },
  { key: "risks",          label: "Risk Assessment",    Icon: AlertTriangle, desc: "Headwinds & red flags" },
  { key: "verdict",        label: "AI Verdict",         Icon: Zap,           desc: "Final investment decision" },
];

const PHASE_LABEL = {
  searching:   { text: "Fetching web data…",   color: "#d97706", Icon: Globe },
  generating:  { text: "Generating analysis…", color: "#4f46e5", Icon: Cpu  },
};

export default function ProgressStepper({ completedSteps, activeStep, tokenSteps }) {
  const getPhase = (key) => {
    if (completedSteps.includes(key)) return "done";
    if (activeStep === key) return tokenSteps.includes(key) ? "generating" : "searching";
    return "pending";
  };

  return (
    <div className="surface" style={{ padding: "16px 18px" }}>
      <p className="label" style={{ marginBottom: 14 }}>Research Pipeline</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {STEPS.map((step, i) => {
          const phase = getPhase(step.key);
          const { Icon } = step;
          const isLast = i === STEPS.length - 1;
          const isDone = phase === "done";
          const isActive = phase === "searching" || phase === "generating";
          const phaseInfo = PHASE_LABEL[phase];

          return (
            <div key={step.key} style={{ display: "flex", gap: 11 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  className={`step-dot ${isDone ? "done" : isActive ? "running" : ""}`}
                  style={{ transition: "all 0.3s ease" }}
                >
                  {isDone   ? <Check size={11} strokeWidth={3} /> :
                   isActive ? <Loader2 size={11} strokeWidth={2.5} className="anim-spin" /> :
                   <span>{i + 1}</span>}
                </div>
                {!isLast && (
                  <div style={{
                    width: 1,
                    flex: 1,
                    minHeight: 18,
                    margin: "3px 0",
                    background: isDone ? "#bbf7d0" : "var(--color-border)",
                    transition: "background 0.5s",
                  }} />
                )}
              </div>

              <div style={{ paddingBottom: isLast ? 0 : 12, paddingTop: 3, flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: phase === "pending" ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  transition: "color 0.2s",
                  display: "block",
                }}>
                  {step.label}
                </span>

                {isActive && phaseInfo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <phaseInfo.Icon
                      size={10}
                      color={phaseInfo.color}
                      strokeWidth={2.5}
                      className={phase === "generating" ? "anim-pulse" : ""}
                    />
                    <span style={{ fontSize: 11, color: phaseInfo.color, fontWeight: 500 }}>
                      {phaseInfo.text}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1, display: "block" }}>
                    {isDone ? "Complete" : step.desc}
                  </span>
                )}

                {isActive && (
                  <div style={{ marginTop: 5, width: "100%" }}>
                    <div className="confidence-bar-track" style={{ height: 3 }}>
                      <div
                        className="confidence-bar-fill"
                        style={{
                          background: phase === "generating"
                            ? "linear-gradient(90deg, #4f46e5, #7c3aed)"
                            : "linear-gradient(90deg, #d97706, #f59e0b)",
                          animation: "runningProgress 15s ease forwards",
                          width: "0%",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider" style={{ margin: "12px 0 10px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {completedSteps.length} of {STEPS.length} done
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {STEPS.map((step) => {
            const p = getPhase(step.key);
            return (
              <div key={step.key} style={{
                width: 18, height: 3, borderRadius: 99,
                background: p === "done" ? "#16a34a"
                          : p === "generating" ? "#4f46e5"
                          : p === "searching"  ? "#d97706"
                          : "var(--color-border)",
                transition: "background 0.4s",
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
