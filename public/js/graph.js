const Graph = {
  container: null,
  viewMode: 'table',

  init(container) {
    this.container = container;
  },

  async load() {
    try {
      const skills = await API.getSkills();
      this.renderGraph(skills);
    } catch (err) {
      this.container.innerHTML = `<p style="color: var(--accent); padding: 24px;">Failed to load: ${err.message}</p>`;
    }
  },

  extractTools(skills) {
    const toolMap = {};
    const allTools = new Set();

    for (const skill of skills) {
      const allowed = skill.frontmatter?.['allowed-tools'] || '';
      const tools = allowed ? allowed.split(',').map(t => t.trim()).filter(Boolean) : [];
      toolMap[skill.name] = tools;
      tools.forEach(t => allTools.add(t));
    }

    return { toolMap, allTools: [...allTools].sort() };
  },

  renderGraph(skills) {
    const { toolMap, allTools } = this.extractTools(skills);

    this.container.innerHTML = `
      <div class="graph-panel">
        <div class="graph-toolbar">
          <h2>Skill Dependency Graph</h2>
          <div class="graph-view-toggle">
            <button class="btn-sm ${this.viewMode === 'table' ? 'active' : ''}" data-mode="table">Table</button>
            <button class="btn-sm ${this.viewMode === 'svg' ? 'active' : ''}" data-mode="svg">Visual</button>
          </div>
        </div>
        <div class="graph-content"></div>
      </div>
    `;

    this.container.querySelectorAll('.graph-view-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.mode;
        this.renderGraph(skills);
      });
    });

    const content = this.container.querySelector('.graph-content');
    if (this.viewMode === 'table') {
      this.renderTable(content, skills, toolMap, allTools);
    } else {
      this.renderSvg(content, skills, toolMap, allTools);
    }
  },

  renderTable(container, skills, toolMap, allTools) {
    if (allTools.length === 0) {
      container.innerHTML = '<p class="perm-empty">No skills have declared allowed-tools</p>';
      return;
    }

    const skillsWithTools = skills.filter(s => toolMap[s.name]?.length > 0);
    const skillsWithout = skills.filter(s => !toolMap[s.name]?.length);

    container.innerHTML = `
      <table class="graph-table">
        <thead>
          <tr>
            <th>Skill</th>
            ${allTools.map(t => `<th class="tool-header" title="${t}">${this.shortenTool(t)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${skillsWithTools.map(skill => `
            <tr>
              <td class="skill-cell">${skill.name}</td>
              ${allTools.map(tool => `<td class="check-cell">${toolMap[skill.name].includes(tool) ? '<span class="check-mark">&#10003;</span>' : ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${skillsWithout.length > 0 ? `
        <div class="graph-note">
          <p>${skillsWithout.length} skill(s) have no declared tools: ${skillsWithout.map(s => s.name).join(', ')}</p>
        </div>
      ` : ''}
    `;
  },

  renderSvg(container, skills, toolMap, allTools) {
    const skillsWithTools = skills.filter(s => toolMap[s.name]?.length > 0);

    if (skillsWithTools.length === 0) {
      container.innerHTML = '<p class="perm-empty">No skills have declared allowed-tools</p>';
      return;
    }

    const leftX = 30, rightX = 500;
    const nodeH = 32, gap = 8;
    const leftCount = skillsWithTools.length;
    const rightCount = allTools.length;
    const height = Math.max(leftCount, rightCount) * (nodeH + gap) + 60;
    const nodeW = 180;

    // Colors by tool type
    const typeColors = { Bash: '#4fc3f7', Read: '#81c784', Write: '#81c784', Edit: '#81c784', Skill: '#ce93d8' };

    let svg = `<svg class="graph-svg" width="100%" height="${height}" viewBox="0 0 720 ${height}">`;

    // Draw connections first (behind nodes)
    skillsWithTools.forEach((skill, si) => {
      const sy = 30 + si * (nodeH + gap) + nodeH / 2;
      toolMap[skill.name].forEach(tool => {
        const ti = allTools.indexOf(tool);
        if (ti === -1) return;
        const ty = 30 + ti * (nodeH + gap) + nodeH / 2;
        const parsed = tool.match(/^(\w+)/);
        const color = parsed ? (typeColors[parsed[1]] || '#90a4ae') : '#90a4ae';
        svg += `<line x1="${leftX + nodeW}" y1="${sy}" x2="${rightX}" y2="${ty}" stroke="${color}" stroke-width="1.5" opacity="0.4" class="graph-line" data-skill="${skill.name}" data-tool="${tool}"/>`;
      });
    });

    // Skill nodes (left)
    skillsWithTools.forEach((skill, i) => {
      const y = 30 + i * (nodeH + gap);
      svg += `<rect x="${leftX}" y="${y}" width="${nodeW}" height="${nodeH}" rx="4" fill="var(--bg-active)" stroke="var(--border)" class="graph-node"/>`;
      svg += `<text x="${leftX + 10}" y="${y + 20}" fill="var(--text)" font-size="12" font-family="sans-serif">${skill.name}</text>`;
    });

    // Tool nodes (right)
    allTools.forEach((tool, i) => {
      const y = 30 + i * (nodeH + gap);
      const parsed = tool.match(/^(\w+)/);
      const color = parsed ? (typeColors[parsed[1]] || '#90a4ae') : '#90a4ae';
      svg += `<rect x="${rightX}" y="${y}" width="${nodeW}" height="${nodeH}" rx="4" fill="var(--bg-sidebar)" stroke="${color}" class="graph-node"/>`;
      svg += `<text x="${rightX + 10}" y="${y + 20}" fill="var(--text)" font-size="11" font-family="monospace">${this.shortenTool(tool)}</text>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;

    // Hover highlighting
    container.querySelectorAll('.graph-node').forEach(node => {
      node.addEventListener('mouseenter', () => {
        container.querySelectorAll('.graph-line').forEach(line => {
          line.setAttribute('opacity', '0.1');
        });
      });
      node.addEventListener('mouseleave', () => {
        container.querySelectorAll('.graph-line').forEach(line => {
          line.setAttribute('opacity', '0.4');
        });
      });
    });
  },

  shortenTool(tool) {
    if (tool.length <= 20) return tool;
    return tool.substring(0, 18) + '...';
  },
};
