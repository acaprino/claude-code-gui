<p align="center">
  <img src="app/public/icon.png" width="120" alt="Anvil">
</p>

<h1 align="center">Anvil</h1>

<p align="center">
  <strong>Manage Claude Code &amp; Gemini CLI sessions in tabbed terminals</strong><br>
  <sub>Pick a project. Pick a model. Hit Enter. Code.</sub>
</p>

<p align="center">
  <a href="https://github.com/acaprino/anvil/stargazers"><img src="https://img.shields.io/github/stars/acaprino/anvil?style=flat-square" alt="Stars"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=flat-square&logo=windows" alt="Platform">
  <img src="https://img.shields.io/badge/tauri-v2-24C8D8?style=flat-square&logo=tauri" alt="Tauri 2">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

<!-- TODO: Add hero screenshot here once captured
<p align="center">
  <img src="docs/screenshots/hero.png" width="800" alt="Anvil - tabbed terminal interface with project picker">
</p>
-->

---

## Table of Contents

- [What is Anvil?](#what-is-anvil)
- [Getting Started](#getting-started)
- [Features](#features)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Configuration](#configuration)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## What is Anvil?

**Pick a project. Pick a model. Hit Enter. Code.**

Anvil is a native Windows desktop app for launching and managing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Gemini CLI](https://github.com/google-gemini/gemini-cli) sessions in tabbed terminals. It scans your project directories, lets you configure model and effort settings per session, and keeps your tabs alive across restarts.

### Why not just run `claude` in a terminal?

You can. But if you work across multiple projects, you end up juggling terminal windows, retyping paths, and losing context when you close them.

Anvil fixes that:

- **Instant project switching** &mdash; All your project directories are scanned and listed. Type to filter, press Enter to launch. No `cd`, no path typing.
- **Persistent tabs** &mdash; Close Anvil, reopen it tomorrow. Your sessions and tabs are exactly where you left them.
- **Keyboard-first** &mdash; Every action has a shortcut. Model selection, effort levels, permissions &mdash; all without touching the mouse.
- **Native speed** &mdash; Rust backend with GPU-accelerated terminal rendering via xterm.js WebGL. No Electron, no web wrapper overhead.

---

## Getting Started

### Prerequisites

- **Windows 11** (or Windows 10 with WebView2)
- **Rust** toolchain (via [rustup](https://rustup.rs/))
- **Node.js** 18+ and npm
- **Claude Code** (`npm i -g @anthropic-ai/claude-code`) and/or **Gemini CLI** (`npm i -g @google/gemini-cli`)

### Build &amp; Run

```bash
# Clone the repository
git clone https://github.com/acaprino/anvil.git
cd anvil/app

# Install frontend dependencies
npm install

# Run in development mode (hot-reload)
cargo tauri dev

# Production build (with LTO + strip)
cargo tauri build
```

The release binary is optimized with LTO, single codegen unit, `opt-level = 3`, and symbol stripping for minimal binary size.

---

## Features

### Multi-Tab Terminal Interface
- Run multiple concurrent AI coding sessions side by side
- See which tabs have new output without switching to them
- Exit codes display when sessions complete
- Custom window chrome &mdash; no standard title bar

### Project Discovery &amp; Management
- Directories are scanned automatically &mdash; your projects appear instantly
- See which branch each project is on and whether it has uncommitted changes
- Spot which projects have a CLAUDE.md at a glance
- Add custom labels to organize projects your way
- Sort by name, last used, or most used
- Type to filter &mdash; real-time search across all projects
- Create new projects or quick-launch any directory (F10)

### AI Tool Integration

| Feature | Claude Code | Gemini CLI |
|---------|:-----------:|:----------:|
| Model selection | sonnet / opus / haiku / 1M variants | &mdash; |
| Effort levels | high / medium / low | &mdash; |
| Skip permissions | toggle | &mdash; |
| Session launch | Enter | Enter |

**Supported Claude models:**

| Model | ID | Context |
|-------|-----|---------|
| Sonnet | `claude-sonnet-4-6` | Standard |
| Opus | `claude-opus-4-6` | Standard |
| Haiku | `claude-haiku-4-5` | Standard |
| Sonnet 1M | `claude-sonnet-4-6[1m]` | Extended |
| Opus 1M | `claude-opus-4-6[1m]` | Extended |

### Terminal Emulation
- **xterm.js v5.5** with WebGL renderer for GPU-accelerated text drawing
- Drag and drop files directly into the terminal
- Paste from Slack, Notion, or Docs without broken smart quotes and dashes
- Paste images from clipboard (Ctrl+V creates a temp PNG)
- Customize font family and size to your preference

### Themes

10 built-in dark themes, switchable with F9. Default: **Catppuccin Mocha**. Includes Dracula, Nord, Tokyo Night, Gruvbox Dark, One Dark, Solarized Dark, Monokai, Anvil Forge, and Guybrush. Themes apply to the entire UI &mdash; window chrome, tabs, project list, status bar, and terminal.

<details>
<summary>View all themes</summary>

| Theme | Accent | Style |
|-------|--------|-------|
| **Catppuccin Mocha** | `#89b4fa` blue | Default |
| **Dracula** | `#bd93f9` purple | Classic |
| **One Dark** | `#61afef` blue | Atom-inspired |
| **Nord** | `#88c0d0` frost | Arctic |
| **Solarized Dark** | `#268bd2` blue | Precision |
| **Gruvbox Dark** | `#83a598` aqua | Warm retro |
| **Tokyo Night** | `#7aa2f7` blue | Neon |
| **Monokai** | `#66d9ef` cyan | Sublime |
| **Anvil Forge** | `#e8943a` orange | Retro forge |
| **Guybrush** | `#4ac8b0` cyan | Retro adventure |

</details>

### Session Management
- Sessions persist across app restarts &mdash; pick up where you left off
- Dead sessions are cleaned up automatically, no orphaned processes eating memory
- Win32 Job Objects guarantee clean process termination, even on crashes

---

## Keyboard Shortcuts

Anvil is keyboard-first. Every feature is reachable without a mouse.

| Action | Key |
|--------|-----|
| New tab | `Ctrl+T` |
| Close tab | `Ctrl+F4` |
| Launch project | `Enter` |
| Filter projects | Just type |
| Cycle model | `Tab` |
| Cycle theme | `F9` |

<details>
<summary>View all shortcuts</summary>

### Navigation
| Key | Action |
|-----|--------|
| `Ctrl+T` | New tab |
| `Ctrl+F4` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `F12` | Toggle About page |

### Settings (New Tab Page)
| Key | Action |
|-----|--------|
| `F1` | Cycle tool (Claude / Gemini) |
| `Tab` | Cycle model |
| `F2` | Cycle effort level |
| `F3` | Cycle sort order |
| `F4` | Toggle skip-permissions |

### Actions
| Key | Action |
|-----|--------|
| `F5` | Create new project |
| `F6` | Open project in Explorer |
| `F7` | Manage project directories |
| `F8` | Label selected project |
| `F9` | Theme picker |
| `F10` | Quick launch (any directory) |
| `F11` | Font settings |
| `Ctrl+U` | Token usage |
| `Enter` | Launch selected project |

### Project List Navigation
| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate projects |
| `Page Up` / `Page Down` | Jump 10 items |
| `Home` / `End` | First / last project |
| Type anything | Filter projects |
| `Backspace` | Delete filter character |
| `Esc` | Clear filter / close tab |

</details>

---

## Configuration

Settings are persisted automatically to disk via the Rust backend.

| Setting | Default | Description |
|---------|---------|-------------|
| Tool | Claude | Active CLI tool |
| Model | Sonnet | Claude model variant |
| Effort | High | Reasoning effort level |
| Sort | Alpha | Project sort order |
| Theme | Catppuccin Mocha | UI theme |
| Font | Cascadia Code, 14px | Terminal font |
| Skip permissions | Off | Auto-accept tool use |
| Project dirs | `D:\Projects` | Directories to scan |

---

## Tech Stack

<details>
<summary>Architecture overview</summary>

```
┌─────────────────────────────────────────────┐
│  Frontend                                   │
│  React 19 · TypeScript 5.7 · Vite 6        │
│  xterm.js 5.5 · WebGL Addon                │
├─────────────────────────────────────────────┤
│  IPC Layer                                  │
│  Tauri 2 Commands · Tauri Channels (PTY)    │
├─────────────────────────────────────────────┤
│  Backend                                    │
│  Rust 2021 · Tokio · Win32 APIs             │
│  PTY Management · Session Registry          │
│  Project Scanner · Settings Persistence     │
└─────────────────────────────────────────────┘
```

### Frontend (`app/src/`)
| Module | Purpose |
|--------|---------|
| `App.tsx` | Tab orchestration, global shortcuts, resize handles |
| `Terminal.tsx` | xterm.js wrapper, PTY comms, drag-and-drop |
| `NewTabPage.tsx` | Project picker, settings, modals |
| `TabBar.tsx` | Custom tabs, window controls, output indicators |
| `ProjectList.tsx` | Scrollable project list with metadata |
| `StatusBar.tsx` | Settings display, action buttons |
| `useTabManager` | Tab lifecycle, session save/restore |
| `useProjects` | Project scanning, filtering, sorting |
| `usePty` | PTY spawn/write/resize/kill via Tauri Channel |

### Backend (`app/src-tauri/src/`)
| Module | Purpose |
|--------|---------|
| `main.rs` | App init, Tauri setup, panic handler |
| `commands.rs` | IPC command handlers |
| `pty.rs` | PTY process spawning and lifecycle |
| `session.rs` | Session registry, event streaming, reaper |
| `projects.rs` | Project scanning, settings, usage persistence |
| `tools.rs` | Tool resolution and CLI argument building |
| `logging.rs` | File-based logging |

### Architecture Highlights

**Performance**
- WebGL terminal rendering &mdash; GPU-accelerated text drawing
- Ref-based callbacks &mdash; PTY handlers use refs to avoid stale closures and re-renders
- React.memo on all components &mdash; surgical re-renders only
- Tauri Channels for PTY data &mdash; zero-copy streaming, no serialization overhead

**Reliability**
- Win32 Job Objects &mdash; child processes always cleaned up, even on crashes
- Session Reaper &mdash; background thread monitors and cleans dead sessions
- Panic logging &mdash; Rust panics caught and logged to file
- Error boundaries &mdash; terminal crashes don't take down the app

**Security**
- CSP enforced &mdash; `default-src 'self'; style-src 'self' 'unsafe-inline'`
- Path validation &mdash; dropped file paths checked for safe Windows characters
- No remote content &mdash; fully local application, no external network calls

### Project Structure

```
anvil/
├── app/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── App.tsx           # Root component
│   │   ├── App.css           # Design tokens + global styles
│   │   ├── themes.ts         # Theme application
│   │   └── types.ts          # TypeScript definitions
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs       # Tauri setup
│   │   │   ├── commands.rs   # IPC handlers
│   │   │   ├── pty.rs        # PTY management
│   │   │   ├── session.rs    # Session lifecycle
│   │   │   ├── projects.rs   # Project scanning
│   │   │   ├── tools.rs      # CLI tool integration
│   │   │   └── logging.rs    # File logging
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── package.json
│   └── vite.config.ts
├── docs/TECHNICAL.md          # Detailed technical docs
├── CLAUDE.md                  # Project instructions
├── build_tauri.bat            # Build script (rust-lld)
├── build_msvc.bat             # Build script (MSVC)
└── README.md
```

</details>

---

## Contributing

Contributions are welcome. Please [open an issue](https://github.com/acaprino/anvil/issues) first to discuss what you'd like to change.

For detailed architecture and development guide, see [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Windows native, keyboard-first. Built with Tauri 2, React 19, and Rust.</sub><br>
  <sub>Anvil &mdash; where code meets the hammer.</sub>
</p>
