import { useState, useEffect, useRef, useCallback, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import Modal from "../Modal";

interface DirEntry {
  name: string;
  path: string;
  has_children: boolean;
}

interface TreeNodeState {
  expanded: boolean;
  children: DirEntry[] | null;
  loading: boolean;
}

interface QuickLaunchModalProps {
  onClose: () => void;
  onLaunch: (dirPath: string, addToProjects: boolean) => void;
}

const INDENT_PX = 16;
const BASE_INDENT_PX = 4;
const MAX_DEPTH = 20;

const FolderTree = memo(function FolderTree({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (path: string) => void;
}) {
  const [roots, setRoots] = useState<DirEntry[]>([]);
  const [nodes, setNodes] = useState<Record<string, TreeNodeState>>({});
  const [error, setError] = useState<string | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    invoke<DirEntry[]>("list_directory", { path: null })
      .then(setRoots)
      .catch((e) => setError(`Failed to load drives: ${e}`));
  }, []);

  const toggleNode = useCallback(async (entry: DirEntry) => {
    const existing = nodesRef.current[entry.path];
    if (existing?.expanded) {
      setNodes((prev) => ({
        ...prev,
        [entry.path]: { ...prev[entry.path], expanded: false },
      }));
      return;
    }

    if (existing?.children) {
      setNodes((prev) => ({
        ...prev,
        [entry.path]: { ...prev[entry.path], expanded: true },
      }));
      return;
    }

    setNodes((prev) => ({
      ...prev,
      [entry.path]: { expanded: true, children: null, loading: true },
    }));

    try {
      const children = await invoke<DirEntry[]>("list_directory", {
        path: entry.path,
      });
      setNodes((prev) => ({
        ...prev,
        [entry.path]: { expanded: true, children, loading: false },
      }));
    } catch (e) {
      console.warn("Failed to list directory:", entry.path, e);
      setNodes((prev) => ({
        ...prev,
        [entry.path]: { expanded: true, children: [], loading: false },
      }));
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, entry: DirEntry) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(entry.path);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (entry.has_children && !nodesRef.current[entry.path]?.expanded) toggleNode(entry);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const node = nodesRef.current[entry.path];
        if (node?.expanded) {
          setNodes((prev) => ({
            ...prev,
            [entry.path]: { ...prev[entry.path], expanded: false },
          }));
        }
      }
    },
    [onSelect, toggleNode],
  );

  const renderEntry = (entry: DirEntry, depth: number) => {
    if (depth >= MAX_DEPTH) return null;
    const node = nodes[entry.path];
    const isExpanded = node?.expanded ?? false;
    const isSelected = selected === entry.path;
    // After first load, derive arrow from actual children; before load, use optimistic default
    const hasChildren = node?.children ? node.children.length > 0 : entry.has_children;

    return (
      <div key={entry.path}>
        <div
          className={`folder-tree-item${isSelected ? " selected" : ""}`}
          style={{ paddingLeft: depth * INDENT_PX + BASE_INDENT_PX }}
          onClick={() => onSelect(entry.path)}
          onDoubleClick={() => {
            if (hasChildren) toggleNode(entry);
          }}
          onKeyDown={(e) => handleKeyDown(e, entry)}
          tabIndex={0}
        >
          <span
            className={`folder-tree-arrow${hasChildren ? "" : " hidden"}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(entry);
            }}
          >
            {isExpanded ? "\u25BE" : "\u25B8"}
          </span>
          <span className="folder-tree-name">{entry.name}</span>
        </div>
        {isExpanded && node?.loading && (
          <div
            className="folder-tree-item loading"
            style={{ paddingLeft: (depth + 1) * INDENT_PX + BASE_INDENT_PX }}
          >
            Loading...
          </div>
        )}
        {isExpanded &&
          node?.children?.map((child) => renderEntry(child, depth + 1))}
      </div>
    );
  };

  if (error) {
    return <div className="folder-tree-error">{error}</div>;
  }

  return (
    <div className="folder-tree">
      {roots.map((r) => renderEntry(r, 0))}
    </div>
  );
});

export default function QuickLaunchModal({
  onClose,
  onLaunch,
}: QuickLaunchModalProps) {
  const [dirPath, setDirPath] = useState("");
  const [addToProjects, setAddToProjects] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLaunch();
          }}
          placeholder="D:\Projects\my-project"
        />
      </div>
      <FolderTree selected={dirPath} onSelect={setDirPath} />
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
        <button className="modal-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal-btn primary" onClick={handleLaunch}>
          Launch
        </button>
      </div>
    </Modal>
  );
}
