# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individual developers managing skills across several coding agents. They need to find, understand, and edit skills across sources, and move selected skills between computers.

## Product Purpose

Popopen helps developers browse, understand, edit, and manage coding-agent skills. Success means a developer can find the right skill, make a change confidently, and carry skills to another computer with a simple handoff to an agent.

## Positioning

Popopen is a local visual workspace for managing skills across coding agents, with a portable backpack for moving selected skill copies between machines.

## Operating Context

Popopen runs a local web server and opens in the developer’s browser. Skills are files on the developer’s computer. A portability workflow should let the user download a bundle, move it to another computer, and point an agent at it to install or set up the skills.

## Capabilities and Constraints

- The viewer discovers global, project, and configured external skill folders for Claude Code, Codex, OpenCode, Hermes, and Pi. Shared folders are represented once with all supported agents listed; same-named copies remain separate instances.
- Current capabilities include source-aware browsing of discovered skill files, rendered previews for Markdown files, Markdown editing, frontmatter and permission editing, sidebar filtering by skill metadata and source, dashboard analytics, bulk operations, backpack ZIP export, Claude CLI update checks for eligible installed skills, and uninstall.
- Backpack export preserves each selected skill folder under a unique archive path and includes a manifest plus agent setup instructions. The receiving agent can install the skills without Popopen installed.
- V1 portability uses direct agent setup from the backpack; Popopen has no separate import screen.
- The receiving agent should ask before replacing a same-named skill already at the destination; never overwrite silently.
- The main library should lead on first open; make Backpack easy to find as a secondary action.
- First-class viewer and backpack targets selected by the user: Claude Code, Codex, OpenCode, Hermes, and Pi.
- The viewer scans documented global and project skill locations. Hermes external directories are read from `~/.hermes/config.yaml`; Popopen marks project skills as untrusted unless the current project is listed in Hermes trust settings. Project discovery disabled in Hermes config is shown as unavailable.
- Group same-named skills in the library, while showing each distinct on-disk instance and its agent/location.
- Backpack export selects individual instances; include each selected copy distinctly without merging it into another copy.
- These agents use different discovery paths: Claude Code `.claude/skills`; Codex `.agents/skills`; OpenCode `.opencode/skills`; Hermes `.hermes/skills` or `.agents/skills`; Pi `.pi/skills`. Compatible shared paths are included where each agent documents them.
- Destination setup instructions list common paths and require the agent to ask before replacing an existing skill.

## Brand Commitments

The product name is Popopen. Use a plain-spoken, calm, precise voice without hype; explain unfamiliar skill terms in context.

## Evidence on Hand

- Existing implementation: `server/lib/scanner.js`, `server/routes/bulk.js`, and `public/`.
- Existing product overview and capability claims: `README.md`.
- No customer interviews, testimonials, adoption metrics, or other external validation are present in the repository.

## Product Principles

- Make each skill copy's source and agent availability visible.
- Let developers inspect and edit the skill files they already use.
- Make portability feel like a simple file handoff that works on another computer.
- Describe agent compatibility accurately and make setup steps clear.
