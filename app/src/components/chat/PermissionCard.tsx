import { memo } from "react";
import type { PermissionSuggestion } from "../../types";

interface Props {
  tool: string;
  description: string;
  suggestions?: PermissionSuggestion[];
  resolved?: boolean;
  allowed?: boolean;
  onRespond: (allow: boolean, suggestions?: PermissionSuggestion[]) => void;
}

export default memo(function PermissionCard({ tool, description, suggestions, resolved, allowed, onRespond }: Props) {
  if (resolved) {
    return (
      <div className={`perm-card resolved ${allowed ? "allowed" : "denied"}`}>
        <span className="perm-card-icon">{allowed ? "\u2713" : "\u2717"}</span>
        <span className="perm-card-label">{allowed ? "Allowed" : "Denied"}: {tool}: {description}</span>
      </div>
    );
  }

  return (
    <div className="perm-card pending">
      <div className="perm-card-question">
        <span>Allow <strong>{tool}</strong>: {description}?</span>
        <div className="perm-card-actions">
          <button className="perm-btn perm-btn--yes" onClick={() => onRespond(true)}><u>Y</u>es</button>
          {suggestions && suggestions.length > 0 && (
            <button className="perm-btn perm-btn--session" onClick={() => onRespond(true, suggestions)}>
              <u>A</u>llow session
            </button>
          )}
          <button className="perm-btn perm-btn--no" onClick={() => onRespond(false)}><u>N</u>o</button>
        </div>
      </div>
    </div>
  );
});
