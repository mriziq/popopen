const SCRIPT_FILE_EXTENSIONS = ['.js', '.ts', '.py'];

const MUTUALLY_EXCLUSIVE_FILTERS = [
  ['localOnly', 'linkedOnly'],
  ['globalLocation', 'projectLocation', 'externalLocation'],
];
const AGENT_FILTERS = {
  claudeCode: 'Claude Code', codex: 'Codex', opencode: 'OpenCode', hermes: 'Hermes', pi: 'Pi',
};

const Search = {
  container: null,
  onFilter: null,
  query: '',
  filters: { localOnly: false, linkedOnly: false, hasScripts: false, globalLocation: false, projectLocation: false, externalLocation: false, claudeCode: false, codex: false, opencode: false, hermes: false, pi: false },

  init(container, onFilter) {
    this.container = container;
    this.onFilter = onFilter;
    this.render();
  },

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-wrapper';
    wrapper.innerHTML = `
      <div class="search-bar">
        <input type="text" class="search-input" placeholder="Filter skills... (&#8984;K)">
      </div>
      <div class="filter-pills">
        <button class="pill" data-filter="localOnly" title="Skills you created yourself">Custom</button>
        <button class="pill" data-filter="linkedOnly" title="Skill folders linked from another location">Linked</button>
        <button class="pill" data-filter="hasScripts" title="Skills that include a scripts/ folder with executable code">Scripts</button>
      </div>
      <div class="filter-pills filter-pills-location">
        <button class="pill" data-filter="globalLocation" title="Global skill folders">Global</button>
        <button class="pill" data-filter="projectLocation" title="Skill folders inside this project">Project</button>
        <button class="pill" data-filter="externalLocation" title="Configured external skill folders">External</button>
      </div>
      <div class="filter-pills filter-pills-agents" aria-label="Filter by agent">
        ${Object.entries(AGENT_FILTERS).map(([key, label]) => `<button class="pill" data-filter="${key}">${label}</button>`).join('')}
      </div>
    `;

    this.container.appendChild(wrapper);

    const input = wrapper.querySelector('.search-input');

    this.attachInputHandler(input);
    this.attachPillHandlers(wrapper);
    this.attachShortcut(input);
  },

  attachInputHandler(input) {
    input.addEventListener('input', () => {
      this.query = input.value;
      if (this.onFilter) this.onFilter(this.query, this.filters);
    });
  },

  clearConflictingFilters(wrapper, activatedFilter) {
    for (const group of MUTUALLY_EXCLUSIVE_FILTERS) {
      if (group.includes(activatedFilter) && this.filters[activatedFilter]) {
        for (const other of group.filter(key => key !== activatedFilter)) {
          this.filters[other] = false;
          wrapper.querySelector(`[data-filter="${other}"]`).classList.remove('active');
        }
      }
    }
  },

  attachPillHandlers(wrapper) {
    wrapper.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.filters[filter] = !this.filters[filter];
        btn.classList.toggle('active', this.filters[filter]);
        this.clearConflictingFilters(wrapper, filter);
        if (this.onFilter) this.onFilter(this.query, this.filters);
      });
    });
  },

  attachShortcut(input) {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  },

  filterByQuery(skills, query) {
    if (!query) return skills;
    const q = query.toLowerCase();
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      s.files.some(f => f.toLowerCase().includes(q))
    );
  },

  hasScriptFile(skill) {
    return skill.files.some(f => SCRIPT_FILE_EXTENSIONS.some(ext => f.endsWith(ext)))
      || skill.dirs.some(d => d === 'scripts');
  },

  filterSkills(skills, query, filters) {
    let filtered = this.filterByQuery(skills, query);
    if (filters.localOnly) filtered = filtered.filter(s => !s.isSymlink);
    if (filters.linkedOnly) filtered = filtered.filter(s => s.isSymlink);
    if (filters.hasScripts) filtered = filtered.filter(s => this.hasScriptFile(s));
    if (filters.globalLocation) filtered = filtered.filter(s => s.location === 'global');
    if (filters.projectLocation) filtered = filtered.filter(s => s.location === 'project');
    if (filters.externalLocation) filtered = filtered.filter(s => s.location === 'external');
    const activeAgents = Object.keys(AGENT_FILTERS).filter(key => filters[key]).map(key => AGENT_FILTERS[key]);
    if (activeAgents.length) filtered = filtered.filter(s => activeAgents.some(agent => (s.agents || []).includes(agent)));
    return filtered;
  },
};
