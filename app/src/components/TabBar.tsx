import { memo, useState, useCallback, useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ContextMenu } from "radix-ui";
import { Tab, getTabLabel } from "../types";
import "./TabBar.css";

const appWindow = getCurrentWindow();

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
  onSaveToProjects?: (tabId: string) => void;
  onToggleAbout: () => void;
  onToggleUsage: () => void;
  onToggleSessions: () => void;
}

export default memo(function TabBar({ tabs, activeTabId, onActivate, onClose, onAdd, onSaveToProjects, onToggleAbout, onToggleUsage, onToggleSessions }: TabBarProps) {
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const closingTimersRef = useRef<Map<string, number>>(new Map());

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

  const handleMinimize = useCallback(() => {
    appWindow.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    appWindow.toggleMaximize();
  }, []);

  const handleWindowClose = useCallback(() => {
    appWindow.close();
  }, []);

  // Clean up closing animation timers on unmount
  useEffect(() => () => {
    closingTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <div className="tab-bar" data-tauri-drag-region>
      <div className="tab-list" role="tablist" data-tauri-drag-region>
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
      <button className="tab-add" onClick={onAdd} title="New Tab (Ctrl+T)" aria-label="New Tab">
        +
      </button>
      <div className="tab-bar-actions">
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
      <div className="window-controls">
        <button className="win-btn minimize" onClick={handleMinimize} aria-label="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button className="win-btn maximize" onClick={handleMaximize} aria-label="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className="win-btn close" onClick={handleWindowClose} aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
      </div>
    </div>
  );
});
