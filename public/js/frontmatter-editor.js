const FrontmatterEditor = {
  container: null,
  skillName: null,
  frontmatter: null,
  body: null,
  onSave: null,
  onCancel: null,
  onEditPermissions: null,

  init(container) {
    this.container = container;
  },

  open(skillName, frontmatter, body, onSave, onCancel, onEditPermissions) {
    this.skillName = skillName;
    this.frontmatter = { ...frontmatter };
    this.body = body;
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.onEditPermissions = onEditPermissions;
    this.render();
  },

  render() {
    const fm = this.frontmatter || {};
    const allowedTools = fm['allowed-tools'] || '';
    const toolCount = allowedTools ? allowedTools.split(',').map(t => t.trim()).filter(Boolean).length : 0;

    this.container.innerHTML = `
      <div class="fm-editor-form">
        <h2>Edit Details: ${this.skillName}</h2>
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
          <div class="fm-perm-summary">
            <span>${toolCount === 0 ? 'No permissions declared' : `${toolCount} permission${toolCount === 1 ? '' : 's'} declared`}</span>
            <button type="button" class="btn btn-link" id="fm-edit-perms">Edit in Permissions tab →</button>
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
          <button class="btn btn-primary" id="fm-save-btn">Save Details</button>
          <button class="btn" id="fm-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // Link to Permissions tab
    const editPerms = this.container.querySelector('#fm-edit-perms');
    if (editPerms) editPerms.addEventListener('click', () => {
      if (this.onEditPermissions) this.onEditPermissions();
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
      if (allowedTools) newFm['allowed-tools'] = allowedTools;
      if (argumentHint) newFm['argument-hint'] = argumentHint;
      if (disableModel) newFm['disable-model-invocation'] = true;
      if (license) newFm.license = license;

      try {
        await API.saveFrontmatter(this.skillName, { frontmatter: newFm, body: this.body });
        if (typeof Toast !== 'undefined') Toast.success(`Details saved for <strong>${this.skillName}</strong>`);
        if (this.onSave) this.onSave();
      } catch (err) {
        if (typeof Toast !== 'undefined') Toast.error(`Failed to save details: ${err.message}`);
        else alert('Failed to save details: ' + err.message);
      }
    });

    // Cancel
    this.container.querySelector('#fm-cancel-btn').addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
    });
  },
};
