const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  return res.json();
}

async function fetchJsonOrThrow(url, options, errorMessage) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(errorMessage);
  return res.json();
}

function postJson(url, body) {
  return { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function putJson(url, body) {
  return { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function patchJson(body) {
  return { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) };
}

const API = {
  async getSkills() {
    const data = await fetchJson('/api/skills');
    return data.skills;
  },

  getFile(path) {
    return fetchJsonOrThrow(`/api/files?path=${encodeURIComponent(path)}`, undefined, `Failed to load ${path}`);
  },

  saveFile(path, content) {
    return fetchJsonOrThrow(
      `/api/files?path=${encodeURIComponent(path)}`,
      { method: 'PUT', body: content },
      'Failed to save'
    );
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

  async trackEvent(skill, event, file) {
    try {
      await fetch('/api/analytics/event', postJson(null, { skill, event, file }));
    } catch {}
  },

  getAnalytics() {
    return fetchJson('/api/analytics');
  },

  search(query) {
    return fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
  },

  getDashboard() {
    return fetchJson('/api/dashboard');
  },

  getFrontmatter(skill) {
    return fetchJsonOrThrow(`/api/frontmatter?skill=${encodeURIComponent(skill)}`, undefined, 'Failed to load frontmatter');
  },

  saveFrontmatter(skill, data) {
    return fetchJsonOrThrow(
      `/api/frontmatter?skill=${encodeURIComponent(skill)}`,
      putJson(null, data),
      'Failed to save frontmatter'
    );
  },

  patchFrontmatter(skill, fields) {
    return fetchJsonOrThrow(
      `/api/frontmatter?skill=${encodeURIComponent(skill)}`,
      patchJson({ frontmatter: fields }),
      'Failed to patch frontmatter'
    );
  },

  getPermissions() {
    return fetchJson('/api/settings/permissions');
  },

  getPlugins() {
    return fetchJson('/api/settings/plugins');
  },

  checkUpdate(skill) {
    return fetchJson(`/api/updates/check?skill=${encodeURIComponent(skill)}`);
  },

  applyUpdate(skill) {
    return fetchJson(`/api/updates/apply?skill=${encodeURIComponent(skill)}`, { method: 'POST' });
  },

  getUpdateStatus(skill) {
    const qs = skill ? `?skill=${encodeURIComponent(skill)}` : '';
    return fetchJson(`/api/updates/status${qs}`);
  },

  dismissUpdateStatus(skill) {
    return fetchJson(`/api/updates/status?skill=${encodeURIComponent(skill)}`, { method: 'DELETE' });
  },

  bulkToggle(skills, field, value) {
    return fetchJson('/api/bulk/toggle', postJson(null, { skills, field, value }));
  },

  async bulkExport(skills) {
    const res = await fetch('/api/bulk/export', postJson(null, { skills }));
    return res.blob();
  },

  bulkCompareTools(skills) {
    return fetchJson(`/api/bulk/compare-tools?skills=${encodeURIComponent(skills.join(','))}`);
  },

  async renameSkill(oldName, newName) {
    const res = await fetch('/api/skills/rename', postJson(null, { oldName, newName }));
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error (${res.status}) — try restarting the server`);
    }
    if (!res.ok) throw new Error(data.error || 'Rename failed');
    return data;
  },

  uninstallPreview(skill) {
    return fetchJson(`/api/uninstall/preview?skill=${encodeURIComponent(skill)}`);
  },

  async uninstallSkill(skill) {
    const res = await fetch('/api/uninstall', postJson(null, { skill }));
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Uninstall failed');
    }
    return res.json();
  },
};
