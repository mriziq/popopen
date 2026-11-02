const chokidar = require('chokidar');
const { getSkillsDirs } = require('./scanner');

let clients = [];
let watcher = null;
let watcherWarningShown = false;

function startWatcher() {
  const skillsDirs = getSkillsDirs();
  watcherWarningShown = false;

  watcher = chokidar.watch(skillsDirs, {
    ignoreInitial: true,
    followSymlinks: true,
    ignored: /(^|[\/\\])node_modules([\/\\]|$)/,
    depth: 5,
  });

  watcher.on('all', (event, filePath) => {
    const data = JSON.stringify({ event, path: filePath });
    clients.forEach(res => {
      res.write(`data: ${data}\n\n`);
    });
  });

  watcher.on('error', (err) => {
    if (err.code === 'EMFILE') {
      if (!watcherWarningShown) console.warn('Live file watching is unavailable because this computer reached its open-file limit. Popopen remains usable; reload the page to refresh changes.');
      watcherWarningShown = true;
      const failedWatcher = watcher;
      watcher = null;
      failedWatcher?.close();
      return;
    }
    console.warn(`Skill file watcher warning: ${err.message}`);
  });
}

function addClient(res) {
  clients.push(res);
  res.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

module.exports = { startWatcher, addClient, stopWatcher };
