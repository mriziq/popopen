# Releasing Popopen

Releases are automated with `semantic-release`. The GitHub Actions workflow runs on pushes to `main`; it analyzes commit messages since the previous release and publishes only when they indicate a release-worthy change.

## Commit messages

Use Conventional Commits so the release workflow can determine the version change:

| Commit prefix | Release effect |
|---|---|
| `fix: ...` | Patch release |
| `feat: ...` | Minor release |
| `feat!: ...` or a `BREAKING CHANGE:` footer | Major release |
| `chore:`, `docs:`, `refactor:`, `style:` | No release by default |

Examples:

```text
fix: keep project skill search scoped to its directory
feat: add keyboard shortcut to open search
feat!: change the skills directory environment variable
```

## Workflow

The workflow in `.github/workflows/release.yml` checks out `main`, sets up Node.js 22, installs dependencies with `npm install --no-audit --no-fund`, and runs `npx semantic-release`.

The configuration in `.releaserc.json` uses the commit history to determine the next version, updates `package.json` and `CHANGELOG.md`, creates a GitHub release, and publishes the package to npm with provenance enabled. The release commit is pushed back to `main` with `[skip ci]`.

The workflow grants GitHub Actions `contents`, `issues`, `pull-requests`, and `id-token` permissions. It passes `NPM_TOKEN` as the npm authentication token. Any npm trusted-publisher configuration is managed outside this repository and is not verified here.

## Verify a release

After the workflow completes, check the published package version with:

```bash
npm view popopen version
```

Then confirm the matching GitHub release exists at `github.com/mriziq/popopen/releases`.

## Deprecating a release

For a release with a critical issue, deprecate the affected version with a clear upgrade message:

```bash
npm deprecate popopen@<version> "Please upgrade to <fixed-version>: <reason>"
```

See `.github/workflows/release.yml` and `.releaserc.json` as the source of truth for release configuration.
