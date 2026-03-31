# Team Agents & Custom Subagents Implementation Plan

> **For agentic workers:** Use subagent-driven execution (if subagents available) or ai-tooling:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Claude Code's Custom Subagents (stable) and Agent Teams (experimental) into the GUI — agent selector at launch, team coordination panel in RightSidebar, multi-sidecar lifecycle management.

**Architecture:** Multi-sidecar approach — each team agent runs as an independent Node.js process. Lead terminal stays full-width. Teammates are observed via a new "Team" tab in the RightSidebar showing members, shared tasks, and inter-agent messages. Custom subagents are selectable at launch via filesystem scan.

**Tech Stack:** Rust (Tauri commands, sidecar lifecycle), Node.js (sidecar.js SDK bridge), React 19 + TypeScript (frontend panels), xterm.js (existing terminal)

---

## Phase 1: Custom Subagents (stable feature)

### Task 1: Add `agentName` field to Tab type and launch flow

**Files:**
- Modify: `app/src/types.ts:8-30` (Tab interface)
- Modify: `app/src/components/NewTabPage.tsx:13-50` (props), `:79-98` (launchProject)
- Modify: `app/src/App.tsx:203-217` (handleLaunch), `:465-494` (AgentView instantiation)

- [ ] **Step 1: Add `agentName` to Tab interface**

In `app/src/types.ts`, add after the `forkSessionId` field:

```typescript
  /** When set, session runs as this custom subagent (passed to SDK agent option). */
  agentName?: string;
```

- [ ] **Step 2: Extend NewTabPage onLaunch signature**

In `app/src/components/NewTabPage.tsx`, update the `onLaunch` prop type to include `agentName`:

```typescript
  onLaunch: (
    tabId: string,
    projectPath: string,
    projectName: string,
    modelIdx: number,
    effortIdx: number,
    permModeIdx: number,
    autocompact: boolean,
    temporary?: boolean,
    agentName?: string,
  ) => void;
```

Update `launchProject` to pass `undefined` as agentName (for now — Task 3 adds the selector):

```typescript
    onLaunch(
      tabId,
      project.path,
      project.label ?? project.name,
      currentSettings.model_idx,
      currentSettings.effort_idx,
      currentSettings.perm_mode_idx,
      currentSettings.autocompact,
      undefined,  // temporary
      undefined,  // agentName
    );
```

- [ ] **Step 3: Update App.tsx handleLaunch to store agentName**

In `app/src/App.tsx`, update `handleLaunch`:

```typescript
const handleLaunch = useCallback(
  (tabId: string, projectPath: string, projectName: string, modelIdx: number, effortIdx: number, permModeIdx: number, autocompact: boolean, temporary?: boolean, agentName?: string) => {
    updateTab(tabId, {
      type: "agent",
      projectPath,
      projectName,
      modelIdx,
      effortIdx,
      permModeIdx,
      autocompact,
      temporary: temporary || false,
      agentName,
    });
  },
  [updateTab],
);
```

- [ ] **Step 4: Pass agentName through to AgentView**

In `app/src/App.tsx`, in the AgentView JSX block, add the prop:

```typescript
      agentName={tab.agentName}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: Clean compilation (AgentView doesn't accept agentName yet — that's Task 2)

- [ ] **Step 6: Commit**

```bash
git add app/src/types.ts app/src/components/NewTabPage.tsx app/src/App.tsx
git commit -m "feat: add agentName field to Tab type and launch flow"
```

---

### Task 2: Thread `agentName` through session controller to sidecar

**Files:**
- Modify: `app/src/components/AgentView.tsx:1-50` (props)
- Modify: `app/src/hooks/useSessionController.ts:88-106` (props), `:485-500` (spawn call)
- Modify: `app/src/hooks/useAgentSession.ts:4-33` (spawnAgent signature)
- Modify: `app/src-tauri/src/commands.rs:385-416` (spawn_agent command)
- Modify: `sidecar/sidecar.js:118-399` (handleCreate), `:376-384` (query options)

- [ ] **Step 1: Add agentName to AgentView props**

In `app/src/components/AgentView.tsx`, extend `AgentViewProps`:

```typescript
interface AgentViewProps extends SessionControllerProps {
  // ...existing...
}
```

`SessionControllerProps` will get the field in the next step, so AgentView gets it for free.

- [ ] **Step 2: Add agentName to SessionControllerProps**

In `app/src/hooks/useSessionController.ts`, add to `SessionControllerProps`:

```typescript
  agentName?: string;
```

- [ ] **Step 3: Pass agentName in spawnAgent call**

In `app/src/hooks/useSessionController.ts`, update the spawn call (around line 490):

```typescript
    : spawnAgent(tabId, projectPath, modelId, effortId, sanitizeInput(systemPrompt), permMode, plugins, disabledHooksRef.current, apiBaseUrl, agentName || "", handleAgentEvent);
```

- [ ] **Step 4: Add agentName to useAgentSession.spawnAgent**

In `app/src/hooks/useAgentSession.ts`, add `agentName` parameter:

```typescript
export async function spawnAgent(
  tabId: string,
  projectPath: string,
  model: string,
  effort: string,
  systemPrompt: string,
  permMode: string,
  plugins: string[],
  disabledHooks: string[],
  apiBaseUrl: string,
  agentName: string,
  onEvent: (event: AgentEvent) => void,
): Promise<Channel<AgentEvent>> {
  const channel = new Channel<AgentEvent>();
  channel.onmessage = onEvent;

  await invoke("spawn_agent", {
    tabId,
    projectPath,
    model,
    effort,
    systemPrompt,
    permMode,
    plugins,
    disabledHooks,
    apiBaseUrl,
    agentName,
    onEvent: channel,
  });

  return channel;
}
```

- [ ] **Step 5: Add agentName to Rust spawn_agent command**

In `app/src-tauri/src/commands.rs`, add parameter and pass to sidecar:

```rust
#[tauri::command]
pub fn spawn_agent(
    sidecar: State<'_, Arc<SidecarManager>>,
    tab_id: String,
    project_path: String,
    model: String,
    effort: String,
    system_prompt: String,
    perm_mode: String,
    plugins: Vec<String>,
    disabled_hooks: Vec<String>,
    api_base_url: String,
    agent_name: String,
    on_event: Channel<AgentEvent>,
) -> Result<(), String> {
    if system_prompt.len() > 100_000 {
        return Err("System prompt too large (max 100000 bytes)".to_string());
    }
    let perm_mode = prepare_agent(&sidecar, &tab_id, &project_path, &perm_mode, &api_base_url, on_event)?;
    log_info!("spawn_agent: tab={tab_id}, project={project_path}, model={model}, agent={agent_name}");
    sidecar.send_command(&serde_json::json!({
        "cmd": "create",
        "tabId": tab_id,
        "cwd": project_path,
        "model": opt_str(&model),
        "effort": effort,
        "systemPrompt": opt_str(&system_prompt),
        "permMode": perm_mode,
        "plugins": plugins,
        "disabledHooks": disabled_hooks,
        "apiBaseUrl": opt_str(&api_base_url),
        "agentName": opt_str(&agent_name),
    }))
}
```

- [ ] **Step 6: Handle agentName in sidecar.js**

In `sidecar/sidecar.js`, in `handleCreate`, extract and apply:

```javascript
const { tabId, cwd, model, effort, systemPrompt, permMode, skipPerms, allowedTools, plugins, apiBaseUrl, agentName } = cmd;
```

Then before calling `query()`, add to options:

```javascript
if (agentName) {
    options.agent = agentName;
}
```

- [ ] **Step 7: Verify full stack compiles**

Run: `cd app && npx tsc --noEmit` and `cd app/src-tauri && cargo check`
Expected: Clean compilation on both

- [ ] **Step 8: Commit**

```bash
git add app/src/components/AgentView.tsx app/src/hooks/useSessionController.ts app/src/hooks/useAgentSession.ts app/src-tauri/src/commands.rs sidecar/sidecar.js
git commit -m "feat: thread agentName from frontend through sidecar to SDK"
```

---

### Task 3: Agent filesystem scanner in Rust backend

**Files:**
- Create: `app/src-tauri/src/agents.rs`
- Modify: `app/src-tauri/src/main.rs` (register module + command)

- [ ] **Step 1: Create agents.rs with scan + parse logic**

Create `app/src-tauri/src/agents.rs`:

```rust
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentDefinition {
    pub name: String,
    pub description: String,
    pub model: Option<String>,
    pub source: String, // "project" | "global"
    pub file_path: String,
}

/// Parse a .md agent file with YAML frontmatter
fn parse_agent_file(path: &Path, source: &str) -> Option<AgentDefinition> {
    let content = fs::read_to_string(path).ok()?;
    let name = path.file_stem()?.to_str()?.to_string();

    // Extract YAML frontmatter between --- markers
    if !content.starts_with("---") {
        return Some(AgentDefinition {
            name,
            description: String::new(),
            model: None,
            source: source.to_string(),
            file_path: path.to_string_lossy().to_string(),
        });
    }

    let end = content[3..].find("\n---").map(|i| i + 3)?;
    let yaml_str = &content[3..end].trim();

    let mut description = String::new();
    let mut model = None;

    for line in yaml_str.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("description:") {
            description = val.trim().trim_matches('"').trim_matches('\'').to_string();
        } else if let Some(val) = line.strip_prefix("model:") {
            model = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        }
    }

    Some(AgentDefinition {
        name,
        description,
        model,
        source: source.to_string(),
        file_path: path.to_string_lossy().to_string(),
    })
}

/// Scan a directory for .md agent files
fn scan_agents_dir(dir: &Path, source: &str) -> Vec<AgentDefinition> {
    let mut agents = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                if let Some(agent) = parse_agent_file(&path, source) {
                    agents.push(agent);
                }
            }
        }
    }
    agents
}

#[tauri::command]
pub fn list_agent_definitions(project_path: String) -> Vec<AgentDefinition> {
    let mut agents = Vec::new();

    // Project-level: <project>/.claude/agents/*.md
    let project_agents_dir = PathBuf::from(&project_path).join(".claude").join("agents");
    agents.extend(scan_agents_dir(&project_agents_dir, "project"));

    // Global: ~/.claude/agents/*.md
    if let Some(home) = dirs::home_dir() {
        let global_agents_dir = home.join(".claude").join("agents");
        agents.extend(scan_agents_dir(&global_agents_dir, "global"));
    }

    // Deduplicate: project-level wins over global
    let mut seen = std::collections::HashSet::new();
    agents.retain(|a| seen.insert(a.name.clone()));

    agents.sort_by(|a, b| a.name.cmp(&b.name));
    agents
}
```

- [ ] **Step 2: Register module and command in main.rs**

In `app/src-tauri/src/main.rs`, add:

```rust
mod agents;
```

And add to the `invoke_handler` macro:

```rust
agents::list_agent_definitions,
```

- [ ] **Step 3: Verify Rust compiles**

Run: `cd app/src-tauri && cargo check`
Expected: Clean compilation

- [ ] **Step 4: Commit**

```bash
git add app/src-tauri/src/agents.rs app/src-tauri/src/main.rs
git commit -m "feat: add Rust agent filesystem scanner for .claude/agents/*.md"
```

---

### Task 4: Agent selector dropdown in NewTabPage

**Files:**
- Modify: `app/src/components/NewTabPage.tsx`
- Modify: `app/src/types.ts` (add AgentDefinition frontend type)

- [ ] **Step 1: Add AgentDefinition type**

In `app/src/types.ts`, add after `AgentInfoSDK`:

```typescript
export interface AgentDefinition {
  name: string;
  description: string;
  model?: string;
  source: "project" | "global";
  filePath: string;
}
```

- [ ] **Step 2: Add agent state and loading to NewTabPage**

In `app/src/components/NewTabPage.tsx`, add state and effect:

```typescript
const [availableAgents, setAvailableAgents] = useState<AgentDefinition[]>([]);
const [selectedAgent, setSelectedAgent] = useState<string>("");

// Load agents when selected project changes
useEffect(() => {
  const project = filteredProjects[selectedIdx];
  if (!project) {
    setAvailableAgents([]);
    setSelectedAgent("");
    return;
  }
  invoke<AgentDefinition[]>("list_agent_definitions", { projectPath: project.path })
    .then(setAvailableAgents)
    .catch(() => setAvailableAgents([]));
}, [filteredProjects, selectedIdx]);
```

- [ ] **Step 3: Add agent selector UI**

In `app/src/components/NewTabPage.tsx`, add a dropdown row below the existing config row (model/effort/perm). Only show if agents are available:

```typescript
{availableAgents.length > 0 && (
  <div className="ntab-agent-row">
    <span className="ntab-agent-label">Agent:</span>
    <select
      className="ntab-agent-select"
      value={selectedAgent}
      onChange={(e) => setSelectedAgent(e.target.value)}
    >
      <option value="">Default (no agent)</option>
      {availableAgents.map(a => (
        <option key={a.name} value={a.name} title={a.description}>
          {a.name}{a.source === "global" ? " (global)" : ""}
        </option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 4: Pass selectedAgent through onLaunch**

Update `launchProject`:

```typescript
    onLaunch(
      tabId,
      project.path,
      project.label ?? project.name,
      currentSettings.model_idx,
      currentSettings.effort_idx,
      currentSettings.perm_mode_idx,
      currentSettings.autocompact,
      undefined,  // temporary
      selectedAgent || undefined,  // agentName
    );
```

- [ ] **Step 5: Add minimal CSS for agent selector**

In `app/src/components/NewTabPage.css`, add:

```css
.ntab-agent-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  font-size: var(--text-xs);
  color: var(--text-dim);
}
.ntab-agent-label {
  min-width: 48px;
}
.ntab-agent-select {
  flex: 1;
  max-width: 300px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid color-mix(in srgb, var(--overlay0) 30%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-0) var(--space-1);
  font-family: inherit;
  font-size: var(--text-xs);
}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: Clean compilation

- [ ] **Step 7: Commit**

```bash
git add app/src/types.ts app/src/components/NewTabPage.tsx app/src/components/NewTabPage.css
git commit -m "feat: add agent selector dropdown in NewTabPage"
```

---

## Phase 2: Agent Teams Backend

### Task 5: Enable Agent Teams env var and team event types

**Files:**
- Modify: `sidecar/sidecar.js:118-152` (handleCreate — set env var)
- Modify: `app/src/types.ts` (TeamState types, extend Tab)

- [ ] **Step 1: Set Agent Teams env var in sidecar**

In `sidecar/sidecar.js`, at the top of `handleCreate`, before any SDK calls:

```javascript
// Enable experimental Agent Teams
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "true";
```

- [ ] **Step 2: Add team types to types.ts**

In `app/src/types.ts`, add after the `AgentDefinition` type:

```typescript
export interface TeamMember {
  agentId: string;
  name: string;
  role: "lead" | "teammate";
  status: "working" | "idle" | "waiting" | "disconnected";
  model?: string;
}

export interface TeamTask {
  id: string;
  description: string;
  assignee?: string;
  status: "pending" | "in_progress" | "completed";
}

export interface InterAgentMsg {
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export interface TeamState {
  active: boolean;
  members: TeamMember[];
  tasks: TeamTask[];
  messages: InterAgentMsg[];
}
```

- [ ] **Step 3: Add teamState to Tab interface**

In `app/src/types.ts`, in the Tab interface, add:

```typescript
  /** Team coordination state — set when Agent Teams is active. */
  teamState?: TeamState;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: Clean compilation

- [ ] **Step 5: Commit**

```bash
git add sidecar/sidecar.js app/src/types.ts
git commit -m "feat: enable Agent Teams env var and add team types"
```

---

### Task 6: Track team state from agent events in useSessionController

**Files:**
- Modify: `app/src/hooks/useSessionController.ts`

- [ ] **Step 1: Add team state management**

In `app/src/hooks/useSessionController.ts`, add state:

```typescript
const [teamState, setTeamState] = useState<TeamState>({ active: false, members: [], tasks: [], messages: [] });
```

- [ ] **Step 2: Handle team events in event handler**

In the event handler switch/if chain (where `taskStarted`, `taskProgress`, `taskNotification` are already handled), enhance the task event handlers to also update teamState:

```typescript
case "taskStarted": {
  const { taskId, description, taskType } = e;
  agentTasksHook.onTaskStarted(taskId, description, taskType);
  // Team tracking: if taskType indicates a teammate, track it
  setTeamState(prev => {
    const newTask: TeamTask = { id: taskId, description, assignee: taskId, status: "in_progress" };
    const memberExists = prev.members.some(m => m.agentId === taskId);
    const newMembers = memberExists ? prev.members.map(m =>
      m.agentId === taskId ? { ...m, status: "working" as const } : m
    ) : [...prev.members, { agentId: taskId, name: taskType || taskId, role: "teammate" as const, status: "working" as const }];
    return {
      active: true,
      members: newMembers,
      tasks: [...prev.tasks, newTask],
      messages: prev.messages,
    };
  });
  break;
}

case "taskProgress": {
  const { taskId, description, totalTokens, toolUses, durationMs, lastToolName, summary } = e;
  agentTasksHook.onTaskProgress(taskId, description, totalTokens, toolUses, durationMs, lastToolName, summary);
  setTeamState(prev => ({
    ...prev,
    tasks: prev.tasks.map(t => t.id === taskId ? { ...t, description: summary || t.description } : t),
    members: prev.members.map(m => m.agentId === taskId ? { ...m, status: "working" as const } : m),
  }));
  break;
}

case "taskNotification": {
  const { taskId, status, summary, totalTokens, toolUses, durationMs } = e;
  agentTasksHook.onTaskNotification(taskId, status, summary, totalTokens, toolUses, durationMs);
  const taskStatus = status === "completed" ? "completed" as const : "pending" as const;
  const memberStatus = status === "completed" ? "idle" as const : status === "failed" ? "disconnected" as const : "idle" as const;
  setTeamState(prev => {
    const updated = {
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: taskStatus, description: summary || t.description } : t),
      members: prev.members.map(m => m.agentId === taskId ? { ...m, status: memberStatus } : m),
      messages: [...prev.messages, { from: taskId, to: "lead", content: summary, timestamp: Date.now() }],
    };
    // Auto-deactivate when all teammates are idle/disconnected
    const allDone = updated.members.every(m => m.status === "idle" || m.status === "disconnected");
    if (allDone && updated.members.length > 0) {
      updated.active = false;
    }
    return updated;
  });
  break;
}
```

- [ ] **Step 3: Expose teamState from the hook return value**

Add `teamState` to the controller's return object:

```typescript
return {
  // ...existing...
  teamState,
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: Clean compilation

- [ ] **Step 5: Commit**

```bash
git add app/src/hooks/useSessionController.ts
git commit -m "feat: track team state from agent task events"
```

---

## Phase 3: Agent Teams Frontend (TeamPanel in RightSidebar)

### Task 7: Create TeamPanel component

**Files:**
- Create: `app/src/components/chat/TeamPanel.tsx`
- Create: `app/src/components/chat/TeamPanel.css`

- [ ] **Step 1: Create TeamPanel.tsx**

```typescript
import { memo } from "react";
import type { TeamState } from "../../types";
import "./TeamPanel.css";

interface Props {
  teamState: TeamState;
}

export default memo(function TeamPanel({ teamState }: Props) {
  const { members, tasks, messages } = teamState;

  return (
    <div className="team-panel">
      {/* Members section */}
      <div className="team-section">
        <div className="team-section-header">Members ({members.length})</div>
        {members.length === 0 ? (
          <div className="team-empty">No team members yet</div>
        ) : (
          <div className="team-members">
            {members.map(m => (
              <div key={m.agentId} className="team-member">
                <span className={`team-status-dot team-status-${m.status}`} />
                <span className="team-member-name">{m.name}</span>
                <span className="team-member-role">{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks section */}
      <div className="team-section">
        <div className="team-section-header">Tasks ({tasks.length})</div>
        {tasks.length === 0 ? (
          <div className="team-empty">No tasks</div>
        ) : (
          <div className="team-tasks">
            {tasks.map(t => (
              <div key={t.id} className={`team-task team-task-${t.status}`}>
                <span className="team-task-check">
                  {t.status === "completed" ? "\u2713" : t.status === "in_progress" ? "\u25C9" : "\u25CB"}
                </span>
                <span className="team-task-desc">{t.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages section */}
      <div className="team-section team-section-messages">
        <div className="team-section-header">Messages ({messages.length})</div>
        {messages.length === 0 ? (
          <div className="team-empty">No messages yet</div>
        ) : (
          <div className="team-messages">
            {messages.map((msg, i) => (
              <div key={i} className="team-message">
                <span className="team-msg-from">{msg.from}</span>
                <span className="team-msg-arrow">{"\u2192"}</span>
                <span className="team-msg-to">{msg.to}</span>
                <div className="team-msg-content">{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Create TeamPanel.css**

```css
.team-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.team-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.team-section-header {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: var(--space-1);
  border-bottom: 1px solid color-mix(in srgb, var(--overlay0) 20%, transparent);
}

.team-empty {
  font-size: var(--text-xs);
  color: var(--overlay0);
  font-style: italic;
  padding: var(--space-1) 0;
}

/* Members */
.team-member {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-0) 0;
  font-size: var(--text-xs);
}

.team-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.team-status-working { background: var(--green); }
.team-status-idle { background: var(--overlay0); }
.team-status-waiting { background: var(--yellow); }
.team-status-disconnected { background: var(--red); }

.team-member-name {
  color: var(--text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-member-role {
  color: var(--overlay0);
  font-size: var(--text-2xs);
}

/* Tasks */
.team-task {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-0) 0;
  font-size: var(--text-xs);
}

.team-task-check {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}
.team-task-completed .team-task-check { color: var(--green); }
.team-task-in_progress .team-task-check { color: var(--accent); }
.team-task-pending .team-task-check { color: var(--overlay0); }

.team-task-desc {
  color: var(--text);
  line-height: 1.4;
}
.team-task-completed .team-task-desc {
  color: var(--text-dim);
  text-decoration: line-through;
}

/* Messages */
.team-section-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.team-message {
  padding: var(--space-1) 0;
  border-bottom: 1px solid color-mix(in srgb, var(--overlay0) 10%, transparent);
  font-size: var(--text-xs);
}

.team-msg-from {
  color: var(--accent);
  font-weight: 600;
}
.team-msg-arrow {
  color: var(--overlay0);
  margin: 0 var(--space-0);
}
.team-msg-to {
  color: var(--green);
  font-weight: 600;
}
.team-msg-content {
  color: var(--text);
  margin-top: var(--space-0);
  line-height: 1.4;
  word-break: break-word;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: Clean compilation

- [ ] **Step 4: Commit**

```bash
git add app/src/components/chat/TeamPanel.tsx app/src/components/chat/TeamPanel.css
git commit -m "feat: create TeamPanel component for RightSidebar"
```

---

### Task 8: Wire TeamPanel into RightSidebar

**Files:**
- Modify: `app/src/components/chat/RightSidebar.tsx`
- Modify: `app/src/components/Icons.tsx` (add team icon)
- Modify: `app/src/components/XTermView.tsx` (pass teamState to sidebar)

- [ ] **Step 1: Add team icon to Icons.tsx**

In `app/src/components/Icons.tsx`, add:

```typescript
export function IconTeam() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2" />
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="12" cy="10" r="1.5" />
      <path d="M8 7v1.5M6 9.5l-1 .5M10 9.5l1 .5" />
    </svg>
  );
}
```

- [ ] **Step 2: Extend RightSidebar props and tabs**

In `app/src/components/chat/RightSidebar.tsx`:

Add import:
```typescript
import TeamPanel from "./TeamPanel";
import { IconTeam } from "../Icons";
import type { TeamState } from "../../types";
```

Update `SidebarTab` type:
```typescript
type SidebarTab = "bookmarks" | "minimap" | "todos" | "thinking" | "agents" | "team";
```

Update props:
```typescript
interface Props {
  messages: ChatMessage[];
  agentTasks: AgentTask[];
  teamState?: TeamState;
  onScrollToMessage: (msgId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}
```

- [ ] **Step 3: Conditionally show team tab**

Replace the static `SIDEBAR_TABS` with a computed array inside the component:

```typescript
const tabs = useMemo(() => {
  const base = [
    { id: "bookmarks" as const, icon: <IconBookmark />, title: "Bookmarks" },
    { id: "minimap" as const, icon: <IconMinimap />, title: "Minimap" },
    { id: "todos" as const, icon: <IconTodos />, title: "Todos" },
    { id: "thinking" as const, icon: <IconThinking />, title: "Thinking" },
    { id: "agents" as const, icon: <IconAgents />, title: "Agents" },
  ];
  if (teamState?.active || (teamState?.members?.length ?? 0) > 0) {
    base.push({ id: "team" as const, icon: <IconTeam />, title: "Team" });
  }
  return base;
}, [teamState?.active, teamState?.members?.length]);
```

Replace the `SIDEBAR_TABS.map(...)` in the render with `tabs.map(...)`.

- [ ] **Step 4: Add TeamPanel rendering**

In the conditional panel rendering section, add:

```typescript
{activeTab === "team" && teamState && (
  <TeamPanel teamState={teamState} />
)}
```

Add badge for active team members:

```typescript
{tab.id === "team" && teamState?.members?.filter(m => m.status === "working").length ? (
  <span key={teamState.members.length} className="sidebar-tab-badge">
    {teamState.members.filter(m => m.status === "working").length}
  </span>
) : null}
```

- [ ] **Step 5: Pass teamState from XTermView to RightSidebar**

In `app/src/components/XTermView.tsx`, the RightSidebar rendering:

The controller already exposes `teamState`. Pass it through:

```typescript
{sidebarOpen && (
  <RightSidebar
    messages={deferredMessages}
    agentTasks={agentTasks}
    teamState={controller.teamState}
    onScrollToMessage={() => {}}
    scrollContainerRef={{ current: null }}
  />
)}
```

- [ ] **Step 6: Auto-open sidebar on team activation**

In `app/src/components/XTermView.tsx`, add effect:

```typescript
// Auto-open sidebar when team becomes active
useEffect(() => {
  if (controller.teamState?.active && !sidebarOpen) {
    setSidebarOpen(true);
  }
}, [controller.teamState?.active]);
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: Clean compilation

- [ ] **Step 8: Commit**

```bash
git add app/src/components/chat/RightSidebar.tsx app/src/components/Icons.tsx app/src/components/XTermView.tsx
git commit -m "feat: wire TeamPanel into RightSidebar with auto-open on team activation"
```

---

### Task 9: Show team indicator in InfoStrip

**Files:**
- Modify: `app/src/components/InfoStrip.tsx` (not applicable — InfoStrip is only for NewTabPage)

Actually, looking at the codebase, InfoStrip is only shown on the NewTabPage (project picker), not in agent tabs. The status bar in agent tabs is the bottom bar in XTermView.tsx.

**Files:**
- Modify: `app/src/components/XTermView.tsx` (bottom bar)

- [ ] **Step 1: Add team indicator to XTermView bottom bar**

In `app/src/components/XTermView.tsx`, in the bottom bar section (where model/effort/permMode are shown), add a team indicator:

```typescript
{controller.teamState?.active && (
  <span className="tv-bottom-team">
    team: {controller.teamState.members.length} agent{controller.teamState.members.length !== 1 ? "s" : ""}
  </span>
)}
```

- [ ] **Step 2: Add CSS for team indicator**

In `app/src/components/XTermView.css`, add:

```css
.tv-bottom-team {
  color: var(--green);
  font-size: var(--text-xs);
  padding: 0 var(--space-2);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/XTermView.tsx app/src/components/XTermView.css
git commit -m "feat: show team agent count in terminal status bar"
```

---

### Task 10: Update CLAUDE.md and design spec

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/plans/2026-03-31-team-agents-design.md`

- [ ] **Step 1: Update CLAUDE.md Key Paths**

Add to the `app/src/components/chat/` line:
```
TeamPanel
```

Add to `app/src-tauri/src/` line:
```
agents.rs
```

- [ ] **Step 2: Add Agent Teams note to CLAUDE.md**

Add a section under Architecture Notes:

```markdown
### Agent Teams (experimental)
- Enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var in sidecar.
- Lead agent terminal stays full-width; teammate activity shown in RightSidebar "Team" tab.
- Team state tracked from SDK TaskStarted/TaskProgress/TaskNotification events.
- Custom subagents selectable at launch from `.claude/agents/*.md` files.
```

- [ ] **Step 3: Update design spec status**

Change status in design spec from "Approved" to "Implemented — simplified to RightSidebar panel (no split view)".

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/plans/2026-03-31-team-agents-design.md
git commit -m "docs: update CLAUDE.md and design spec for team agents"
```
