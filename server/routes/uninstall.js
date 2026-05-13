const express = require('express');
const { uninstallSkill, scanSkills } = require('../lib/scanner');
const updateState = require('../lib/update-state');

const router = express.Router();

// GET info about what uninstalling would do (for confirmation UI)
router.get('/uninstall/preview', (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });

  const skills = scanSkills();
  const skillData = skills.find(s => s.name === skill);
  if (!skillData) return res.status(404).json({ error: 'Skill not found' });

  res.json({
    skill: skill,
    scope: skillData.scope,
    isSymlink: skillData.isSymlink,
    source: skillData.source,
    fileCount: skillData.fileCount,
    willRemove: skillData.scope === 'installed'
      ? [`Symlink ~/.claude/skills/${skill}`, `Source ~/.agents/skills/${skill}`, 'Lock file entry']
      : [`Directory ~/.claude/skills/${skill} (${skillData.fileCount} files)`],
  });
});

// POST to actually uninstall
router.post('/uninstall', express.json(), (req, res) => {
  const { skill } = req.body;
  if (!skill) return res.status(400).json({ error: 'skill name required' });

  try {
    const result = uninstallSkill(skill);
    updateState.clear(skill);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
