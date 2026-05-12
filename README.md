<div align="center">

<img src="public/logo.png" alt="Popopen" width="280" />

<p>A visual UI for browsing, editing, and managing coding agent skills.<br/>Anywhere, anytime — just run <code>popopen</code>.</p>

[![npm version](https://img.shields.io/npm/v/popopen?style=flat-square&color=007AFF)](https://www.npmjs.com/package/popopen)
[![npm downloads](https://img.shields.io/npm/dm/popopen?style=flat-square&color=5856D6)](https://www.npmjs.com/package/popopen)
[![License: ISC](https://img.shields.io/badge/license-ISC-34C759?style=flat-square)](LICENSE)
[![Node.js ≥18](https://img.shields.io/badge/node-%E2%89%A518-FF9F0A?style=flat-square)](https://nodejs.org)

</div>

---

## Install

```bash
npm install -g popopen
```

**Requirements:** Node.js 18+

## Usage

```bash
popopen
```

That's it. Run it from any directory, any time — Popopen opens in your browser instantly. If it's already running, it just pops the tab back up. No setup, no config, no arguments required.

```bash
PORT=4000 popopen   # use a different port
```

## Features

- **Browse & edit skills** — view all installed and custom skills, edit markdown files with live preview
- **Frontmatter editor** — toggle skill settings (`disable-model-invocation`, descriptions, etc.) without touching raw YAML
- **Search** — full-text search across all skill files
- **Dashboard** — usage analytics (views, edits, saves) tracked locally
- **Version history** — per-skill git log and the ability to initialize git tracking on any skill
- **Bulk operations** — batch toggle frontmatter fields, export skills as a ZIP
- **Update checker** — compares installed skill folder hashes against their GitHub source and applies updates via the Claude Code CLI
- **Uninstall** — remove installed or custom skills from the UI

## How it works

Popopen is a local Express server that reads from `~/.claude/skills/` (custom skills) and `~/.agents/skills/` (agent-installed skills). It works with any coding agent that follows the skills convention. All data stays on your machine — nothing is sent to any external service except GitHub API calls for the update checker.

The server binds to `127.0.0.1` only and is not accessible from other machines on your network.

Analytics are stored in `~/.popopen/analytics.json`.

## Local Development

```bash
git clone https://github.com/mriziq/popopen.git
cd popopen
npm install
npm run dev
```

Starts the Express server at `http://localhost:3377`. Refresh the browser to pick up UI changes during development.

To test against a different skills directory:

```bash
SKILLS_DIR=~/my-test-skills npm run dev
```

The entry point is `server/index.js`. Static assets are served from `public/`. All routes live under `server/routes/`.

## Uninstall

```bash
npm uninstall -g popopen
```

---

<div align="center">
<sub>Built for coding agents · <a href="https://github.com/mriziq/popopen/releases">Changelog</a> · <a href="docs/releasing.md">Contributing</a></sub>
</div>
