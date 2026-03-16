import { memo, useState } from "react";

interface Props {
  tool: string;
  input: unknown;
  output?: string;
  success?: boolean;
}

export default memo(function ToolCard({ tool, input, output, success }: Props) {
  const [expanded, setExpanded] = useState(false);
  const inputStr = typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const truncatedInput = inputStr.length > 300 ? inputStr.slice(0, 300) + "..." : inputStr;
  const pending = success === undefined;

  return (
    <div className={`tool-card${success === false ? " failed" : ""}`}>
      <div className="tool-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-card-icon">$</span>
        <span className="tool-card-name">{tool}</span>
        {!expanded && <span className="tool-card-preview">{truncatedInput.split("\n")[0].slice(0, 60)}</span>}
        <span className={`tool-card-status${pending ? " pending" : success ? " ok" : " fail"}`}>
          {pending ? "\u25CB" : success ? "\u2713" : "\u2717"}
        </span>
        <span className="tool-card-toggle">{expanded ? "\u25BE" : "\u25B8"}</span>
      </div>
      {expanded && (
        <div className="tool-card-body">
          <pre className="tool-card-input">{inputStr}</pre>
          {output && (
            <div className="tool-card-output">
              <span className="tool-result-prefix">{"\u23BF"}</span>
              <pre>{output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
