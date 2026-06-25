const KEY_TERMS = {
  green:  /^(INVEST|Strong|Wide|Growing|Increasing|Outperform|Leader|Positive|Profitable|Buy|Low)$/,
  red:    /^(PASS|Critical|None|Declining|Decreasing|Underperform|Negative|Loss|Sell|Avoid|High)$/,
  amber:  /^(Moderate|Narrow|Stable|Neutral|Medium|Mixed|Hold|Fair|Average|Elevated)$/,
  purple: /^(Emerging|Disruptive|Innovative|Expanding|Accelerating)$/,
};

function highlightChip(text, key) {
  const styles = {
    green:  { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
    red:    { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
    amber:  { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
    purple: { background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" },
    number: { background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" },
    bold:   { background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0" },
  };
  const s = styles[key] || styles.bold;
  return {
    ...s,
    fontWeight: 600,
    fontSize: "0.85em",
    padding: "1px 6px",
    borderRadius: 4,
    display: "inline",
    whiteSpace: "nowrap",
  };
}

// Regex that splits on: currencies, percentages, bracket ratings, and key words
const SPLIT_RE = new RegExp(
  "(" +
  "[\\$\\u20B9\\u20AC\\xA3\\xa5][\\d,.]+[BMKTbn]*" + // currency
  "|\\d[\\d,.]*%" +                                   // percentage
  "|\\d[\\d,.]*[BMKTbn]+" +                           // 3B, 500M etc
  "|\\[Critical\\]|\\[High\\]|\\[Medium\\]|\\[Low\\]" + // bracket ratings
  "|(?<!\\w)(?:INVEST|PASS|Strong|Wide|Moderate|Narrow|None|Critical|High|Medium|Low|Elevated|Growing|Declining|Stable|Leader|Outperform)(?!\\w)" +
  ")",
  "g"
);

function renderInline(text) {
  const boldParts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return boldParts.flatMap((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return [<mark key={`b${i}`} style={highlightChip(inner, "bold")}>{inner}</mark>];
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return [<em key={`e${i}`}>{part.slice(1, -1)}</em>];
    }

    const subParts = part.split(SPLIT_RE);

    return subParts.map((sub, j) => {
      const key = `${i}-${j}`;
      if (!sub) return null;

      // Currency / percentage / large numbers
      if (/^[\$\u20B9\u20AC\xA3\xa5][\d,.]+/.test(sub) || /^\d[\d,.]*%$/.test(sub) || /^\d[\d,.]*[BMKTbn]+$/.test(sub)) {
        return <mark key={key} style={highlightChip(sub, "number")}>{sub}</mark>;
      }

      // Bracket risk ratings
      if (sub === "[Critical]") return <mark key={key} style={highlightChip(sub, "red")}>Critical</mark>;
      if (sub === "[High]")     return <mark key={key} style={highlightChip(sub, "red")}>High</mark>;
      if (sub === "[Medium]")   return <mark key={key} style={highlightChip(sub, "amber")}>Medium</mark>;
      if (sub === "[Low]")      return <mark key={key} style={highlightChip(sub, "green")}>Low</mark>;

      // Keyword chips
      for (const [color, regex] of Object.entries(KEY_TERMS)) {
        if (regex.test(sub)) {
          return <mark key={key} style={highlightChip(sub, color)}>{sub}</mark>;
        }
      }

      return <span key={key}>{sub}</span>;
    }).filter(Boolean);
  });
}

export default function MarkdownText({ text, streaming }) {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks = [];
  let listBuffer = null;
  let listType = null;

  const flushList = () => {
    if (listBuffer) { blocks.push({ type: listType, items: [...listBuffer] }); }
    listBuffer = null;
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); continue; }

    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "bold-heading", content: trimmed.slice(2, -2) });
      continue;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      flushList();
      blocks.push({ type: "heading", content: trimmed.replace(/^#+\s/, "") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== "ul") { flushList(); listBuffer = []; listType = "ul"; }
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== "ol") { flushList(); listBuffer = []; listType = "ol"; }
      listBuffer.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushList();
    blocks.push({ type: "p", content: trimmed });
  }
  flushList();

  return (
    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <p key={i} style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)", marginTop: i === 0 ? 0 : 16, marginBottom: 4 }}>
              {block.content}
            </p>
          );
        }
        if (block.type === "bold-heading") {
          return (
            <p key={i} style={{
              fontWeight: 700, fontSize: 12.5, color: "var(--color-text-primary)",
              marginTop: i === 0 ? 0 : 14, marginBottom: 4,
              paddingLeft: 8,
              borderLeft: "2px solid var(--color-accent)",
            }}>
              {block.content}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} style={{ margin: "4px 0 10px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} style={{ margin: "4px 0 10px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.8 }}>
            {renderInline(block.content)}
          </p>
        );
      })}
      {streaming && (
        <span style={{
          display: "inline-block", width: 2, height: 14,
          background: "var(--color-accent)", marginLeft: 2,
          verticalAlign: "text-bottom", animation: "pulse 0.8s ease infinite",
        }} />
      )}
    </div>
  );
}
