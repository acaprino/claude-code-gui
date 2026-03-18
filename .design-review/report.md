# Design Review -- 2026-03-18

Diff mode review -- 2 CSS files, 2 TSX files changed (TerminalView + RightSidebar)

## Scores

| Category | Score |
|----------|-------|
| UX Consistency | 6/10 |
| Layout System | 8/10 |
| CSS Architecture | 7/10 |
| Visual Polish & Motion | 6/10 |
| Accessibility | 4/10 |
| Typography | 7/10 |
| **Overall** | **6/10** |

Critical: 1 | High: 4 | Medium: 8 | Low: 7

## Files Audited

- `app/src/components/TerminalView.tsx`
- `app/src/components/TerminalView.css`
- `app/src/components/chat/RightSidebar.tsx`
- `app/src/components/chat/RightSidebar.css`

---

## Critical & High Issues

### Component Design

#### `TerminalView.tsx:35` -- ElapsedTimer receives `Date.now()` inline, defeating memo
- **Severity**: Critical
- **Issue**: `<ElapsedTimer startTime={Date.now()} />` inside ActivitySpinner creates a new prop value on every render, causing unmount/remount and resetting the elapsed counter to 0 on parent re-renders.
- **Fix**: Capture start time in a `useState` initializer inside ActivitySpinner:
  ```tsx
  const ActivitySpinner = memo(function ActivitySpinner({ label }: { label: string }) {
    const [startTime] = useState(() => Date.now());
    return (
      <div className="tv-activity">
        <span className="tv-activity-dot" />
        <span className="tv-activity-label">{label}</span>
        <ElapsedTimer startTime={startTime} />
      </div>
    );
  });
  ```
- [ ] Fixed

### UX Consistency

#### `TerminalView.tsx:104` -- Virtualizer estimateSize too low for new typography
- **Severity**: High
- **Issue**: `estimateSize: 24` but at 13px/1.5 line-height + padding, single lines are ~24px while multi-line items (assistant text, tool output, permissions) are much taller. Causes layout jumps during fast scrolling. ChatView uses `estimateSize: 60`.
- **Fix**: Increase `estimateSize` to `40` or `48`.
- [ ] Fixed

#### `TerminalView.tsx:255` -- onScrollToMessage is a no-op, bookmarks are broken
- **Severity**: High
- **Issue**: `onScrollToMessage={() => {}}` makes BookmarkPanel clicks do nothing. Users see clickable bookmarks that have no effect.
- **Fix**: Implement scroll handler using `virtualizer.scrollToIndex`:
  ```tsx
  const handleScrollToMessage = useCallback((msgId: string) => {
    const idx = displayItems.findIndex(item => item.id === msgId);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "center" });
  }, [displayItems, virtualizer]);
  ```
- [ ] Fixed

### Motion Design

#### `TerminalView.css:59-67` -- Activity dots fully static, no running-state feedback
- **Severity**: High
- **Issue**: All infinite animations removed including the activity dot on ActivitySpinner. A static dot next to "Working..." gives no visual indication the system is running vs. frozen. The user complaint was about "blinking lights that never stop" in the sidebar -- the main activity dot should retain subtle animation.
- **Fix**: Add a slow, opacity-only breathe animation on `.tv-activity-dot` and `.tv-thinking-dot` only. Keep everything else static:
  ```css
  @keyframes tv-breathe {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }
  .tv-activity-dot { animation: tv-breathe 3s ease-in-out infinite; }
  .tv-thinking-dot { animation: tv-breathe 3s ease-in-out infinite; }
  ```
- [ ] Fixed

### Accessibility

#### `RightSidebar.tsx:59-66` -- Sidebar tab buttons lack ARIA semantics
- **Severity**: High
- **Issue**: Tab buttons use SVG icons with no text content. Missing `aria-label`, `role="tab"`, `aria-selected`. Screen readers announce empty buttons.
- **Fix**: Add ARIA tabs pattern:
  ```tsx
  <div className="right-sidebar-tabs" role="tablist" aria-label="Sidebar panels">
    {SIDEBAR_TABS.map((tab) => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={activeTab === tab.id}
        aria-label={tab.title}
        ...
      >
  ```
- [ ] Fixed

---

## Medium Issues

### CSS Architecture

#### `TerminalView.css:80-83` -- Dead `@keyframes tv-pulse` definition
- **Severity**: Medium
- **Issue**: `@keyframes tv-pulse` is defined but no longer referenced by any selector.
- **Fix**: Delete the keyframe block. Replace with `tv-breathe` if adopting the subtle activity pulse.
- [ ] Fixed

#### `TerminalView.css:469-473` -- `prefers-reduced-motion` references non-existent animations
- **Severity**: Medium
- **Issue**: The reduced-motion block targets `.tv-tool-status.pending` and `.tv-thinking-spinner`, neither of which has animation anymore.
- **Fix**: Update to target only elements that actually animate.
- [ ] Fixed

### Accessibility

#### `TerminalView.css:167-172` -- Color-only status indicators (WCAG 1.4.1)
- **Severity**: Medium
- **Issue**: Tool status conveyed purely by color (accent=pending, green=ok, red=fail). Accent blue and green are hard to distinguish in deuteranopia.
- **Fix**: Verify TSX renders distinct symbols alongside color.
- [ ] Verified

#### `RightSidebar.tsx:56` -- Resize handle lacks keyboard accessibility
- **Severity**: Medium
- **Issue**: Resize handle uses only `onMouseDown`. No `tabIndex`, `role`, or keyboard handler.
- **Fix**: Add `role="separator"`, `tabIndex={0}`, `aria-label="Resize sidebar"`, and arrow key handler.
- [ ] Fixed

### Micro-interactions

#### `TerminalView.css:423-466` -- Bottom bar buttons missing transitions and active state
- **Severity**: Medium
- **Issue**: Hover styles snap instantly (no transition). No `:active` press feedback on 18x18px targets.
- **Fix**: Add `transition: color 0.15s ease-out, border-color 0.15s ease-out` and `:active { transform: scale(0.92); }`. Consolidate duplicate button styles into shared `.tv-bottom-btn`.
- [ ] Fixed

### Spacing

#### `TerminalView.css` -- Raw px values instead of spacing tokens
- **Severity**: Medium
- **Issue**: Multiple elements use raw `1px` or `2px` padding/margin where `var(--space-0)` (2px) exists.
- **Fix**: Replace `2px` values with `var(--space-0)`.
- [ ] Fixed

#### `TerminalView.css:6` -- Off-grid indent (20px)
- **Severity**: Medium
- **Issue**: `--tv-indent: 20px` breaks the 4px base-unit grid. Scale has `--space-4` (16px) and `--space-6` (24px).
- **Fix**: Use `var(--space-4)` (16px) or `var(--space-6)` (24px).
- [ ] Fixed

#### `RightSidebar.css:173` -- `!important` on `.minimap-block:hover`
- **Severity**: Medium
- **Issue**: `opacity: 1 !important` overrides inline styles. Undocumented.
- **Fix**: Add comment explaining override, or refactor to CSS classes.
- [ ] Fixed

---

## Low Issues

#### `TerminalView.tsx:162-194` -- Large inline switch in virtualizer render
- Extract to standalone `renderDisplayItem` function.
- [ ] Fixed

#### `TerminalView.css:428` -- Bottom bar buttons off-grid (18px)
- Use 20px or 16px from token scale.
- [ ] Fixed

#### `TerminalView.css:32` -- 3px scrollbar thin at 13px font scale
- Consider 4-5px, or add `:hover` width expansion.
- [ ] Fixed

#### `TerminalView.css` -- Tool output max-height clips mid-line
- `150px` at 19.5px line-height = 7.7 lines. Use `156px` for clean 8 lines.
- [ ] Fixed

#### `TerminalView.css:45-49` -- `.tv-line--status` dead CSS
- Remove unused class.
- [ ] Fixed

#### `RightSidebar.tsx:17-21` -- SVG icons lack `aria-hidden="true"`
- Add to all decorative SVGs.
- [ ] Fixed

#### `RightSidebar.css` -- Sidebar panel gaps inconsistent (1px, 2px)
- Standardize to `var(--space-0)`.
- [ ] Fixed

---

## What's Working Well

- Excellent design token discipline -- all spacing, colors, radii use CSS custom properties
- All color transparency uses `color-mix()` per project conventions, no hardcoded rgba
- Good component decomposition -- message types delegated to focused sub-components
- Font bump from 11px to 13px aligns with `--text-base` token value
- Bottom bar correctly uses `--text-sm` for chrome hierarchy differentiation
- Streaming cursor blink correctly preserved with terminal-authentic `step-end` timing
- `prefers-reduced-motion` media query present
- No `will-change` used statically, per project convention
- Right sidebar proportions well-calibrated (220px default, 150-400 range)
- RightSidebar correctly shared between ChatView and TerminalView

---

## Action Plan

1. [ ] **Fix ElapsedTimer Date.now() bug** -- Critical, causes timer resets
2. [ ] **Add subtle breathe animation to activity/thinking dots** -- restores running-state feedback
3. [ ] **Implement onScrollToMessage** -- currently broken bookmarks
4. [ ] **Increase virtualizer estimateSize to 40-48** -- reduces scroll jank
5. [ ] **Add ARIA tabs pattern to RightSidebar** -- accessibility gap
6. [ ] **Clean up dead keyframes and stale reduced-motion rules** -- CSS hygiene
7. [ ] **Add transitions/active states to bottom bar buttons** -- polish
8. [ ] **Tokenize raw px values (2px -> space-0, 20px indent -> space-4)** -- consistency
