# Releasing Popopen

Releases are fully automated. Every push to `main` triggers the release workflow — no manual version bumps, no manual npm publishes. The version bump and publish only happen when a commit message signals a meaningful change.

---

## How releases are triggered

The release workflow reads your commit messages using the [Conventional Commits](https://www.conventionalcommits.org/) format to decide whether to release and what version to bump.

| Commit prefix | What it signals | Version bump |
|---|---|---|
| `fix: ...` | Bug fix | Patch — `1.0.0 → 1.0.1` |
| `feat: ...` | New feature, backwards compatible | Minor — `1.0.0 → 1.1.0` |
| `feat!:` or `BREAKING CHANGE:` in body | Breaking change | Major — `1.0.0 → 2.0.0` |
| `chore:`, `docs:`, `refactor:`, `style:` | Maintenance, no user impact | No release |

### Examples

```bash
# Cuts a patch release
git commit -m "fix: sidebar not updating when skill is deleted"

# Cuts a minor release
git commit -m "feat: add keyboard shortcut to open search"

# Cuts a major release
git commit -m "feat!: rename PORT env var to POPOPEN_PORT"

# No release — workflow runs but nothing is published
git commit -m "chore: update dev dependencies"
git commit -m "docs: improve README install instructions"
```

---

## What happens on a release

When a releasable commit lands on `main`, the workflow automatically:

1. Determines the next version from commit messages since the last release
2. Updates `package.json` with the new version
3. Generates / updates `CHANGELOG.md`
4. Commits those changes back to `main` with `[skip ci]` to avoid a loop
5. Creates a GitHub Release with generated release notes
6. Publishes the new version to npm

---

## Verifying a release

After the workflow completes, confirm the new version is live:

```bash
npm view popopen
```

Or check the GitHub Releases page: `github.com/mriziq/popopen/releases`

---

## Emergency: deprecating or unpublishing a version

If a published version has a critical bug, deprecate it rather than unpublish:

```bash
npm deprecate popopen@1.0.1 "Critical bug, please upgrade to 1.0.2"
```

npm only allows unpublishing within 72 hours and only if no other packages depend on it:

```bash
npm unpublish popopen@1.0.1
```

---

## Infrastructure

- **Workflow file:** `.github/workflows/release.yml`
- **Release config:** `.releaserc.json`
- **GitHub secret required:** `NPM_TOKEN` (Automation token from npmjs.com)
- **Trusted Publisher:** configured on npmjs.com for `mriziq/popopen` / `release.yml`
