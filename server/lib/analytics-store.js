const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_DIR = path.join(os.homedir(), '.popopen');
const STORE_FILE = path.join(STORE_DIR, 'analytics.json');
const MAX_EVENTS = 10000;
const ROTATE_TO = 5000;

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readStore() {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { events: [] };
  }
}

function writeStore(data) {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function recordEvent(skill, event, file) {
  const store = readStore();
  store.events.push({ skill, event, file, ts: Date.now() });

  if (store.events.length > MAX_EVENTS) {
    store.events = store.events.slice(-ROTATE_TO);
  }

  writeStore(store);
}

function getStats() {
  const store = readStore();
  const skills = {};

  for (const evt of store.events) {
    if (!skills[evt.skill]) {
      skills[evt.skill] = { views: 0, edits: 0, saves: 0, lastViewed: null, lastEdited: null };
    }
    const s = skills[evt.skill];
    if (evt.event === 'view') {
      s.views++;
      s.lastViewed = evt.ts;
    } else if (evt.event === 'edit') {
      s.edits++;
      s.lastEdited = evt.ts;
    } else if (evt.event === 'save') {
      s.saves++;
      s.lastEdited = evt.ts;
    }
  }

  return skills;
}

module.exports = { recordEvent, getStats };
