const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCK_FILE = path.join(os.homedir(), '.agents', '.skill-lock.json');

function readLockFile() {
  try {
    const raw = fs.readFileSync(LOCK_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const skills = data.skills || {};
    const result = {};
    for (const [name, info] of Object.entries(skills)) {
      result[name] = {
        source: info.source || null,
        sourceType: info.sourceType || null,
        sourceUrl: info.sourceUrl || null,
        skillPath: info.skillPath || null,
        skillFolderHash: info.skillFolderHash || null,
        pluginName: info.pluginName || null,
        installedAt: info.installedAt || null,
        updatedAt: info.updatedAt || null,
      };
    }
    return result;
  } catch {
    return {};
  }
}

module.exports = { readLockFile };
