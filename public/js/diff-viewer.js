const DiffViewer = {
  container: null,
  onConfirm: null,
  onCancel: null,

  init(container) {
    this.container = container;
  },

  show(original, modified, onConfirm, onCancel) {
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    const diff = this.computeDiff(original, modified);
    const additions = diff.filter(d => d.type === 'add').length;
    const deletions = diff.filter(d => d.type === 'del').length;

    this.container.innerHTML = `
      <div class="diff-panel">
        <div class="diff-header">
          <span>Review changes before saving</span>
          <span class="diff-stats">
            <span class="diff-add-count">+${additions}</span>
            <span class="diff-del-count">-${deletions}</span>
          </span>
        </div>
        <div class="diff-content">
          ${diff.map((line, i) => {
            const cls = line.type === 'add' ? 'diff-line-add' : line.type === 'del' ? 'diff-line-del' : 'diff-line-ctx';
            const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
            return `<div class="${cls}"><span class="diff-prefix">${prefix}</span><span class="diff-text">${this.escapeHtml(line.text)}</span></div>`;
          }).join('')}
        </div>
        <div class="diff-actions">
          <button class="btn btn-primary" id="diff-confirm">Confirm Save</button>
          <button class="btn" id="diff-cancel">Cancel</button>
        </div>
      </div>
    `;

    this.container.querySelector('#diff-confirm').addEventListener('click', () => {
      if (this.onConfirm) this.onConfirm();
    });

    this.container.querySelector('#diff-cancel').addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
    });
  },

  computeDiff(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const result = [];

    // Simple LCS-based diff
    const lcs = this.lcs(oldLines, newLines);
    let oi = 0, ni = 0, li = 0;

    while (oi < oldLines.length || ni < newLines.length) {
      if (li < lcs.length && oi < oldLines.length && ni < newLines.length &&
          oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
        result.push({ type: 'ctx', text: oldLines[oi] });
        oi++; ni++; li++;
      } else if (li < lcs.length && oi < oldLines.length && oldLines[oi] !== lcs[li]) {
        result.push({ type: 'del', text: oldLines[oi] });
        oi++;
      } else if (li < lcs.length && ni < newLines.length && newLines[ni] !== lcs[li]) {
        result.push({ type: 'add', text: newLines[ni] });
        ni++;
      } else if (li >= lcs.length && oi < oldLines.length) {
        result.push({ type: 'del', text: oldLines[oi] });
        oi++;
      } else if (li >= lcs.length && ni < newLines.length) {
        result.push({ type: 'add', text: newLines[ni] });
        ni++;
      } else {
        break;
      }
    }

    return result;
  },

  lcs(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Backtrack to find the actual LCS
    const result = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift(a[i - 1]);
        i--; j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return result;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
