import { TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            AlphaLens
          </span>

        </button>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            AI Investment Research
          </span>
          {location.pathname !== "/" && (
            <>
              <div style={{ width: 1, height: 14, background: "var(--color-border)" }} />
              <button className="btn btn-secondary" onClick={() => navigate("/")}>
                New Analysis
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
