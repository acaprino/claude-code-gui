import { memo, useCallback, useRef, useEffect } from "react";
import { Settings, TOOLS, MODELS, EFFORTS } from "../types";
import SegmentedControl from "./SegmentedControl";
import "./SessionConfig.css";

interface SessionConfigProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
}

const TOOL_OPTIONS = TOOLS.map((t) => ({ label: t, value: t }));
const MODEL_OPTIONS = MODELS.map((m) => ({ label: m.display, value: m.display }));
const EFFORT_OPTIONS = EFFORTS.map((e) => ({ label: e, value: e }));
const PERMS_OPTIONS = [
  { label: "safe", value: "safe" },
  { label: "SKIP", value: "skip" },
] as const;

export default memo(function SessionConfig({ settings, onUpdate }: SessionConfigProps) {
  const isClaude = settings.tool_idx === 0;
  const currentTool = TOOLS[settings.tool_idx] ?? TOOLS[0];
  const currentModel = MODELS[settings.model_idx]?.display ?? MODELS[0].display;
  const currentEffort = EFFORTS[settings.effort_idx] ?? EFFORTS[0];
  const permsValue = settings.skip_perms ? "skip" : "safe";

  const handleToolChange = useCallback((idx: number) => {
    onUpdate({ tool_idx: idx });
  }, [onUpdate]);

  const handleModelChange = useCallback((idx: number) => {
    onUpdate({ model_idx: idx });
  }, [onUpdate]);

  const handleEffortChange = useCallback((idx: number) => {
    onUpdate({ effort_idx: idx });
  }, [onUpdate]);

  const handlePermsChange = useCallback((idx: number) => {
    onUpdate({ skip_perms: idx === 1 });
  }, [onUpdate]);

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const handleCompactToggle = useCallback(() => {
    onUpdate({ autocompact: !settingsRef.current.autocompact });
  }, [onUpdate]);

  return (
    <div className="session-config">
      <SegmentedControl
        options={TOOL_OPTIONS}
        value={currentTool}
        onChange={handleToolChange}
        title="Tool (F1)"
      />
      {isClaude && (
        <>
          <SegmentedControl
            options={MODEL_OPTIONS}
            value={currentModel}
            onChange={handleModelChange}
            title="Model (Tab)"
          />
          <SegmentedControl
            options={EFFORT_OPTIONS}
            value={currentEffort}
            onChange={handleEffortChange}
            title="Effort (F2)"
          />
          <SegmentedControl
            options={PERMS_OPTIONS}
            value={permsValue}
            onChange={handlePermsChange}
            variant="perms"
            title="Permissions (F4)"
          />
          <button
            className={`session-config__toggle ${settings.autocompact ? "active" : ""}`}
            onClick={handleCompactToggle}
            title="Toggle autocompact"
          >
            {settings.autocompact ? "compact: on" : "compact: off"}
          </button>
        </>
      )}
    </div>
  );
});
