const API = {
  async getSkills() {
    const res = await fetch('/api/skills');
    const data = await res.json();
    return data.skills;
  },

  async getFile(path) {
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  },

  async saveFile(path, content) {
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: content,
    });
    if (!res.ok) throw new Error('Failed to save');
    return res.json();
  },

  connectEvents(onMessage) {
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {}
    };
    return es;
  },

  // Analytics
  async trackEvent(skill, event, file) {
    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, event, file }),
      });
    } catch {}
  },

  async getAnalytics() {
    const res = await fetch('/api/analytics');
    return res.json();
  },

  // Search
  async search(query) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  // Dashboard
  async getDashboard() {
    const res = await fetch('/api/dashboard');
    return res.json();
  },

  // Frontmatter
  async getFrontmatter(skill) {
    const res = await fetch(`/api/frontmatter?skill=${encodeURIComponent(skill)}`);
    if (!res.ok) throw new Error('Failed to load frontmatter');
    return res.json();
  },

  async saveFrontmatter(skill, data) {
    const res = await fetch(`/api/frontmatter?skill=${encodeURIComponent(skill)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save frontmatter');
    return res.json();
  },

  async patchFrontmatter(skill, fields) {
    const res = await fetch(`/api/frontmatter?skill=${encodeURIComponent(skill)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: fields }),
    });
    if (!res.ok) throw new Error('Failed to patch frontmatter');
    return res.json();
  },

  // Settings
  async getPermissions() {
    const res = await fetch('/api/settings/permissions');
    return res.json();
  },

  async getPlugins() {
    const res = await fetch('/api/settings/plugins');
    return res.json();
  },

  // History
  async getHistory(skill) {
    const res = await fetch(`/api/history?skill=${encodeURIComponent(skill)}`);
    return res.json();
  },

  async initGit(skill) {
    const res = await fetch(`/api/history/init?skill=${encodeURIComponent(skill)}`, {
      method: 'POST',
    });
    return res.json();
  },

  async getEditLog(skill) {
    const res = await fetch(`/api/history/edits?skill=${encodeURIComponent(skill)}`);
    return res.json();
  },

  // Updates
  async checkUpdate(skill) {
    const res = await fetch(`/api/updates/check?skill=${encodeURIComponent(skill)}`);
    return res.json();
  },

  async applyUpdate(skill) {
    const res = await fetch(`/api/updates/apply?skill=${encodeURIComponent(skill)}`, {
      method: 'POST',
    });
    return res.json();
  },

  // Bulk
  async bulkToggle(skills, field, value) {
    const res = await fetch('/api/bulk/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, field, value }),
    });
    return res.json();
  },

  async bulkExport(skills) {
    const res = await fetch('/api/bulk/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills }),
    });
    return res.blob();
  },

  async bulkCompareTools(skills) {
    const res = await fetch(`/api/bulk/compare-tools?skills=${encodeURIComponent(skills.join(','))}`);
    return res.json();
  },

  // Uninstall
  async uninstallPreview(skill) {
    const res = await fetch(`/api/uninstall/preview?skill=${encodeURIComponent(skill)}`);
    return res.json();
  },

  async uninstallSkill(skill) {
    const res = await fetch('/api/uninstall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Uninstall failed');
    }
    return res.json();
  },
};
