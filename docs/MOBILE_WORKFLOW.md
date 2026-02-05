# 📱 Mobile Workflow: Comment to Implement

The simplest way to use Claude Code - just comment on Linear issues from your phone!

## 🎯 How It Works

1. **📱 Open Linear app** (on phone or desktop)
2. **💬 Comment on any issue:** `@claude implement this`
3. **⚡ Wait ~5 minutes**
4. **✅ PR is ready for review!**

That's it. No templates, no special issue creation - just comment.

## ⚙️ One-Time Setup (5 minutes)

### Step 1: Connect Linear to GitHub

1. **Open Linear** (web browser required for settings)
2. **Go to Settings** (⚙️ gear icon) → **Integrations**
3. **Find GitHub** → Click **Add** or **Configure**
4. **Authorize** Linear to access your GitHub account
5. **Select repository:** `trainers-gg/trainers.gg`

### Step 2: Enable Comment Sync

In the GitHub integration settings:

- ✅ **Create GitHub issues from Linear issues**
- ✅ **Sync comments bidirectionally** ← This is the critical one!
- ✅ **Sync status updates**
- ✅ **Sync assignees**

Click **Save**.

### Step 3: Test It

1. **Create a test issue in Linear:**
   - Title: `[Test] Add hello function`
   - Description: `Create a simple hello() function in packages/utils/src/hello.ts`

2. **Wait 1-2 minutes** for it to sync to GitHub
   - Check https://github.com/trainers-gg/trainers.gg/issues
   - Your issue should appear

3. **Comment on the issue in Linear:**
   - `@claude implement this`

4. **Check GitHub Actions:**
   - https://github.com/trainers-gg/trainers.gg/actions
   - "Claude Code" workflow should be running

5. **Wait for PR:**
   - Claude will create a branch and open a PR
   - PR will reference your issue with "Closes #XXX"
   - Review and merge when ready!

## 📝 Usage Examples

### Basic Implementation

```
@claude implement this
```

### With Specific Instructions

```
@claude implement this. Make sure to:
- Add TypeScript types
- Include unit tests
- Use the existing API client pattern
```

### Fix a Bug

```
@claude fix this bug. The issue is in the authentication flow.
```

### Add Tests

```
@claude add tests for this feature
```

### Refactor Code

```
@claude refactor this to use React Server Components
```

## 💡 Pro Tips

### Works on Any Issue

- Old issues, new issues, doesn't matter
- Just comment with `@claude` whenever you're ready to implement

### Comment Multiple Times

- Need changes after the first PR? Comment again!
- `@claude please add error handling to the implementation`

### Works from Anywhere

- Linear mobile app (iOS/Android)
- Linear web app
- Even GitHub directly (if you prefer)

### Quick Commands

- `@claude implement this`
- `@claude fix this`
- `@claude add tests`
- `@claude refactor this to use <pattern>`

### Be Specific for Better Results

Instead of:

```
@claude implement this
```

Try:

```
@claude implement this. Requirements:
- Use the validateTeam function from @trainers/validators
- Add error handling for invalid Pokemon
- Include unit tests covering edge cases
- Follow the patterns in packages/tournaments/
```

## 🔍 Tracking Progress

### In Linear

- Comment appears in the issue thread
- PR link gets posted as a comment when ready
- Issue status updates after merge

### In GitHub

- Check Actions tab for real-time progress
- PR notification when ready
- Can review/comment on PR normally

## ❓ Troubleshooting

### Comment doesn't trigger Claude

**Check:**

- Linear → GitHub sync is enabled
- Comment sync is enabled (most common issue)
- `@claude` is in the comment (case sensitive)
- Issue has synced to GitHub first

**Fix:**

- Go to Linear Settings → Integrations → GitHub
- Verify "Sync comments bidirectionally" is checked
- Wait 1-2 minutes for sync to complete

### Issue doesn't sync to GitHub

**Check:**

- GitHub integration is connected
- Repository is selected in Linear settings
- Team is mapped to the repository

**Fix:**

- Reconnect GitHub integration
- Verify repository selection
- Check Linear webhook logs (Settings → Integrations → GitHub → View logs)

### Claude runs but doesn't create PR

**Check:**

- `CLAUDE_CODE_OAUTH_TOKEN` exists in GitHub repo secrets
- Workflow has write permissions

**Fix:**

- Both of these are already configured ✅
- Check GitHub Actions logs for specific error

## 🎨 Optional: Linear Issue Templates

Want to pre-fill issue descriptions for common tasks?

**Create a template:**

1. Team Settings → Templates → New template
2. Add your standard format (acceptance criteria, technical notes, etc.)
3. **Don't include @claude in the template** - you'll add it via comment instead
4. Save and use when creating issues

**Why comment instead of template:**

- More flexible - implement only when ready
- Works on existing issues
- Mobile-friendly
- Can add specific instructions per implementation

## 🚀 Daily Workflow

**Morning planning:**

1. 📱 Open Linear on phone during commute
2. 📝 Create issues for features/fixes needed
3. 💬 Comment `@claude implement this` on high-priority ones
4. ☕ Get coffee while Claude works

**Afternoon review:** 5. 💻 Open laptop 6. 🔍 Review PRs Claude created 7. ✅ Merge or request changes 8. 🔄 Repeat for next batch

**Evening wrap-up:** 9. 📱 Check Linear on phone 10. ✨ See completed issues marked as "Done" 11. 🎉 Ship to production

---

**That's the entire workflow.** No templates, no complex setup, just comment and go!

## 📚 Related Docs

- [Full Setup Guide](./LINEAR_GITHUB_SETUP.md) - Detailed configuration
- [Quick Start](./LINEAR_GITHUB_QUICK_START.md) - Alternative workflows
- [CLAUDE.md](../CLAUDE.md) - Project conventions Claude follows

---

**Last Updated:** 2026-02-05
