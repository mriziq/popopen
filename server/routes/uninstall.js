const express = require('express');
const path = require('path');
const os = require('os');
const { uninstallSkill, getSkillInstance, scanSkills } = require('../lib/scanner');
const updateState = require('../lib/update-state');

const router = express.Router();

// GET info about what uninstalling would do (for confirmation UI)
router.get('/uninstall/preview', (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });

  let skillData;
  try { skillData = getSkillInstance(skill); } catch (err) {
    return res.status(err.message.includes('ambiguous') ? 409 : 404).json({ error: err.message });
  }
  let willRemove;
  if (skillData.isSymlink) {
    willRemove = [skillData.location === 'project' ? 'Project skill link' : 'Global skill link'];
    const agentsRoot = path.join(os.homedir(), '.agents', 'skills') + path.sep;
    const hasOtherLink = scanSkills().some(item => item.id !== skillData.id && item.isSymlink && item.realPath === skillData.realPath);
    if (skillData.location === 'global' && skillData.realPath.startsWith(agentsRoot) && !hasOtherLink) {
      willRemove.push('Installed skill source under ~/.agents/skills', 'Skill lock file entry');
    } else if (hasOtherLink) {
      willRemove.push('The shared skill source will remain because another link uses it');
    }
  } else {
    willRemove = [`${skillData.location === 'project' ? 'Project' : skillData.location === 'external' ? 'External' : 'Global'} skill directory (${skillData.fileCount} files)`];
  }

  res.json({
    skill: skillData.name,
    instanceId: skillData.id,
    sourcePath: skillData.sourcePath,
    scope: skillData.scope,
    isSymlink: skillData.isSymlink,
    source: skillData.source,
    fileCount: skillData.fileCount,
    willRemove,
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
