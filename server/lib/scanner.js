const fs = require('fs');
const path = require('path');
const os = require('os');
const matter = require('gray-matter');
const { readLockFile } = require('./lock-reader');

const SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills');

function getSkillsDir() {
  return SKILLS_DIR;
}

function listFilesRecursive(dir, base = '') {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const rel = base ? path.join(base, entry.name) : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push({ type: 'dir', name: rel });
      results.push(...listFilesRecursive(full, rel));
    } else if (entry.isFile()) {
      results.push({ type: 'file', name: rel });
    }
  }
  return results;
}

function parseFrontmatter(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return { frontmatter: data, body: content, raw };
  } catch {
    return null;
  }
}

function scanSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    return [];
  }

  const lockData = readLockFile();
  let entries;
  try {
    entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(SKILLS_DIR, entry.name);
    let stat;
    try {
      stat = fs.lstatSync(fullPath);
    } catch {
      continue;
    }

    const isSymlink = stat.isSymbolicLink();
    let realPath;
    try {
      realPath = fs.realpathSync(fullPath);
    } catch {
      continue;
    }

    let realStat;
    try {
      realStat = fs.statSync(realPath);
    } catch {
      continue;
    }

    if (!realStat.isDirectory()) continue;

    const files = listFilesRecursive(realPath);
    const skillMdPath = path.join(realPath, 'SKILL.md');
    const parsed = parseFrontmatter(skillMdPath);

    const fileList = files.filter(f => f.type === 'file').map(f => f.name);
    const hasGit = fs.existsSync(path.join(realPath, '.git'));
    const lock = lockData[entry.name] || {};

    // Determine scope:
    // "installed" = symlinked from ~/.agents/skills/, tracked in lock file, installed from remote
    // "custom" = local directory in ~/.claude/skills/, user-created or manually added
    const scope = isSymlink ? 'installed' : 'custom';

    const skill = {
      name: entry.name,
      description: parsed?.frontmatter?.description || '',
      scope,
      isSymlink,
      isLocal: !isSymlink,
      realPath,
      files: fileList,
      dirs: files.filter(f => f.type === 'dir').map(f => f.name),
      fileCount: fileList.length,
      hasGit,
      frontmatter: parsed?.frontmatter || null,
      source: lock.source || null,
      sourceType: lock.sourceType || null,
      sourceUrl: lock.sourceUrl || null,
      skillPath: lock.skillPath || null,
      skillFolderHash: lock.skillFolderHash || null,
      pluginName: lock.pluginName || null,
      installedAt: lock.installedAt || null,
      updatedAt: lock.updatedAt || null,
    };

    skills.push(skill);
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

function resolveSkillFilePath(skillPath) {
  // skillPath is like "linear-cli/SKILL.md"
  const full = path.join(SKILLS_DIR, skillPath);
  const real = fs.realpathSync(full);

  // Security: ensure resolved path is within skills dir or its symlink targets
  const realSkillsDir = fs.realpathSync(SKILLS_DIR);
  const agentsDir = path.join(os.homedir(), '.agents', 'skills');

  if (!real.startsWith(realSkillsDir) && !real.startsWith(agentsDir) && !real.startsWith(SKILLS_DIR)) {
    throw new Error('Path traversal detected');
  }

  return real;
}

function readSkillFile(skillPath) {
  const real = resolveSkillFilePath(skillPath);
  const raw = fs.readFileSync(real, 'utf-8');
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content, raw };
}

function writeSkillFile(skillPath, content) {
  const real = resolveSkillFilePath(skillPath);
  fs.writeFileSync(real, content, 'utf-8');
}

function readSkillFrontmatter(skillName) {
  const skillMdPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const real = fs.realpathSync(skillMdPath);
  const raw = fs.readFileSync(real, 'utf-8');
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content, raw };
}

function writeSkillFrontmatter(skillName, frontmatter, body) {
  const skillMdPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const real = fs.realpathSync(skillMdPath);
  const output = matter.stringify(body, frontmatter);
  fs.writeFileSync(real, output, 'utf-8');
}

function patchSkillFrontmatter(skillName, patch) {
  const { frontmatter, body } = readSkillFrontmatter(skillName);
  const merged = { ...frontmatter, ...patch };
  // Remove keys set to null/undefined
  for (const [k, v] of Object.entries(merged)) {
    if (v === null || v === undefined) delete merged[k];
  }
  // Remove disable-model-invocation if set to false (it's the default)
  if (merged['disable-model-invocation'] === false) delete merged['disable-model-invocation'];
  writeSkillFrontmatter(skillName, merged, body);
}

function resolveSkillDir(skillName) {
  const full = path.join(SKILLS_DIR, skillName);
  return fs.realpathSync(full);
}

function uninstallSkill(skillName) {
  const fullPath = path.join(SKILLS_DIR, skillName);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Skill "${skillName}" not found`);
  }

  const stat = fs.lstatSync(fullPath);
  const isSymlink = stat.isSymbolicLink();

  if (isSymlink) {
    // Installed (global) skill: remove the symlink
    fs.unlinkSync(fullPath);

    // Also remove from ~/.agents/skills/ if it exists there
    const agentsPath = path.join(os.homedir(), '.agents', 'skills', skillName);
    if (fs.existsSync(agentsPath)) {
      fs.rmSync(agentsPath, { recursive: true, force: true });
    }

    // Remove from lock file
    const lockFilePath = path.join(os.homedir(), '.agents', '.skill-lock.json');
    try {
      const lockRaw = fs.readFileSync(lockFilePath, 'utf-8');
      const lockData = JSON.parse(lockRaw);
      if (lockData.skills && lockData.skills[skillName]) {
        delete lockData.skills[skillName];
        fs.writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2), 'utf-8');
      }
    } catch {
      // Lock file cleanup is best-effort
    }

    return { scope: 'installed', removed: true };
  } else {
    // Custom (local) skill: delete the directory
    fs.rmSync(fullPath, { recursive: true, force: true });
    return { scope: 'custom', removed: true };
  }
}

module.exports = {
  scanSkills, readSkillFile, writeSkillFile, getSkillsDir,
  readSkillFrontmatter, writeSkillFrontmatter, patchSkillFrontmatter,
  resolveSkillDir, uninstallSkill,
};
