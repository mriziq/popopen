const fs = require('fs');
const path = require('path');
const os = require('os');
const matter = require('gray-matter');
const { readLockFile } = require('./lock-reader');

const SKILLS_DIR = process.env.SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills');
const LOCAL_SKILLS_DIR = process.env.LOCAL_SKILLS_DIR || path.join(process.cwd(), '.claude', 'skills');
const AGENTS_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const LOCK_FILE_PATH = path.join(os.homedir(), '.agents', '.skill-lock.json');

const VALID_SKILL_NAME_REGEX = /^[\w-]+$/;
const IGNORED_DIRS = new Set(['node_modules']);

function getSkillsDir() {
  return SKILLS_DIR;
}

function isHidden(name) {
  return name.startsWith('.');
}

function safeRealpath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
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
    if (isHidden(entry.name) || IGNORED_DIRS.has(entry.name)) continue;
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

function buildSkillRecord(entry, realPath, isSymlink, location, lockData) {
  const files = listFilesRecursive(realPath);
  const parsed = parseFrontmatter(path.join(realPath, 'SKILL.md'));
  const fileList = files.filter(f => f.type === 'file').map(f => f.name);
  const lock = (lockData || {})[entry.name] || {};

  return {
    name: entry.name,
    description: parsed?.frontmatter?.description || '',
    scope: isSymlink ? 'installed' : 'custom',
    location,
    isSymlink,
    isLocal: !isSymlink,
    realPath,
    files: fileList,
    dirs: files.filter(f => f.type === 'dir').map(f => f.name),
    fileCount: fileList.length,
    hasGit: fs.existsSync(path.join(realPath, '.git')),
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
}

function scanDir(dir, location, lockData) {
  if (!fs.existsSync(dir)) return [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = [];
  for (const entry of entries) {
    if (isHidden(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    let stat;
    try { stat = fs.lstatSync(fullPath); } catch { continue; }

    const realPath = safeRealpath(fullPath);
    if (!realPath) continue;

    let realStat;
    try { realStat = fs.statSync(realPath); } catch { continue; }
    if (!realStat.isDirectory()) continue;

    skills.push(buildSkillRecord(entry, realPath, stat.isSymbolicLink(), location, lockData));
  }
  return skills;
}

function scanSkills() {
  const lockData = readLockFile();
  const global = scanDir(SKILLS_DIR, 'global', lockData);
  const local = scanDir(LOCAL_SKILLS_DIR, 'local', null);

  // Local skills shadow global skills of the same name
  const localNames = new Set(local.map(s => s.name));
  const skills = [...local, ...global.filter(s => !localNames.has(s.name))];
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

function isPathInside(child, parent) {
  return child.startsWith(parent + path.sep);
}

function resolveSkillFilePath(skillPath) {
  const realLocalDir = fs.existsSync(LOCAL_SKILLS_DIR) ? fs.realpathSync(LOCAL_SKILLS_DIR) : LOCAL_SKILLS_DIR;
  const realSkillsDir = fs.existsSync(SKILLS_DIR) ? fs.realpathSync(SKILLS_DIR) : SKILLS_DIR;

  // Prefer local skills dir if the skill exists there
  const localFull = path.join(LOCAL_SKILLS_DIR, skillPath);
  if (fs.existsSync(localFull)) {
    const real = fs.realpathSync(localFull);
    if (isPathInside(real, realLocalDir)) return real;
  }

  const real = fs.realpathSync(path.join(SKILLS_DIR, skillPath));
  const allowed =
    isPathInside(real, realSkillsDir) ||
    isPathInside(real, AGENTS_SKILLS_DIR) ||
    isPathInside(real, SKILLS_DIR);

  if (!allowed) throw new Error('Path traversal detected');
  return real;
}

function readFileWithFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content, raw };
}

function readSkillFile(skillPath) {
  return readFileWithFrontmatter(resolveSkillFilePath(skillPath));
}

function writeSkillFile(skillPath, content) {
  fs.writeFileSync(resolveSkillFilePath(skillPath), content, 'utf-8');
}

function readSkillFrontmatter(skillName) {
  return readFileWithFrontmatter(resolveSkillFilePath(path.join(skillName, 'SKILL.md')));
}

function writeSkillFrontmatter(skillName, frontmatter, body) {
  const real = resolveSkillFilePath(path.join(skillName, 'SKILL.md'));
  fs.writeFileSync(real, matter.stringify(body, frontmatter), 'utf-8');
}

function patchSkillFrontmatter(skillName, patch) {
  const { frontmatter, body } = readSkillFrontmatter(skillName);
  const merged = { ...frontmatter, ...patch };

  // Strip null/undefined keys
  for (const [key, value] of Object.entries(merged)) {
    if (value === null || value === undefined) delete merged[key];
  }

  // disable-model-invocation=false is the default; omit it
  if (merged['disable-model-invocation'] === false) {
    delete merged['disable-model-invocation'];
  }

  writeSkillFrontmatter(skillName, merged, body);
}

function resolveSkillDir(skillName) {
  const real = fs.realpathSync(path.join(SKILLS_DIR, skillName));
  const realSkillsDir = fs.realpathSync(SKILLS_DIR);
  if (!isPathInside(real, realSkillsDir) && !isPathInside(real, AGENTS_SKILLS_DIR)) {
    throw new Error('Path traversal detected');
  }
  return real;
}

function removeFromLockFile(skillName) {
  try {
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE_PATH, 'utf-8'));
    if (lockData.skills && lockData.skills[skillName]) {
      delete lockData.skills[skillName];
      fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(lockData, null, 2), 'utf-8');
    }
  } catch {
    // Best-effort cleanup
  }
}

function uninstallInstalledSkill(skillName, fullPath) {
  fs.unlinkSync(fullPath);

  const agentsPath = path.join(AGENTS_SKILLS_DIR, skillName);
  if (fs.existsSync(agentsPath)) {
    fs.rmSync(agentsPath, { recursive: true, force: true });
  }

  removeFromLockFile(skillName);
  return { scope: 'installed', removed: true };
}

function uninstallCustomSkill(fullPath) {
  fs.rmSync(fullPath, { recursive: true, force: true });
  return { scope: 'custom', removed: true };
}

function uninstallSkill(skillName) {
  if (!VALID_SKILL_NAME_REGEX.test(skillName)) {
    throw new Error('Invalid skill name');
  }

  const fullPath = path.join(SKILLS_DIR, skillName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Skill "${skillName}" not found`);
  }

  const isSymlink = fs.lstatSync(fullPath).isSymbolicLink();
  return isSymlink
    ? uninstallInstalledSkill(skillName, fullPath)
    : uninstallCustomSkill(fullPath);
}

module.exports = {
  scanSkills, readSkillFile, writeSkillFile, getSkillsDir,
  readSkillFrontmatter, writeSkillFrontmatter, patchSkillFrontmatter,
  resolveSkillDir, uninstallSkill,
};
