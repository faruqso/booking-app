# Build Failure Prevention Guide

This document outlines the checks and processes in place to prevent production build failures.

## Pre-Deployment Checks

### 🎯 Automated Git Hooks (Husky)

**Automatic checks run before you commit/push:**

1. **Pre-Commit Hook** - Runs on `git commit`
   - Lints only staged files with ESLint
   - Auto-fixes fixable issues
   - Blocks commit if ESLint errors exist

2. **Pre-Push Hook** - Runs on `git push`
   - Generates Prisma Client
   - Runs full ESLint check
   - Runs production build
   - **Blocks push if build fails**

**These hooks are automatically set up when you run `npm install`!**

### 1. Local Build Test (Before Committing)

Always run a build locally before pushing:

```bash
npm run build
```

Or use the automated check:

```bash
npm run prebuild-check  # Runs lint + build
```

This catches:

- TypeScript errors
- ESLint errors
- Missing dependencies
- Prisma schema issues

### 2. GitHub Actions CI/CD

Two workflows automatically check every PR:

- **`.github/workflows/ci.yml`** - Runs on every PR and push
  - Installs dependencies
  - Generates Prisma Client
  - Runs ESLint
  - Runs production build

- **`.github/workflows/vercel-build-check.yml`** - Runs on PRs to main
  - Uses the exact same build command as Vercel (`vercel-build`)
  - Catches Vercel-specific build issues

### 3. Pre-Push Git Hook (Optional - Recommended)

Run `npm run prebuild-check` before pushing to catch issues early.

## Common Build Failure Causes

### ESLint Errors

- **Unescaped quotes** in JSX: Use `&quot;` instead of `"`
- **Missing alt props** on images
- **React Hook dependencies** warnings

**Fix:** Run `npm run lint` before committing

### TypeScript Errors

- Type mismatches
- Missing type definitions

**Fix:** Run `npm run build` to see TypeScript errors

### Prisma Issues

- Schema not synced with database
- Client not generated

**Fix:**

```bash
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes (dev only)
```

### Missing Dependencies

- Importing packages not in `package.json`
- Missing dev dependencies

**Fix:** Install missing packages with `npm install <package>`

## Best Practices

### Before Committing:

1. ✅ **Automatic:** Pre-commit hook runs ESLint on staged files
2. ✅ **Manual (optional):** Run `npm run build` if you want extra confidence
3. ✅ Test locally with `npm run dev`

### Before Pushing:

1. ✅ **Automatic:** Pre-push hook runs lint + build (blocks if fails)
2. ✅ If hooks pass, push will proceed automatically

### Before Creating PR:

1. ✅ Ensure CI checks pass on your branch
2. ✅ Review build logs in GitHub Actions
3. ✅ Test the feature manually

### Before Merging to Main:

1. ✅ All CI checks must pass
2. ✅ Code review approved
3. ✅ Build succeeds in PR checks

## Vercel Build Command

Vercel uses the `vercel-build` script from `package.json`:

```json
"vercel-build": "npm install --include=dev && prisma generate && next build"
```

This ensures:

- Dev dependencies are installed (needed for Prisma)
- Prisma Client is generated
- Production build runs

## Emergency Fixes

If a build fails in production:

1. **Check Vercel build logs** - They show the exact error
2. **Reproduce locally** - Run `npm run vercel-build`
3. **Fix the issue** - Usually ESLint or TypeScript errors
4. **Test locally** - `npm run build` must succeed
5. **Push fix** - Vercel will automatically redeploy

## Monitoring

- GitHub Actions: Check `.github/workflows/` folder for status
- Vercel Dashboard: View deployment logs and build status
- Slack/Email: Set up notifications for build failures
