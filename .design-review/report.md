# Design & Performance Review -- 2026-03-13

Diff mode review -- 3 changed files (App.css, themes.ts, types.ts) + retro mode impact on 6 component stylesheets

## Scores

| Category | Score |
|----------|-------|
| UX Consistency | 7/10 |
| Layout System | 7/10 |
| Accessibility | 5/10 |
| Visual Polish & Motion | 6/10 |
| Typography | 6/10 |
| React Performance | 9/10 |
| **Overall** | **7/10** |

Critical: 0 | High: 3 | Medium: 5 | Low: 8

## Files Audited

- `app/src/App.css` (retro mode CSS)
- `app/src/themes.ts` (retro class toggle)
- `app/src/types.ts` (Theme interface, 2 new themes)
- `app/src/components/TabBar.css`, `StatusBar.css`, `ProjectList.css`, `Modal.css`, `Terminal.css`, `NewTabPage.css`

---

## High Issues

### `types.ts` -- textDim on surface fails WCAG AA in both new themes
- **Severity**: High
- **Issue**: `textDim` rendered on `surface` backgrounds fails WCAG AA 4.5:1. Anvil Forge: `#a0907a` on `#3d342c` = ~3.96:1. Guybrush: `#8a9480` on `#2c3548` = ~3.87:1. Affects project metadata on selected items, status bar, modal labels.
- **Fix**: Lighten textDim. Anvil Forge: `#a0907a` -> `#b8a890`. Guybrush: `#8a9480` -> `#a0ac96`.
- [ ] Fixed

### `types.ts` -- Anvil Forge red fails WCAG AA on bg
- **Severity**: High
- **Issue**: Red `#e85c3a` on bg `#2a2420` = ~4.40:1, below 4.5:1 AA threshold. Used for error messages, tab exit codes, danger buttons at 11-13px sizes.
- **Fix**: Lighten to `#f06845` (~5.2:1).
- [ ] Fixed

### `App.css` -- Active tab offset doesn't compensate for retro 2px border
- **Severity**: High
- **Issue**: `.tab.active` uses `margin-bottom: -1px; padding-bottom: 1px` to overlap the tab bar's 1px border. In retro mode, border becomes 2px but offset stays at -1px, leaving a 1px border line visible between active tab and content.
- **Fix**: Add `.retro .tab.active { margin-bottom: -2px; padding-bottom: 2px; }`
- [ ] Fixed

---

## Medium Issues

### `App.css` -- CSS animations not disabled in retro mode
- **Severity**: Medium
- **Issue**: `transition: none` only kills CSS transitions. Keyframe animations still run smoothly: tab-enter (0.2s), tab-exit (0.15s), pulse dot, shimmer, terminal-in, perms-pulse, tab-panel opacity. Contradicts "snap like old UI" philosophy.
- **Fix**: Add animation overrides:
  ```css
  .retro .tab,
  .retro .tab.closing { animation: none; }
  .retro .tab.has-output::before { animation: none; }
  .retro .skeleton-row { animation: none; background: var(--surface); }
  .retro .terminal-container { animation: none; }
  .retro .tab-panel { transition: none; }
  .retro .status-btn.perms.on strong { animation: none; }
  ```
- [ ] Fixed

### `App.css` -- Scanline overlay z-index above modals
- **Severity**: Medium
- **Issue**: `.retro::after` uses `z-index: 9999`, above `--z-modal: 1000`. Scanlines render on top of modals (theme picker, directory manager). Also hardcodes z-index outside the token system.
- **Fix**: Add `--z-scanline: 999` to `:root` tokens. Use `z-index: var(--z-scanline)` so scanlines sit below modal backdrops.
- [ ] Fixed

### `App.css` -- Scanline opacity too low to be visible
- **Severity**: Medium
- **Issue**: `rgba(0, 0, 0, 0.03)` on dark backgrounds produces a luminance delta below the just-noticeable-difference threshold. Effect is invisible on most monitors, especially at high DPI. Full-screen pseudo-element for zero perceptual payoff.
- **Fix**: Increase to `rgba(0, 0, 0, 0.06)` or `0.08` for visible CRT feel. Consider increasing line pitch to 3px/6px.
- [ ] Fixed

### `App.css` -- Output indicator dot remains circular in retro mode
- **Severity**: Medium
- **Issue**: `.tab.has-output::before` uses hardcoded `border-radius: 50%`. A 6x6px round dot breaks the "no curves" retro contract.
- **Fix**: Add `.retro .tab.has-output::before { border-radius: 0; }`
- [ ] Fixed

### `types.ts` -- Theme picker doesn't indicate retro themes
- **Severity**: Medium
- **Issue**: "Anvil Forge" and "Guybrush" previews look identical to standard themes. Users can't tell these activate retro mode (geometry, scanlines, transitions) until after selection.
- **Fix**: Append "[retro]" to theme names, or apply `border-radius: 0` to retro theme preview cards as a visual hint.
- [ ] Fixed

---

## Low Issues

### `App.css` -- Modal box-shadow not removed in retro mode
- **Issue**: `.modal` has `box-shadow: 0 8px 32px rgba(0,0,0,0.5)`. DOS-era dialogs had hard borders, not drop shadows.
- **Fix**: Add `.retro .modal { box-shadow: none; }`
- [ ] Fixed

### `App.css` -- Modal button padding cramped with 2px border
- **Issue**: `.modal-btn` vertical padding drops from 4px to 3px effective with `border-width: 2px`. Feels tight.
- **Fix**: Add `.retro .modal-btn { padding: 5px var(--space-3); }`
- [ ] Fixed

### `types.ts` -- Guybrush textDim color temperature mismatch
- **Issue**: Text `#dcd0b8` is warm sandy, but textDim `#8a9480` shifts to cool green-gray. Temperature disconnect.
- **Fix**: Shift to warm gray: `#9a9488` or `#a09888`.
- [ ] Fixed

### `types.ts` -- Anvil Forge green feels washed out
- **Issue**: Green `#8ab060` has lower saturation/brightness than sibling semantic colors. Success/branch indicators feel anemic.
- **Fix**: Brighten to `#9cc068` or `#a0c060`.
- [ ] Fixed

### `App.css` -- No CRT phosphor glow in retro mode
- **Issue**: Real CRT displays had subtle text bloom. Missing detail.
- **Fix**: Add `.retro .new-tab-header h2 { text-shadow: 0 0 2px currentColor; }`
- [ ] Fixed

### `App.css` -- Smooth scrolling inconsistent with retro snap
- **Issue**: `.project-list` uses `scroll-behavior: smooth`.
- **Fix**: Add `.retro .project-list { scroll-behavior: auto; }`
- [ ] Fixed

### `App.css` -- Theme swatch bar spans retain 2px radius
- **Issue**: `.theme-swatch-bar span` has hardcoded `border-radius: 2px`.
- **Fix**: Add `.retro .theme-swatch-bar span { border-radius: 0; }`
- [ ] Fixed

### `App.css` -- No retro typography reinforcement
- **Issue**: No letter-spacing or font-weight adjustments for retro feel. Optional enhancement.
- **Fix**: Add `.retro { letter-spacing: 0.03em; }` and flatten bold weights to 400 in retro mode.
- [ ] Fixed

---

## What's Working Well

- Clean architectural separation: `retro` flag in Theme interface, single-line class toggle, all CSS scoped under `.retro`
- CSS custom property override (`--radius-sm/--radius-md` to 0) cascades automatically to all token-consuming elements
- Theme application bypasses React entirely (DOM manipulation) -- no re-render cascade
- All style mutations in `applyTheme()` are batched into a single browser recalculation
- Terminal component uses `React.memo` + ref-based callbacks, preventing re-mounts on theme change
- `pointer-events: none` on scanline overlay preserves terminal interactivity
- `prefers-reduced-motion` media query covers retro-blink and all other animations
- Primary text contrast is excellent (AAA) in both themes: Anvil ~10.7:1, Guybrush ~10.4:1
- Primary button contrast solid: Anvil ~7.0:1, Guybrush ~8.7:1
- Blinking underscore cursor (`step-end` timing) is an authentic DOS detail
- Inset 3px box-shadow for selected items evokes DOS list navigation
- Theme palettes are distinct and coherent: warm forge vs. cool adventure

---

## Action Plan

1. [ ] Fix textDim contrast in both themes (lighten by 15-20%)
2. [ ] Fix Anvil Forge red contrast (`#e85c3a` -> `#f06845`)
3. [ ] Fix active tab offset for 2px retro border (-2px margin)
4. [ ] Disable all CSS animations in retro mode (not just transitions)
5. [ ] Lower scanline z-index below modals (999 via token)
6. [ ] Increase scanline opacity to 0.06-0.08 for visibility
7. [ ] Square the output indicator dot in retro mode
8. [ ] Add retro indicator to theme names in picker
9. [ ] Remove modal box-shadow in retro mode
10. [ ] Fix Guybrush textDim color temperature
