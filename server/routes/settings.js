const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const router = express.Router();

const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');
const SETTINGS_LOCAL_FILE = path.join(os.homedir(), '.claude', 'settings.local.json');
const PLUGINS_FILE = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

router.get('/settings/permissions', (req, res) => {
  const local = readJsonFile(SETTINGS_LOCAL_FILE);
  const permissions = local.permissions?.allow || [];
  const deny = local.permissions?.deny || [];
  res.json({ permissions, deny });
});

router.get('/settings/plugins', (req, res) => {
  const settings = readJsonFile(SETTINGS_FILE);
  const plugins = readJsonFile(PLUGINS_FILE);
  res.json({
    enabledPlugins: settings.enabledPlugins || {},
    plugins: plugins.plugins || {},
  });
});

module.exports = router;
