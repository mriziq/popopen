const FRONTMATTER_MAX_DISPLAY_LENGTH = 48;

function formatFrontmatterValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function buildFrontmatterBadge(key, value) {
  const full = formatFrontmatterValue(value);
  const display = truncate(full, FRONTMATTER_MAX_DISPLAY_LENGTH);
  const safeTitle = full.replace(/"/g, '&quot;');
  return `<span class="fm-badge" title="${safeTitle}"><span class="fm-key">${key}:</span> ${display}</span>`;
}

const Viewer = {
  container: null,

  init(container) {
    this.container = container;
  },

  renderFrontmatterBar(frontmatter) {
    const bar = document.createElement('div');
    bar.className = 'frontmatter-bar';
    bar.innerHTML = Object.entries(frontmatter).map(([k, v]) => buildFrontmatterBadge(k, v)).join('');
    return bar;
  },

  render(body, frontmatter) {
    this.container.innerHTML = '';

    if (frontmatter && Object.keys(frontmatter).length > 0) {
      this.container.appendChild(this.renderFrontmatterBar(frontmatter));
    }

    const pre = document.createElement('pre');
    pre.className = 'raw-viewer';
    pre.textContent = body;
    this.container.appendChild(pre);
  },
};
