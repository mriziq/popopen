(() => {
  const TEXT_FILE_EXTENSIONS = ['md', 'txt', 'json', 'js', 'ts', 'py', 'yaml', 'yml', 'toml'];
  const FILE_AWARE_VIEWS = ['viewer', 'editor-container', 'frontmatter-editor', 'permissions-view'];
  const ALL_VIEWS = [
    'welcome', 'viewer', 'editor-container', 'dashboard-view',
    'frontmatter-editor', 'diff-view',
    'permissions-view'
  ];

  const welcome = document.getElementById('welcome');
  const fileHeader = document.getElementById('file-header');
  const fileMeta = document.getElementById('file-meta');
  const viewerTabs = document.getElementById('viewer-tabs');
  const viewer = document.getElementById('viewer');
  const editorContainer = document.getElementById('editor-container');
  const btnFrontmatter = document.getElementById('btn-frontmatter');
  const btnEdit = document.getElementById('btn-edit');
  const btnUninstall = document.getElementById('btn-uninstall');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');

  let currentPath = null;
  let currentData = null;
  let currentSkill = null;
  let isEditing = false;
  let activeView = 'welcome';
  let activeTab = 'content';

  function hideAllViews() {
    ALL_VIEWS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function updateFileHeaderVisibility(viewName) {
    const showFileHeader = FILE_AWARE_VIEWS.includes(viewName);
    fileHeader.classList.toggle('hidden', !showFileHeader);
    viewerTabs.classList.toggle('hidden', !showFileHeader);
  }

  function setActiveTab(tabName) {
    activeTab = tabName;
    viewerTabs.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
  }

  function showView(viewName, opts = {}) {
    activeView = viewName;
    hideAllViews();
    updateFileHeaderVisibility(viewName);

    const target = document.getElementById(viewName);
    if (target) target.classList.remove('hidden');

    if (opts.tab) setActiveTab(opts.tab);
  }

  function getSkillName(filePath) {
    return filePath.split('/')[0];
  }

  function getFileName(filePath) {
    return filePath.split('/').slice(1).join('/');
  }

  function renderFileMeta(skillName, fileName) {
    const isInstalled = currentSkill?.scope === 'installed';
    const title = isInstalled ? 'Installed skills cannot be renamed' : 'Click to rename';
    fileMeta.innerHTML = `
      <span class="skill-name" data-skill="${skillName}" title="${title}">${skillName}</span>
      <span class="file-path">${fileName}</span>
    `;

    if (!isInstalled) {
      const nameEl = fileMeta.querySelector('.skill-name');
      nameEl.classList.add('skill-name-editable');
      nameEl.addEventListener('click', () => startRename(nameEl));
    }
  }

  function renderUnsupportedFile(ext) {
    showView('viewer', { tab: 'content' });
    viewer.innerHTML = `<p style="color: var(--text-muted); padding: 48px; text-align: center;">Binary or unsupported file type (.${ext})</p>`;
    btnEdit.classList.add('hidden');
  }

  function renderLoadError(message) {
    showView('viewer', { tab: 'content' });
    viewer.innerHTML = `<p style="color: var(--accent); padding: 48px;">Error loading file: ${message}</p>`;
  }

  async function onFileSelect(filePath, skill) {
    currentPath = filePath;
    currentSkill = skill;
    exitEditMode();

    const skillName = getSkillName(filePath);
    const fileName = getFileName(filePath);
    renderFileMeta(skillName, fileName);

    API.trackEvent(skillName, 'view', fileName);

    btnFrontmatter.classList.toggle('hidden', fileName !== 'SKILL.md');
    btnUninstall.classList.toggle('hidden', fileName !== 'SKILL.md');

    const ext = filePath.split('.').pop().toLowerCase();
    if (!TEXT_FILE_EXTENSIONS.includes(ext)) {
      renderUnsupportedFile(ext);
      return;
    }

    try {
      currentData = await API.getFile(filePath);
      showView('viewer', { tab: 'content' });
      btnEdit.classList.remove('hidden');
      Viewer.render(currentData.body, currentData.frontmatter);
    } catch (err) {
      renderLoadError(err.message);
    }
  }

  async function commitRename(input, nameEl, original) {
    const newName = input.value.trim();
    if (!newName || newName === original) {
      input.replaceWith(nameEl);
      return;
    }
    try {
      await API.renameSkill(original, newName);
      currentPath = currentPath.replace(original, newName);
      currentSkill = { ...currentSkill, name: newName };
      await Sidebar.load();
      Sidebar.setActive(currentPath);
      nameEl.textContent = newName;
      nameEl.dataset.skill = newName;
      input.replaceWith(nameEl);
    } catch (err) {
      alert(err.message);
      input.replaceWith(nameEl);
    }
  }

  function startRename(nameEl) {
    const original = nameEl.dataset.skill;
    const input = document.createElement('input');
    input.className = 'skill-name-input';
    input.value = original;
    input.spellcheck = false;
    nameEl.replaceWith(input);
    input.select();

    input.addEventListener('blur', () => commitRename(input, nameEl, original));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = original;
        input.blur();
      }
    });
  }

  function enterEditMode() {
    if (!currentData || !currentPath) return;
    isEditing = true;
    showView('editor-container');
    btnEdit.classList.add('hidden');
    btnFrontmatter.classList.add('hidden');
    btnUninstall.classList.add('hidden');
    btnSave.classList.remove('hidden');
    btnCancel.classList.remove('hidden');
    viewerTabs.classList.add('hidden');
    Editor.open(currentPath, currentData.raw);

    API.trackEvent(getSkillName(currentPath), 'edit', getFileName(currentPath));
  }

  function exitEditMode() {
    isEditing = false;
    editorContainer.classList.add('hidden');
    btnEdit.classList.remove('hidden');
    btnSave.classList.add('hidden');
    btnCancel.classList.add('hidden');
    Editor.close();
  }

  async function saveFile() {
    if (!currentPath) return;
    const content = Editor.getContent();

    if (typeof DiffViewer !== 'undefined' && currentData) {
      DiffViewer.show(
        currentData.raw,
        content,
        () => doSave(content),
        () => showView('editor-container')
      );
      showView('diff-view');
      return;
    }

    await doSave(content);
  }

  async function doSave(content) {
    try {
      await API.saveFile(currentPath, content);
      API.trackEvent(getSkillName(currentPath), 'save', getFileName(currentPath));
      currentData = await API.getFile(currentPath);
      exitEditMode();
      showView('viewer', { tab: 'content' });
      Viewer.render(currentData.body, currentData.frontmatter);
      if (typeof Toast !== 'undefined') Toast.success(`Saved <strong>${getFileName(currentPath)}</strong>`);
    } catch (err) {
      if (typeof Toast !== 'undefined') Toast.error(`Failed to save: ${err.message}`);
    }
  }

  function initOptionalComponents() {
    if (typeof Dashboard !== 'undefined') Dashboard.init(document.getElementById('dashboard-view'), onFileSelect);
    if (typeof FrontmatterEditor !== 'undefined') FrontmatterEditor.init(document.getElementById('frontmatter-editor'));
    if (typeof DiffViewer !== 'undefined') DiffViewer.init(document.getElementById('diff-view'));
    if (typeof Permissions !== 'undefined') Permissions.init(document.getElementById('permissions-view'));
    if (typeof Bulk !== 'undefined') Bulk.init();
  }

  function handleTabClick(tabName) {
    if (tabName === 'content') {
      showView('viewer', { tab: 'content' });
    } else if (tabName === 'permissions' && typeof Permissions !== 'undefined') {
      showView('permissions-view', { tab: 'permissions' });
      if (currentSkill) Permissions.load(currentSkill.name);
    }
  }

  function handleNavButton(view) {
    if (view === 'dashboard' && typeof Dashboard !== 'undefined') {
      showView('dashboard-view');
      Dashboard.load();
    }
  }

  function openFrontmatterEditor() {
    if (!currentSkill || !currentData || typeof FrontmatterEditor === 'undefined') return;
    showView('frontmatter-editor');
    viewerTabs.classList.add('hidden');
    btnFrontmatter.classList.add('hidden');
    btnEdit.classList.add('hidden');
    btnUninstall.classList.add('hidden');

    FrontmatterEditor.open(
      currentSkill.name,
      currentData.frontmatter,
      currentData.body,
      async () => {
        currentData = await API.getFile(currentPath);
        showView('viewer', { tab: 'content' });
        btnFrontmatter.classList.remove('hidden');
        btnEdit.classList.remove('hidden');
        btnUninstall.classList.remove('hidden');
        Viewer.render(currentData.body, currentData.frontmatter);
        Sidebar.load();
      },
      () => {
        showView('viewer', { tab: 'content' });
        btnFrontmatter.classList.remove('hidden');
        btnEdit.classList.remove('hidden');
        btnUninstall.classList.remove('hidden');
      },
      () => {
        viewerTabs.classList.remove('hidden');
        btnFrontmatter.classList.remove('hidden');
        btnEdit.classList.remove('hidden');
        btnUninstall.classList.remove('hidden');
        handleTabClick('permissions');
      }
    );
  }

  function uninstallCurrentSkill() {
    if (!currentSkill || typeof Dashboard === 'undefined') return;
    Dashboard.showUninstallConfirm(currentSkill.name, async () => {
      currentPath = null;
      currentData = null;
      currentSkill = null;
      showView('welcome');
      await Sidebar.load();
    });
  }

  function cancelEdit() {
    exitEditMode();
    showView('viewer', { tab: 'content' });
    if (currentData) Viewer.render(currentData.body, currentData.frontmatter);
  }

  function handleLiveReload(event) {
    Sidebar.load();
    if (currentPath && event.path && event.path.includes(currentPath.split('/').pop())) {
      onFileSelect(currentPath, currentSkill);
    }
  }

  Sidebar.init(document.getElementById('skill-tree'), onFileSelect, (view) => showView(view));

  Search.init(document.getElementById('search-container'), (query, filters) => {
    Sidebar.applyFilters(query, filters);
  });

  Search.onResultClick = (filePath) => {
    const skillName = getSkillName(filePath);
    const skill = Sidebar.skills.find(s => s.name === skillName);
    if (skill) {
      Sidebar.setActive(filePath);
      Sidebar.expandSkill(skillName);
      onFileSelect(filePath, skill);
    }
  };

  Viewer.init(viewer);
  Editor.init(editorContainer);
  initOptionalComponents();

  Sidebar.load();

  const appShell = document.getElementById('app-shell');
  appShell.addEventListener('animationend', () => {
    if (typeof Dashboard !== 'undefined') {
      showView('dashboard-view');
      Dashboard.load();
    }
  }, { once: true });

  const btnCollapseAll = document.getElementById('btn-collapse-all');
  if (btnCollapseAll) btnCollapseAll.addEventListener('click', () => Sidebar.toggleAllFolders(btnCollapseAll));

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => handleNavButton(btn.dataset.view));
  });

  viewerTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => handleTabClick(tab.dataset.tab));
  });

  btnFrontmatter.addEventListener('click', openFrontmatterEditor);
  btnEdit.addEventListener('click', enterEditMode);
  btnUninstall.addEventListener('click', uninstallCurrentSkill);
  btnSave.addEventListener('click', saveFile);
  btnCancel.addEventListener('click', cancelEdit);

  document.querySelectorAll('.hint-link').forEach(link => {
    link.addEventListener('click', () => handleNavButton(link.dataset.view));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

    const modal = document.querySelector('.modal-overlay');
    if (modal) { modal.remove(); return; }

    if (isEditing) { cancelEdit(); return; }

    if (activeView === 'frontmatter-editor') {
      const cancelBtn = document.getElementById('fm-cancel-btn');
      if (cancelBtn) cancelBtn.click();
      return;
    }

    if (activeView !== 'dashboard-view') handleNavButton('dashboard');
  });

  API.connectEvents(handleLiveReload);
})();
