const Theme = (() => {
  const STORAGE_KEY = 'popopen-theme';
  const DARK_HLJS   = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/atom-one-dark.min.css';
  const LIGHT_HLJS  = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css';

  function resolvedMode(value) {
    if (value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return value;
  }

  function applyHljs(value) {
    const link = document.getElementById('hljs-theme');
    if (!link) return;
    link.href = resolvedMode(value) === 'light' ? LIGHT_HLJS : DARK_HLJS;
  }

  function apply(value) {
    document.documentElement.setAttribute('data-theme', value);
    applyHljs(value);
  }

  function set(value) {
    apply(value);
    localStorage.setItem(STORAGE_KEY, value);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeValue === value);
    });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'system';
    apply(saved);

    // React to OS preference changes while in system mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = localStorage.getItem(STORAGE_KEY) || 'system';
      if (current === 'system') applyHljs('system');
    });

    // Wire up toggle buttons (called after DOM is ready)
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => set(btn.dataset.themeValue));
        btn.classList.toggle('active', btn.dataset.themeValue === saved);
      });
    });
  }

  // Apply immediately (before DOMContentLoaded) to prevent FOUC
  const savedEarly = localStorage.getItem(STORAGE_KEY) || 'system';
  document.documentElement.setAttribute('data-theme', savedEarly);

  return { init, set };
})();

Theme.init();
