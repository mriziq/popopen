const Permissions = {
  container: null,
  skillName: null,
  tools: [],
  denyRules: [],
  rawMode: false,
  pickerOpen: false,
  pickerSelection: new Set(),
  pickerQuery: '',

  PICKER_GROUPS: [
    {
      label: 'Files',
      items: ['Read', 'Grep', 'Glob', 'LS', 'Edit', 'Write'],
    },
    {
      label: 'Git',
      items: [
        'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)',
        'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git push:*)',
        'Bash(git pull:*)', 'Bash(git checkout:*)',
      ],
    },
    {
      label: 'NPM / Node',
      items: ['Bash(npm install:*)', 'Bash(npm run:*)', 'Bash(npm test:*)', 'Bash(npx:*)'],
    },
    {
      label: 'Shell',
      items: ['Bash(ls:*)', 'Bash(find:*)', 'Bash(cat:*)', 'Bash(echo:*)'],
    },
  ],

  PRESETS: {
    'Git workflow': ['Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)'],
    'Read-only': ['Read', 'Grep', 'Glob'],
    'npm': ['Bash(npm install:*)', 'Bash(npm run:*)', 'Bash(npm test:*)'],
  },

  init(container) {
    this.container = container;
  },

  async load(skillName) {
    this.skillName = skillName;
    this.rawMode = false;
    this.pickerOpen = false;
    try {
      const [permData, skills] = await Promise.all([API.getPermissions(), API.getSkills()]);
      const skill = skills.find(s => s.name === skillName);
      const allowedTools = skill?.frontmatter?.['allowed-tools'] || '';
      this.tools = this.parseTools(allowedTools);
      this.denyRules = permData.deny || [];
      this.render();
    } catch (err) {
      this.container.innerHTML = `<p style="color: var(--accent); padding: 24px;">Failed to load permissions: ${err.message}</p>`;
    }
  },

  parseTools(str) {
    return str ? str.split(',').map(t => t.trim()).filter(Boolean) : [];
  },

  classify(tool) {
    if (tool === '*' || tool === 'Bash' || tool === 'Bash(*)' || tool === 'Write' || tool === 'Edit') return 'danger';
    if (/^Bash\(/.test(tool)) return 'bash';
    return 'read';
  },

  conflictsWithDeny(tool) {
    return this.denyRules.some(rule => {
      if (rule === tool) return true;
      const stripWild = s => s.replace(/[:*]+\)?$/, '').replace(/\*$/, '');
      return stripWild(rule) && tool.startsWith(stripWild(rule));
    });
  },

  async save() {
    const value = this.tools.join(', ');
    try {
      await API.patchFrontmatter(this.skillName, { 'allowed-tools': value || null });
      if (typeof Sidebar !== 'undefined') Sidebar.load();
    } catch (err) {
      if (typeof Toast !== 'undefined') Toast.error(`Failed to save permissions: ${err.message}`);
      else alert('Failed to save permissions: ' + err.message);
      await this.load(this.skillName);
    }
  },

  async addTools(tools) {
    const before = this.tools.length;
    for (const t of tools) {
      if (t && !this.tools.includes(t)) this.tools.push(t);
    }
    if (this.tools.length !== before) {
      this.render();
      await this.save();
    }
  },

  async removeTool(tool) {
    const idx = this.tools.indexOf(tool);
    if (idx === -1) return;
    this.tools.splice(idx, 1);
    this.render();
    await this.save();
  },

  togglePicker() {
    this.pickerOpen = !this.pickerOpen;
    this.pickerSelection = new Set();
    this.pickerQuery = '';
    this.render();
  },

  toggleRawMode() {
    this.rawMode = !this.rawMode;
    this.pickerOpen = false;
    this.render();
  },

  async commitRaw(value) {
    this.tools = this.parseTools(value);
    this.rawMode = false;
    this.render();
    await this.save();
  },

  escape(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  },

  renderChip(tool) {
    const cls = this.classify(tool);
    const conflict = this.conflictsWithDeny(tool);
    const title = conflict ? 'Conflicts with a deny rule in settings.json' : '';
    return `<span class="tag tag--${cls}${conflict ? ' tag--conflict' : ''}" title="${this.escape(title)}">${this.escape(tool)}<button class="tag-remove" data-tool="${this.escape(tool)}" aria-label="Remove">&times;</button></span>`;
  },

  renderPicker() {
    if (!this.pickerOpen) return '';
    const q = this.pickerQuery.toLowerCase();
    const groups = this.PICKER_GROUPS.map(g => {
      const items = g.items.filter(it => !this.tools.includes(it) && (!q || it.toLowerCase().includes(q)));
      if (items.length === 0) return '';
      return `
        <div class="perm-picker-group">
          <div class="perm-picker-group-label">${g.label}</div>
          ${items.map(it => `
            <label class="perm-picker-item">
              <input type="checkbox" data-tool="${this.escape(it)}" ${this.pickerSelection.has(it) ? 'checked' : ''}>
              <span>${this.escape(it)}</span>
            </label>`).join('')}
        </div>`;
    }).join('');
    const count = this.pickerSelection.size;
    return `
      <div class="perm-picker">
        <input type="text" class="perm-picker-search" placeholder="Search…" value="${this.escape(this.pickerQuery)}">
        <div class="perm-picker-body">${groups || '<div class="perm-picker-empty">No matches</div>'}</div>
        <div class="perm-picker-actions">
          <button class="btn" data-picker-cancel>Cancel</button>
          <button class="btn btn-primary" data-picker-add ${count === 0 ? 'disabled' : ''}>Add ${count || ''}</button>
        </div>
      </div>`;
  },

  render() {
    const hasConflicts = this.tools.some(t => this.conflictsWithDeny(t));
    const chipArea = this.rawMode
      ? `<textarea class="perm-raw-input" data-raw placeholder="Read, Grep, Bash(git commit:*), Bash(npm test:*)">${this.escape(this.tools.join(', '))}</textarea>`
      : `<div class="tag-input">
          <div class="tags">${this.tools.map(t => this.renderChip(t)).join('') || '<span class="perm-empty">No permissions declared</span>'}</div>
          <button class="perm-add-btn" data-toggle-picker>+ Add permission…</button>
        </div>`;

    const hint = `<p class="perm-hint">Tool names like <code>Read</code>, <code>Grep</code>, or scoped Bash patterns like <code>Bash(git commit:*)</code>. Use <code>:*</code> to allow any arguments after the prefix.</p>`;

    this.container.innerHTML = `
      <div class="permissions-panel">
        <div class="perm-section">
          <div class="perm-section-head">
            <h4>Allowed tools for ${this.escape(this.skillName)}</h4>
            <button class="perm-mode-toggle" data-toggle-raw>${this.rawMode ? 'Chips ▾' : 'Raw text ▾'}</button>
          </div>
          ${chipArea}
          ${hint}
          ${this.renderPicker()}
        </div>

        <div class="perm-section">
          <h4>Presets</h4>
          <div class="perm-presets">
            ${Object.keys(this.PRESETS).map(name => `<button class="btn" data-preset="${this.escape(name)}">${this.escape(name)}</button>`).join('')}
          </div>
        </div>

        ${hasConflicts ? `<div class="perm-conflict">⚠ Conflicts with settings.json deny rules</div>` : ''}
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    this.container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => this.removeTool(btn.dataset.tool));
    });

    const toggleRaw = this.container.querySelector('[data-toggle-raw]');
    if (toggleRaw) toggleRaw.addEventListener('click', () => this.toggleRawMode());

    const togglePicker = this.container.querySelector('[data-toggle-picker]');
    if (togglePicker) togglePicker.addEventListener('click', () => this.togglePicker());

    this.container.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => this.addTools(this.PRESETS[btn.dataset.preset]));
    });

    const rawInput = this.container.querySelector('[data-raw]');
    if (rawInput) {
      rawInput.focus();
      rawInput.addEventListener('blur', () => this.commitRaw(rawInput.value));
    }

    const search = this.container.querySelector('.perm-picker-search');
    if (search) {
      search.focus();
      search.addEventListener('input', () => {
        const pos = search.selectionStart;
        this.pickerQuery = search.value;
        this.render();
        const next = this.container.querySelector('.perm-picker-search');
        if (next) next.setSelectionRange(pos, pos);
      });
    }

    this.container.querySelectorAll('.perm-picker-item input').forEach(cb => {
      cb.addEventListener('change', () => {
        const t = cb.dataset.tool;
        if (cb.checked) this.pickerSelection.add(t); else this.pickerSelection.delete(t);
        this.render();
      });
    });

    const cancel = this.container.querySelector('[data-picker-cancel]');
    if (cancel) cancel.addEventListener('click', () => this.togglePicker());

    const add = this.container.querySelector('[data-picker-add]');
    if (add) add.addEventListener('click', () => {
      const tools = Array.from(this.pickerSelection);
      this.pickerOpen = false;
      this.addTools(tools);
    });
  },
};
