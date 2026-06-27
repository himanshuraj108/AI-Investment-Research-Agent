import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Trash2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function HistoryRow({ item, onDelete, onClick }) {
  const [hovered, setHovered] = useState(false);
  const isInvest = item.verdict === "INVEST";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        cursor: "pointer",
        background: hovered ? "var(--color-surface-raised)" : "transparent",
        transition: "background 0.12s",
      }}
    >
      <div style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: isInvest ? "var(--color-invest)" : "var(--color-pass)",
        flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.company}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: isInvest ? "var(--color-invest-text)" : "var(--color-pass-text)" }}>
            {item.verdict}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{'\u00B7'} {item.confidence}%</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {!hovered && (
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{timeAgo(item.created_at)}</span>
        )}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              color: "var(--color-pass-text)",
              background: "var(--color-pass-bg)",
              border: "1px solid var(--color-pass-border)",
              borderRadius: 4,
              padding: "2px 7px",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            <Trash2 size={10} strokeWidth={2.5} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function HistoryPanel({ refreshKey, currentCompany, isRunning }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const historyRef = useRef([]);

  // Keep ref in sync so async handlers always see latest list
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/history`)
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id) => {
    const current   = historyRef.current;
    const deleted   = current.find((h) => h.id === id);
    const remaining = current.filter((h) => h.id !== id);
    historyRef.current = remaining;
    setHistory(remaining);
    await fetch(`${API_BASE_URL}/api/history/${id}`, { method: "DELETE" });

    // Never redirect while research is actively generating
    if (isRunning) return;

    if (remaining.length === 0) {
      navigate("/");
      return;
    }
    if (
      deleted &&
      currentCompany &&
      deleted.company.toLowerCase() === currentCompany.toLowerCase()
    ) {
      navigate("/");
    }
  };

  return (
    <div className="surface" style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Clock size={12} color="var(--color-text-muted)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>Recent Research</span>
        </div>
        {history.length > 0 && (
          <span className="badge badge-neutral">{history.length}</span>
        )}
      </div>

      {loading && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
        </div>
      )}

      {!loading && history.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No research history yet</p>
          <p style={{ fontSize: 11, color: "var(--color-text-disabled)", marginTop: 3 }}>Search a company to get started</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div>
          {history.map((item, i) => (
            <div key={item.id} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : "none" }}>
              <HistoryRow
                item={item}
                onDelete={handleDelete}
                onClick={() => navigate(`/result?company=${encodeURIComponent(item.company)}`, { state: { fromHistory: true } })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
