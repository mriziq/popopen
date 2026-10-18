# Skill library and backpack

## Job and audience

Individual developers manage skills across Claude Code, Codex, OpenCode, Hermes, and Pi. They need to find, understand, and edit a skill across global and project sources, then move selected instances between computers.

## Outcome and product truth

Open directly to the skill library. Group same-named skills while keeping each on-disk instance distinct and labeled by agent and source scope. Let the developer inspect and edit the exact instance they chose.

The Backpack exports selected instances as an ordinary ZIP with their original files preserved and a concise agent-readable inventory and installation guide. The receiving agent installs to its own supported location without Popopen. It asks before replacing an existing skill with the same name.

## Direction and interaction

Keep the incumbent Popopen visual identity. Make the library the primary surface, with clear search and agent/scope wayfinding. Expose each group's instances without implying that separate copies stay synchronized. Keep Backpack visible from the library and select exact instances for export.

Use a plain-spoken, calm, precise voice without hype. Explain unfamiliar skill terms in context.

## Scope and constraints

- Web app running locally for individual developers.
- Scan documented global/project locations for the five selected agents. Read configured Hermes external directories; distinguish project skills from trusted/loaded availability.
- Preserve current editing, frontmatter, permissions, dashboard, update, and uninstall capabilities while making instance-targeted operations unambiguous.
- No separate Popopen import screen in v1; import is handled by the receiving agent from the backpack file.
- Do not silently merge same-named skill instances or overwrite a destination skill.
- Code-first implementation.
