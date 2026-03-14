import { memo, useCallback } from "react";
import "./SegmentedControl.css";

interface SegmentedControlProps {
  options: readonly { label: string; value: string | number }[];
  value: string | number;
  onChange: (value: number) => void;
  variant?: "default" | "perms";
  title?: string;
}

export default memo(function SegmentedControl({
  options,
  value,
  onChange,
  variant = "default",
  title,
}: SegmentedControlProps) {
  const activeIdx = options.findIndex((opt) => opt.value === value);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (activeIdx + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (activeIdx - 1 + options.length) % options.length;
    }
    if (next >= 0) onChange(next);
  }, [activeIdx, options.length, onChange]);

  return (
    <div
      className={`segmented ${variant !== "default" ? `segmented--${variant}` : ""}`}
      role="radiogroup"
      aria-label={title}
      title={title}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          className={`segmented__item ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(idx)}
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          data-value={opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
});
