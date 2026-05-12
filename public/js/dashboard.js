const Dashboard = {
  container: null,
  skills: [],
  sortBy: 'name',
  onFileSelect: null,
  analytics: null,

  init(container, onFileSelect) {
    this.container = container;
    this.onFileSelect = onFileSelect;
  },

  async load() {
    try {
      const [dashData, analyticsData] = await Promise.all([
        API.getDashboard(),
        API.getAnalytics(),
      ]);
      this.skills = dashData.skills;
      this.analytics = analyticsData.skills;
      this.render();
      this.checkUpdatesInBackground();
    } catch (err) {
      this.container.innerHTML = `<p style="color: var(--red); padding: 48px;">Failed to load dashboard: ${err.message}</p>`;
    }
  },

  checkUpdatesInBackground() {
    const updatable = this.skills.filter(s => s.scope === 'installed' && s.sourceUrl && s.skillFolderHash);
    updatable.forEach(skill => {
      API.checkUpdate(skill.name)
        .then(result => {
          if (result.updateAvailable) this.markCardUpdatable(skill.name);
        })
        .catch(() => {});
    });
  },

  markCardUpdatable(skillName) {
    const card = this.container.querySelector(`.skill-card[data-skill="${skillName}"]`);
    if (!card) return;

    const badges = card.querySelector('.card-badges');
    if (badges && !badges.querySelector('.badge-update')) {
      badges.insertAdjacentHTML('beforeend', '<span class="badge badge-update">update available</span>');
    }

    const footer = card.querySelector('.card-footer');
    if (footer && !footer.querySelector('.card-update-btn')) {
      const btn = document.createElement('button');
      btn.className = 'card-update-btn btn-sm btn-primary-sm';
      btn.textContent = 'Update';
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        btn.textContent = 'Updating…';
        btn.disabled = true;
        try {
          await API.applyUpdate(skillName);
          await this.load();
        } catch (err) {
          btn.textContent = 'Failed';
          btn.disabled = false;
          console.error('Update failed:', err);
        }
      });
      footer.insertBefore(btn, footer.querySelector('.card-view-btn'));
    }
  },

  sortSkills(skills) {
    return [...skills].sort((a, b) => {
      if (this.sortBy === 'name') return a.name.localeCompare(b.name);
      if (this.sortBy === 'scope') return (a.scope || '').localeCompare(b.scope || '');
      if (this.sortBy === 'installed') return (b.installedAt || '').localeCompare(a.installedAt || '');
      if (this.sortBy === 'updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      return 0;
    });
  },

  formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  render() {
    const sorted = this.sortSkills(this.skills);
    const selectedCount = typeof Bulk !== 'undefined' ? Bulk.selectedSkills.size : 0;
    const installedCount = this.skills.filter(s => s.scope === 'installed').length;
    const customCount = this.skills.filter(s => s.scope === 'custom').length;

    this.container.innerHTML = `
      <div class="dashboard-toolbar">
        <div class="dashboard-title-row">
          <h2>Skills Dashboard</h2>
          <div class="scope-summary">
            <span class="scope-count scope-count-installed">${installedCount} installed</span>
            <span class="scope-divider">/</span>
            <span class="scope-count scope-count-custom">${customCount} custom</span>
          </div>
        </div>
        <div class="dashboard-controls">
          <select class="sort-select">
            <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name</option>
            <option value="scope" ${this.sortBy === 'scope' ? 'selected' : ''}>Scope</option>
            <option value="installed" ${this.sortBy === 'installed' ? 'selected' : ''}>Install Date</option>
            <option value="updated" ${this.sortBy === 'updated' ? 'selected' : ''}>Updated</option>
          </select>
          ${selectedCount > 0 ? `<span class="selection-count">${selectedCount} selected</span>` : ''}
        </div>
      </div>
      <div class="dashboard-grid">
        ${sorted.map(skill => this.renderCard(skill)).join('')}
      </div>
    `;

    // Sort handler
    this.container.querySelector('.sort-select').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    // Make entire card clickable to open skill
    this.container.querySelectorAll('.skill-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-checkbox') || e.target.closest('.card-toggle') ||
            e.target.closest('.card-view-btn') || e.target.closest('.card-uninstall')) return;
        const skillName = card.dataset.skill;
        const filePath = `${skillName}/SKILL.md`;
        const skill = this.skills.find(s => s.name === skillName);
        if (this.onFileSelect && skill) {
          this.onFileSelect(filePath, skill);
        }
      });
    });

    // Card view button
    this.container.querySelectorAll('.card-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const skillName = btn.dataset.skill;
        const filePath = `${skillName}/SKILL.md`;
        const skill = this.skills.find(s => s.name === skillName);
        if (this.onFileSelect && skill) {
          this.onFileSelect(filePath, skill);
        }
      });
    });

    // Quick toggle handlers
    this.container.querySelectorAll('.card-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skillName = btn.dataset.skill;
        const current = btn.dataset.disabled === 'true';
        try {
          await API.patchFrontmatter(skillName, { 'disable-model-invocation': !current });
          await this.load();
        } catch (err) {
          console.error('Toggle failed:', err);
        }
      });
    });

    // Uninstall handlers
    this.container.querySelectorAll('.card-uninstall').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skillName = btn.dataset.skill;
        await this.showUninstallConfirm(skillName);
      });
    });

    // Bulk checkboxes
    this.container.querySelectorAll('.card-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (typeof Bulk !== 'undefined') {
          Bulk.toggle(cb.dataset.skill);
          this.render();
        }
      });
    });

    if (typeof Bulk !== 'undefined') Bulk.renderActionBar();
  },

  async showUninstallConfirm(skillName) {
    try {
      const preview = await API.uninstallPreview(skillName);

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-content uninstall-modal">
          <div class="modal-header">
            <h3>Uninstall Skill</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="uninstall-warning">
              <div class="uninstall-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2">
                  <path d="M12 2L2 22h20L12 2z"/><path d="M12 10v4M12 18h.01"/>
                </svg>
              </div>
              <div class="uninstall-info">
                <p class="uninstall-name">${preview.skill}</p>
                <span class="badge badge-scope-${preview.scope}">${preview.scope}</span>
              </div>
            </div>
            <div class="uninstall-details">
              <p class="uninstall-label">This will remove:</p>
              <ul class="uninstall-list">
                ${preview.willRemove.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="uninstall-actions">
              <button class="btn" id="uninstall-cancel-btn">Cancel</button>
              <button class="btn btn-danger" id="uninstall-confirm-btn">Uninstall</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#uninstall-cancel-btn').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      overlay.querySelector('#uninstall-confirm-btn').addEventListener('click', async () => {
        const btn = overlay.querySelector('#uninstall-confirm-btn');
        btn.textContent = 'Removing...';
        btn.disabled = true;
        try {
          await API.uninstallSkill(skillName);
          overlay.remove();
          await this.load();
        } catch (err) {
          btn.textContent = 'Failed: ' + err.message;
          btn.disabled = false;
        }
      });
    } catch (err) {
      alert('Failed to preview uninstall: ' + err.message);
    }
  },

  renderCard(skill) {
    const stats = this.analytics && this.analytics[skill.name];
    const viewCount = stats ? stats.views : 0;
    const disabled = skill.frontmatter && skill.frontmatter['disable-model-invocation'];
    const isSelected = typeof Bulk !== 'undefined' && Bulk.selectedSkills.has(skill.name);
    const scope = skill.scope || (skill.isSymlink ? 'installed' : 'custom');

    return `
      <div class="skill-card" data-skill="${skill.name}">
        <div class="card-scope-indicator scope-${scope}"></div>
        <div class="card-header">
          <input type="checkbox" class="card-checkbox" data-skill="${skill.name}" ${isSelected ? 'checked' : ''}>
          <h3>${skill.name}</h3>
          <div class="card-badges">
            <span class="badge badge-scope-${scope}">${scope === 'installed' ? 'installed' : 'custom'}</span>
            ${disabled ? '<span class="badge badge-disabled">disabled</span>' : ''}
            ${skill.hasGit ? '<span class="badge badge-git">git</span>' : ''}
          </div>
        </div>
        <div class="card-body">
          <p class="card-description">${skill.description ? skill.description.substring(0, 120) + (skill.description.length > 120 ? '...' : '') : 'No description'}</p>
          <div class="card-meta">
            ${scope === 'installed' && skill.source ? `<span class="meta-source">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
              ${skill.source}</span>` : `<span class="meta-local">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l1.122 1.12A1.5 1.5 0 009.62 4H13.5A1.5 1.5 0 0115 5.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z"/></svg>
              user-created</span>`}
            <span>Files: ${skill.fileCount || skill.files.length}</span>
            ${skill.installedAt ? `<span>Added: ${this.formatDate(skill.installedAt)}</span>` : ''}
            ${viewCount > 0 ? `<span>Views: ${viewCount}</span>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <button class="card-toggle btn-sm" data-skill="${skill.name}" data-disabled="${!!disabled}">
            ${disabled ? 'Enable' : 'Disable'}
          </button>
          <button class="card-view-btn btn-sm btn-primary-sm" data-skill="${skill.name}">View</button>
          <button class="card-uninstall btn-sm btn-danger-sm" data-skill="${skill.name}" title="Uninstall ${skill.name}">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
          </button>
        </div>
      </div>
    `;
  },
};
