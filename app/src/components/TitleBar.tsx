import { memo, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconMinimize, IconMaximize, IconClose } from "./Icons";
import "./TitleBar.css";

const appWindow = getCurrentWindow();

export default memo(function TitleBar() {
  const handleMinimize = useCallback(() => {
    appWindow.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    appWindow.toggleMaximize();
  }, []);

  const handleClose = useCallback(() => {
    appWindow.close();
  }, []);

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar__spacer" data-tauri-drag-region />
      <div className="window-controls">
        <button className="win-btn minimize" onClick={handleMinimize} aria-label="Minimize">
          <IconMinimize />
        </button>
        <button className="win-btn maximize" onClick={handleMaximize} aria-label="Maximize">
          <IconMaximize />
        </button>
        <button className="win-btn close" onClick={handleClose} aria-label="Close">
          <IconClose />
        </button>
      </div>
    </div>
  );
});
