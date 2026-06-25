import { useState, useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import MarkdownText from "./MarkdownText";

export default function ResearchSection({ icon: Icon, title, content, streamingText, isStreaming, color, defaultOpen, sources = [] }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const prevStreamingRef = useRef(false);

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setOpen(false);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const displayText = streamingText || content;
  if (!displayText && !isStreaming) return null;

  const isOpen = isStreaming || open;

  return (
    <div className="surface anim-fade-up" style={{ overflow: "hidden" }}>
      <button
        onClick={() => !isStreaming && setOpen((p) => !p)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: isStreaming ? "default" : "pointer",
          textAlign: "left",
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => { if (!isStreaming) e.currentTarget.style.background = "var(--color-surface-raised)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: isStreaming ? "var(--color-accent-light)" : `${color}12`,
          border: `1px solid ${isStreaming ? "var(--color-accent-border)" : `${color}25`}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.2s",
        }}>
          <Icon size={13} color={isStreaming ? "var(--color-accent)" : color} strokeWidth={2} />
        </div>

        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
          {title}
        </span>

        {isStreaming && (
          <span className="badge badge-accent anim-pulse" style={{ fontSize: 10, flexShrink: 0 }}>
            Generating
          </span>
        )}

        {!isStreaming && displayText && (
          <ChevronRight
            size={13}
            color="var(--color-text-muted)"
            style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
          />
        )}
      </button>

      {isOpen && displayText && (
        <div
          className="anim-fade-in"
          style={{ padding: "0 16px 16px 52px", borderTop: "1px solid var(--color-border)" }}
        >
          <div style={{ marginTop: 14 }}>
            <MarkdownText text={displayText} streaming={isStreaming} />
          </div>
          {!isStreaming && sources.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Sources</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11.5, color: "var(--color-accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, opacity: 0.8 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.8}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0 }} />
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
