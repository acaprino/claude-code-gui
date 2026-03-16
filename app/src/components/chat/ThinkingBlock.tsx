import { memo, useState, useEffect } from "react";

interface Props {
  text: string;
  ended?: boolean;
}

export default memo(function ThinkingBlock({ text, ended }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse when thinking ends
  useEffect(() => {
    if (ended) setCollapsed(true);
  }, [ended]);

  const lines = text.split("\n");
  const lineCount = text.length === 0 ? 0 : lines.length;

  return (
    <div className={`thinking-block${ended ? " ended" : ""}`}>
      <div className="thinking-block-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="thinking-block-icon">[thinking]</span>
        <span className="thinking-block-title">
          {collapsed
            ? lineCount === 0 ? "(empty)" : `(${lineCount} line${lineCount !== 1 ? "s" : ""}) `
            : text.length === 0
              ? "..."
              : lines[0].slice(0, 60)}
        </span>
        <span className="thinking-block-toggle">{collapsed ? "\u25B8" : "\u25BE"}</span>
      </div>
      {!collapsed && text.length > 0 && (
        <div className="thinking-block-body">
          <span className="thinking-block-text">{text}</span>
        </div>
      )}
    </div>
  );
});
