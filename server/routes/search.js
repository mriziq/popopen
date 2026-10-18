const express = require('express');
const fs = require('fs');
const path = require('path');
const { scanSkills } = require('../lib/scanner');

const router = express.Router();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textMatchRank(text, query) {
  const value = String(text || '').toLowerCase();
  if (!value.includes(query)) return Infinity;
  const wordMatch = new RegExp(`\\b${escapeRegExp(query)}\\b`, 'iu').test(value);
  if (wordMatch) return 0;
  const startsWord = new RegExp(`\\b${escapeRegExp(query)}`, 'iu').test(value);
  return startsWord ? 1 : 2;
}

function skillMatchRank(skill, query) {
  const nameRank = textMatchRank(skill.name, query);
  const descriptionRank = textMatchRank(skill.description, query);
  if (nameRank < Infinity) return nameRank;
  if (descriptionRank < Infinity) return 3 + descriptionRank;
  return 10;
}

router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) {
    return res.json({ results: [] });
  }

  const skills = scanSkills();
  const results = [];

  for (const skill of skills) {
    for (const file of skill.files) {
      const ext = file.split('.').pop().toLowerCase();
      if (!['md', 'txt', 'json', 'js', 'ts', 'py', 'yaml', 'yml', 'toml'].includes(ext)) continue;

      let content;
      try {
        const fullPath = path.join(skill.realPath, file);
        const realPath = fs.realpathSync(fullPath);
        content = fs.readFileSync(realPath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(query)) {
          const result = {
            instanceId: skill.id,
            skill: skill.name,
            location: skill.location,
            agents: skill.agents,
            isSymlink: skill.isSymlink,
            hasScripts: skill.files.some(candidate => /\.(js|ts|py)$/i.test(candidate)) || skill.dirs.some(dir => dir === 'scripts'),
            file,
            line: i + 1,
            context: lines[i].trim().substring(0, 200),
          };
          const skillRank = skillMatchRank(skill, query);
          const contextRank = textMatchRank(lines[i], query);
          results.push({ ...result, _relevance: skillRank * 10 + contextRank });
        }
      }
    }
  }

  results.sort((a, b) => a._relevance - b._relevance
    || a.skill.localeCompare(b.skill)
    || a.file.localeCompare(b.file)
    || a.line - b.line);
  res.json({ results: results.slice(0, 100).map(({ _relevance, ...result }) => result) });
});

module.exports = router;
