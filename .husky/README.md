# Git Hooks with Husky

This directory contains automated git hooks that run checks before commits and pushes.

## Available Hooks

### `pre-commit`

Runs automatically on `git commit`:

- Lints staged files with ESLint
- Auto-fixes fixable issues
- Blocks commit if errors exist

### `pre-push`

Runs automatically on `git push`:

- Generates Prisma Client
- Runs full ESLint check
- Runs production build
- Blocks push if any step fails

## How It Works

1. When you run `npm install`, the `prepare` script sets up Husky
2. Git hooks in `.husky/` are automatically linked
3. Hooks run automatically - no manual action needed!

## Bypassing Hooks (Not Recommended)

If you absolutely must bypass hooks (emergency hotfix):

```bash
# Skip pre-commit
git commit --no-verify

# Skip pre-push
git push --no-verify
```

**Warning:** Only use `--no-verify` in emergencies. It defeats the purpose of automated checks!

## Troubleshooting

If hooks aren't running:

1. Make sure Husky is installed: `npm install`
2. Ensure `.husky/` directory is in git (it should be)
3. Check hook permissions: `chmod +x .husky/pre-commit .husky/pre-push`
4. Reinstall hooks: `npx husky install`
