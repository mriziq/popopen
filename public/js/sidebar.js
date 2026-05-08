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
  },

  applyFilters(query, filters) {
    this.filteredSkills = Search.filterSkills(this.skills, query, filters);
    this.render();
  },

  render() {
    this.container.innerHTML = '';

    for (const skill of this.filteredSkills) {
      const folder = document.createElement('div');
      folder.className = 'skill-folder';

      const header = document.createElement('div');
      header.className = 'skill-folder-header';

      const disabledByModel = skill.frontmatter && skill.frontmatter['disable-model-invocation'];

      const scope = skill.scope || (skill.isSymlink ? 'installed' : 'custom');

      header.innerHTML = `
        <span class="chevron">&#9654;</span>
        <span class="folder-icon">&#128193;</span>
        <span class="skill-name-label">${skill.name}</span>
        <span class="scope-badge scope-badge-${scope}" title="${scope === 'installed' ? 'Installed from remote source' : 'Custom / user-created'}">${scope === 'installed' ? 'IN' : 'CU'}</span>
        <span class="quick-toggle ${disabledByModel ? 'off' : 'on'}" title="${disabledByModel ? 'Model invocation disabled' : 'Model invocation enabled'}">
          ${disabledByModel ? '&#9676;' : '&#9679;'}
        </span>
      `;

      const fileList = document.createElement('div');
      fileList.className = 'skill-files';

      const sortedFiles = [...skill.files].sort((a, b) => {
        if (a === 'SKILL.md') return -1;
        if (b === 'SKILL.md') return 1;
        return a.localeCompare(b);
      });

      for (const file of sortedFiles) {
        const fileItem = document.createElement('div');
        fileItem.className = 'skill-file';
        const filePath = `${skill.name}/${file}`;
        fileItem.dataset.path = filePath;

        const ext = file.split('.').pop().toLowerCase();
        let icon = '&#128196;';
        if (ext === 'md') icon = '&#128221;';
        else if (ext === 'json') icon = '&#128295;';
        else if (['js', 'ts', 'py'].includes(ext)) icon = '&#128187;';

        fileItem.innerHTML = `<span class="file-icon">${icon}</span><span>${file}</span>`;

        fileItem.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setActive(filePath);
          if (this.onFileSelect) this.onFileSelect(filePath, skill);
        });

        fileList.appendChild(fileItem);
      }

      // Quick toggle click
      const toggleBtn = header.querySelector('.quick-toggle');
      toggleBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newValue = !disabledByModel;
        try {
          await API.patchFrontmatter(skill.name, { 'disable-model-invocation': newValue });
          await this.load();
        } catch (err) {
          console.error('Failed to toggle:', err);
        }
      });

      header.addEventListener('click', () => {
        const chevron = header.querySelector('.chevron');
        const isOpen = fileList.classList.toggle('open');
        chevron.classList.toggle('open', isOpen);
      });

      folder.appendChild(header);
      folder.appendChild(fileList);
      this.container.appendChild(folder);
    }
  },

  setActive(filePath) {
    this.activeFile = filePath;
    this.container.querySelectorAll('.skill-file').forEach(el => {
      el.classList.toggle('active', el.dataset.path === filePath);
    });
  },

  expandSkill(skillName) {
    const folders = this.container.querySelectorAll('.skill-folder');
    for (const folder of folders) {
      const name = folder.querySelector('.skill-name-label').textContent;
      if (name === skillName) {
        const fileList = folder.querySelector('.skill-files');
        const chevron = folder.querySelector('.chevron');
        fileList.classList.add('open');
        chevron.classList.add('open');
        break;
      }
    }
  },
};
