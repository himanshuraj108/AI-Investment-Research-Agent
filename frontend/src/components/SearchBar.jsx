import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const QUICK = ["Apple", "Tesla", "Nvidia", "Reliance Industries", "Infosys", "Zomato"];

export default function SearchBar({ autoFocus }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const active = focused || hovered;

  const go = (q) => {
    const name = (q || value).trim();
    if (!name) return;
    navigate(`/result?company=${encodeURIComponent(name)}`);
  };

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("main-search")?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: "relative", borderRadius: 18, padding: 3, overflow: "hidden",
          boxShadow: active
            ? "0 0 0 5px rgba(139,92,246,0.15), 0 20px 60px rgba(99,102,241,0.22), 0 0 80px rgba(236,72,153,0.1)"
            : "0 4px 30px rgba(0,0,0,0.08)",
          transition: "box-shadow 0.4s ease",
        }}
      >
        <div
          style={{
            position: "absolute", inset: -80,
            background: "conic-gradient(from 0deg, #6366f1, #8b5cf6, #a855f7, #ec4899, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #6366f1)",
            animation: "borderSpin 4s linear infinite",
            animationPlayState: active ? "paused" : "running",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14,
            borderRadius: 15, padding: "0 16px", height: 66,
            background: "#ffffff",
          }}
        >
          <input
            id="main-search"
            type="text"
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="Enter company name to analyze..."
            style={{
              flex: 1, border: "none", background: "none",
              fontSize: 15.5, fontWeight: 500, letterSpacing: "-0.015em",
              color: "var(--color-text-primary)", fontFamily: "inherit",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!value && !active && (
              <div style={{ display: "flex", gap: 3 }}>
                <span className="kbd">⌘</span><span className="kbd">K</span>
              </div>
            )}
            <button
              onClick={() => go()}
              disabled={!value.trim()}
              style={{
                padding: "11px 24px", borderRadius: 11, border: "none",
                background: value.trim()
                  ? "linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)"
                  : "#f3f4f6",
                color: value.trim() ? "#fff" : "#9ca3af",
                fontSize: 13.5, fontWeight: 700,
                cursor: value.trim() ? "pointer" : "not-allowed",
                transition: "all 0.25s ease",
                boxShadow: value.trim() ? "0 6px 20px rgba(79,70,229,0.4)" : "none",
                fontFamily: "inherit", letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                if (value.trim()) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 28px rgba(79,70,229,0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = value.trim() ? "0 6px 20px rgba(79,70,229,0.4)" : "none";
              }}
            >
              Analyze
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Try:</span>
        {QUICK.map((c) => (
          <button
            key={c}
            onClick={() => go(c)}
            style={{
              fontSize: 12, fontWeight: 500, padding: "5px 13px", borderRadius: 99,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#a5b4fc";
              e.currentTarget.style.color = "#4f46e5";
              e.currentTarget.style.background = "#eef2ff";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 3px 10px rgba(99,102,241,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
              e.currentTarget.style.background = "var(--color-surface)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
