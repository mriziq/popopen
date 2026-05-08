const Editor = {
  container: null,
  textarea: null,
  currentPath: null,
  currentContent: null,

  init(container) {
    this.container = container;
  },

  open(path, rawContent) {
    this.currentPath = path;
    this.currentContent = rawContent;
    this.container.innerHTML = '';

    // Simple textarea editor for now (CodeMirror will be Phase 3)
    this.textarea = document.createElement('textarea');
    this.textarea.value = rawContent;
    this.textarea.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 500px;
      padding: 20px 32px;
      background: var(--void, #08080c);
      color: var(--text, #c8c8d4);
      border: none;
      outline: none;
      font-family: 'Space Mono', 'IBM Plex Mono', monospace;
      font-size: 13px;
      line-height: 1.7;
      resize: none;
      tab-size: 2;
      caret-color: #d4915c;
    `;

    // Handle tab key for indentation
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
      }
    });

    this.container.appendChild(this.textarea);
  },

  getContent() {
    return this.textarea ? this.textarea.value : this.currentContent;
  },

  close() {
    this.container.innerHTML = '';
    this.textarea = null;
    this.currentPath = null;
    this.currentContent = null;
  },
};
