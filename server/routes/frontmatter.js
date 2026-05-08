const express = require('express');
const { readSkillFrontmatter, writeSkillFrontmatter, patchSkillFrontmatter } = require('../lib/scanner');

const router = express.Router();

router.get('/frontmatter', (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });
  try {
    const data = readSkillFrontmatter(skill);
    res.json({ frontmatter: data.frontmatter, body: data.body });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.put('/frontmatter', express.json(), (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });
  try {
    const { frontmatter, body } = req.body;
    writeSkillFrontmatter(skill, frontmatter, body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/frontmatter', express.json(), (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });
  try {
    const { frontmatter } = req.body;
    patchSkillFrontmatter(skill, frontmatter);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
