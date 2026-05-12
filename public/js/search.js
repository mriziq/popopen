const SEARCH_DEBOUNCE_MS = 200;
const MIN_CONTENT_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 10;
const SCRIPT_FILE_EXTENSIONS = ['.js', '.ts', '.py'];

const MUTUALLY_EXCLUSIVE_FILTERS = [
  ['localOnly', 'linkedOnly'],
  ['globalLocation', 'localLocation'],
];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const Search = {
  container: null,
  onFilter: null,
  query: '',
  filters: { localOnly: false, linkedOnly: false, hasScripts: false, globalLocation: false, localLocation: false },
  debounceTimer: null,
  resultsContainer: null,
  onResultClick: null,

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
        <input type="text" class="search-input" placeholder="Search skills... (&#8984;K)">
      </div>
      <div class="filter-pills">
        <button class="pill" data-filter="localOnly" title="Skills you created yourself">Custom</button>
        <button class="pill" data-filter="linkedOnly" title="Skills installed via the Claude Code CLI">3rd Party</button>
        <button class="pill" data-filter="hasScripts" title="Skills that include a scripts/ folder with executable code">Scripts</button>
      </div>
      <div class="filter-pills filter-pills-location">
        <button class="pill" data-filter="globalLocation" title="Skills in ~/.claude/skills — available in every project">Global</button>
        <button class="pill" data-filter="localLocation" title="Skills in this project's .claude/skills — only active here">Local</button>
      </div>
      <div class="search-results hidden"></div>
    `;

    this.container.appendChild(wrapper);

    const input = wrapper.querySelector('.search-input');
    this.resultsContainer = wrapper.querySelector('.search-results');

    this.attachInputHandler(input);
    this.attachPillHandlers(wrapper);
    this.attachShortcut(input);
  },

  attachInputHandler(input) {
    input.addEventListener('input', () => {
      this.query = input.value;
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (this.onFilter) this.onFilter(this.query, this.filters);
        this.doContentSearch(this.query);
      }, SEARCH_DEBOUNCE_MS);
    });
  },

  clearConflictingFilters(wrapper, activatedFilter) {
    for (const [a, b] of MUTUALLY_EXCLUSIVE_FILTERS) {
      const other = activatedFilter === a ? b : activatedFilter === b ? a : null;
      if (other && this.filters[activatedFilter]) {
        this.filters[other] = false;
        wrapper.querySelector(`[data-filter="${other}"]`).classList.remove('active');
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

  renderResults(results) {
    this.resultsContainer.classList.remove('hidden');
    this.resultsContainer.innerHTML = results.slice(0, MAX_SEARCH_RESULTS).map(r =>
      `<div class="search-result" data-path="${r.skill}/${r.file}">
        <span class="sr-skill">${r.skill}</span>
        <span class="sr-file">${r.file}:${r.line}</span>
        <span class="sr-context">${escapeHtml(r.context)}</span>
      </div>`
    ).join('');

    this.resultsContainer.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        this.resultsContainer.classList.add('hidden');
        if (this.onResultClick) this.onResultClick(el.dataset.path);
      });
    });
  },

  async doContentSearch(query) {
    if (!query || query.length < MIN_CONTENT_SEARCH_LENGTH) {
      this.resultsContainer.classList.add('hidden');
      return;
    }
    try {
      const data = await API.search(query);
      if (data.results.length === 0) {
        this.resultsContainer.classList.add('hidden');
        return;
      }
      this.renderResults(data.results);
    } catch {}
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
    if (filters.globalLocation) filtered = filtered.filter(s => !s.location || s.location === 'global');
    if (filters.localLocation) filtered = filtered.filter(s => s.location === 'local');
    return filtered;
  },
};
