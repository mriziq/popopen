function bpEscape(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function bpTruncate(value, max) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const Backpack = {
  overlay: null,
  stageHost: null,
  skills: [],
  skillMap: new Map(),
  loadPromise: null,
  selected: new Set(),
  query: '',
  stage: 'intro',
  downloading: false,
  filename: '',
  packedCount: 0,
  packedSkills: [],
  triggerEl: null,
  bumpTimer: null,

  async open() {
    if (this.overlay) return;

    this.triggerEl = document.activeElement;
    this.selected = new Set(typeof Bulk !== 'undefined' ? Bulk.selectedSkills : []);
    this.query = '';
    this.stage = 'intro';
    this.downloading = false;
    this.filename = '';
    this.packedCount = 0;
    this.packedSkills = [];
    this.skills = [];
    this.skillMap = new Map();
    this.loadPromise = API.getSkills();
    this.loadPromise.catch(() => {});

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay bp-overlay';
    this.overlay.innerHTML = `
      <div class="modal-content bp-modal" role="dialog" aria-modal="true" aria-labelledby="bp-title">
        <button class="modal-close bp-close" type="button" aria-label="Close backpack">&times;</button>
        <div class="bp-stage-host"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);
    this.stageHost = this.overlay.querySelector('.bp-stage-host');

    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
    this.overlay.querySelector('.bp-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('keydown', (event) => this.handleOverlayKeydown(event));

    this.renderIntro();
    queueMicrotask(() => this.stageHost?.querySelector('.bp-start')?.focus());
  },

  close() {
    if (!this.overlay) return;
    const trigger = this.triggerEl;
    this.overlay.remove();
    this.overlay = null;
    this.stageHost = null;
    this.skills = [];
    this.skillMap = new Map();
    this.loadPromise = null;
    this.triggerEl = null;
    clearTimeout(this.bumpTimer);
    if (trigger && typeof trigger.focus === 'function') trigger.focus();
  },

  handleOverlayKeydown(event) {
    if (event.key === 'Escape') {
      if (event.target.matches('.bp-search-input') && event.target.value) {
        event.target.value = '';
        this.query = '';
        this.renderSkillList();
        event.stopPropagation();
        return;
      }
      this.close();
      event.stopPropagation();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(event);
  },

  trapFocus(event) {
    if (!this.overlay) return;
    const focusable = [...this.overlay.querySelectorAll('button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.getClientRects().length > 0);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!this.overlay.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  },

  async ensureSkills() {
    if (this.skills.length) return this.skills;
    const skills = await this.loadPromise;
    this.skills = Array.isArray(skills) ? skills : [];
    this.skillMap = new Map(this.skills.map(skill => [skill.id, skill]));
    this.selected = new Set([...this.selected].filter(id => this.skillMap.has(id)));
    this.syncBulkSelection();
    return this.skills;
  },

  setStage(html) {
    if (!this.stageHost) return;
    this.stageHost.innerHTML = html;
  },

  bagMarkup(extraClass = '', withCards = false) {
    return `
      <div class="bp-bag-scene ${extraClass}">
        <div class="bp-bag-glow" aria-hidden="true"></div>
        <div class="bp-bag-inner">
          <svg class="bp-bag-svg" viewBox="0 0 180 210" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="bpBagBody" x1="90" y1="30" x2="90" y2="186" gradientUnits="userSpaceOnUse">
                <stop stop-color="var(--surface-overlay)"/>
                <stop offset="1" stop-color="var(--surface)"/>
              </linearGradient>
            </defs>
            <ellipse class="bp-bag-shadow" cx="90" cy="197" rx="46" ry="8"/>
            <path class="bp-bag-handle" d="M66 34c0-10 8-18 18-18h12c10 0 18 8 18 18"/>
            <rect class="bp-bag-body" x="28" y="30" width="124" height="156" rx="34"/>
            <path class="bp-bag-flap" d="M28 64c0-19 15-34 34-34h56c19 0 34 15 34 34v24H28V64z"/>
            <path class="bp-bag-strap" d="M46 90v54M134 90v54"/>
            <path class="bp-bag-seam" d="M40 80h100"/>
            <circle class="bp-bag-patch" cx="90" cy="101" r="8"/>
            <path class="bp-bag-patch-mark" d="M85.5 99h4l1 1.5h4.5v5h-9.5z"/>
            <rect class="bp-bag-pocket" x="54" y="124" width="72" height="44" rx="14"/>
            <path class="bp-bag-zip" d="M54 128h72"/>
            <circle class="bp-bag-zip-pull" cx="124" cy="128" r="3.5"/>
          </svg>
          ${withCards ? '<div class="bp-bag-cards" aria-hidden="true"></div>' : ''}
        </div>
      </div>
    `;
  },

  renderIntro() {
    this.stage = 'intro';
    const preselected = this.selected.size;
    this.setStage(`
      <section class="bp-stage bp-stage--intro" aria-labelledby="bp-title">
        <div class="bp-intro-visual" aria-hidden="true">
          <span class="bp-float-chip bp-float-chip--skill">SKILL.md</span>
          <span class="bp-float-chip bp-float-chip--zip">ZIP</span>
          <span class="bp-float-chip bp-float-chip--handoff">→ new computer</span>
          ${this.bagMarkup('bp-intro-bag')}
        </div>
        <div class="bp-intro-copy">
          <span class="bp-eyebrow">Step 1 of 3 · Portable skills</span>
          <h2 id="bp-title">Start a backpack flow?</h2>
          <p class="bp-lede">Pick skill copies from your library and Popopen packs them into one ZIP. Hand the file to a coding agent on another computer and it takes care of setup.</p>
          <ol class="bp-steps">
            <li>
              <span class="bp-step-num">1</span>
              <span class="bp-step-copy">
                <strong>Choose copies</strong>
                <small>Select any installed or custom skills. Each copy stays separate.</small>
              </span>
            </li>
            <li>
              <span class="bp-step-num">2</span>
              <span class="bp-step-copy">
                <strong>Pack the backpack</strong>
                <small>Download a ZIP with the full skill folders, a manifest, and agent instructions.</small>
              </span>
            </li>
            <li>
              <span class="bp-step-num">3</span>
              <span class="bp-step-copy">
                <strong>Hand it off</strong>
                <small>Open it on the other computer, or give it to your agent. It asks before replacing anything.</small>
              </span>
            </li>
          </ol>
          ${preselected ? `<div class="bp-selected-note">${preselected} skill ${preselected === 1 ? 'copy is' : 'copies are'} already selected in your library. You can adjust the selection next.</div>` : ''}
          <div class="bp-intro-actions">
            <button type="button" class="btn bp-cancel">Not now</button>
            <button type="button" class="btn btn-primary bp-start">Start packing <span aria-hidden="true">→</span></button>
          </div>
          <p class="bp-fineprint">The receiving computer does not need Popopen. The ZIP includes plain, readable setup instructions for agents.</p>
        </div>
      </section>
    `);

    this.stageHost.querySelector('.bp-cancel').addEventListener('click', () => this.close());
    this.stageHost.querySelector('.bp-start').addEventListener('click', (event) => this.openPackStage(event.currentTarget));
  },

  async openPackStage(startButton) {
    if (startButton) startButton.disabled = true;
    try {
      await this.ensureSkills();
    } catch (err) {
      if (startButton) startButton.disabled = false;
      if (typeof Toast !== 'undefined') Toast.error(`Could not load skills: ${err.message}`);
      return;
    }
    if (!this.overlay) return;
    this.renderPackStage();
  },

  renderPackStage() {
    this.stage = 'pack';
    const total = this.skills.length;
    this.setStage(`
      <section class="bp-stage bp-stage--pack" aria-labelledby="bp-title">
        <header class="bp-pack-head">
          <div class="bp-pack-title">
            <span class="bp-eyebrow">Step 2 of 3 · Choose skills</span>
            <h2 id="bp-title">Pack your backpack</h2>
            <p class="bp-sub">Select the copies you want to carry. Each on-disk copy is packed as its own folder.</p>
          </div>
          <button type="button" class="bp-text-btn bp-back-intro">← How it works</button>
        </header>
        <div class="bp-pack-body">
          <section class="bp-library" aria-label="Skill copies">
            <div class="bp-library-toolbar">
              <label class="bp-search">
                <span class="bp-search-icon" aria-hidden="true"></span>
                <input type="search" class="bp-search-input" placeholder="Search skills, agents, locations…" autocomplete="off" spellcheck="false">
              </label>
              <div class="bp-toolbar-actions">
                <button type="button" class="bp-mini-btn bp-select-all">Select all</button>
                <button type="button" class="bp-mini-btn bp-clear" disabled>Clear</button>
              </div>
            </div>
            <div class="bp-list-meta">
              <span class="bp-visible-count"></span>
              <span class="bp-list-hint">${total} ${total === 1 ? 'copy' : 'copies'} in library</span>
            </div>
            <div class="bp-skill-list" role="group" aria-label="Choose skill copies"></div>
            <div class="bp-no-results hidden">No skill copies match that search.</div>
          </section>
          <aside class="bp-pane" aria-label="Backpack">
            <div class="bp-bag-stage">
              ${this.bagMarkup('bp-pack-bag', true)}
              <div class="bp-bag-count" aria-live="polite"><strong class="bp-bag-count-num">0</strong><span>packed</span></div>
            </div>
            <div class="bp-packed">
              <div class="bp-packed-heading">
                <span>Inside the backpack</span>
                <span class="bp-packed-total">0 copies</span>
              </div>
              <div class="bp-packed-list" aria-live="polite"></div>
              <p class="bp-packed-empty">Nothing packed yet.<br><span>Pick a skill to start.</span></p>
            </div>
          </aside>
        </div>
        <footer class="bp-pack-footer">
          <div class="bp-footer-note">
            <span class="bp-footer-count">No skills selected</span>
            <span class="bp-footer-hint">ZIP · manifest.json · agent instructions</span>
          </div>
          <div class="bp-footer-actions">
            <button type="button" class="btn bp-cancel-pack">Cancel</button>
            <button type="button" class="btn btn-primary bp-download" disabled>Download backpack</button>
          </div>
        </footer>
      </section>
    `);

    const search = this.stageHost.querySelector('.bp-search-input');
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderSkillList();
    });

    this.stageHost.querySelector('.bp-back-intro').addEventListener('click', () => this.renderIntro());
    this.stageHost.querySelector('.bp-cancel-pack').addEventListener('click', () => this.close());
    this.stageHost.querySelector('.bp-select-all').addEventListener('click', () => this.selectAllVisible());
    this.stageHost.querySelector('.bp-clear').addEventListener('click', () => this.clearSelection());
    this.stageHost.querySelector('.bp-download').addEventListener('click', () => this.download());

    this.stageHost.querySelector('.bp-skill-list').addEventListener('change', (event) => {
      const checkbox = event.target.closest('.bp-skill-check');
      if (!checkbox) return;
      this.toggleSkill(checkbox.dataset.id, checkbox.checked);
    });

    this.stageHost.querySelector('.bp-packed-list').addEventListener('click', (event) => {
      const remove = event.target.closest('.bp-remove');
      if (!remove) return;
      this.removeSkill(remove.dataset.id);
    });

    this.renderSkillList();
    this.updateBag(false, false);
    search.focus();
  },

  getFilteredSkills() {
    const query = this.query.trim().toLowerCase();
    if (!query) return this.skills;
    return this.skills.filter(skill => {
      const haystack = [
        skill.name,
        skill.description,
        skill.location,
        (skill.agents || []).join(' '),
        skill.sourcePath,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  },

  skillRowMarkup(skill) {
    const selected = this.selected.has(skill.id);
    const scope = skill.scope || 'custom';
    const location = skill.location || 'global';
    const agents = (skill.agents || []).join(', ') || 'Unknown agent';
    const description = skill.description ? bpTruncate(skill.description, 120) : skill.sourcePath;
    const fileCount = skill.fileCount ?? (skill.files ? skill.files.length : 0);

    return `
      <label class="bp-skill-row ${selected ? 'is-selected' : ''}" data-id="${skill.id}" title="${bpEscape(skill.sourcePath)}">
        <input class="bp-skill-check" type="checkbox" data-id="${skill.id}" ${selected ? 'checked' : ''}>
        <span class="bp-skill-copy">
          <span class="bp-skill-top">
            <span class="bp-skill-name">${bpEscape(skill.name)}</span>
            <span class="bp-badge bp-badge-scope-${bpEscape(scope)}">${bpEscape(scope)}</span>
            <span class="bp-badge bp-badge-loc-${bpEscape(location)}">${bpEscape(location)}</span>
          </span>
          <span class="bp-skill-desc">${bpEscape(description)}</span>
          <span class="bp-skill-agents">${bpEscape(agents)} · ${fileCount} ${fileCount === 1 ? 'file' : 'files'}</span>
        </span>
      </label>
    `;
  },

  renderSkillList() {
    if (!this.overlay) return;
    const list = this.stageHost.querySelector('.bp-skill-list');
    const noResults = this.stageHost.querySelector('.bp-no-results');
    if (!list) return;

    const filtered = this.getFilteredSkills();
    const groups = new Map();
    for (const skill of filtered) {
      if (!groups.has(skill.name)) groups.set(skill.name, []);
      groups.get(skill.name).push(skill);
    }

    let html = '';
    for (const [name, instances] of groups) {
      html += '<div class="bp-skill-group">';
      if (instances.length > 1) {
        html += `<div class="bp-skill-group-label"><span>${bpEscape(name)}</span><small>${instances.length} copies</small></div>`;
      }
      html += instances.map(skill => this.skillRowMarkup(skill)).join('');
      html += '</div>';
    }

    list.innerHTML = html;
    noResults.classList.toggle('hidden', filtered.length > 0);
    list.classList.toggle('hidden', filtered.length === 0);
    this.updateListMeta(filtered.length);
  },

  updateListMeta(visibleCount) {
    if (!this.stageHost) return;
    const visible = this.stageHost.querySelector('.bp-visible-count');
    if (visible) {
      visible.textContent = this.query.trim()
        ? `${visibleCount} matching ${visibleCount === 1 ? 'copy' : 'copies'}`
        : `${visibleCount} ${visibleCount === 1 ? 'copy' : 'copies'}`;
    }
    const hint = this.stageHost.querySelector('.bp-list-hint');
    if (hint) {
      const total = this.skills.length;
      hint.textContent = this.selected.size
        ? `${this.selected.size} of ${total} selected`
        : `${total} in library`;
    }
    const clear = this.stageHost.querySelector('.bp-clear');
    if (clear) clear.disabled = this.selected.size === 0;
    const selectAll = this.stageHost.querySelector('.bp-select-all');
    if (selectAll) selectAll.textContent = this.query.trim() ? 'Select matching' : 'Select all';
  },

  toggleSkill(instanceId, isSelected) {
    if (isSelected) this.selected.add(instanceId);
    else this.selected.delete(instanceId);
    this.syncBulkSelection();

    const row = this.stageHost?.querySelector(`.bp-skill-row[data-id="${instanceId}"]`);
    if (row) row.classList.toggle('is-selected', isSelected);
    this.updateBag(isSelected, isSelected);
    this.updateListMeta(this.getFilteredSkills().length);
  },

  removeSkill(instanceId) {
    this.selected.delete(instanceId);
    this.syncBulkSelection();

    const row = this.stageHost?.querySelector(`.bp-skill-row[data-id="${instanceId}"]`);
    if (row) {
      row.classList.remove('is-selected');
      const checkbox = row.querySelector('.bp-skill-check');
      if (checkbox) checkbox.checked = false;
    }
    this.updateBag(false, false);
    this.updateListMeta(this.getFilteredSkills().length);
  },

  selectAllVisible() {
    for (const skill of this.getFilteredSkills()) this.selected.add(skill.id);
    this.syncBulkSelection();
    this.applyVisibleSelection(true);
    this.updateBag(false, true);
    this.updateListMeta(this.getFilteredSkills().length);
  },

  clearSelection() {
    this.selected.clear();
    this.syncBulkSelection();
    this.applyVisibleSelection(false);
    this.updateBag(false, false);
    this.updateListMeta(this.getFilteredSkills().length);
  },

  applyVisibleSelection(isSelected) {
    if (!this.stageHost) return;
    this.stageHost.querySelectorAll('.bp-skill-check').forEach(checkbox => {
      checkbox.checked = isSelected;
      checkbox.closest('.bp-skill-row')?.classList.toggle('is-selected', isSelected);
    });
  },

  syncBulkSelection() {
    if (typeof Bulk === 'undefined') return;
    Bulk.selectedSkills.clear();
    for (const id of this.selected) Bulk.selectedSkills.add(id);
    Bulk.renderActionBar();

    document.querySelectorAll('.instance-select').forEach(input => {
      input.checked = Bulk.selectedSkills.has(input.dataset.instanceId);
    });
    document.querySelectorAll('.card-checkbox').forEach(input => {
      input.checked = Bulk.selectedSkills.has(input.dataset.instanceId);
    });
  },

  selectedSkills() {
    return [...this.selected].map(id => this.skillMap.get(id)).filter(Boolean);
  },

  updateBag(animateNewCard = false, bump = false) {
    if (!this.stageHost) return;
    const selected = this.selectedSkills();
    const count = selected.length;
    const countLabel = `${count} ${count === 1 ? 'copy' : 'copies'}`;

    const countNum = this.stageHost.querySelector('.bp-bag-count-num');
    if (countNum) countNum.textContent = count;
    const packedTotal = this.stageHost.querySelector('.bp-packed-total');
    if (packedTotal) packedTotal.textContent = countLabel;

    this.fillBagCards(this.stageHost.querySelector('.bp-bag-cards'), selected, animateNewCard);

    const packed = this.stageHost.querySelector('.bp-packed');
    const packedList = this.stageHost.querySelector('.bp-packed-list');
    if (packedList) {
      packedList.innerHTML = selected.map(skill => `
        <div class="bp-packed-item" data-id="${skill.id}">
          <span class="bp-packed-dot bp-packed-dot--${bpEscape(skill.location || 'global')}"></span>
          <span class="bp-packed-name" title="${bpEscape(skill.sourcePath)}">${bpEscape(skill.name)}</span>
          <span class="bp-packed-loc">${bpEscape(skill.location || 'global')}</span>
          <button type="button" class="bp-remove" data-id="${skill.id}" aria-label="Remove ${bpEscape(skill.name)} from backpack">&times;</button>
        </div>
      `).join('');
    }
    if (packed) packed.classList.toggle('is-empty', count === 0);

    const footerCount = this.stageHost.querySelector('.bp-footer-count');
    if (footerCount) {
      footerCount.textContent = count === 0
        ? 'No skills selected'
        : `${count} ${count === 1 ? 'skill' : 'skills'} selected`;
    }

    const download = this.stageHost.querySelector('.bp-download');
    if (download && !this.downloading) download.disabled = count === 0;

    const clear = this.stageHost.querySelector('.bp-clear');
    if (clear) clear.disabled = count === 0;

    if (bump) this.bumpBag();
  },

  fillBagCards(container, selected, animateNewCard = false) {
    if (!container) return;
    const cards = selected.slice(-3);
    const overflow = selected.length - cards.length;
    container.innerHTML = cards.map((skill, index) => `
      <span class="bp-bag-card ${animateNewCard && index === cards.length - 1 ? 'bp-bag-card--in' : ''}" style="--i:${index}">${bpEscape(bpTruncate(skill.name, 18))}</span>
    `).join('') + (overflow > 0 ? `<span class="bp-bag-more">+${overflow}</span>` : '');
  },

  bumpBag() {
    if (!this.stageHost) return;
    const scene = this.stageHost.querySelector('.bp-bag-scene');
    if (!scene) return;
    scene.classList.remove('is-packing');
    void scene.offsetWidth;
    scene.classList.add('is-packing');
    clearTimeout(this.bumpTimer);
    this.bumpTimer = setTimeout(() => scene.classList.remove('is-packing'), 620);
  },

  async download() {
    if (!this.selected.size || this.downloading) return;

    const selectedIds = [...this.selected];
    const packedSkills = selectedIds.map(id => this.skillMap.get(id)).filter(Boolean);
    const button = this.stageHost?.querySelector('.bp-download, .bp-redownload');
    const originalLabel = button ? button.innerHTML : '';
    this.downloading = true;
    this.overlay?.classList.add('is-downloading');
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
      button.innerHTML = '<span class="bp-spinner" aria-hidden="true"></span>Packing…';
    }

    try {
      const blob = await API.bulkExport(selectedIds);
      const filename = `popopen-backpack-${new Date().toISOString().slice(0, 10)}.zip`;
      this.saveBlob(blob, filename);
      this.filename = filename;
      this.packedSkills = packedSkills;
      this.packedCount = packedSkills.length;
      this.downloading = false;
      this.overlay?.classList.remove('is-downloading');
      this.renderReady();
    } catch (err) {
      this.downloading = false;
      this.overlay?.classList.remove('is-downloading');
      if (button && button.isConnected) {
        button.disabled = false;
        button.classList.remove('is-loading');
        button.innerHTML = originalLabel;
      }
      if (typeof Toast !== 'undefined') Toast.error(`Could not pack the backpack: ${err.message}`);
    }
  },

  saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  renderReady() {
    this.stage = 'ready';
    const count = this.packedCount;
    const handoffPrompt = 'Install every skill in this backpack and follow AGENT-INSTRUCTIONS.md. Ask me before replacing a skill that already exists.';

    this.setStage(`
      <section class="bp-stage bp-stage--ready" aria-labelledby="bp-title">
        <div class="bp-ready-visual" aria-hidden="true">
          ${this.bagMarkup('bp-ready-bag')}
          <span class="bp-ready-tag">ZIP</span>
          <span class="bp-ready-check">✓</span>
        </div>
        <div class="bp-ready-copy">
          <span class="bp-eyebrow">Step 3 of 3 · Handoff</span>
          <h2 id="bp-title" tabindex="-1">Your skills are packed</h2>
          <p class="bp-lede">${count} ${count === 1 ? 'skill copy' : 'skill copies'} saved as <code class="bp-filename">${bpEscape(this.filename)}</code>.</p>
          <div class="bp-handoff">
            <div class="bp-handoff-head">
              <span class="bp-handoff-icon" aria-hidden="true">→</span>
              <div>
                <strong>How to hand it off</strong>
                <small>Popopen stays here. The backpack travels on its own.</small>
              </div>
            </div>
            <ol class="bp-handoff-steps">
              <li><span class="bp-handoff-num">1</span><span class="bp-handoff-copy">Move the ZIP to the other computer. Popopen is not needed there.</span></li>
              <li><span class="bp-handoff-num">2</span><span class="bp-handoff-copy">Open it yourself, or point your coding agent at the ZIP.</span></li>
              <li><span class="bp-handoff-num">3</span><span class="bp-handoff-copy">The agent reads <code>AGENT-INSTRUCTIONS.md</code> and asks before replacing a skill with the same name.</span></li>
            </ol>
            <div class="bp-prompt-row">
              <code class="bp-prompt-text" id="bp-handoff-prompt">${bpEscape(handoffPrompt)}</code>
              <button type="button" class="bp-copy-btn">Copy prompt</button>
            </div>
          </div>
          <div class="bp-ready-actions">
            <button type="button" class="btn bp-edit-selection">Edit selection</button>
            <button type="button" class="btn bp-redownload">Download again</button>
            <button type="button" class="btn btn-primary bp-done">Done</button>
          </div>
        </div>
      </section>
    `);

    this.stageHost.querySelector('.bp-edit-selection').addEventListener('click', () => this.renderPackStage());
    this.stageHost.querySelector('.bp-redownload').addEventListener('click', (event) => this.download(event.currentTarget));
    this.stageHost.querySelector('.bp-done').addEventListener('click', () => this.close());
    this.stageHost.querySelector('.bp-copy-btn').addEventListener('click', (event) => this.copyHandoffPrompt(event.currentTarget));
    this.stageHost.querySelector('#bp-title').focus();
  },

  async copyHandoffPrompt(button) {
    const prompt = this.stageHost?.querySelector('#bp-handoff-prompt')?.textContent || '';
    try {
      await navigator.clipboard.writeText(prompt);
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => {
        if (button.isConnected) button.textContent = original;
      }, 1600);
    } catch {
      if (typeof Toast !== 'undefined') Toast.error('Could not copy the prompt. Select it and copy manually.');
    }
  },
};
