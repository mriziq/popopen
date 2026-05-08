const SkillHistory = {
  container: null,

  init(container) {
    this.container = container;
  },

  async load(skillName) {
    try {
      const [historyData, editData] = await Promise.all([
        API.getHistory(skillName),
        API.getEditLog(skillName),
      ]);
      this.render(skillName, historyData, editData);
    } catch (err) {
      this.container.innerHTML = `<p style="color: var(--accent); padding: 24px;">Failed to load history: ${err.message}</p>`;
    }
  },

  render(skillName, historyData, editData) {
    const { hasGit, commits, isLocal, sourceUrl, skillFolderHash } = historyData;
    const edits = editData.edits || [];

    this.container.innerHTML = `
      <div class="history-panel">
        <h3>History: ${skillName}</h3>

        ${hasGit ? `
          <div class="history-section">
            <h4>Git History</h4>
            <div class="commit-list">
              ${commits.map(c => `
                <div class="commit">
                  <span class="commit-hash">${c.hash}</span>
                  <span class="commit-date">${new Date(c.date).toLocaleDateString()}</span>
                  <span class="commit-message">${c.message}</span>
                </div>
              `).join('')}
              ${commits.length === 0 ? '<p class="perm-empty">No commits yet</p>' : ''}
            </div>
          </div>
        ` : isLocal ? `
          <div class="history-section">
            <h4>Git Tracking</h4>
            <p>This local skill has no git history.</p>
            <button class="btn btn-primary" id="init-git-btn">Initialize Git Tracking</button>
          </div>
        ` : `
          <div class="history-section">
            <h4>Remote Source</h4>
            ${sourceUrl ? `<p>Source: <a href="${sourceUrl.replace('.git', '')}" target="_blank" class="history-link">${sourceUrl}</a></p>` : ''}
            ${skillFolderHash ? `<p>Folder hash: <code>${skillFolderHash}</code></p>` : ''}
          </div>
        `}

        <div class="history-section">
          <h4>Edit Log (local)</h4>
          ${edits.length > 0 ? `
            <div class="edit-timeline">
              ${edits.slice(0, 50).map(e => `
                <div class="edit-entry">
                  <span class="edit-time">${new Date(e.ts).toLocaleString()}</span>
                  <span class="edit-action">${e.event}</span>
                  <span class="edit-file">${e.file || ''}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="perm-empty">No edits recorded yet</p>'}
        </div>
      </div>
    `;

    const initBtn = this.container.querySelector('#init-git-btn');
    if (initBtn) {
      initBtn.addEventListener('click', async () => {
        try {
          await API.initGit(skillName);
          await this.load(skillName);
        } catch (err) {
          alert('Failed to initialize git: ' + err.message);
        }
      });
    }
  },
};
