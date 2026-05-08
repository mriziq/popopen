const express = require('express');
const archiver = require('archiver');
const { scanSkills, patchSkillFrontmatter, resolveSkillDir } = require('../lib/scanner');

const router = express.Router();

router.post('/bulk/toggle', express.json(), async (req, res) => {
  const { skills, field, value } = req.body;
  if (!skills || !field) {
    return res.status(400).json({ error: 'skills and field required' });
  }

  const results = [];
  for (const skill of skills) {
    try {
      patchSkillFrontmatter(skill, { [field]: value });
      results.push({ skill, ok: true });
    } catch (err) {
      results.push({ skill, ok: false, error: err.message });
    }
  }

  res.json({ results });
});

router.post('/bulk/export', express.json(), (req, res) => {
  const { skills } = req.body;
  if (!skills || skills.length === 0) {
    return res.status(400).json({ error: 'skills array required' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=skills-export.zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => res.status(500).json({ error: err.message }));
  archive.pipe(res);

  for (const skill of skills) {
    try {
      const realPath = resolveSkillDir(skill);
      archive.directory(realPath, skill);
    } catch (err) {
      // Skip skills that can't be resolved
    }
  }

  archive.finalize();
});

router.get('/bulk/compare-tools', (req, res) => {
  const skillNames = (req.query.skills || '').split(',').filter(Boolean);
  if (skillNames.length === 0) {
    return res.status(400).json({ error: 'skills query parameter required' });
  }

  const allSkills = scanSkills();
  const skills = {};
  const allToolsSet = new Set();

  for (const name of skillNames) {
    const skill = allSkills.find(s => s.name === name);
    const allowed = skill?.frontmatter?.['allowed-tools'] || '';
    const tools = allowed ? allowed.split(',').map(t => t.trim()).filter(Boolean) : [];
    skills[name] = tools;
    tools.forEach(t => allToolsSet.add(t));
  }

  const allTools = [...allToolsSet].sort();
  const matrix = {};
  for (const tool of allTools) {
    matrix[tool] = skillNames.filter(name => skills[name].includes(tool));
  }

  res.json({ skills, allTools, matrix });
});

module.exports = router;
