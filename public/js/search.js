const Search = {
  container: null,
  onFilter: null,
  query: '',
  filters: { localOnly: false, linkedOnly: false, hasScripts: false },
  debounceTimer: null,
  resultsContainer: null,

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
        <button class="pill" data-filter="localOnly">Local</button>
        <button class="pill" data-filter="linkedOnly">Linked</button>
        <button class="pill" data-filter="hasScripts">Scripts</button>
      </div>
      <div class="search-results hidden"></div>
    `;

    this.container.appendChild(wrapper);

    const input = wrapper.querySelector('.search-input');
    this.resultsContainer = wrapper.querySelector('.search-results');

    input.addEventListener('input', () => {
      this.query = input.value;
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (this.onFilter) this.onFilter(this.query, this.filters);
        this.doContentSearch(this.query);
      }, 200);
    });

    wrapper.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.filters[filter] = !this.filters[filter];
        btn.classList.toggle('active', this.filters[filter]);
        // Clear conflicting filters
        if (filter === 'localOnly' && this.filters.localOnly) {
          this.filters.linkedOnly = false;
          wrapper.querySelector('[data-filter="linkedOnly"]').classList.remove('active');
        }
        if (filter === 'linkedOnly' && this.filters.linkedOnly) {
          this.filters.localOnly = false;
          wrapper.querySelector('[data-filter="localOnly"]').classList.remove('active');
        }
        if (this.onFilter) this.onFilter(this.query, this.filters);
      });
    });

    // Cmd+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  },

  async doContentSearch(query) {
    if (!query || query.length < 2) {
      this.resultsContainer.classList.add('hidden');
      return;
    }
    try {
      const data = await API.search(query);
      if (data.results.length === 0) {
        this.resultsContainer.classList.add('hidden');
        return;
      }
      this.resultsContainer.classList.remove('hidden');
      this.resultsContainer.innerHTML = data.results.slice(0, 10).map(r =>
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
    } catch {}
  },

  onResultClick: null,

  filterSkills(skills, query, filters) {
    let filtered = skills;
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.files.some(f => f.toLowerCase().includes(q))
      );
    }
    if (filters.localOnly) {
      filtered = filtered.filter(s => !s.isSymlink);
    }
    if (filters.linkedOnly) {
      filtered = filtered.filter(s => s.isSymlink);
    }
    if (filters.hasScripts) {
      filtered = filtered.filter(s =>
        s.files.some(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.py')) ||
        s.dirs.some(d => d === 'scripts')
      );
    }
    return filtered;
  },
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
