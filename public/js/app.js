(() => {
  const welcome = document.getElementById('welcome');
  const fileHeader = document.getElementById('file-header');
  const fileMeta = document.getElementById('file-meta');
  const viewerTabs = document.getElementById('viewer-tabs');
  const viewer = document.getElementById('viewer');
  const editorContainer = document.getElementById('editor-container');
  const btnFrontmatter = document.getElementById('btn-frontmatter');
  const btnEdit = document.getElementById('btn-edit');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');

  const allViews = [
    'welcome', 'viewer', 'editor-container', 'dashboard-view',
    'frontmatter-editor', 'diff-view', 'history-view',
    'permissions-view', 'graph-view'
  ];

  let currentPath = null;
  let currentData = null;
  let currentSkill = null;
  let isEditing = false;
  let activeView = 'welcome';
  let activeTab = 'content';

  // View router
  function showView(viewName, opts = {}) {
    activeView = viewName;

    // Hide all views
    allViews.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show/hide file header and tabs based on context
    if (['viewer', 'editor-container', 'frontmatter-editor', 'permissions-view', 'history-view'].includes(viewName)) {
      fileHeader.classList.remove('hidden');
      viewerTabs.classList.remove('hidden');
    } else {
      fileHeader.classList.add('hidden');
      viewerTabs.classList.add('hidden');
    }

    // Show the target view
    const target = document.getElementById(viewName);
    if (target) target.classList.remove('hidden');

    // Update tab active state
    if (opts.tab) {
      activeTab = opts.tab;
      viewerTabs.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === opts.tab);
      });
    }
  }

  // Init components
  Sidebar.init(
    document.getElementById('skill-tree'),
    onFileSelect,
    (view) => showView(view)
  );

  Search.init(document.getElementById('search-container'), (query, filters) => {
    Sidebar.applyFilters(query, filters);
  });

  Search.onResultClick = (filePath) => {
    const skillName = filePath.split('/')[0];
    const skill = Sidebar.skills.find(s => s.name === skillName);
    if (skill) {
      Sidebar.setActive(filePath);
      Sidebar.expandSkill(skillName);
      onFileSelect(filePath, skill);
    }
  };

  Viewer.init(viewer);
  Editor.init(editorContainer);

  // Init Phase 2+ components (safe stubs if not loaded)
  if (typeof Dashboard !== 'undefined') Dashboard.init(document.getElementById('dashboard-view'), onFileSelect);
  if (typeof FrontmatterEditor !== 'undefined') FrontmatterEditor.init(document.getElementById('frontmatter-editor'));
  if (typeof DiffViewer !== 'undefined') DiffViewer.init(document.getElementById('diff-view'));
  if (typeof Permissions !== 'undefined') Permissions.init(document.getElementById('permissions-view'));
  if (typeof Graph !== 'undefined') Graph.init(document.getElementById('graph-view'));
  if (typeof SkillHistory !== 'undefined') SkillHistory.init(document.getElementById('history-view'));
  if (typeof Bulk !== 'undefined') Bulk.init();

  // Load sidebar
  Sidebar.load();

  // Load markdown-it from CDN dynamically
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/markdown-it/14.1.0/markdown-it.min.js', () => {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js', () => {
      Viewer.loadMarkdownIt();
      if (currentData) {
        Viewer.render(currentData.body, currentData.frontmatter);
      }
    });
  });

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'dashboard' && typeof Dashboard !== 'undefined') {
        showView('dashboard-view');
        Dashboard.load();
      } else if (view === 'graph' && typeof Graph !== 'undefined') {
        showView('graph-view');
        Graph.load();
      }
    });
  });

  // Tab clicks
  viewerTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName === 'content') {
        showView('viewer', { tab: 'content' });
      } else if (tabName === 'permissions' && typeof Permissions !== 'undefined') {
        showView('permissions-view', { tab: 'permissions' });
        if (currentSkill) Permissions.load(currentSkill.name);
      } else if (tabName === 'history' && typeof SkillHistory !== 'undefined') {
        showView('history-view', { tab: 'history' });
        if (currentSkill) SkillHistory.load(currentSkill.name);
      }
    });
  });

  async function onFileSelect(filePath, skill) {
    const ext = filePath.split('.').pop().toLowerCase();

    currentPath = filePath;
    currentSkill = skill;
    exitEditMode();

    const parts = filePath.split('/');
    const skillName = parts[0];
    const fileName = parts.slice(1).join('/');

    fileMeta.innerHTML = `
      <span class="skill-name">${skillName}</span>
      <span class="file-path">${fileName}</span>
    `;

    // Track view event
    API.trackEvent(skillName, 'view', fileName);

    // Show frontmatter button only for SKILL.md
    if (fileName === 'SKILL.md') {
      btnFrontmatter.classList.remove('hidden');
    } else {
      btnFrontmatter.classList.add('hidden');
    }

    if (!['md', 'txt', 'json', 'js', 'ts', 'py', 'yaml', 'yml', 'toml'].includes(ext)) {
      showView('viewer', { tab: 'content' });
      viewer.innerHTML = `<p style="color: var(--text-muted); padding: 48px; text-align: center;">Binary or unsupported file type (.${ext})</p>`;
      btnEdit.classList.add('hidden');
      return;
    }

    try {
      currentData = await API.getFile(filePath);
      showView('viewer', { tab: 'content' });
      btnEdit.classList.remove('hidden');
      await Viewer.loadMarkdownIt();
      Viewer.render(currentData.body, currentData.frontmatter);
    } catch (err) {
      showView('viewer', { tab: 'content' });
      viewer.innerHTML = `<p style="color: var(--accent); padding: 48px;">Error loading file: ${err.message}</p>`;
    }
  }

  function enterEditMode() {
    if (!currentData || !currentPath) return;
    isEditing = true;
    showView('editor-container');
    btnEdit.classList.add('hidden');
    btnFrontmatter.classList.add('hidden');
    btnSave.classList.remove('hidden');
    btnCancel.classList.remove('hidden');
    viewerTabs.classList.add('hidden');
    Editor.open(currentPath, currentData.raw);

    const skillName = currentPath.split('/')[0];
    API.trackEvent(skillName, 'edit', currentPath.split('/').slice(1).join('/'));
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

    // If DiffViewer is available, show diff first
    if (typeof DiffViewer !== 'undefined' && currentData) {
      DiffViewer.show(currentData.raw, content, async () => {
        await doSave(content);
      }, () => {
        showView('editor-container');
      });
      showView('diff-view');
      return;
    }

    await doSave(content);
  }

  async function doSave(content) {
    try {
      await API.saveFile(currentPath, content);
      const skillName = currentPath.split('/')[0];
      API.trackEvent(skillName, 'save', currentPath.split('/').slice(1).join('/'));
      currentData = await API.getFile(currentPath);
      exitEditMode();
      showView('viewer', { tab: 'content' });
      await Viewer.loadMarkdownIt();
      Viewer.render(currentData.body, currentData.frontmatter);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  }

  // Frontmatter editor button
  btnFrontmatter.addEventListener('click', () => {
    if (!currentSkill || !currentData || typeof FrontmatterEditor === 'undefined') return;
    showView('frontmatter-editor');
    viewerTabs.classList.add('hidden');
    btnFrontmatter.classList.add('hidden');
    btnEdit.classList.add('hidden');
    FrontmatterEditor.open(currentSkill.name, currentData.frontmatter, currentData.body, async () => {
      // On save callback - reload
      currentData = await API.getFile(currentPath);
      showView('viewer', { tab: 'content' });
      btnFrontmatter.classList.remove('hidden');
      btnEdit.classList.remove('hidden');
      await Viewer.loadMarkdownIt();
      Viewer.render(currentData.body, currentData.frontmatter);
      Sidebar.load();
    }, () => {
      // On cancel
      showView('viewer', { tab: 'content' });
      btnFrontmatter.classList.remove('hidden');
      btnEdit.classList.remove('hidden');
    });
  });

  btnEdit.addEventListener('click', enterEditMode);
  btnSave.addEventListener('click', saveFile);
  btnCancel.addEventListener('click', () => {
    exitEditMode();
    showView('viewer', { tab: 'content' });
    if (currentData) {
      Viewer.render(currentData.body, currentData.frontmatter);
    }
  });

  // Welcome hint link to dashboard
  document.querySelectorAll('.hint-link').forEach(link => {
    link.addEventListener('click', () => {
      const view = link.dataset.view;
      if (view === 'dashboard' && typeof Dashboard !== 'undefined') {
        showView('dashboard-view');
        Dashboard.load();
      }
    });
  });

  // SSE for live reload
  API.connectEvents((event) => {
    Sidebar.load();
    if (currentPath && event.path && event.path.includes(currentPath.split('/').pop())) {
      onFileSelect(currentPath, currentSkill);
    }
  });

  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  }
})();
