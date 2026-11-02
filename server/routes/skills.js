const express = require('express');
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const { scanSkills, readSkillFile } = require('../lib/scanner');
const VALID_NAME_PATTERN = /[^a-zA-Z0-9_-]/g;
const markdown = new MarkdownIt({ html: false });

const router = express.Router();

router.get('/skills', (req, res) => {
  res.json({ skills: scanSkills() });
});

router.get('/files', (req, res) => {
  const filePath = req.query.path;
  const instanceId = req.query.instanceId;
  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  try {
    const file = readSkillFile(filePath, instanceId);
    if (path.extname(filePath).toLowerCase() === '.md') {
      file.renderedBody = markdown.render(file.body);
    }
    res.json(file);
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
  const { instanceId, oldName, newName } = req.body;
  const validation = validateRenameInput(oldName, newName);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const { safeName } = validation;
  const skills = scanSkills();
  const matches = skills.filter(item => item.name === oldName);
  const skill = instanceId ? skills.find(item => item.id === instanceId) : matches.length === 1 ? matches[0] : null;
  if (!skill) {
    if (!instanceId && matches.length > 1) return res.status(409).json({ error: 'Multiple copies have this name; instance id required' });
    return res.status(404).json({ error: `Skill "${oldName}" not found` });
  }

  if (skills.some(item => item.sourcePath !== skill.sourcePath && item.name === safeName && path.dirname(item.sourcePath) === path.dirname(skill.sourcePath))) {
    return res.status(409).json({ error: 'A skill with that name already exists' });
  }

  if (skill.isSymlink) {
    return res.status(403).json({ error: 'Cannot rename installed skills' });
  }

  const oldPath = skill.realPath;
  const newPath = path.join(path.dirname(oldPath), safeName);

  try {
    if (fs.existsSync(newPath)) {
      return res.status(409).json({ error: 'A skill with that name already exists' });
    }
    fs.renameSync(oldPath, newPath);
    const renamed = scanSkills().find(item => item.sourcePath === newPath);
    res.json({ ok: true, name: safeName, instanceId: renamed?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
