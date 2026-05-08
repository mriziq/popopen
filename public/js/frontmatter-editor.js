const FrontmatterEditor = {
  container: null,
  skillName: null,
  frontmatter: null,
  body: null,
  onSave: null,
  onCancel: null,

  init(container) {
    this.container = container;
  },

  open(skillName, frontmatter, body, onSave, onCancel) {
    this.skillName = skillName;
    this.frontmatter = { ...frontmatter };
    this.body = body;
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.render();
  },

  render() {
    const fm = this.frontmatter || {};
    const allowedTools = fm['allowed-tools'] || '';
    const tags = allowedTools ? allowedTools.split(',').map(t => t.trim()).filter(Boolean) : [];

    this.container.innerHTML = `
      <div class="fm-editor-form">
        <h2>Edit Frontmatter: ${this.skillName}</h2>
        <div class="fm-field">
          <label>Name</label>
          <input type="text" id="fm-name" value="${fm.name || ''}">
        </div>
        <div class="fm-field">
          <label>Description</label>
          <textarea id="fm-description" rows="4">${fm.description || ''}</textarea>
        </div>
        <div class="fm-field">
          <label>Allowed Tools</label>
          <div class="tag-input" id="fm-tools-container">
            <div class="tags">
              ${tags.map(tag => `<span class="tag">${tag}<button class="tag-remove" data-tag="${tag}">&times;</button></span>`).join('')}
            </div>
            <input type="text" class="tag-text-input" id="fm-tool-input" placeholder="Add tool (e.g. Bash(cmd:*)) and press Enter">
          </div>
        </div>
        <div class="fm-field">
          <label>Argument Hint</label>
          <input type="text" id="fm-argument-hint" value="${fm['argument-hint'] || ''}" placeholder="e.g. [ENG-NNN]">
        </div>
        <div class="fm-field">
          <label>Disable Model Invocation</label>
          <label class="toggle-switch">
            <input type="checkbox" id="fm-disable-model" ${fm['disable-model-invocation'] ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="fm-field">
          <label>License</label>
          <input type="text" id="fm-license" value="${fm.license || ''}" placeholder="e.g. MIT">
        </div>
        <div class="fm-actions">
          <button class="btn btn-primary" id="fm-save-btn">Save Frontmatter</button>
          <button class="btn" id="fm-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // Tag removal
    this.container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const idx = tags.indexOf(tag);
        if (idx > -1) tags.splice(idx, 1);
        this.frontmatter['allowed-tools'] = tags.join(', ');
        this.render();
      });
    });

    // Tag addition
    const toolInput = this.container.querySelector('#fm-tool-input');
    toolInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && toolInput.value.trim()) {
        e.preventDefault();
        tags.push(toolInput.value.trim());
        this.frontmatter['allowed-tools'] = tags.join(', ');
        this.render();
      }
    });

    // Save
    this.container.querySelector('#fm-save-btn').addEventListener('click', async () => {
      const newFm = {};
      const name = this.container.querySelector('#fm-name').value.trim();
      const description = this.container.querySelector('#fm-description').value.trim();
      const argumentHint = this.container.querySelector('#fm-argument-hint').value.trim();
      const disableModel = this.container.querySelector('#fm-disable-model').checked;
      const license = this.container.querySelector('#fm-license').value.trim();

      if (name) newFm.name = name;
      if (description) newFm.description = description;
      if (tags.length > 0) newFm['allowed-tools'] = tags.join(', ');
      if (argumentHint) newFm['argument-hint'] = argumentHint;
      if (disableModel) newFm['disable-model-invocation'] = true;
      if (license) newFm.license = license;

      try {
        await API.saveFrontmatter(this.skillName, { frontmatter: newFm, body: this.body });
        if (this.onSave) this.onSave();
      } catch (err) {
        alert('Failed to save frontmatter: ' + err.message);
      }
    });

    // Cancel
    this.container.querySelector('#fm-cancel-btn').addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
    });
  },
};
