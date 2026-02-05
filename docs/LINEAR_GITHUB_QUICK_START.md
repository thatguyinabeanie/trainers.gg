# Linear + GitHub + Claude: Quick Start Guide

## ✅ What's Already Done

- ✅ GitHub workflow updated with write permissions
- ✅ Custom prompt configured to follow CLAUDE.md
- ✅ `CLAUDE_CODE_OAUTH_TOKEN` secret exists in repository
- ✅ GitHub Action triggers on `@claude` mentions in **comments and issues**

## 📱 Recommended: Mobile Workflow (Simplest)

**Just comment on Linear issues from your phone!**

See **[MOBILE_WORKFLOW.md](./MOBILE_WORKFLOW.md)** for the simplest approach:

1. Open Linear app 📱
2. Comment on any issue: `@claude implement this`
3. Wait ~5 minutes ⏱️
4. Review PR ✅

Only setup needed: Enable comment sync in Linear → GitHub integration (5 min one-time setup).

---

## 🚀 Alternative Workflows

### 1️⃣ Choose Your Workflow

**Option A: Linear → GitHub Sync** (5 minutes setup)

1. **Configure GitHub Sync**:
   - Open Linear Settings → Integrations → GitHub
   - Connect repository: `trainers-gg/trainers.gg`
   - Enable: ✅ Create GitHub issues from Linear, ✅ Sync comments, ✅ Sync status

2. **Create Linear Issue Template**:
   - Go to Team Settings → Templates → New template
   - Name: "Claude Implementation"
   - Description:

     ```markdown
     ## Description

     [What to build/fix]

     ## Acceptance Criteria

     - [ ] [Criterion 1]

     ---

     @claude please implement this following CLAUDE.md conventions.
     ```

   - Set as default template (optional)

3. **Map labels** (optional):
   - Ready → `ready-to-implement`
   - In Progress → `in-progress`
   - Done → `implemented`

**Option B: Manual** (no setup needed)

- Add `@claude` to any Linear or GitHub issue description manually
- Works immediately, no configuration required

### 2️⃣ Test the Workflow (2 minutes)

1. **Create a test issue in Linear**:
   - Title: `[Test] Add hello world utility`
   - Description: `Create packages/utils/src/hello.ts with helloWorld() function and tests`
   - Make sure `@claude` is in the description
2. **Wait 1-2 minutes** for GitHub sync
3. **Check GitHub Issues** - issue should appear
4. **Check GitHub Actions** - "Claude Code" workflow should run
5. **Check Pull Requests** - Claude should create a PR within 5 minutes
6. **Review and merge** the PR
7. **Verify Linear** - issue should move to "Done"

### 3️⃣ Start Using It

Create issues in Linear with:

- Clear description of what to build/fix
- Acceptance criteria as checkboxes
- `@claude` mention in the description
- Status set to "Ready"

Claude will:

- Read CLAUDE.md for project conventions
- Implement the feature/fix
- Write tests (required by project)
- Create a PR with proper title and description
- Link back to the original issue

## 📖 Full Documentation

See [LINEAR_GITHUB_SETUP.md](./LINEAR_GITHUB_SETUP.md) for:

- Detailed configuration steps
- Troubleshooting guide
- Security notes
- Maintenance tasks
- Optional enhancements

## 🆘 Common Issues

| Problem                            | Fix                                         |
| ---------------------------------- | ------------------------------------------- |
| Issue syncs but Claude doesn't run | Add `@claude` to Linear issue template      |
| Claude runs but no PR created      | Check CLAUDE_CODE_OAUTH_TOKEN exists        |
| Permission denied errors           | Workflow permissions already set to `write` |
| Linear status doesn't update       | Enable two-way sync in Linear settings      |

## 💡 Pro Tips

- **Use Linear templates** with `@claude` pre-filled for common tasks
- **Be specific** in issue descriptions - more detail = better implementation
- **Include acceptance criteria** as checkboxes for clarity
- **Request changes** by commenting on the PR with `@claude please <change>`
- **Set up label filters** in Linear to only sync certain types of issues

---

**Next Step:** Configure Linear integration (Step 1 above), then create a test issue (Step 2).
