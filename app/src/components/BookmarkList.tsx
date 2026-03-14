import { memo, useRef, useEffect, useState, useCallback } from "react";
import type { Terminal as XTerm } from "@xterm/xterm";
import "./BookmarkList.css";

interface BookmarkListProps {
  xterm: XTerm | null;
  isActive: boolean;
  bookmarksRef: React.RefObject<Map<number, string>>;
}

export default memo(function BookmarkList({ xterm, isActive, bookmarksRef }: BookmarkListProps) {
  const [entries, setEntries] = useState<{ line: number; text: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevSizeRef = useRef(0);

  // Sync entries from bookmarksRef on every write (bookmarks are added on Enter)
  const syncEntries = useCallback(() => {
    const bm = bookmarksRef.current;
    if (bm.size === prevSizeRef.current) return;
    prevSizeRef.current = bm.size;
    const arr: { line: number; text: string }[] = [];
    for (const [line, text] of bm) {
      arr.push({ line, text });
    }
    arr.sort((a, b) => a.line - b.line);
    setEntries(arr);
  }, [bookmarksRef]);

  useEffect(() => {
    if (!xterm) return;
    syncEntries();
    const d = xterm.onWriteParsed(() => syncEntries());
    return () => d.dispose();
  }, [xterm, syncEntries]);

  // Also sync on tab activation (bookmarks may have changed while inactive)
  useEffect(() => {
    if (isActive) syncEntries();
  }, [isActive, syncEntries]);

  // Find the nearest bookmark to the current viewport for highlighting
  const [activeLine, setActiveLine] = useState<number>(-1);

  useEffect(() => {
    if (!xterm) return;
    const updateActive = () => {
      const vpTop = xterm.buffer.active.viewportY;
      const vpBottom = vpTop + xterm.rows;
      const bm = bookmarksRef.current;
      let nearest = -1;
      let nearestDist = Infinity;
      for (const line of bm.keys()) {
        // Find the last bookmark above or at the viewport top
        if (line <= vpBottom) {
          const d = Math.abs(line - vpTop);
          if (d < nearestDist || (d === nearestDist && line > nearest)) {
            nearest = line;
            nearestDist = d;
          }
        }
      }
      setActiveLine(nearest);
    };
    updateActive();
    const d1 = xterm.onScroll(() => updateActive());
    const d2 = xterm.onWriteParsed(() => updateActive());
    return () => { d1.dispose(); d2.dispose(); };
  }, [xterm, bookmarksRef]);

  // Auto-scroll the bookmark list to keep the active item visible
  useEffect(() => {
    if (activeLine < 0 || !containerRef.current) return;
    const active = containerRef.current.querySelector(".bookmark-item--active");
    if (active) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeLine]);

  const scrollTo = useCallback(
    (line: number) => {
      if (!xterm) return;
      const maxScroll = xterm.buffer.active.length - xterm.rows;
      const target = Math.max(0, Math.min(line - 2, maxScroll));
      xterm.scrollToLine(target);
      xterm.focus();
    },
    [xterm],
  );

  if (!xterm || entries.length === 0) return null;

  return (
    <div ref={containerRef} className="bookmark-list">
      <div className="bookmark-list-header">Prompts</div>
      <div className="bookmark-list-items">
        {entries.map((e, i) => (
          <button
            key={e.line}
            className={`bookmark-item${e.line === activeLine ? " bookmark-item--active" : ""}`}
            onClick={() => scrollTo(e.line)}
            title={e.text}
          >
            <span className="bookmark-index">{i + 1}</span>
            <span className="bookmark-text">{e.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
