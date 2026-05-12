const express = require('express');
const { scanSkills } = require('../lib/scanner');

const router = express.Router();

// In-memory cache for update checks (5-minute TTL)
const updateCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

router.get('/updates/check', async (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });

  // Check cache
  const cached = updateCache.get(skill);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json(cached.data);
  }

  const skills = scanSkills();
  const skillData = skills.find(s => s.name === skill);

  if (!skillData || !skillData.sourceUrl || !skillData.skillFolderHash) {
    return res.json({
      skill,
      currentHash: skillData?.skillFolderHash || null,
      remoteHash: null,
      updateAvailable: false,
      error: 'No remote source info available',
    });
  }

  try {
    // Parse owner/repo from sourceUrl
    const match = skillData.sourceUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (!match) {
      return res.json({
        skill,
        currentHash: skillData.skillFolderHash,
        remoteHash: null,
        updateAvailable: false,
        error: 'Could not parse GitHub repo from sourceUrl',
      });
    }

    const [, owner, repo] = match;

    // Get the default branch tree
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (!response.ok) {
      // Try 'master' branch
      const response2 = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });
      if (!response2.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }
      var treeData = await response2.json();
    } else {
      var treeData = await response.json();
    }

    // Find the skill subfolder in the tree
    let skillFolder = '';
    if (skillData.skillPath) {
      // skillPath is like "skills/linear-cli/SKILL.md" — get parent
      const parts = skillData.skillPath.split('/');
      parts.pop(); // remove SKILL.md
      skillFolder = parts.join('/');
    }

    // Find the tree entry for the skill folder
    let remoteHash = null;
    if (skillFolder) {
      const entry = treeData.tree?.find(t => t.path === skillFolder && t.type === 'tree');
      remoteHash = entry?.sha || null;
    }

    const updateAvailable = remoteHash && remoteHash !== skillData.skillFolderHash;

    const result = {
      skill,
      currentHash: skillData.skillFolderHash,
      remoteHash,
      updateAvailable: !!updateAvailable,
      error: null,
    };

    // Cache result
    updateCache.set(skill, { ts: Date.now(), data: result });

    res.json(result);
  } catch (err) {
    const result = {
      skill,
      currentHash: skillData.skillFolderHash,
      remoteHash: null,
      updateAvailable: false,
      error: err.message,
    };
    res.json(result);
  }
});

router.post('/updates/apply', async (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'skill query parameter required' });

  try {
    // Try using the skills CLI if available
    const { execFileSync } = require('child_process');
    execFileSync('npx', ['-y', '@anthropic-ai/claude-code', 'skills', 'update', skill], {
      timeout: 30000,
      stdio: 'pipe',
    });
    // Clear cache
    updateCache.delete(skill);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Update failed: ${err.message}` });
  }
});

module.exports = router;
