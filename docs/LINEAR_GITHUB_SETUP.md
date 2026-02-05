# Linear + GitHub + Claude Code Integration Setup

This guide walks through configuring the Linear → GitHub → Claude workflow for remote code implementation.

## 🎯 Workflow Overview

1. **Create issue in Linear** with `@claude` mention
2. **Linear syncs to GitHub** automatically
3. **GitHub Action triggers** Claude Code
4. **Claude implements** the feature/fix
5. **PR is created** for review
6. **After merge**, Linear status updates

## ✅ Step 1: GitHub Workflow (COMPLETED)

The `.github/workflows/claude.yml` file has been updated with:

- ✅ Write permissions for contents, PRs, and issues
- ✅ Custom prompt instructing Claude to follow CLAUDE.md conventions
- ✅ Requirement to include tests and link back to issues

No further action needed for this step.

## 📋 Step 2: Configure Linear → GitHub Integration

### 2.1 Connect Linear to GitHub

1. **Open Linear Settings**
   - Click the gear icon (⚙️) in the bottom left
   - Navigate to **Workspace Settings** → **Integrations**

2. **Find GitHub Integration**
   - Locate the **GitHub** integration card
   - Click **Add** or **Configure** (if already connected)

3. **Authorize Connection**
   - Select your GitHub account
   - Authorize Linear to access `trainers-gg/trainers.gg` repository
   - Grant required permissions:
     - Read/write access to issues
     - Read/write access to pull requests
     - Read access to repository metadata

### 2.2 Configure Sync Settings

1. **Select Repository**
   - Choose `trainers-gg/trainers.gg` from the dropdown
   - Optionally select which Linear team(s) should sync to this repo

2. **Enable Two-Way Sync**
   - ✅ **Create GitHub issues from Linear issues**
   - ✅ **Sync comments bidirectionally**
   - ✅ **Sync status updates**
   - ✅ **Sync assignees**

3. **Ensure @claude Mentions** (Critical)

   There are three ways to ensure `@claude` appears in synced issues:

   **Method 1: Linear Issue Templates (Recommended)**
   - Create a Linear issue template (Team Settings → Templates)
   - Include `@claude` in the template description
   - Use this template when creating issues
   - See "Linear Issue Templates" section below for detailed steps

   **Method 2: Manual Addition**
   - Simply add `@claude` to each Linear issue description manually
   - When synced to GitHub, the mention is preserved

4. **Label Mapping** (Recommended)

   Map Linear workflow states to GitHub labels:

   | Linear Status | GitHub Label         |
   | ------------- | -------------------- |
   | Backlog       | `backlog`            |
   | Ready         | `ready-to-implement` |
   | In Progress   | `in-progress`        |
   | In Review     | `in-review`          |
   | Done          | `implemented`        |
   | Canceled      | `wontfix`            |

5. **Save Configuration**
   - Click **Save** or **Update Settings**
   - Wait for confirmation message

### 2.3 Create Linear Issue Templates (Recommended)

To automatically include `@claude` in every issue, create a Linear template:

1. **Navigate to Templates**
   - Go to **Team Settings → Templates**
   - Or **Workspace Settings → Templates** (for cross-team templates)

2. **Create New Template**
   - Click **"New template"**
   - Select **"Standard template"**
   - Name: "Claude Implementation" or "Ready for Development"

3. **Configure Template Content**

   ```markdown
   ## Description

   [Describe what needs to be built or fixed]

   ## Acceptance Criteria

   - [ ] [Criterion 1]
   - [ ] [Criterion 2]

   ## Technical Notes

   [Any implementation details, APIs to use, edge cases, etc.]

   ---

   @claude please implement this following the project conventions in CLAUDE.md.
   ```

4. **Set Default Properties** (optional)
   - Status: "Ready"
   - Labels: `ready-to-implement`, `automation`
   - Priority: Medium
   - Assignee: (leave blank or set default)

5. **Make Default Template** (optional)
   - In Team Settings → Templates
   - Click on your template → Set as "Default for team members"
   - Now every new issue will use this template automatically

6. **Save Template**

**Usage:** When creating a new issue, press `Option/Alt + C` or click "Template" next to the team name to select this template.

### 2.4 Test the Integration

1. **Create a test issue in Linear:**
   - Team: Choose your team
   - Title: `[Test] Add hello world utility`
   - Description:

     ```markdown
     Create a simple hello world utility function for testing the Linear → GitHub → Claude workflow.

     **Acceptance Criteria:**

     - [ ] Create `packages/utils/src/hello.ts` with a `helloWorld()` function
     - [ ] Add unit tests in `packages/utils/src/__tests__/hello.test.ts`
     - [ ] Export from `packages/utils/src/index.ts`
     ```

   - Labels: `test`, `automation`
   - Status: `Ready`

2. **Verify GitHub sync:**
   - Check GitHub Issues (https://github.com/trainers-gg/trainers.gg/issues)
   - The issue should appear within 1-2 minutes
   - Verify `@claude` is present in the issue body
   - Verify Linear URL link is included

3. **Monitor GitHub Actions:**
   - Go to Actions tab: https://github.com/trainers-gg/trainers.gg/actions
   - Look for "Claude Code" workflow run
   - Should trigger automatically within seconds of issue creation
   - Click into the run to see logs

4. **Check for PR creation:**
   - After Claude processes (typically 2-5 minutes)
   - New branch should appear (e.g., `claude/test-hello-world`)
   - New PR should be created
   - PR should reference the issue with "Closes #XXX"

5. **Review and merge:**
   - Review the implementation
   - Check that tests pass
   - Merge the PR
   - Verify Linear issue moves to "Done"

## 🔑 Step 3: Verify GitHub Secrets

1. **Navigate to Repository Settings**
   - Go to https://github.com/trainers-gg/trainers.gg/settings/secrets/actions

2. **Check Required Secrets**

   | Secret Name               | Status         | Action if Missing |
   | ------------------------- | -------------- | ----------------- |
   | `GITHUB_TOKEN`            | Auto-provided  | No action needed  |
   | `CLAUDE_CODE_OAUTH_TOKEN` | Must be manual | See below         |

### 3.1 Add CLAUDE_CODE_OAUTH_TOKEN (if missing)

1. **Generate OAuth Token:**
   - Visit https://console.anthropic.com/settings/oauth
   - Create a new OAuth token for GitHub integration
   - Copy the token (shown only once)

2. **Add to GitHub Secrets:**
   - In repository Settings → Secrets and variables → Actions
   - Click **New repository secret**
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: (paste the token)
   - Click **Add secret**

## 🧪 Step 4: End-to-End Test Checklist

- [ ] Linear issue syncs to GitHub within 2 minutes
- [ ] `@claude` mention is present in GitHub issue body
- [ ] Linear URL is linked in GitHub issue
- [ ] GitHub Action "Claude Code" workflow triggers
- [ ] Claude creates a new branch (check branches page)
- [ ] Claude opens a PR with proper title and description
- [ ] PR includes "Closes #XXX" reference
- [ ] Tests pass on the PR (check CI)
- [ ] PR can be reviewed and merged normally
- [ ] After merge, Linear issue status updates to "Done"

## 🔄 Daily Usage Pattern

Once configured, your workflow becomes:

1. **In Linear**: Create issue describing what to build/fix
2. **Add `@claude`** in the issue description (or rely on template)
3. **Set status to "Ready"** (optional, depends on your workflow)
4. **Wait ~5 minutes** for Claude to implement and create PR
5. **Review PR** in GitHub, request changes if needed
6. **Merge** when satisfied
7. **Linear auto-updates** to "Done"

## 🎨 Optional Enhancements

### Use Linear Templates for Common Tasks

Create issue templates in Linear with `@claude` pre-filled:

**Bug Fix Template:**

```markdown
## Bug Description

[Describe the bug]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

---

@claude please fix this bug following the project conventions.
```

**Feature Template:**

```markdown
## Feature Description

[Describe the feature]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Technical Notes

[Any implementation details]

---

@claude please implement this feature following the project conventions in CLAUDE.md.
```

### Label Filters

Configure Linear filters to only sync issues with specific labels (e.g., `ready-to-implement`, `claude-task`).

## 🚨 Troubleshooting

### Issue syncs but Claude doesn't trigger

**Possible causes:**

- `@claude` mention is missing from GitHub issue body
- GitHub Action workflow is disabled
- Insufficient permissions in workflow file

**Fix:**

1. Check issue body contains `@claude`
2. Go to Actions tab → Workflows → Ensure "Claude Code" is enabled
3. Verify workflow permissions are set to `write` (see Step 1)

### Claude runs but doesn't create PR

**Possible causes:**

- Missing `CLAUDE_CODE_OAUTH_TOKEN` secret
- Write permissions not granted
- Issue description too vague

**Fix:**

1. Verify secret exists in repository settings
2. Check workflow permissions (should be `write`, not `read`)
3. Provide more detailed requirements in the issue

### Linear status doesn't update after merge

**Possible causes:**

- GitHub → Linear sync not enabled
- PR doesn't properly reference the issue

**Fix:**

1. Enable two-way sync in Linear settings
2. Ensure PRs include "Closes #XXX" or "Fixes #XXX" in description
3. Check Linear webhook logs (Settings → Integrations → GitHub → View logs)

### GitHub Action fails with permission error

**Fix:**

```yaml
# In .github/workflows/claude.yml, ensure permissions block has:
permissions:
  contents: write
  pull-requests: write
  issues: write
```

## 📚 Additional Resources

- [Linear GitHub Integration Docs](https://linear.app/docs/github)
- [Claude Code Action Docs](https://github.com/anthropics/claude-code-action)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-for-github-actions)
- [trainers.gg CLAUDE.md](../CLAUDE.md) - Project conventions Claude follows

## 🔐 Security Notes

- The workflow has write access limited to branches, PRs, and issues
- Cannot modify protected branches (main requires PR reviews)
- All code changes go through PR review process
- Actions are logged and auditable in Actions tab
- OAuth tokens should be kept secret and rotated regularly

## 📝 Maintenance

### Monthly Tasks

- [ ] Review Claude-created PRs for quality patterns
- [ ] Update issue template if common issues arise
- [ ] Check Codecov reports to ensure test coverage remains >60%

### Quarterly Tasks

- [ ] Rotate `CLAUDE_CODE_OAUTH_TOKEN`
- [ ] Review Linear → GitHub label mappings
- [ ] Audit closed issues for successful workflow completion rate

---

**Last Updated:** 2026-02-05
**Maintained By:** Development Team
