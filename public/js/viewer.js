const Viewer = {
  container: null,
  md: null,

  init(container) {
    this.container = container;
    // markdown-it loaded via CDN in index.html won't work since we're not using CDN for it
    // We'll use the server to render, or load markdown-it from node_modules
    // For now, let's use a simple approach: serve markdown-it from node_modules
  },

  async loadMarkdownIt() {
    if (this.md) return;
    // We'll load from the server-rendered endpoint instead
    // Actually, let's just include markdown-it + hljs via CDN for simplicity
    if (typeof markdownit !== 'undefined') {
      this.md = markdownit({
        html: true,
        linkify: true,
        typographer: true,
        highlight: function (str, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(str, { language: lang }).value;
            } catch {}
          }
          return '';
        }
      });
    }
  },

  renderFrontmatter(frontmatter) {
    if (!frontmatter || Object.keys(frontmatter).length === 0) return '';

    const badges = Object.entries(frontmatter).map(([key, value]) => {
      let display = value;
      if (typeof value === 'boolean') display = value ? 'true' : 'false';
      else if (typeof value === 'string' && value.length > 60) display = value.slice(0, 60) + '...';
      return `<span class="fm-badge"><span class="fm-key">${key}:</span> ${display}</span>`;
    }).join('');

    return `<div class="frontmatter-bar">${badges}</div>`;
  },

  render(body, frontmatter) {
    let html = this.renderFrontmatter(frontmatter);

    if (this.md) {
      html += `<div class="md-content">${this.md.render(body)}</div>`;
    } else {
      // Fallback: show raw markdown in a pre block
      html += `<div class="md-content"><pre><code>${escapeHtml(body)}</code></pre></div>`;
    }

    this.container.innerHTML = html;
  },
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
