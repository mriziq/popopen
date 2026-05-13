const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(os.homedir(), '.claude', 'popopen');
const STATE_FILE = path.join(STATE_DIR, 'update-state.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAll(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, STATE_FILE);
}

function update(skill, patch) {
  const state = readAll();
  state[skill] = { ...(state[skill] || {}), ...patch, skill };
  writeAll(state);
  return state[skill];
}

function start(skill) {
  return update(skill, { status: 'in-progress', startedAt: Date.now(), finishedAt: null, error: null });
}

function succeed(skill) {
  return update(skill, { status: 'success', finishedAt: Date.now(), error: null });
}

function fail(skill, error) {
  return update(skill, { status: 'failed', finishedAt: Date.now(), error: String(error) });
}

function get(skill) {
  return readAll()[skill] || null;
}

function getAll() {
  return readAll();
}

function clear(skill) {
  const state = readAll();
  if (state[skill]) {
    delete state[skill];
    writeAll(state);
  }
}

function sweepStale() {
  const state = readAll();
  let changed = false;
  for (const [skill, entry] of Object.entries(state)) {
    if (entry.status === 'in-progress') {
      state[skill] = { ...entry, status: 'failed', finishedAt: Date.now(), error: 'Server was interrupted during update' };
      changed = true;
    }
  }
  if (changed) writeAll(state);
}

module.exports = { start, succeed, fail, get, getAll, clear, sweepStale };
