# Branch Protection Setup

This document explains how to enable branch protection rules on the `main` branch to ensure that all code passing through CI before merging.

## Why Branch Protection?

Branch protection prevents broken code from landing in `main` by:
- Requiring all CI checks to pass before merge
- Enforcing code review (optional but recommended)
- Preventing force pushes and deletion of `main`

## Setup Instructions

### Step 1: Navigate to Repository Settings

1. Go to: https://github.com/saagar210/CryptForge
2. Click **Settings** (top navigation)
3. In left sidebar, click **Branches** (under "Code and automation")

### Step 2: Add Branch Protection Rule

1. Click **Add branch protection rule**
2. In "Branch name pattern", enter: `main`

### Step 3: Configure Protection Rules

Enable the following settings:

#### ✅ Require status checks to pass before merging
- **Check:** Enable this option
- Click **Add** next to "Status checks that are required"
- Search for and add these 3 checks:
  - `test (ubuntu-latest)`
  - `test (windows-latest)`
  - `test (macos-latest)`
- **Check:** "Require branches to be up to date before merging"

#### ✅ Require pull request reviews before merging (Optional but Recommended)
- **Check:** Enable this option
- Set "Required approving reviews" to: **1**
- **Check:** "Dismiss stale pull request approvals when new commits are pushed"

#### ✅ Do not allow bypassing the above settings
- **Check:** "Do not allow bypassing the above settings"
- This ensures admins also follow the rules

#### ✅ Require linear history (Optional)
- **Check:** Enable to prevent merge commits
- Forces rebase or squash merges

#### ❌ Do NOT enable "Require deployments to succeed"
- Not needed for this project

#### ❌ Do NOT enable "Lock branch"
- Would prevent all pushes

### Step 4: Save Rules

1. Scroll to bottom
2. Click **Create** (or **Save changes** if editing)
3. Verify: Branch protection rule now appears for `main`

## Verification

### Test Branch Protection

1. Create a test branch with a failing test:
   ```bash
   git checkout -b test-branch-protection
   # Make a change that breaks a test
   git commit -am "test: intentional failure"
   git push origin test-branch-protection
   ```

2. Create a PR on GitHub
3. Verify:
   - CI workflow runs automatically
   - PR shows "❌ Some checks were not successful"
   - "Merge pull request" button is **disabled** (greyed out)

4. Fix the test:
   ```bash
   # Fix the issue
   git commit -am "fix: resolve test failure"
   git push origin test-branch-protection
   ```

5. Verify:
   - CI re-runs automatically
   - PR shows "✅ All checks have passed"
   - "Merge pull request" button is **enabled** (green)

6. Clean up:
   ```bash
   git checkout main
   git branch -D test-branch-protection
   git push origin --delete test-branch-protection
   ```

## Troubleshooting

### "Status checks not found"
- **Cause:** CI workflow hasn't run yet on main branch
- **Fix:** Merge the CI workflow PR first, then enable branch protection

### Can't find status check names
- **Cause:** Status check names must match exactly
- **Fix:** Run the workflow once, then check GitHub Actions tab for exact names

### Merge button still enabled despite failing checks
- **Cause:** Branch protection not properly configured
- **Fix:** Re-check "Require status checks to pass before merging" is enabled

### Admin can still merge failing PRs
- **Cause:** "Do not allow bypassing" is not checked
- **Fix:** Enable "Do not allow bypassing the above settings"

## Current Status

- ✅ CI workflow created (`.github/workflows/ci.yml`)
- ⏳ **TODO:** Enable branch protection after merging this PR
- ⏳ **TODO:** Test protection with a failing PR

## Related Files

- `.github/workflows/ci.yml` — The CI pipeline
- `IMPLEMENTATION_PLAN.md` — Full execution plan
- `docs/RELEASE.md` — Release process (created in Phase 4B)
