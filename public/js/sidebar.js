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

function escapeSkillText(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
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
    const hasLocal = this.skills.some(s => s.location === 'project');
    const hasExternal = this.skills.some(s => s.location === 'external');
    const localPill = document.querySelector('[data-filter="projectLocation"]');
    const locationRow = document.querySelector('.filter-pills-location');
    if (locationRow) locationRow.style.display = (hasLocal || hasExternal || this.skills.length > 0) ? '' : 'none';
    if (localPill) localPill.disabled = !hasLocal;
    const externalPill = document.querySelector('[data-filter="externalLocation"]');
    if (externalPill) externalPill.disabled = !hasExternal;
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
    const scopeTitle = scope === 'installed' ? 'Installed from remote source' : 'Skill folder';
    const scopeLabel = scope === 'installed' ? 'INSTALLED' : scope === 'custom' ? 'CUSTOM' : 'LINKED';
    const sourceTitle = (skill.discoveryPaths || [{ path: skill.sourcePath }])
      .map(source => source.path)
      .join('\n');
    const toggleTitle = disabledByModel ? 'Model invocation disabled' : 'Model invocation enabled';
    const toggleIcon = disabledByModel ? '&#9676;' : '&#9679;';
    const locationLabel = skill.location === 'project' ? 'PROJECT' : skill.location === 'external' ? 'EXTERNAL' : 'GLOBAL';
    const agents = (skill.agents || []).join(', ');

    header.innerHTML = `
      <span class="chevron">&#9654;</span>
      <span class="folder-icon">&#128193;</span>
      <span class="skill-name-label">${escapeSkillText(skill.name)}</span>
      <span class="scope-badge scope-badge-${scope}" title="${scopeTitle}">${scopeLabel}</span>
      <span class="scope-badge scope-badge-local" title="${escapeSkillText(sourceTitle)}">${locationLabel}</span>
      <span class="instance-agents" title="Available to: ${escapeSkillText(agents)}">${escapeSkillText(agents || 'Unknown agent')}</span>
      ${skill.hermesStatus === 'untrusted' ? '<span class="scope-badge" title="Hermes needs the user to trust this project before loading its project skills">HERMES UNTRUSTED</span>' : ''}
      ${skill.hermesStatus === 'discovery-disabled' ? '<span class="scope-badge" title="Project skill discovery is disabled in Hermes configuration">HERMES DISABLED</span>' : ''}
      <input class="instance-select" data-instance-id="${skill.id}" type="checkbox" aria-label="Select this skill copy for backpack export" title="Select for backpack" ${Bulk.selectedSkills.has(skill.id) ? 'checked' : ''}>
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
    fileItem.dataset.instanceId = skill.id;
    fileItem.innerHTML = `<span class="file-icon">${iconForFile(file)}</span><span>${escapeSkillText(file)}</span>`;

    fileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setActive(filePath, skill.id);
      if (this.onFileSelect) this.onFileSelect(filePath, skill);
    });

    return fileItem;
  },

  attachToggleHandler(toggleBtn, skill, disabledByModel) {
    toggleBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await API.patchFrontmatter(skill.id, { 'disable-model-invocation': !disabledByModel });
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
    header.querySelector('.instance-select').addEventListener('click', event => event.stopPropagation());
    header.querySelector('.instance-select').addEventListener('change', event => {
      Bulk.toggle(skill.id);
      event.stopPropagation();
    });
    this.attachHeaderToggle(header, fileList);

    folder.appendChild(header);
    folder.appendChild(fileList);
    return folder;
  },

  render() {
    this.container.innerHTML = '';
    const groups = new Map();
    for (const skill of this.filteredSkills) {
      if (!groups.has(skill.name)) groups.set(skill.name, []);
      groups.get(skill.name).push(skill);
    }
    for (const [name, instances] of groups) {
      const group = document.createElement('section');
      group.className = 'skill-group';
      if (instances.length > 1) {
        const label = document.createElement('div');
        label.className = 'skill-group-label';
        label.innerHTML = `<span>${escapeSkillText(name)}</span><small>${instances.length} copies</small>`;
        group.appendChild(label);
      }
      for (const skill of instances) group.appendChild(this.renderSkillFolder(skill));
      this.container.appendChild(group);
    }
  },

  setActive(filePath, instanceId) {
    this.activeFile = filePath;
    this.container.querySelectorAll('.skill-file').forEach(el => {
      el.classList.toggle('active', el.dataset.path === filePath && (!instanceId || el.dataset.instanceId === instanceId));
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

  expandSkill(skillName, instanceId) {
    const folders = this.container.querySelectorAll('.skill-folder');
    for (const folder of folders) {
      const name = folder.querySelector('.skill-name-label').textContent;
      if (name !== skillName) continue;
      if (instanceId && folder.querySelector('.instance-select')?.dataset.instanceId !== instanceId) continue;
      folder.querySelector('.skill-files').classList.add('open');
      folder.querySelector('.chevron').classList.add('open');
      return;
    }
  },
};
