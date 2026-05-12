# Popopen

A local web UI for browsing, editing, and managing [Claude Code](https://claude.ai/code) skills. Run one command to pop open a visual interface for everything in your `~/.claude/skills/` directory.

## Install

```bash
npm install -g popopen
```

**Requirements:** Node.js 18+

## Usage

```bash
popopen
```

Starts the server on `http://localhost:3377` and opens it in your browser. If already running, the command reopens the browser without starting a second instance.

To use a different port:

```bash
PORT=4000 popopen
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

Popopen is a local Express server that reads from `~/.claude/skills/` (custom skills) and `~/.agents/skills/` (skills installed via the Claude Code CLI). All data stays on your machine — nothing is sent to any external service except GitHub API calls for the update checker.

The server binds to `127.0.0.1` only and is not accessible from other machines on your network.

Analytics are stored in `~/.popopen/analytics.json`.

## Local Development

Clone the repo and install dependencies:

```bash
git clone https://github.com/mriziq/popopen.git
cd popopen
npm install
```

Start the dev server:

```bash
npm run dev
```

This starts the Express server at `http://localhost:3377`. The server watches for file changes in `~/.claude/skills/` via SSE — refresh the browser to pick up UI changes during development (no hot reload).

To test against a different skills directory, set `SKILLS_DIR` and `AGENTS_DIR` before starting:

```bash
SKILLS_DIR=~/my-test-skills npm run dev
```

The entry point is `server/index.js`. Static assets are served from `public/`. All routes live under `server/routes/`.

## Uninstall

```bash
npm uninstall -g popopen
```
