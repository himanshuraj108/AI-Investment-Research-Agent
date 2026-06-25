import { TrendingUp, TrendingDown, Check, X } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";

const DIMENSIONS = [
  { key: "businessQuality", label: "Business"   },
  { key: "financialHealth",  label: "Financials" },
  { key: "marketPosition",   label: "Market"     },
  { key: "riskProfile",      label: "Risk"       },
  { key: "valuation",        label: "Valuation"  },
  { key: "growthOutlook",    label: "Growth"     },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { subject, value } = payload[0].payload;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 600,
      color: "#111827",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      {subject}: <span style={{ color: "#4f46e5" }}>{value}/100</span>
    </div>
  );
}

function RadarScore({ scores, isInvest }) {
  const data = DIMENSIONS.map(({ key, label }) => ({
    subject: label,
    value: scores[key] ?? 0,
    fullMark: 100,
  }));

  const fillColor  = isInvest ? "#4f46e5" : "#dc2626";
  const strokeColor = isInvest ? "#4338ca" : "#b91c1c";

  return (
    <div style={{ padding: "16px 24px 4px", borderBottom: "1px solid var(--color-border)" }}>
      <p className="label" style={{ marginBottom: 2 }}>Dimension Analysis</p>
      <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8 }}>
        Weighted across 6 investment dimensions
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fontSize: 11,
              fontWeight: 600,
              fill: "#6b7280",
              fontFamily: "'Poppins', sans-serif",
            }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={strokeColor}
            fill={fillColor}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function VerdictCard({ verdict, company }) {
  const isInvest   = verdict?.verdict === "INVEST";
  const confidence = verdict?.confidence ?? 50;
  const scores     = verdict?.scores || null;

  return (
    <div
      className="surface anim-pop-in"
      style={{
        borderLeft: `3px solid ${isInvest ? "var(--color-invest)" : "var(--color-pass)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* Verdict + Confidence */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p className="label" style={{ marginBottom: 8 }}>Investment Verdict</p>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
              borderRadius: "var(--radius)", width: "fit-content",
              background: isInvest ? "var(--color-invest-bg)" : "var(--color-pass-bg)",
              border: `1px solid ${isInvest ? "var(--color-invest-border)" : "var(--color-pass-border)"}`,
            }}>
              {isInvest
                ? <TrendingUp  size={18} color="var(--color-invest)" strokeWidth={2.5} />
                : <TrendingDown size={18} color="var(--color-pass)"  strokeWidth={2.5} />}
              <span style={{
                fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em",
                color: isInvest ? "var(--color-invest-text)" : "var(--color-pass-text)",
                fontFamily: "var(--font-mono)",
              }}>
                {verdict?.verdict}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p className="label" style={{ marginBottom: 6 }}>Confidence</p>
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", lineHeight: 1 }}>
              {confidence}<span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span>
            </p>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="confidence-bar-track">
            <div
              className="confidence-bar-fill"
              style={{
                width: `${confidence}%`,
                background: isInvest
                  ? "linear-gradient(90deg, #16a34a, #22c55e)"
                  : "linear-gradient(90deg, #dc2626, #f87171)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      {scores && <RadarScore scores={scores} isInvest={isInvest} />}

      {/* Executive Summary */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}>
        <p className="label" style={{ marginBottom: 6 }}>Executive Summary</p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          {verdict?.summary}
        </p>
      </div>

      {/* Strengths & Weaknesses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "16px 24px", gap: 20 }}>
        <div>
          <p className="label" style={{ marginBottom: 10, color: "var(--color-invest-text)" }}>Strengths</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(verdict?.strengths || []).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--color-invest-bg)", border: "1px solid var(--color-invest-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Check size={9} color="var(--color-invest)" strokeWidth={3} />
                </div>
                <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="label" style={{ marginBottom: 10, color: "var(--color-pass-text)" }}>Weaknesses</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(verdict?.weaknesses || []).map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--color-pass-bg)", border: "1px solid var(--color-pass-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <X size={9} color="var(--color-pass)" strokeWidth={3} />
                </div>
                <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analyst Note */}
      {verdict?.finalReasoning && (
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid var(--color-border)" }}>
          <p className="label" style={{ marginBottom: 6 }}>Analyst Note</p>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.65, fontStyle: "italic" }}>
            "{verdict.finalReasoning}"
          </p>
        </div>
      )}
    </div>
  );
}
