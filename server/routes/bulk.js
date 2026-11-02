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
  res.setHeader('Content-Disposition', `attachment; filename=popopen-backpack-${new Date().toISOString().slice(0, 10)}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => res.destroy(err));
  archive.pipe(res);

  const manifest = {
    format: 'popopen-backpack',
    version: 1,
    createdAt: new Date().toISOString(),
    count: selected.length,
    skills: selected.map(skill => ({
      name: skill.name,
      bundlePath: `skills/${skill.name}--${skill.id.slice(0, 8)}`,
      location: skill.location,
      agents: skill.agents,
      description: skill.description || '',
      fileCount: skill.fileCount ?? skill.files.length,
    })),
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  const instructions = `# Popopen skills backpack

This backpack contains ${selected.length} skill ${selected.length === 1 ? 'copy' : 'copies'}, exported from Popopen on ${manifest.createdAt.slice(0, 10)}. Each folder under skills/ is a complete skill folder. manifest.json lists the original name, archive path, agent availability, and description for every entry.

## Your job

Install the selected skills for the coding agent or agents the user names. Do not install them for every agent unless the user asks.

1. Read manifest.json and match each entry to its folder under skills/.
2. Choose the destination that matches the user's agent:
   - Claude Code: global ~/.claude/skills; project .claude/skills.
   - Codex: global ~/.agents/skills; project .agents/skills.
   - OpenCode: global ~/.config/opencode/skills; project .opencode/skills. It also reads compatible .agents/skills and .claude/skills locations.
   - Hermes: global ~/.hermes/skills; project .hermes/skills or .agents/skills. Project skills require the user's trust configuration before Hermes loads them.
   - Pi: global ~/.pi/agent/skills; project .pi/skills. It also reads compatible .agents/skills and .claude/skills locations.
3. Copy the whole bundle folder to the destination and name the destination folder with the original skill name from manifest.json.
   Example: skills/commit-helper--a1b2c3d4 becomes ~/.claude/skills/commit-helper.
   Keep every file and subfolder, including scripts, references, and hidden files.
4. Before replacing a destination skill with the same name, show the conflict and ask the user whether to keep the existing skill, replace it, or install under a new name. Never overwrite silently.
5. If two bundle entries have the same original name, do not merge them. Ask the user which one to install or whether to rename one.
6. After installing, verify that each destination contains SKILL.md. Report the destination paths and any conflicts you encountered.

## Common handoff prompt

The user may hand you this backpack with:

"Install every skill in this backpack and follow AGENT-INSTRUCTIONS.md. Ask me before replacing a skill that already exists."

If the user wants only some of the skills, ask which entries to install before copying anything. Do not modify the source ZIP. Popopen is not required on this computer.
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
