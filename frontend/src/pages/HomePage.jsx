import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ArrowRight, Clock } from "lucide-react";
import SearchBar from "../components/SearchBar";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomePage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/history`)
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 80px" }}>
      <section style={{ paddingTop: 80, paddingBottom: 48, textAlign: "center" }}>
        <h1 style={{
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          color: "var(--color-text-primary)",
          lineHeight: 1.15,
          marginBottom: 12,
        }}>
          AI Investment Research
        </h1>

        <p style={{
          fontSize: 15,
          color: "var(--color-text-secondary)",
          lineHeight: 1.65,
          marginBottom: 36,
          maxWidth: 420,
          margin: "0 auto 36px",
        }}>
          Analyze any company. Get a research-backed{" "}
          <span style={{ fontWeight: 700, color: "var(--color-invest-text)" }}>Invest</span>{" "}
          or{" "}
          <span style={{ fontWeight: 700, color: "var(--color-pass-text)" }}>Pass</span>{" "}
          verdict in seconds.
        </p>

        <SearchBar autoFocus />
      </section>

      <section>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} color="var(--color-text-muted)" strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
              Recent Analyses
            </span>
          </div>
          {history.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {history.length} {history.length === 1 ? "report" : "reports"}
            </span>
          )}
        </div>

        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {loading && (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 32 }} />
              ))}
            </div>
          )}

          {!loading && history.length === 0 && (
            <div style={{ padding: "44px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                No analyses yet
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                Search a company above to generate your first report
              </p>
            </div>
          )}

          {!loading && history.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Company", "Verdict", "Confidence", "Date"].map((h) => (
                    <th key={h} style={{
                      padding: "9px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-text-muted)",
                    }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => {
                  const isInvest = item.verdict === "INVEST";
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/result?company=${encodeURIComponent(item.company)}`, { state: { fromHistory: true } })}
                      style={{
                        borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-raised)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {item.company}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 5,
                            background: isInvest ? "var(--color-invest-bg)" : "var(--color-pass-bg)",
                            border: `1px solid ${isInvest ? "var(--color-invest-border)" : "var(--color-pass-border)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {isInvest
                              ? <TrendingUp size={11} color="var(--color-invest)" strokeWidth={2.5} />
                              : <TrendingDown size={11} color="var(--color-pass)" strokeWidth={2.5} />
                            }
                          </div>
                          <span style={{
                            fontSize: 12, fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            color: isInvest ? "var(--color-invest-text)" : "var(--color-pass-text)",
                          }}>
                            {item.verdict}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
                          {item.confidence}%
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {timeAgo(item.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px 12px 0", textAlign: "right" }}>
                        <ArrowRight size={13} color="var(--color-text-muted)" strokeWidth={2} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
