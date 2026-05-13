const Toast = {
  container: null,

  ensureContainer() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, opts = {}) {
    this.ensureContainer();
    const variant = opts.variant || 'info';
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.innerHTML = `
      <div class="toast-body">${message}</div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;
    this.container.appendChild(el);

    const dismiss = () => {
      el.classList.add('toast--leaving');
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.toast-close').addEventListener('click', dismiss);

    const duration = opts.duration === 0 ? 0 : (opts.duration || 8000);
    if (duration > 0) setTimeout(dismiss, duration);

    return { dismiss };
  },

  error(message, opts) { return this.show(message, { ...opts, variant: 'error' }); },
  success(message, opts) { return this.show(message, { ...opts, variant: 'success' }); },
};
