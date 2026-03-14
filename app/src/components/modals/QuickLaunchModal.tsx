import { useState, useEffect, useRef } from "react";
import Modal from "../Modal";

interface QuickLaunchModalProps {
  onClose: () => void;
  onLaunch: (dirPath: string, addToProjects: boolean) => void;
}

export default function QuickLaunchModal({
  onClose,
  onLaunch,
}: QuickLaunchModalProps) {
  const [dirPath, setDirPath] = useState("");
  const [addToProjects, setAddToProjects] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleLaunch = () => {
    const trimmed = dirPath.trim();
    if (!trimmed) return;
    onLaunch(trimmed, addToProjects);
  };

  return (
    <Modal title="Quick Launch" onClose={onClose}>
      <div className="modal-field">
        <label>Project directory path</label>
        <input
          ref={inputRef}
          className="modal-input"
          value={dirPath}
          onChange={(e) => setDirPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleLaunch(); }}
          placeholder="D:\Projects\my-project"
        />
      </div>
      <div className="modal-checkbox">
        <input
          type="checkbox"
          id="add-to-projects"
          checked={addToProjects}
          onChange={(e) => setAddToProjects(e.target.checked)}
        />
        <label htmlFor="add-to-projects">Add to project list</label>
      </div>
      <div className="modal-buttons">
        <button className="modal-btn" onClick={onClose}>Cancel</button>
        <button className="modal-btn primary" onClick={handleLaunch}>Launch</button>
      </div>
    </Modal>
  );
}
