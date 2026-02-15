# Releasing CryptForge

This document describes the release process for CryptForge, including version bumping, tagging, and publishing binaries to GitHub Releases.

## Version Numbering

CryptForge follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH[-prerelease]

Examples:
  0.1.0         — Initial release
  0.1.1         — Patch (bug fixes)
  0.2.0         — Minor (new features, backwards-compatible)
  1.0.0         — Major (breaking changes or first stable)
  0.2.0-alpha1  — Prerelease
  0.2.0-beta3   — Beta release
```

### When to Bump Versions

- **PATCH** (0.1.0 → 0.1.1): Bug fixes, small tweaks, no new features
- **MINOR** (0.1.0 → 0.2.0): New features, new content, backwards-compatible
- **MAJOR** (0.9.0 → 1.0.0): Breaking changes, major redesign, or first stable

---

## Release Checklist

### Prerequisites

Before starting a release:

1. ✅ All tests passing locally: `npm run verify`
2. ✅ No uncommitted changes: `git status` is clean
3. ✅ On `main` branch: `git checkout main && git pull`
4. ✅ CI passing on main: Check [GitHub Actions](https://github.com/saagar210/CryptForge/actions)
5. ✅ Code signing secrets configured (for macOS/Windows): See `docs/CODE_SIGNING.md`

---

## Release Process

### Step 1: Bump Version

Use `npm version` to bump the version in all files simultaneously:

```bash
# For a patch release (0.1.0 → 0.1.1):
npm version patch

# For a minor release (0.1.1 → 0.2.0):
npm version minor

# For a major release (0.2.0 → 1.0.0):
npm version major

# For a prerelease (0.1.0 → 0.2.0-alpha1):
npm version preminor --preid=alpha

# This command:
# 1. Updates package.json
# 2. Creates a git commit: "0.2.0"
# 3. Creates a git tag: "v0.2.0"
```

**Manual Alternative** (if npm version doesn't work):

```bash
# 1. Edit version in 3 files:
# - package.json: "version": "0.2.0"
# - src-tauri/Cargo.toml: version = "0.2.0"
# - src-tauri/tauri.conf.json: "version": "0.2.0"

# 2. Commit:
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.2.0"

# 3. Tag:
git tag v0.2.0
```

---

### Step 2: Push Tag to GitHub

```bash
# Push the commit AND tag:
git push origin main
git push origin v0.2.0

# Or push all tags:
git push --tags
```

**This triggers the release workflow automatically.**

---

### Step 3: Monitor GitHub Actions

1. Go to: https://github.com/saagar210/CryptForge/actions
2. Find the "Release" workflow for tag `v0.2.0`
3. Watch the build progress (3 parallel jobs):
   - `build-release (linux)`
   - `build-release (windows)`
   - `build-release (macos)`

**Expected time:** 15-25 minutes total

Each job:
- ✅ Checks out code
- ✅ Installs dependencies
- ✅ Builds Tauri app (Rust + React)
- ✅ Signs binary (if secrets configured)
- ✅ Uploads to GitHub Release

---

### Step 4: Verify Binaries

Once the workflow completes:

1. Go to: https://github.com/saagar210/CryptForge/releases
2. Find the release for `v0.2.0` (should be marked "Draft")
3. Verify all 3 binaries are attached:
   - `cryptforge_0.2.0_x64-setup.msi` (Windows)
   - `cryptforge_0.2.0_x64.dmg` (macOS)
   - `cryptforge_0.2.0_x64.AppImage` (Linux)

---

### Step 5: Test Binaries (Critical)

**Do NOT publish until tested on all platforms.**

#### Test on Windows

```bash
# Download .msi from GitHub Release (draft)
# Double-click to install
# Launch CryptForge from Start Menu
# Verify:
# - Game loads
# - Can start new game
# - Save/load works
# - No crashes
```

#### Test on macOS

```bash
# Download .dmg from GitHub Release (draft)
# Open .dmg
# Drag CryptForge.app to Applications
# Launch from Applications folder
# Verify:
# - No "developer cannot be verified" warning (if signed)
# - Game loads
# - Full functionality
```

#### Test on Linux

```bash
# Download .AppImage from GitHub Release (draft)
chmod +x cryptforge_0.2.0_x64.AppImage
./cryptforge_0.2.0_x64.AppImage
# Verify:
# - Game launches without errors
# - Full functionality
```

---

### Step 6: Write Release Notes

Edit the GitHub Release (still in Draft):

1. Click **Edit** on the draft release
2. Update the description with:

```markdown
## 🎮 CryptForge v0.2.0 — [Release Name]

**Release Date:** February 15, 2026

### ✨ New Features
- Added feature X
- Implemented Y
- New content: Z

### 🐛 Bug Fixes
- Fixed issue #123: Description
- Resolved crash when doing X

### ⚙️ Changes
- Improved performance of Y
- Updated UI for Z

### 🎨 Content
- 5 new enemies
- 3 new items
- New floor 11+ endless mode improvements

### 📊 Stats
- Commits since last release: 47
- Contributors: 2
- Tests passing: 160

---

**Downloads:**
- Windows: `cryptforge_0.2.0_x64-setup.msi`
- macOS: `cryptforge_0.2.0_x64.dmg`
- Linux: `cryptforge_0.2.0_x64.AppImage`

**System Requirements:**
- Windows 10+ (x64)
- macOS 10.13+ (x64 or Apple Silicon)
- Linux (most distros with glibc 2.27+)

**Installation:**
- Windows: Download and run `.msi` installer
- macOS: Download `.dmg`, drag to Applications
- Linux: Download `.AppImage`, run `chmod +x` then execute

**Known Issues:**
- None

**Full Changelog:** https://github.com/saagar210/CryptForge/compare/v0.1.0...v0.2.0
```

---

### Step 7: Publish Release

1. In the GitHub Release draft, click **Publish release**
2. Release is now live at: `https://github.com/saagar210/CryptForge/releases/tag/v0.2.0`
3. Binaries are publicly downloadable

---

### Step 8: Announce (Optional)

- Post to social media
- Update itch.io or Steam page (if applicable)
- Notify Discord/community
- Post on Reddit (r/roguelikes, r/roguelikedev)

---

## Rollback / Hotfix

### If a release is broken:

#### Option 1: Delete and Recreate

```bash
# 1. Delete the release on GitHub (UI action)
# 2. Delete the tag:
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# 3. Fix the issue
git commit -am "fix: critical bug"

# 4. Re-tag (same version or bump to 0.2.1):
npm version patch  # 0.2.0 → 0.2.1
git push origin main
git push origin v0.2.1
```

#### Option 2: Hotfix Release

```bash
# 1. Fix the bug on main
git commit -am "fix: critical issue"

# 2. Bump patch version:
npm version patch  # 0.2.0 → 0.2.1

# 3. Push:
git push origin main --tags

# 4. Mark old release as deprecated:
# - Edit v0.2.0 release on GitHub
# - Add warning: "⚠️ Deprecated. Use v0.2.1 instead."
```

---

## Troubleshooting

### "Version mismatch" error in workflow

**Cause:** package.json, Cargo.toml, or tauri.conf.json version doesn't match git tag

**Fix:**
```bash
# Update all 3 files to match:
npm version 0.2.0 --no-git-tag-version
# Then commit and re-tag
```

### macOS binary not signed

**Cause:** Missing `APPLE_CERTIFICATE` or `APPLE_SIGNING_IDENTITY` in GitHub Secrets

**Fix:** See `docs/CODE_SIGNING.md`

### Windows build fails

**Cause:** Missing Visual Studio Build Tools on runner (should auto-install)

**Fix:** Workflow should handle this; if persistent, check workflow logs

### Linux AppImage won't run

**Cause:** glibc version mismatch (built on newer Ubuntu than user's distro)

**Fix:** Build on older Ubuntu (e.g., 20.04 instead of 22.04):
```yaml
# In release.yml:
- platform: linux
  os: ubuntu-20.04  # Change from ubuntu-latest
```

### Binary size too large (>100MB)

**Cause:** Debug symbols not stripped

**Fix:** Verify `Cargo.toml` has:
```toml
[profile.release]
strip = true
opt-level = "s"
lto = true
```

---

## Release History

| Version | Date | Highlights |
|---------|------|------------|
| v0.1.0 | 2026-02-15 | Initial release, 10 floors, 3 bosses, 160 tests |
| (future) | | |

---

## Related Files

- `.github/workflows/release.yml` — Release automation
- `docs/CODE_SIGNING.md` — Certificate setup
- `docs/BUILD.md` — Building from source
- `IMPLEMENTATION_PLAN.md` — Full release plan
