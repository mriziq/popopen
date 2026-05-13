#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(require('../package.json').version);
  process.exit(0);
}

const PORT = process.env.PORT || 3377;
const PID_FILE = '/tmp/popopen.pid';

// Check if already running
if (fs.existsSync(PID_FILE)) {
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
  try {
    process.kill(pid, 0); // Check if process exists
    // Already running, just open the browser
    console.log(`Popping open your agents ... http://localhost:${PORT}`);
    execSync(`open http://localhost:${PORT}`);
    process.exit(0);
  } catch {
    // Process doesn't exist, clean up stale PID file
    fs.unlinkSync(PID_FILE);
  }
}

// Write PID file
fs.writeFileSync(PID_FILE, String(process.pid));

// Clean up on exit
function cleanup() {
  try { fs.unlinkSync(PID_FILE); } catch {}
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

// Start the server
const { start } = require(path.join(__dirname, '..', 'server', 'index.js'));
start();

// Open browser after a short delay
setTimeout(() => {
  try {
    execSync(`open http://localhost:${PORT}`);
  } catch {}
}, 500);
