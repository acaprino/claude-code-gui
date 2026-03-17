import { memo, useState, useCallback, useRef, useEffect } from "react";
import { ContextMenu } from "radix-ui";
import { Tab, getTabLabel } from "../types";
import "./TabSidebar.css";

interface TabSidebarProps {
  tabs: Tab[];
  activeTabId: string;
  sidebarWidth: number;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
  onSaveToProjects?: (tabId: string) => void;
  onToggleAbout: () => void;
  onToggleUsage: () => void;
  onToggleSessions: () => void;
  onResizeWidth: (width: number) => void;
  onResizing: (resizing: boolean) => void;
}

const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 360;

export default memo(function TabSidebar({
  tabs, activeTabId, sidebarWidth, onActivate, onClose, onAdd,
  onSaveToProjects, onToggleAbout, onToggleUsage, onToggleSessions, onResizeWidth, onResizing,
}: TabSidebarProps) {
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const closingTimersRef = useRef<Map<string, number>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback((tabId: string) => {
    if (closingTimersRef.current.has(tabId)) return;

    setClosingIds((prev) => new Set(prev).add(tabId));

    const timer = window.setTimeout(() => {
      setClosingIds((prev) => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
      closingTimersRef.current.delete(tabId);
      onClose(tabId);
    }, 150);

    closingTimersRef.current.set(tabId, timer);
  }, [onClose]);

  // Clean up closing animation timers on unmount
  useEffect(() => () => {
    closingTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  // Resize handle logic
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    onResizing(true);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + delta));
      document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`);
    };

    const onUp = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + delta));
      onResizing(false);
      onResizeWidth(newWidth);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [sidebarWidth, onResizeWidth, onResizing]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(".tab.active");
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeTabId]);

  return (
    <div className="tab-sidebar">
      <div className="tab-sidebar__header">
        <button className="tab-sidebar__add" onClick={onAdd} title="New Tab (Ctrl+T)" aria-label="New Tab">
          + New Tab
        </button>
      </div>

      <div className="tab-sidebar__list" ref={listRef} role="tablist" aria-orientation="vertical">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isClosing = closingIds.has(tab.id);
          const label = getTabLabel(tab);

          return (
            <ContextMenu.Root key={tab.id}>
              <ContextMenu.Trigger asChild>
                <div
                  className={`tab ${isActive ? "active" : ""} ${tab.hasNewOutput ? "has-output" : ""} ${isClosing ? "closing" : ""} ${tab.temporary ? "temporary" : ""}`}
                  onClick={() => !isClosing && onActivate(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                >
                  <span className="tab-label" title={tab.temporary ? `${label} (temp)` : label}>{label}</span>
                  {tab.exitCode != null && (
                    <span className={`tab-exit ${tab.exitCode === 0 ? "ok" : "err"}`}>
                      {tab.exitCode === 0 ? "\u2713" : "\u2717"}
                    </span>
                  )}
                  <button
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose(tab.id);
                    }}
                    title="Close (Ctrl+F4)"
                    aria-label={`Close ${label}`}
                  >
                    {"\u00d7"}
                  </button>
                </div>
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content className="tab-context-menu">
                  {tab.type === "agent" && tab.temporary && onSaveToProjects && (
                    <ContextMenu.Item className="context-menu-item" onSelect={() => onSaveToProjects(tab.id)}>
                      Save to Projects
                    </ContextMenu.Item>
                  )}
                  <ContextMenu.Item className="context-menu-item" onSelect={() => handleClose(tab.id)}>
                    Close Tab
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          );
        })}
      </div>

      <div className="tab-sidebar__footer">
        <button className="tab-bar-action" onClick={onToggleSessions} title="Sessions (Ctrl+Shift+S)" aria-label="Sessions">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 3.5A4.5 4.5 0 1 1 2 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <polyline points="2,1 2,3.5 4.5,3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
        <button className="tab-bar-action" onClick={onToggleUsage} title="Usage Stats (Ctrl+U)" aria-label="Usage Stats">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="7" width="2" height="4" rx="0.5" fill="currentColor"/>
            <rect x="5" y="4" width="2" height="7" rx="0.5" fill="currentColor"/>
            <rect x="9" y="1" width="2" height="10" rx="0.5" fill="currentColor"/>
          </svg>
        </button>
        <button className="tab-bar-action" onClick={onToggleAbout} title="About (F12)" aria-label="About">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <text x="6" y="9" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold" fontFamily="serif">i</text>
          </svg>
        </button>
      </div>

      {/* Resize handle */}
      <div
        className="tab-sidebar__resize"
        onMouseDown={handleResizeStart}
      />

    </div>
  );
});
