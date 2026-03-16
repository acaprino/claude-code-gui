# Phase 1: Input Bar + Critical Fix — Implementation Plan

> **For agentic workers:** Use subagent-driven execution (if subagents available) or ai-tooling:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline textarea in ChatView with a full-featured ChatInput component that supports text sanitization, file attachments, drag & drop, image paste, and chat/terminal input mode toggle.

**Architecture:** Extract input logic from ChatView into a dedicated ChatInput component. Add a sanitizeInput utility called before every message send. Attachment state lives in ChatInput; files are prepended as path references on submit. Drag & drop is handled at the ChatView level with an overlay, forwarding dropped files to ChatInput.

**Tech Stack:** React 19, TypeScript, Tauri 2 APIs (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-clipboard-manager`), CSS custom properties

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/src/utils/sanitizeInput.ts` | Strip surrogates, smart quotes, zero-width chars |
| Create | `app/src/components/chat/ChatInput.tsx` | Input bar with textarea, attachment button, send button, paste handler |
| Create | `app/src/components/chat/ChatInput.css` | Styles for input bar, attachment chips, drop overlay |
| Create | `app/src/components/chat/AttachmentChip.tsx` | Single attachment display with remove button |
| Modify | `app/src/components/ChatView.tsx` | Remove inline textarea, integrate ChatInput, add drag-drop handlers |
| Modify | `app/src/components/ChatView.css` | Remove old `.chat-input-bar` / `.chat-input` styles |
| Modify | `app/src/types.ts` | Add `Attachment` interface, add `input_style` to Settings |
| Note | `app/src-tauri/` | No Rust changes needed — `Settings` uses `#[serde(flatten)]` to capture arbitrary keys like `input_style` |

---

## Chunk 1: Text Sanitization

### Task 1: Create sanitizeInput utility

**Files:**
- Create: `app/src/utils/sanitizeInput.ts`

- [ ] **Step 1: Create the utils directory and sanitizeInput.ts**

```typescript
// app/src/utils/sanitizeInput.ts

/**
 * Sanitize user input before sending to the agent.
 * Strips lone surrogates (cause API JSON parse errors),
 * normalizes smart typography, and removes zero-width characters.
 */
export function sanitizeInput(text: string): string {
  return text
    // Strip lone high surrogates not followed by low surrogate
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    // Strip lone low surrogates not preceded by high surrogate
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    // Smart double quotes → straight
    .replace(/[\u201C\u201D]/g, '"')
    // Smart single quotes → straight
    .replace(/[\u2018\u2019]/g, "'")
    // Em dash → --
    .replace(/\u2014/g, "--")
    // En dash → -
    .replace(/\u2013/g, "-")
    // Ellipsis → ...
    .replace(/\u2026/g, "...")
    // Zero-width characters (ZWSP, ZWNJ, ZWJ, BOM)
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/utils/sanitizeInput.ts
git commit -m "feat: add sanitizeInput utility to prevent API JSON errors"
```

### Task 2: Integrate sanitizeInput into ChatView and remove stripNonBmp

**Files:**
- Modify: `app/src/components/ChatView.tsx`

- [ ] **Step 1: Replace stripNonBmp with sanitizeInput**

In `ChatView.tsx`:
1. Remove the `stripNonBmp` function (lines 12-15)
2. Add import: `import { sanitizeInput } from "../utils/sanitizeInput";`
3. In `handleSubmit` (line 258), sanitize text before sending:
   ```typescript
   const handleSubmit = () => {
     const text = sanitizeInput(inputText.trim());
     if (!text || !agentStartedRef.current) return;
     // ... rest unchanged
   };
   ```
4. In the `spawnAgent` call (line 226), replace `stripNonBmp(systemPrompt)` with `sanitizeInput(systemPrompt)`

- [ ] **Step 2: Verify the app compiles**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ChatView.tsx
git commit -m "fix: use sanitizeInput in ChatView, remove stripNonBmp"
```

---

## Chunk 2: Attachment Type + AttachmentChip Component

### Task 3: Add Attachment type to types.ts

**Files:**
- Modify: `app/src/types.ts`

- [ ] **Step 1: Add Attachment interface after SessionInfo**

```typescript
// Add at the end of types.ts, after SessionInfo:

export interface Attachment {
  id: string;
  path: string;
  name: string;
  type: "file" | "image";
  thumbnail?: string;
}
```

- [ ] **Step 2: Add input_style to Settings interface**

In the `Settings` interface (around line 38), add:
```typescript
  input_style?: "chat" | "terminal";
```

- [ ] **Step 3: Commit**

```bash
git add app/src/types.ts
git commit -m "feat: add Attachment interface and input_style setting"
```

### Task 4: Create AttachmentChip component

**Files:**
- Create: `app/src/components/chat/AttachmentChip.tsx`

- [ ] **Step 1: Write AttachmentChip.tsx**

```typescript
// app/src/components/chat/AttachmentChip.tsx
import { memo } from "react";
import type { Attachment } from "../../types";

interface Props {
  attachment: Attachment;
  onRemove: (id: string) => void;
}

/** File type icon based on extension. */
function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "\uD83D\uDDBC"; // frame with picture
  if (["csv", "xlsx", "xls", "tsv", "json"].includes(ext)) return "\uD83D\uDCCA"; // bar chart
  if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) return "\uD83D\uDCE6"; // package
  return "\uD83D\uDCC4"; // page facing up
}

export default memo(function AttachmentChip({ attachment, onRemove }: Props) {
  const truncatedName = attachment.name.length > 20
    ? attachment.name.slice(0, 17) + "..."
    : attachment.name;

  return (
    <div className="attachment-chip" title={attachment.path}>
      {attachment.thumbnail ? (
        <img src={attachment.thumbnail} alt="" className="attachment-thumb" />
      ) : (
        <span className="attachment-icon">{fileIcon(attachment.name)}</span>
      )}
      <span className="attachment-name">{truncatedName}</span>
      <button
        className="attachment-remove"
        onClick={() => onRemove(attachment.id)}
        aria-label={`Remove ${attachment.name}`}
      >
        x
      </button>
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/chat/AttachmentChip.tsx
git commit -m "feat: add AttachmentChip component for file/image display"
```

---

## Chunk 3: ChatInput Component

### Task 5: Create ChatInput.css

**Files:**
- Create: `app/src/components/chat/ChatInput.css`

- [ ] **Step 1: Write ChatInput.css**

```css
/* app/src/components/chat/ChatInput.css */

/* ── Input Bar Container ──────────────────────────────────────── */
.chat-input-container {
  border-top: 1px solid color-mix(in srgb, var(--overlay0) 40%, transparent);
  padding: var(--space-2) var(--space-3);
}

/* Terminal mode: no border, blends with message flow */
.chat-input-container.terminal-mode {
  border-top: none;
  padding-top: var(--space-3);
}

/* ── Attachment Chips Row ─────────────────────────────────────── */
.attachment-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding-bottom: var(--space-2);
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--overlay0);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-dim);
  max-width: 200px;
}

.attachment-thumb {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 2px;
}

.attachment-icon { font-size: var(--text-sm); }

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-remove {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 0 2px;
  font-family: inherit;
  font-size: var(--text-xs);
  opacity: 0.6;
  line-height: 1;
}

.attachment-remove:hover { opacity: 1; color: var(--red); }

/* ── Main Input Row ───────────────────────────────────────────── */
.chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.chat-input-attach-btn {
  background: none;
  border: 1px solid var(--overlay0);
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: var(--text-base);
  flex-shrink: 0;
  transition: border-color 0.1s, color 0.1s;
}

.chat-input-attach-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chat-input-textarea {
  flex: 1;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  color: var(--text);
  border: 1px solid var(--overlay0);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: inherit;
  resize: none;
  outline: none;
  box-sizing: border-box;
  max-height: calc(var(--text-base) * 1.5 * 6 + var(--space-2) * 2);
  overflow-y: auto;
  line-height: 1.5;
}

.chat-input-textarea:focus {
  border-color: var(--accent);
}

/* Processing state pulse */
.chat-input-container.processing .chat-input-textarea {
  animation: input-pulse 2s ease-in-out infinite;
}

@keyframes input-pulse {
  0%, 100% { border-color: var(--overlay0); }
  50% { border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
}

.chat-input-send-btn {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--crust);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 700;
  flex-shrink: 0;
  transition: opacity 0.1s;
}

.chat-input-send-btn:hover { opacity: 0.85; }
.chat-input-send-btn:active { transform: translateY(1px); }
.chat-input-send-btn:disabled { opacity: 0.3; cursor: default; }

/* ── Drag & Drop Overlay ──────────────────────────────────────── */
.chat-drop-overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  border: 2px dashed var(--accent);
  border-radius: var(--radius-md);
  pointer-events: none;
}

.chat-drop-overlay-text {
  color: var(--accent);
  font-size: var(--text-lg);
  font-weight: 600;
}

/* ── Floating Mini-Input (terminal mode, scrolled up) ─────────── */
.chat-mini-input {
  position: sticky;
  bottom: 0;
  background: var(--bg);
  border-top: 1px solid color-mix(in srgb, var(--overlay0) 40%, transparent);
  padding: var(--space-1) var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  animation: mini-in 0.2s ease-out;
}

@keyframes mini-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-mini-input .chat-input-textarea {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/chat/ChatInput.css
git commit -m "style: add ChatInput component styles"
```

### Task 6: Create ChatInput component

**Files:**
- Create: `app/src/components/chat/ChatInput.tsx`

- [ ] **Step 1: Write ChatInput.tsx**

```typescript
// app/src/components/chat/ChatInput.tsx
import { memo, useRef, useEffect, useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { sanitizeInput } from "../../utils/sanitizeInput";
import { saveClipboardImage } from "../../hooks/useAgentSession";
import AttachmentChip from "./AttachmentChip";
import type { Attachment } from "../../types";
import "./ChatInput.css";

interface Props {
  onSubmit: (text: string, attachments: Attachment[]) => void;
  disabled: boolean;
  processing: boolean;
  isActive: boolean;
  inputStyle?: "chat" | "terminal";
  /** File paths from drag-drop on ChatView — consumed and cleared via onDroppedFilesConsumed */
  droppedFiles?: string[];
  onDroppedFilesConsumed?: () => void;
}

let chipCounter = 0;
function nextChipId(): string {
  return `att-${++chipCounter}`;
}

function extToType(name: string): "file" | "image" {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext) ? "image" : "file";
}

export default memo(function ChatInput({ onSubmit, disabled, processing, isActive, inputStyle = "chat", droppedFiles, onDroppedFilesConsumed }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when active and not disabled
  useEffect(() => {
    if (isActive && !disabled) {
      textareaRef.current?.focus();
    }
  }, [isActive, disabled]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [text]);

  // Consume dropped files from parent (ChatView drag-drop)
  useEffect(() => {
    if (droppedFiles && droppedFiles.length > 0) {
      addFiles(droppedFiles);
      onDroppedFilesConsumed?.();
    }
  }, [droppedFiles, onDroppedFilesConsumed, addFiles]);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  const handleSubmit = useCallback(() => {
    const sanitized = sanitizeInput(text.trim());
    if (!sanitized && attachments.length === 0) return;
    onSubmit(sanitized, attachments);
    setText("");
    setAttachments([]);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, attachments, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && hasContent) handleSubmit();
    }
  };

  const addFiles = useCallback((paths: string[]) => {
    const newAttachments = paths.map((p) => {
      const name = p.split(/[/\\]/).pop() || p;
      const type = extToType(name);
      return {
        id: nextChipId(), path: p, name, type,
        thumbnail: type === "image" ? convertFileSrc(p) : undefined,
      } as Attachment;
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // File picker via [+] button
  const handleAttachClick = async () => {
    try {
      const result = await open({ multiple: true });
      if (result) {
        // result is string | string[] depending on platform
        const paths = Array.isArray(result) ? result : [result];
        addFiles(paths);
      }
    } catch {
      // User cancelled — ignore
    }
  };

  // Paste handler: images → saveClipboardImage, text → sanitize
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for image data in clipboard
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        try {
          const path = await saveClipboardImage();
          if (path) {
            const name = path.split(/[/\\]/).pop() || "clipboard.png";
            setAttachments((prev) => [...prev, {
              id: nextChipId(), path, name, type: "image",
              thumbnail: convertFileSrc(path),
            }]);
          }
        } catch (err) {
          console.error("Failed to save clipboard image:", err);
        }
        return;
      }
    }

    // Check for file paths in plain text (e.g., pasted from Explorer)
    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText) {
      // Check if it looks like file paths (one per line, starts with drive letter or /)
      const lines = pastedText.split("\n").map((l) => l.trim()).filter(Boolean);
      const allPaths = lines.every((l) => /^[A-Za-z]:[/\\]|^\//.test(l));
      if (allPaths && lines.length > 0 && lines.length <= 20) {
        e.preventDefault();
        addFiles(lines);
        return;
      }
    }

    // Regular text paste — sanitizeInput is applied on submit, not here
  };

  const containerClass = [
    "chat-input-container",
    inputStyle === "terminal" ? "terminal-mode" : "",
    processing ? "processing" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      {attachments.length > 0 && (
        <div className="attachment-chips">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} onRemove={removeAttachment} />
          ))}
        </div>
      )}
      <div className="chat-input-row">
        <button
          className="chat-input-attach-btn"
          onClick={handleAttachClick}
          title="Attach files"
          disabled={disabled}
        >
          +
        </button>
        <textarea
          ref={textareaRef}
          className="chat-input-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
        />
        <button
          className="chat-input-send-btn"
          onClick={handleSubmit}
          disabled={disabled || !hasContent}
          title="Send message"
        >
          &gt;
        </button>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Install @tauri-apps/plugin-dialog (required — not in package.json)**

```bash
cd app && npm install @tauri-apps/plugin-dialog
```

Also check Rust side — if `tauri-plugin-dialog` is not in `app/src-tauri/Cargo.toml`:
```bash
cd app/src-tauri && cargo add tauri-plugin-dialog
```
And register in `main.rs` with `.plugin(tauri_plugin_dialog::init())` if not already present.

- [ ] **Step 3: Verify the app compiles**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/src/components/chat/ChatInput.tsx
git commit -m "feat: add ChatInput component with attachment support and paste handling"
```

---

## Chunk 4: Integrate ChatInput into ChatView + Drag & Drop

### Task 7: Refactor ChatView to use ChatInput

**Files:**
- Modify: `app/src/components/ChatView.tsx`
- Modify: `app/src/components/ChatView.css`

- [ ] **Step 1: Update ChatView.tsx**

Changes:
1. Replace the `import` of `sanitizeInput` (already added in Task 2)
2. Add import for ChatInput: `import ChatInput from "./chat/ChatInput";`
3. Add import for Attachment type: `import type { Attachment } from "../types";`
4. Add drag & drop state and lifted attachment state for drop forwarding:
   ```typescript
   const [isDragging, setIsDragging] = useState(false);
   const dragCounterRef = useRef(0);
   const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
   ```
5. Replace `handleSubmit` to accept attachments:
   ```typescript
   const handleSubmit = (text: string, attachments: Attachment[]) => {
     if (!agentStartedRef.current) return;
     // Build message with attachment paths prepended
     let fullText = text;
     if (attachments.length > 0) {
       const attachPrefix = attachments.map(a => `[Attached: ${a.path}]`).join("\n");
       fullText = attachPrefix + (text ? "\n\n" + text : "");
     }
     if (!fullText.trim()) return;
     setMessages(prev => [...prev, { id: nextId(), role: "user", text: fullText, timestamp: Date.now() }]);
     setInputState("processing");
     sendAgentMessage(tabId, fullText).catch((err) => {
       setMessages(prev => [...prev, { id: nextId(), role: "error", code: "send", message: String(err), timestamp: Date.now() }]);
     });
   };
   ```
6. Remove the following dead code (now managed by ChatInput):
   - `const [inputText, setInputText] = useState("");` (line 44)
   - `const inputRef = useRef<HTMLTextAreaElement>(null);` (line 46)
   - The `useEffect` that focuses `inputRef` (lines 82-86)
   - The entire old `{inputState === "awaiting_input" && ...}` JSX block with inline `<textarea>` (lines 319-337)
   - The old `{inputState === "processing" && ...}` JSX block with `ThinkingIndicator` (lines 338-340) — replaced by ChatInput in processing mode
8. Add drag event handlers:
   ```typescript
   const handleDragEnter = (e: React.DragEvent) => {
     e.preventDefault();
     dragCounterRef.current++;
     if (dragCounterRef.current === 1) setIsDragging(true);
   };
   const handleDragLeave = (e: React.DragEvent) => {
     e.preventDefault();
     dragCounterRef.current--;
     if (dragCounterRef.current === 0) setIsDragging(false);
   };
   const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
   };
   const handleDrop = (e: React.DragEvent) => {
     e.preventDefault();
     dragCounterRef.current = 0;
     setIsDragging(false);
     const files = Array.from(e.dataTransfer.files);
     if (files.length > 0) {
       const paths = files.map(f => f.path || f.name);
       setDroppedFiles(paths); // ChatInput consumes via prop and clears
     }
   };
   ```
9. Update the JSX return — replace the inline textarea section and add drag-drop:
   ```tsx
   return (
     <div
       className="chat-view"
       style={{ fontFamily: `'${fontFamily}', 'Consolas', monospace`, fontSize }}
       onKeyDown={handleKeyDown}
       tabIndex={0}
       onDragEnter={handleDragEnter}
       onDragLeave={handleDragLeave}
       onDragOver={handleDragOver}
       onDrop={handleDrop}
     >
       <div ref={chatContainerRef} className="chat-messages">
         {/* ... message rendering unchanged ... */}
         <div ref={messagesEndRef} />
       </div>
       {inputState === "awaiting_input" && (
         <ChatInput
           onSubmit={handleSubmit}
           disabled={false}
           processing={false}
           isActive={isActive}
           droppedFiles={droppedFiles}
           onDroppedFilesConsumed={() => setDroppedFiles([])}
         />
       )}
       {inputState === "processing" && !messages.some(m => m.role === "permission" && !m.resolved) && (
         <ChatInput
           onSubmit={handleSubmit}
           disabled={true}
           processing={true}
           isActive={isActive}
           droppedFiles={droppedFiles}
           onDroppedFilesConsumed={() => setDroppedFiles([])}
         />
       )}
       {isDragging && (
         <div className="chat-drop-overlay">
           <span className="chat-drop-overlay-text">Drop files here</span>
         </div>
       )}
     </div>
   );
   ```

Note: The `chat-drop-overlay` needs `position: relative` on `.chat-view`. Add this to ChatView.css:
```css
.chat-view { position: relative; }
```

- [ ] **Step 2: Clean up ChatView.css**

Remove the old `.chat-input-bar` and `.chat-input` styles (lines 312-334) since ChatInput.css now handles input styling. Keep `.chat-thinking-bar` as it's still used.

- [ ] **Step 3: Verify the app compiles and renders**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual test**

1. Run `cargo tauri dev`
2. Open a project tab — verify the new input bar appears with [+] button and [>] send button
3. Type a message and press Enter — verify it sends
4. Click [+] — verify native file picker opens
5. Paste an image (Ctrl+V with image in clipboard) — verify attachment chip appears
6. Drag a file over the chat — verify overlay appears with "Drop files here"
7. Drop the file — verify attachment chip appears
8. Send a message with attachments — verify `[Attached: ...]` prefix in the sent message

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ChatView.tsx app/src/components/ChatView.css
git commit -m "feat: integrate ChatInput with drag-drop and attachment support"
```

---

## Chunk 5: Input Mode Setting (chat vs terminal)

### Task 8: Add input_style setting to the settings modal

**Files:**
- Modify: `app/src/components/ChatView.tsx` — pass inputStyle
- Modify: Settings modal (find via `Ctrl+,` handler in App.tsx/NewTabPage.tsx)

- [ ] **Step 1: Identify settings modal location**

The settings modal is triggered by Ctrl+, in `NewTabPage.tsx`. Search for the component that renders settings fields (font, theme, etc.) — this is where the input_style toggle will be added. No Rust changes needed — Settings struct uses `#[serde(flatten)]` for arbitrary keys.

- [ ] **Step 3: Pass inputStyle to ChatInput**

In `ChatView.tsx`, accept `inputStyle` as a prop and pass it to ChatInput. In terminal mode, render ChatInput inside `chat-messages` div (before `messagesEndRef`) instead of outside it.

Add `inputStyle` prop to `ChatViewProps`:
```typescript
inputStyle?: "chat" | "terminal";
```

In the JSX, conditionally position ChatInput:
```tsx
{/* Chat mode: ChatInput rendered OUTSIDE chat-messages div */}
{/* Terminal mode: ChatInput rendered INSIDE chat-messages div, before messagesEndRef */}

<div ref={chatContainerRef} className="chat-messages">
  {/* ... messages ... */}
  {inputStyle === "terminal" && inputState === "awaiting_input" && (
    <ChatInput onSubmit={handleSubmit} disabled={false} processing={false}
      isActive={isActive} inputStyle="terminal"
      droppedFiles={droppedFiles} onDroppedFilesConsumed={() => setDroppedFiles([])} />
  )}
  <div ref={messagesEndRef} />
</div>
{inputStyle !== "terminal" && inputState === "awaiting_input" && (
  <ChatInput onSubmit={handleSubmit} disabled={false} processing={false}
    isActive={isActive} inputStyle="chat"
    droppedFiles={droppedFiles} onDroppedFilesConsumed={() => setDroppedFiles([])} />
)}
```

- [ ] **Step 4: Add floating mini-input for terminal mode**

When `inputStyle === "terminal"` and user has scrolled up > 200px, show a compact sticky input at the bottom. Track scroll position with a ref:

```typescript
const [showMiniInput, setShowMiniInput] = useState(false);

// In the scroll handler:
const handleScroll = () => {
  const el = chatContainerRef.current;
  if (!el) return;
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  setShowMiniInput(dist > 200);
};
```

- [ ] **Step 5: Add setting toggle to settings modal**

Add a row to the settings modal:
```
Input style: [Chat] [Terminal]
```
Use the existing `SegmentedControl` component if it exists in the codebase, or add two styled buttons (matching existing settings row pattern). The toggle calls `updateSettings({ input_style: value })`.

- [ ] **Step 6: Manual test terminal mode**

1. Switch to terminal mode in settings
2. Verify input appears at the bottom of the message list (not fixed)
3. Scroll up — verify floating mini-input appears
4. Type in mini-input — verify it scrolls down and focuses the full input
5. Switch back to chat mode — verify fixed bottom input

- [ ] **Step 7: Commit**

```bash
git add app/src/components/ChatView.tsx app/src/components/chat/ChatInput.tsx app/src/components/chat/ChatInput.css
git commit -m "feat: add chat/terminal input mode toggle setting"
```
(Add the settings modal file to the git add list too.)

---

## Summary

After completing all 8 tasks across 5 chunks:

- Text sanitization prevents the `invalid high surrogate` API crash
- ChatInput component with [+] attach, paste, and send button
- AttachmentChip showing file/image previews with remove
- Drag & drop overlay on the chat area
- Image paste via Ctrl+V using Tauri clipboard API
- Input mode setting: chat (fixed bottom) vs terminal (inline flow)
- Old `stripNonBmp` removed, replaced by comprehensive `sanitizeInput`

**Next:** Phase 2 (Message Rendering) can begin independently — code highlighting, thinking panel, permission UX, dialog management, loading animations.
