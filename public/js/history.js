const SkillHistory = {
  container: null,

  init(container) {
    this.container = container;
  },

  async load(skillName) {
    try {
      const editData = await API.getEditLog(skillName);
      this.render(skillName, editData.edits || []);
    } catch (err) {
      this.container.innerHTML = `<p style="color: var(--accent); padding: 24px;">Failed to load activity: ${err.message}</p>`;
    }
  },

  render(skillName, edits) {
    this.container.innerHTML = `
      <div class="history-panel">
        <h3>Activity: ${skillName}</h3>
        <div class="history-section">
          ${edits.length > 0 ? `
            <div class="edit-timeline">
              ${edits.slice(0, 100).map(e => `
                <div class="edit-entry">
                  <span class="edit-time">${new Date(e.ts).toLocaleString()}</span>
                  <span class="edit-action">${e.event}</span>
                  <span class="edit-file">${e.file || ''}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="perm-empty">No activity recorded yet — open or edit this skill to start tracking.</p>'}
        </div>
      </div>
    `;
  },
};
