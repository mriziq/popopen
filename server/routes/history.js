const express = require('express');
const fs = require('fs');
const simpleGit = require('simple-git');
const { resolveSkillDir, scanSkills } = require('../lib/scanner');
const { getEditLog } = require('../lib/analytics-store');

const router = express.Router();

router.get('/history', async (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });

  try {
    const realPath = resolveSkillDir(skill);
    const hasGit = fs.existsSync(`${realPath}/.git`);
    const skills = scanSkills();
    const skillData = skills.find(s => s.name === skill);
    const isLocal = skillData ? skillData.isLocal : false;

    if (!hasGit) {
      return res.json({
        hasGit: false,
        isLocal,
        commits: [],
        sourceUrl: skillData?.sourceUrl || null,
        skillFolderHash: skillData?.skillFolderHash || null,
      });
    }

    const git = simpleGit(realPath);
    const log = await git.log({ maxCount: 50 });

    const commits = log.all.map(c => ({
      hash: c.hash.substring(0, 7),
      date: c.date,
      author: c.author_name,
      message: c.message,
    }));

    res.json({
      hasGit: true,
      isLocal,
      commits,
      sourceUrl: skillData?.sourceUrl || null,
      skillFolderHash: skillData?.skillFolderHash || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/history/init', async (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });

  try {
    const realPath = resolveSkillDir(skill);

    if (fs.existsSync(`${realPath}/.git`)) {
      return res.json({ ok: true, message: 'Already initialized' });
    }

    const git = simpleGit(realPath);
    await git.init();
    await git.add('.');
    await git.commit('Initial commit (skill-journal)');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/edits', (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });
  const edits = getEditLog(skill);
  res.json({ edits });
});

module.exports = router;
