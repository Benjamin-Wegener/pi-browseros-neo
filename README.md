# pi-browseros-neo

Dedicated **BrowserOS Neo** live browser integration for **Pi Coding Agent**.

Replaces static/legacy CLI scraping solutions (like standalone `web-search`) with persistent browser sessions, live authenticated profiles, multi-step actions, and direct Model Context Protocol (MCP) tool registrations.

---

## ⚡ Overview

When an agent needs to access the web (search, read documentation, fill forms, download data, or interact with logged-in services), **BrowserOS Neo** provides a dedicated headless/headed browser environment.

### Why BrowserOS Neo?
- 🔑 **Authenticated Sessions:** Operates inside dedicated browser profiles with user logins and cookies preserved.
- ⚡ **Native MCP Tool Registration:** Auto-discovers and registers `browseros_*` tools (`browseros_read`, `browseros_grep`, `browseros_navigate`, `browseros_act`, `browseros_run`, `browseros_tabs`).
- 🧠 **Smart Memory Handling:** Pages live in memory tabs & DOM trees — preventing agents from hallucinating local `/tmp` file paths.
- 🛡️ **Graceful Lifecycle:** Automatically initializes background RPC streams and safely tears down child processes on session shutdown.

---

## 📦 Directory Structure

```
pi-browseros-neo/
├── extensions/
│   └── browseros-neo.ts       # Extension connecting Pi Coding Agent to BrowserClaw MCP Server
├── skills/
│   └── browseros-neo/
│       └── SKILL.md           # Drop-in Agent Skill definition & workflow rules
├── guidelines/
│   ├── AGENTS.md              # Global prompt guidelines for browser search & context
│   └── APPEND_SYSTEM.md       # System prompt additions for web verification
├── LICENSE
├── package.json
└── README.md
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- [BrowserOS Neo / BrowserClaw](https://browseros.com) installed on macOS
- [Pi Coding Agent](https://github.com/mariozechner/pi-coding-agent) installed

### 2. Install Extension & Skill

Clone or copy the files into your local `.pi/agent` configuration:

```bash
# 1. Clone repository
git clone https://github.com/Benjamin-Wegener/pi-browseros-neo.git /tmp/pi-browseros-neo

# 2. Copy extension
mkdir -p ~/.pi/agent/extensions
cp /tmp/pi-browseros-neo/extensions/browseros-neo.ts ~/.pi/agent/extensions/

# 3. Copy skill
mkdir -p ~/.pi/agent/skills/browseros-neo
cp /tmp/pi-browseros-neo/skills/browseros-neo/SKILL.md ~/.pi/agent/skills/browseros-neo/

# 4. (Optional) Append agent verification guidelines
cat /tmp/pi-browseros-neo/guidelines/AGENTS.md >> ~/.pi/agent/AGENTS.md
```

---

## 🛠️ Available Tools

The extension exposes the following tools to the agent:

| Tool | Description |
|---|---|
| `browseros_read` | Extract the full webpage content directly as clean Markdown |
| `browseros_grep` | Search / filter content inside the active webpage using queries |
| `browseros_navigate` | Navigate to any given URL |
| `browseros_tabs` | Manage browser tabs (list, switch, open new tabs) |
| `browseros_snapshot` | Inspect DOM element handles (`[ref=eN]`) for interaction |
| `browseros_act` | Click, type, select, or submit form elements |
| `browseros_run` | Execute complex multi-step automation chains in a single step |

---

## 📋 Agent Etiquette & Best Practices

1. **In-Memory Pages**: Browser pages exist in active browser tabs, **never** as local files on disk. Do not use `grep` or `cat` on `/tmp` or disk looking for page snapshots.
2. **Read vs Snapshot**: Prefer `browseros_read` for reading textual articles and documentation. Use `browseros_snapshot` when interactive form filling or button clicking is needed.
3. **Session Naming**: Name sessions early with `browseros_name_session` using a short descriptive label.

---

## 🤝 Contributing

Pull requests and issues are welcome! Feel free to open an issue for feature suggestions or bug reports.

## 📄 License

[MIT](LICENSE) © [Benjamin Wegener](https://github.com/Benjamin-Wegener)

---

<div align="center">
  <sub>
    <a href="https://github.com/Benjamin-Wegener/pi-browseros-neo">pi-browseros-neo</a> - 
    <a href="https://github.com/Benjamin-Wegener/pi-browseros-neo/stargazers">⭐ Star on GitHub</a> - 
    <a href="https://github.com/Benjamin-Wegener/pi-browseros-neo/issues">🐛 Issues</a>
  </sub>
</div>
