# Releasing Popopen to npm

## Prerequisites

- npm account with publish access to the `popopen` package
- Logged in via `npm login` (runs once, persists via `~/.npmrc`)

To verify you're logged in:
```bash
npm whoami
```

---

## What gets published

The `files` field in `package.json` limits the published package to:

```
bin/
server/
public/
package.json
README.md
```

Nothing else (no `.git`, `package-lock.json`, `RELEASING.md`, etc.) is included. Verify before any publish:

```bash
npm pack --dry-run
```

---

## Release workflow

### 1. Bump the version

Use npm's version command — it updates `package.json`, commits the change, and creates a git tag automatically:

```bash
npm version patch   # 1.0.0 → 1.0.1  (bug fixes)
npm version minor   # 1.0.0 → 1.1.0  (new features, backwards compatible)
npm version major   # 1.0.0 → 2.0.0  (breaking changes)
```

Or set an exact version:
```bash
npm version 1.2.3
```

### 2. Push the tag

```bash
git push origin main --follow-tags
```

### 3. Publish

```bash
npm publish
```

For a public package (required the first time if the account defaults to restricted):
```bash
npm publish --access public
```

---

## Pre-publish checklist

- [ ] All changes committed and pushed
- [ ] `npm pack --dry-run` output looks correct
- [ ] Version in `package.json` reflects the nature of the change (patch/minor/major)
- [ ] `README.md` is up to date

---

## Versioning policy

Follow [semver](https://semver.org/):

| Change type | Version bump |
|---|---|
| Bug fix, security patch | `patch` |
| New feature, backwards compatible | `minor` |
| Breaking CLI change (flag rename, command rename) | `major` |
| Breaking behavior change that affects existing installs | `major` |

---

## Verifying a published release

After publishing, confirm the correct version is live:

```bash
npm view popopen
```

Test a clean install in a temp directory:
```bash
cd $(mktemp -d) && npm install popopen && npx popopen
```

---

## Deprecating a version

If a published version has a critical bug:

```bash
npm deprecate popopen@1.0.1 "Critical bug, please upgrade to 1.0.2"
```

This adds a warning to anyone installing that version without removing it from the registry.

---

## Unpublishing

npm only allows unpublishing within 72 hours of publishing and only if no other packages depend on it. Prefer deprecating over unpublishing.

```bash
npm unpublish popopen@1.0.1
```

To unpublish the entire package (destructive, use only in emergencies):
```bash
npm unpublish popopen --force
```
