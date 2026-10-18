const express = require('express');
const archiver = require('archiver');
const { scanSkills, patchSkillFrontmatter, resolveSkillDir } = require('../lib/scanner');

const router = express.Router();

router.post('/bulk/toggle', express.json(), async (req, res) => {
  const { skills, field, value } = req.body;
  if (!Array.isArray(skills) || !field) {
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
  const { skills: instanceIds } = req.body;
  if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
    return res.status(400).json({ error: 'skills array required' });
  }

  const allSkills = scanSkills();
  const selected = instanceIds.map(id => allSkills.find(skill => skill.id === id)).filter(Boolean);
  if (!selected.length) return res.status(404).json({ error: 'No selected skill instances were found' });
  let entries;
  try {
    entries = selected.map(skill => ({ skill, realPath: resolveSkillDir(skill.id) }));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=skills-export.zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => res.destroy(err));
  archive.pipe(res);

  const manifest = {
    format: 'popopen-backpack',
    version: 1,
    skills: selected.map(skill => ({
      name: skill.name,
      bundlePath: `skills/${skill.name}--${skill.id.slice(0, 8)}`,
      location: skill.location,
      agents: skill.agents,
    })),
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  const instructions = `# Popopen skills backpack

This bundle contains ${selected.length} selected skill instance${selected.length === 1 ? '' : 's'}. Skill folders are preserved under skills/. See manifest.json for each skill's original name and folder path.

## Install with an agent

Point your coding agent at this ZIP or its extracted folder and ask it to install the selected skills for that agent. Copy each complete folder to the agent's documented skills directory and name the destination folder using the original skill name in manifest.json. Preserve all files.

Common locations:
- Claude Code: global ~/.claude/skills; project .claude/skills.
- Codex: global ~/.agents/skills; project .agents/skills.
- OpenCode: global ~/.config/opencode/skills; project .opencode/skills. It also reads compatible .agents/skills and .claude/skills locations.
- Hermes: global ~/.hermes/skills; project .hermes/skills or .agents/skills. Project skills require the user's trust configuration before Hermes loads them.
- Pi: global ~/.pi/agent/skills; project .pi/skills. It also reads compatible .agents/skills and .claude/skills locations.

Before replacing a destination skill with the same name, show the conflict and ask whether to keep, replace, or rename it. Never overwrite silently. If two bundle entries have the same name, ask which one to install or whether to rename one; do not merge them. This bundle does not require Popopen.
`;
  archive.append(instructions, { name: 'AGENT-INSTRUCTIONS.md' });

  for (const { skill, realPath } of entries) {
    archive.directory(realPath, `skills/${skill.name}--${skill.id.slice(0, 8)}`);
  }

  archive.finalize();
});

router.get('/bulk/compare-tools', (req, res) => {
  const instanceIds = (req.query.skills || '').split(',').filter(Boolean);
  if (instanceIds.length === 0) {
    return res.status(400).json({ error: 'skills query parameter required' });
  }

  const allSkills = scanSkills();
  const skills = {};
  const allToolsSet = new Set();

  for (const id of instanceIds) {
    const skill = allSkills.find(s => s.id === id);
    if (!skill) continue;
    const name = skill.name;
    const allowed = skill?.frontmatter?.['allowed-tools'] || '';
    const tools = allowed ? allowed.split(',').map(t => t.trim()).filter(Boolean) : [];
    skills[id] = { name, tools, sourcePath: skill.sourcePath };
    tools.forEach(t => allToolsSet.add(t));
  }

  const allTools = [...allToolsSet].sort();
  const matrix = {};
  for (const tool of allTools) {
    matrix[tool] = instanceIds.filter(id => skills[id]?.tools.includes(tool));
  }

  res.json({ skills, allTools, matrix });
});

module.exports = router;
