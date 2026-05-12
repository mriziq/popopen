const FILE_ICONS = {
  md: '&#128221;',
  json: '&#128295;',
  js: '&#128187;',
  ts: '&#128187;',
  py: '&#128187;',
};
const DEFAULT_FILE_ICON = '&#128196;';
const SKILL_MD = 'SKILL.md';

function iconForFile(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || DEFAULT_FILE_ICON;
}

function sortSkillFiles(files) {
  return [...files].sort((a, b) => {
    if (a === SKILL_MD) return -1;
    if (b === SKILL_MD) return 1;
    return a.localeCompare(b);
  });
}

function getSkillScope(skill) {
  return skill.scope || (skill.isSymlink ? 'installed' : 'custom');
}

const Sidebar = {
  container: null,
  skills: [],
  filteredSkills: [],
  onFileSelect: null,
  onViewChange: null,
  activeFile: null,
  currentView: 'welcome',

  init(container, onFileSelect, onViewChange) {
    this.container = container;
    this.onFileSelect = onFileSelect;
    this.onViewChange = onViewChange;
  },

  async load() {
    this.skills = await API.getSkills();
    this.filteredSkills = this.skills;
    this.render();
    this.updateLocalLocationVisibility();
  },

  updateLocalLocationVisibility() {
    const hasLocal = this.skills.some(s => s.location === 'local');
    const localPill = document.querySelector('[data-filter="localLocation"]');
    const locationRow = document.querySelector('.filter-pills-location');
    if (locationRow) locationRow.style.display = hasLocal ? '' : 'none';
    if (localPill) localPill.disabled = !hasLocal;
  },

  applyFilters(query, filters) {
    this.filteredSkills = Search.filterSkills(this.skills, query, filters);
    this.render();
  },

  buildFolderHeader(skill) {
    const header = document.createElement('div');
    header.className = 'skill-folder-header';

    const disabledByModel = skill.frontmatter && skill.frontmatter['disable-model-invocation'];
    const scope = getSkillScope(skill);
    const location = skill.location || 'global';
    const scopeTitle = scope === 'installed' ? 'Installed from remote source' : 'Custom / user-created';
    const scopeLabel = scope === 'installed' ? 'IN' : 'CU';
    const toggleTitle = disabledByModel ? 'Model invocation disabled' : 'Model invocation enabled';
    const toggleIcon = disabledByModel ? '&#9676;' : '&#9679;';

    header.innerHTML = `
      <span class="chevron">&#9654;</span>
      <span class="folder-icon">&#128193;</span>
      <span class="skill-name-label">${skill.name}</span>
      <span class="scope-badge scope-badge-${scope}" title="${scopeTitle}">${scopeLabel}</span>
      ${location === 'local' ? `<span class="scope-badge scope-badge-local" title="Project-local skill — only active in this project">LO</span>` : ''}
      <span class="quick-toggle ${disabledByModel ? 'off' : 'on'}" title="${toggleTitle}">
        ${toggleIcon}
      </span>
    `;

    return { header, disabledByModel };
  },

  buildFileItem(skill, file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'skill-file';
    const filePath = `${skill.name}/${file}`;
    fileItem.dataset.path = filePath;
    fileItem.innerHTML = `<span class="file-icon">${iconForFile(file)}</span><span>${file}</span>`;

    fileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setActive(filePath);
      if (this.onFileSelect) this.onFileSelect(filePath, skill);
    });

    return fileItem;
  },

  attachToggleHandler(toggleBtn, skill, disabledByModel) {
    toggleBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await API.patchFrontmatter(skill.name, { 'disable-model-invocation': !disabledByModel });
        await this.load();
      } catch (err) {
        console.error('Failed to toggle:', err);
      }
    });
  },

  attachHeaderToggle(header, fileList) {
    header.addEventListener('click', () => {
      const chevron = header.querySelector('.chevron');
      const isOpen = fileList.classList.toggle('open');
      chevron.classList.toggle('open', isOpen);
    });
  },

  renderSkillFolder(skill) {
    const folder = document.createElement('div');
    folder.className = 'skill-folder';

    const { header, disabledByModel } = this.buildFolderHeader(skill);

    const fileList = document.createElement('div');
    fileList.className = 'skill-files';
    sortSkillFiles(skill.files).forEach(file => {
      fileList.appendChild(this.buildFileItem(skill, file));
    });

    this.attachToggleHandler(header.querySelector('.quick-toggle'), skill, disabledByModel);
    this.attachHeaderToggle(header, fileList);

    folder.appendChild(header);
    folder.appendChild(fileList);
    return folder;
  },

  render() {
    this.container.innerHTML = '';
    for (const skill of this.filteredSkills) {
      this.container.appendChild(this.renderSkillFolder(skill));
    }
  },

  setActive(filePath) {
    this.activeFile = filePath;
    this.container.querySelectorAll('.skill-file').forEach(el => {
      el.classList.toggle('active', el.dataset.path === filePath);
    });
  },

  toggleAllFolders(btn) {
    const fileLists = this.container.querySelectorAll('.skill-files');
    const anyOpen = [...fileLists].some(el => el.classList.contains('open'));
    const shouldOpen = !anyOpen;

    fileLists.forEach(el => el.classList.toggle('open', shouldOpen));
    this.container.querySelectorAll('.chevron').forEach(el => el.classList.toggle('open', shouldOpen));

    btn.title = anyOpen ? 'Expand all' : 'Collapse all';
    btn.innerHTML = anyOpen
      ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3l4 5H4zM8 13l4-5H4z"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h12v1.5H2zM2 9.5h12V11H2z"/></svg>`;
  },

  expandSkill(skillName) {
    const folders = this.container.querySelectorAll('.skill-folder');
    for (const folder of folders) {
      const name = folder.querySelector('.skill-name-label').textContent;
      if (name !== skillName) continue;
      folder.querySelector('.skill-files').classList.add('open');
      folder.querySelector('.chevron').classList.add('open');
      return;
    }
  },
};
