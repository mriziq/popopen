const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { scanSkills } = require('../lib/scanner');

const router = express.Router();

const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');

function getEnabledPlugins() {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    return data.enabledPlugins || {};
  } catch {
    return {};
  }
}

router.get('/dashboard', (req, res) => {
  const skills = scanSkills();
  const enabledPlugins = getEnabledPlugins();

  const enriched = skills.map(skill => {
    let enabledPlugin = null;
    if (skill.pluginName) {
      // Check if any enabled plugin key contains this plugin name
      for (const key of Object.keys(enabledPlugins)) {
        if (key.startsWith(skill.pluginName + '@')) {
          enabledPlugin = enabledPlugins[key];
          break;
        }
      }
    }
    return { ...skill, enabledPlugin };
  });

  res.json({ skills: enriched });
});

module.exports = router;
