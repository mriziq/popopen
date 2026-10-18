const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const matter = require('gray-matter');
const { readLockFile } = require('./lock-reader');

const SKILLS_DIR = process.env.SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills');
const LOCAL_SKILLS_DIR = process.env.LOCAL_SKILLS_DIR || path.join(process.cwd(), '.claude', 'skills');
const AGENTS_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const LOCK_FILE_PATH = path.join(os.homedir(), '.agents', '.skill-lock.json');

const VALID_SKILL_NAME_REGEX = /^[\w-]+$/;
const IGNORED_DIRS = new Set(['node_modules']);

function stableId(sourcePath) {
  return crypto.createHash('sha256').update(path.resolve(sourcePath)).digest('hex').slice(0, 20);
}

function getSkillsDirs() {
  const home = os.homedir();
  const project = process.cwd();
  const dirs = [
    SKILLS_DIR, LOCAL_SKILLS_DIR,
    path.join(home, '.agents', 'skills'), path.join(home, '.config', 'opencode', 'skills'),
    path.join(home, '.hermes', 'skills'), path.join(home, '.pi', 'agent', 'skills'),
    path.join(project, '.agents', 'skills'), path.join(project, '.opencode', 'skills'),
    path.join(project, '.hermes', 'skills'), path.join(project, '.pi', 'skills'),
  ];
  try {
    const raw = fs.readFileSync(path.join(home, '.hermes', 'config.yaml'), 'utf8');
    const config = matter(`---\n${raw}\n---\n`).data || {};
    for (const dir of (Array.isArray(config.skills?.external_dirs) ? config.skills.external_dirs : [])) dirs.push(path.resolve(home, dir.replace(/^~(?=$|\/)/, home)));
  } catch {}
  return [...new Set(dirs)];
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

function buildSkillRecord(entry, realPath, isSymlink, location, lockData, sourcePath, agents, hermesStatus) {
  const files = listFilesRecursive(realPath);
  const parsed = parseFrontmatter(path.join(realPath, 'SKILL.md'));
  const fileList = files.filter(f => f.type === 'file').map(f => f.name);
  const lock = (lockData || {})[entry.name] || {};

  return {
    id: stableId(sourcePath),
    name: entry.name,
    description: parsed?.frontmatter?.description || '',
    scope: isSymlink ? 'installed' : 'custom',
    location,
    sourcePath,
    agents: [...new Set(agents || [])].sort(),
    hermesTrusted: hermesStatus === 'trusted' ? true : hermesStatus === 'untrusted' ? false : null,
    hermesStatus: hermesStatus || null,
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

function containsSkillFile(dir, depth = 0) {
  if (depth > 5) return false;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  if (entries.some(entry => entry.isFile() && entry.name === 'SKILL.md')) return true;
  return entries.some(entry => entry.isDirectory() && !isHidden(entry.name) && !IGNORED_DIRS.has(entry.name)
    && containsSkillFile(path.join(dir, entry.name), depth + 1));
}

function scanDir(dir, location, lockData, agents = [], hermesStatus = null) {
  if (!fs.existsSync(dir)) return [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = [];
  const visit = (parent, children, depth) => {
    if (depth > 5) return;
    for (const entry of children) {
      if (isHidden(entry.name) || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
      const fullPath = path.join(parent, entry.name);
      let stat;
      try { stat = fs.lstatSync(fullPath); } catch { continue; }
      const realPath = safeRealpath(fullPath);
      if (!realPath) continue;
      let realStat;
      try { realStat = fs.statSync(realPath); } catch { continue; }
      if (!realStat.isDirectory()) continue;
      let childrenEntries = [];
      try { childrenEntries = fs.readdirSync(realPath, { withFileTypes: true }); } catch {}
      const hasSkillFile = childrenEntries.some(child => child.isFile() && child.name === 'SKILL.md');
      const hasNestedSkill = !hasSkillFile && containsSkillFile(realPath);
      if (hasSkillFile || (!hasNestedSkill && depth === 0)) {
        skills.push(buildSkillRecord(entry, realPath, stat.isSymbolicLink(), location, lockData, fullPath, agents, hermesStatus));
      } else if (hasNestedSkill) {
        visit(realPath, childrenEntries, depth + 1);
      }
    }
  };
  visit(dir, entries, 0);
  return skills;
}

function scanSkills() {
  const lockData = readLockFile();
  const home = os.homedir();
  const project = process.cwd();
  let hermesConfig = {};
  try {
    const configRaw = fs.readFileSync(path.join(home, '.hermes', 'config.yaml'), 'utf8');
    hermesConfig = matter(`---\n${configRaw}\n---\n`).data || {};
  } catch {}
  const trustedDirs = Array.isArray(hermesConfig.skills?.trusted_project_dirs) ? hermesConfig.skills.trusted_project_dirs : [];
  const hermesProjectEnabled = hermesConfig.skills?.project_discovery !== false;
  const projectTrusted = trustedDirs.includes(project) || trustedDirs.includes(path.basename(project));
  const hermesProjectStatus = !hermesProjectEnabled ? 'discovery-disabled' : projectTrusted ? 'trusted' : 'untrusted';

  const roots = [
    { dir: SKILLS_DIR, location: 'global', agents: ['Claude Code', 'OpenCode', 'Pi'], lock: lockData },
    { dir: path.join(home, '.agents', 'skills'), location: 'global', agents: ['Codex', 'OpenCode', 'Hermes', 'Pi'], lock: lockData },
    { dir: path.join(home, '.config', 'opencode', 'skills'), location: 'global', agents: ['OpenCode'], lock: null },
    { dir: path.join(home, '.hermes', 'skills'), location: 'global', agents: ['Hermes'], lock: null },
    { dir: path.join(home, '.pi', 'agent', 'skills'), location: 'global', agents: ['Pi'], lock: null },
    { dir: LOCAL_SKILLS_DIR, location: 'project', agents: ['Claude Code', 'OpenCode', 'Pi'], lock: null },
    { dir: path.join(project, '.agents', 'skills'), location: 'project', agents: ['Codex', 'OpenCode', 'Hermes', 'Pi'], lock: null, hermesStatus: hermesProjectStatus },
    { dir: path.join(project, '.opencode', 'skills'), location: 'project', agents: ['OpenCode'], lock: null },
    { dir: path.join(project, '.hermes', 'skills'), location: 'project', agents: ['Hermes'], lock: null, hermesStatus: hermesProjectStatus },
    { dir: path.join(project, '.pi', 'skills'), location: 'project', agents: ['Pi'], lock: null },
  ];
  for (const dir of (Array.isArray(hermesConfig.skills?.external_dirs) ? hermesConfig.skills.external_dirs : [])) {
    const expanded = dir.replace(/^~(?=$|\/)/, home);
    roots.push({ dir: path.resolve(home, expanded), location: 'external', agents: ['Hermes'], lock: null });
  }

  // Preserve override behavior while ensuring project/global roots remain separately addressable.
  const seen = new Map();
  const skills = [];
  for (const root of roots) {
    for (const skill of scanDir(root.dir, root.location, root.lock, root.agents, root.hermesStatus ?? null)) {
      const existing = seen.get(skill.sourcePath);
      if (existing) {
        existing.agents = [...new Set([...existing.agents, ...skill.agents])].sort();
        continue;
      }
      seen.set(skill.sourcePath, skill);
      skills.push(skill);
    }
  }
  skills.sort((a, b) => a.name.localeCompare(b.name) || a.location.localeCompare(b.location) || a.sourcePath.localeCompare(b.sourcePath));
  return skills;
}

function isPathInside(child, parent) {
  return child.startsWith(parent + path.sep);
}

function getSkillInstance(identifier) {
  const skills = scanSkills();
  const exact = skills.find(skill => skill.id === identifier);
  if (exact) return exact;
  const matches = skills.filter(skill => skill.name === identifier);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Skill name "${identifier}" is ambiguous; instance id required`);
  throw new Error(`Skill "${identifier}" not found`);
}

function resolveSkillFilePath(skillPath, instanceId) {
  if (instanceId) {
    const skill = getSkillInstance(instanceId);
    let relativePath = path.normalize(skillPath);
    if (relativePath.split(path.sep)[0] === skill.name) relativePath = path.join(...relativePath.split(path.sep).slice(1));
    if (path.isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)) {
      throw new Error('Path traversal detected');
    }
    const target = path.resolve(skill.realPath, relativePath);
    if (!isPathInside(target, skill.realPath)) throw new Error('Path traversal detected');
    const real = fs.realpathSync(target);
    if (!isPathInside(real, skill.realPath) && real !== skill.realPath) throw new Error('Path traversal detected');
    return real;
  }
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

function readSkillFile(skillPath, instanceId) {
  return readFileWithFrontmatter(resolveSkillFilePath(skillPath, instanceId));
}

function writeSkillFile(skillPath, content, instanceId) {
  fs.writeFileSync(resolveSkillFilePath(skillPath, instanceId), content, 'utf-8');
}

function readSkillFrontmatter(identifier) {
  const skill = getSkillInstance(identifier);
  return readFileWithFrontmatter(path.join(skill.realPath, 'SKILL.md'));
}

function writeSkillFrontmatter(identifier, frontmatter, body) {
  const skill = getSkillInstance(identifier);
  const real = path.join(skill.realPath, 'SKILL.md');
  fs.writeFileSync(real, matter.stringify(body, frontmatter), 'utf-8');
}

function patchSkillFrontmatter(identifier, patch) {
  const { frontmatter, body } = readSkillFrontmatter(identifier);
  const merged = { ...frontmatter, ...patch };

  // Strip null/undefined keys
  for (const [key, value] of Object.entries(merged)) {
    if (value === null || value === undefined) delete merged[key];
  }

  // disable-model-invocation=false is the default; omit it
  if (merged['disable-model-invocation'] === false) {
    delete merged['disable-model-invocation'];
  }

  writeSkillFrontmatter(identifier, merged, body);
}

function resolveSkillDir(identifier) {
  if (scanSkills().some(skill => skill.id === identifier)) return getSkillInstance(identifier).realPath;
  const skillName = identifier;
  if (!VALID_SKILL_NAME_REGEX.test(skillName)) {
    throw new Error('Invalid skill name');
  }

  const localPath = path.join(LOCAL_SKILLS_DIR, skillName);
  const isLocal = fs.existsSync(localPath);
  const skillPath = isLocal ? localPath : path.join(SKILLS_DIR, skillName);
  const real = fs.realpathSync(skillPath);
  const realRoot = fs.realpathSync(isLocal ? LOCAL_SKILLS_DIR : SKILLS_DIR);
  if (!isPathInside(real, realRoot) && !isPathInside(real, AGENTS_SKILLS_DIR)) {
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

function uninstallSkill(identifier) {
  const skill = getSkillInstance(identifier);
  const skillName = skill.name;
  const fullPath = skill.sourcePath;
  const isSymlink = fs.lstatSync(fullPath).isSymbolicLink();
  if (isSymlink) {
    fs.unlinkSync(fullPath);
    if (skill.scope === 'installed' && skill.location === 'global') {
      const otherLinks = scanSkills().some(item => item.id !== skill.id && item.isSymlink && item.name === skillName);
      if (!otherLinks && skill.realPath.startsWith(AGENTS_SKILLS_DIR + path.sep)) {
        fs.rmSync(skill.realPath, { recursive: true, force: true });
        removeFromLockFile(skillName);
      }
    }
    return { scope: skill.scope, removed: true };
  }
  return uninstallCustomSkill(fullPath);
}

module.exports = {
  scanSkills, getSkillInstance, readSkillFile, writeSkillFile, getSkillsDirs,
  readSkillFrontmatter, writeSkillFrontmatter, patchSkillFrontmatter,
  resolveSkillDir, uninstallSkill,
};
