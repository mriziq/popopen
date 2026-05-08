const chokidar = require('chokidar');
const { getSkillsDir } = require('./scanner');

let clients = [];
let watcher = null;

function startWatcher() {
  const skillsDir = getSkillsDir();

  watcher = chokidar.watch(skillsDir, {
    ignoreInitial: true,
    followSymlinks: true,
    ignored: /(^|[\/\\])\.|node_modules/,
    depth: 5,
  });

  watcher.on('all', (event, filePath) => {
    const data = JSON.stringify({ event, path: filePath });
    clients.forEach(res => {
      res.write(`data: ${data}\n\n`);
    });
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
