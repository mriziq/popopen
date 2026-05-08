const Permissions = {
  container: null,

  init(container) {
    this.container = container;
  },

  async load(skillName) {
    try {
      const [permData, skills] = await Promise.all([
        API.getPermissions(),
        API.getSkills(),
      ]);

      const skill = skills.find(s => s.name === skillName);
      const allPermissions = permData.permissions || [];
      const allowedTools = skill?.frontmatter?.['allowed-tools'] || '';
      const toolPatterns = allowedTools ? allowedTools.split(',').map(t => t.trim()) : [];

      // Match permissions to this skill
      const matched = [];
      const unmatched = [];

      for (const perm of allPermissions) {
        const parsed = this.parsePerm(perm);
        if (!parsed) continue;

        let isRelevant = false;

        // Direct skill permission
        if (parsed.type === 'Skill' && parsed.pattern === skillName) {
          isRelevant = true;
        }

        // Bash permission matching allowed-tools
        if (parsed.type === 'Bash') {
          for (const tool of toolPatterns) {
            const toolParsed = this.parsePerm(tool);
            if (toolParsed && toolParsed.type === 'Bash' && this.patternsOverlap(parsed.pattern, toolParsed.pattern)) {
              isRelevant = true;
              break;
            }
          }
        }

        if (isRelevant) {
          matched.push({ ...parsed, raw: perm });
        } else {
          unmatched.push({ ...parsed, raw: perm });
        }
      }

      this.render(skillName, matched, unmatched, toolPatterns);
    } catch (err) {
      this.container.innerHTML = `<p style="color: var(--accent); padding: 24px;">Failed to load permissions: ${err.message}</p>`;
    }
  },

  parsePerm(str) {
    const match = str.match(/^(\w+)\((.+)\)$/);
    if (!match) return null;
    return { type: match[1], pattern: match[2] };
  },

  patternsOverlap(granted, requested) {
    // Simple prefix matching with wildcard
    const gBase = granted.replace(/\*$/, '');
    const rBase = requested.replace(/\*$/, '');
    return rBase.startsWith(gBase) || gBase.startsWith(rBase);
  },

  render(skillName, matched, unmatched, toolPatterns) {
    this.container.innerHTML = `
      <div class="permissions-panel">
        <h3>Permissions for ${skillName}</h3>

        <div class="perm-section">
          <h4>Declared Tools (from SKILL.md)</h4>
          ${toolPatterns.length > 0
            ? `<div class="perm-tags">${toolPatterns.map(t => `<span class="perm-tag">${t}</span>`).join('')}</div>`
            : '<p class="perm-empty">No tools declared in frontmatter</p>'
          }
        </div>

        <div class="perm-section">
          <h4>Granted Permissions (matching this skill)</h4>
          ${matched.length > 0
            ? `<table class="perm-table">
                <thead><tr><th>Type</th><th>Pattern</th><th>Raw</th></tr></thead>
                <tbody>${matched.map(p => `<tr><td><span class="perm-type perm-type-${p.type.toLowerCase()}">${p.type}</span></td><td><code>${p.pattern}</code></td><td class="perm-raw">${p.raw}</td></tr>`).join('')}</tbody>
              </table>`
            : '<p class="perm-empty">No matching permissions found</p>'
          }
        </div>

        <div class="perm-section">
          <h4>All Other Permissions</h4>
          ${unmatched.length > 0
            ? `<table class="perm-table">
                <thead><tr><th>Type</th><th>Pattern</th></tr></thead>
                <tbody>${unmatched.map(p => `<tr><td><span class="perm-type perm-type-${p.type.toLowerCase()}">${p.type}</span></td><td><code>${p.pattern}</code></td></tr>`).join('')}</tbody>
              </table>`
            : '<p class="perm-empty">No other permissions</p>'
          }
        </div>
      </div>
    `;
  },
};
