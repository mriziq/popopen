const express = require('express');
const { scanSkills, readSkillFile } = require('../lib/scanner');

const router = express.Router();

router.get('/skills', (req, res) => {
  const skills = scanSkills();
  res.json({ skills });
});

router.get('/files', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  try {
    const result = readSkillFile(filePath);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
