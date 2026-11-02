const Bulk = {
  selectedSkills: new Set(),
  actionBar: null,

  init() {
    // Create floating action bar
    this.actionBar = document.createElement('div');
    this.actionBar.className = 'bulk-bar hidden';
    this.actionBar.innerHTML = `
      <span class="bulk-count"></span>
      <button class="btn-sm" id="bulk-enable">Enable All</button>
      <button class="btn-sm" id="bulk-disable">Disable All</button>
      <button class="btn-sm" id="bulk-export">Create backpack</button>
      <button class="btn-sm" id="bulk-compare">Compare Tools</button>
      <button class="btn-sm" id="bulk-clear">Clear</button>
    `;
    document.body.appendChild(this.actionBar);

    this.actionBar.querySelector('#bulk-enable').addEventListener('click', () => this.bulkToggle(false));
    this.actionBar.querySelector('#bulk-disable').addEventListener('click', () => this.bulkToggle(true));
    this.actionBar.querySelector('#bulk-export').addEventListener('click', () => this.openBackpack());
    this.actionBar.querySelector('#bulk-compare').addEventListener('click', () => this.compareTools());
    this.actionBar.querySelector('#bulk-clear').addEventListener('click', () => {
      this.selectedSkills.clear();
      this.renderActionBar();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    });
  },

  toggle(skillName) {
    if (this.selectedSkills.has(skillName)) {
      this.selectedSkills.delete(skillName);
    } else {
      this.selectedSkills.add(skillName);
    }
    this.renderActionBar();
  },

  renderActionBar() {
    if (!this.actionBar) return;
    if (this.selectedSkills.size === 0) {
      this.actionBar.classList.add('hidden');
      return;
    }
    this.actionBar.classList.remove('hidden');
    this.actionBar.querySelector('.bulk-count').textContent = `${this.selectedSkills.size} ${this.selectedSkills.size === 1 ? 'skill copy' : 'skill copies'} selected`;
  },

  async bulkToggle(disableValue) {
    const skills = [...this.selectedSkills];
    try {
      await API.bulkToggle(skills, 'disable-model-invocation', disableValue);
      if (typeof Dashboard !== 'undefined') await Dashboard.load();
    } catch (err) {
      alert('Bulk toggle failed: ' + err.message);
    }
  },

  openBackpack() {
    if (typeof Backpack !== 'undefined') Backpack.open();
  },

  async compareTools() {
    const skills = [...this.selectedSkills];
    try {
      const data = await API.bulkCompareTools(skills);
      // Show in a modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Tool Comparison</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <table class="perm-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  ${skills.map(id => `<th>${data.skills[id]?.name || 'Skill'}<br><small>${data.skills[id]?.sourcePath || ''}</small></th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.allTools.map(tool => `
                  <tr>
                    <td><code>${tool}</code></td>
                    ${skills.map(id => `<td class="check-cell">${data.skills[id]?.tools.includes(tool) ? '<span class="check-mark">&#10003;</span>' : ''}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${data.allTools.length === 0 ? '<p class="perm-empty">None of the selected skills have declared tools</p>' : ''}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    } catch (err) {
      alert('Comparison failed: ' + err.message);
    }
  },
};
