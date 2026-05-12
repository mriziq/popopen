const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { scanSkills, readSkillFile } = require('../lib/scanner');

const SKILLS_DIR = process.env.SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills');
const VALID_NAME_PATTERN = /[^a-zA-Z0-9_-]/g;

const router = express.Router();

router.get('/skills', (req, res) => {
  res.json({ skills: scanSkills() });
});

router.get('/files', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  try {
    res.json(readSkillFile(filePath));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

function sanitizeSkillName(name) {
  return name.replace(VALID_NAME_PATTERN, '');
}

function validateRenameInput(oldName, newName) {
  if (!oldName || !newName) {
    return { error: 'oldName and newName required', status: 400 };
  }
  const safeName = sanitizeSkillName(newName);
  if (!safeName || safeName !== newName) {
    return { error: 'Name may only contain letters, numbers, hyphens, and underscores', status: 400 };
  }
  return { safeName };
}

router.post('/skills/rename', (req, res) => {
  const { oldName, newName } = req.body;
  const validation = validateRenameInput(oldName, newName);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const { safeName } = validation;
  const oldPath = path.join(SKILLS_DIR, oldName);
  const newPath = path.join(SKILLS_DIR, safeName);

  try {
    if (fs.lstatSync(oldPath).isSymbolicLink()) {
      return res.status(403).json({ error: 'Cannot rename installed skills' });
    }
    if (fs.existsSync(newPath)) {
      return res.status(409).json({ error: 'A skill with that name already exists' });
    }
    fs.renameSync(oldPath, newPath);
    res.json({ ok: true, name: safeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
