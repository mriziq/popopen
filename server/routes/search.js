const express = require('express');
const fs = require('fs');
const path = require('path');
const { scanSkills, getSkillsDir } = require('../lib/scanner');

const router = express.Router();

router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) {
    return res.json({ results: [] });
  }

  const skills = scanSkills();
  const skillsDir = getSkillsDir();
  const results = [];

  for (const skill of skills) {
    for (const file of skill.files) {
      const ext = file.split('.').pop().toLowerCase();
      if (!['md', 'txt', 'json', 'js', 'ts', 'py', 'yaml', 'yml', 'toml'].includes(ext)) continue;

      let content;
      try {
        const fullPath = path.join(skillsDir, skill.name, file);
        const realPath = fs.realpathSync(fullPath);
        content = fs.readFileSync(realPath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(query)) {
          results.push({
            skill: skill.name,
            file,
            line: i + 1,
            context: lines[i].trim().substring(0, 200),
          });
          if (results.length >= 100) {
            return res.json({ results });
          }
        }
      }
    }
  }

  res.json({ results });
});

module.exports = router;
