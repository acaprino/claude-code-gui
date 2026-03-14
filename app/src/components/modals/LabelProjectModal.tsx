import { useState, useEffect, useRef } from "react";
import { ProjectInfo } from "../../types";
import Modal from "../Modal";

interface LabelProjectModalProps {
  project: ProjectInfo;
  currentLabel: string | null;
  onClose: () => void;
  onSave: (label: string) => void;
}

export default function LabelProjectModal({
  project,
  currentLabel,
  onClose,
  onSave,
}: LabelProjectModalProps) {
  const [label, setLabel] = useState(currentLabel ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    onSave(label.trim());
  };

  return (
    <Modal title={`Label: ${project.name}`} onClose={onClose}>
      <div className="modal-field">
        <label>Display label (leave empty to use folder name)</label>
        <input
          ref={inputRef}
          className="modal-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder={project.name}
        />
      </div>
      <div className="modal-buttons">
        <button className="modal-btn" onClick={onClose}>Cancel</button>
        <button className="modal-btn primary" onClick={handleSave}>Save</button>
      </div>
    </Modal>
  );
}
