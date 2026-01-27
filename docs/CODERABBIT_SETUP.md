# CodeRabbit Setup Guide

CodeRabbit is an AI-powered code review tool that automatically reviews your pull requests and provides intelligent feedback.

## Setup Instructions

### 1. Install CodeRabbit GitHub App

1. Go to [CodeRabbit GitHub App](https://github.com/apps/coderabbitai)
2. Click **"Install"** or **"Configure"**
3. Select your GitHub account or organization (`faruqso`)
4. Choose which repositories to enable CodeRabbit for:
   - **All repositories** (recommended for new projects)
   - **Only select repositories** (choose `booking-app`)
5. Review and accept the permissions
6. Click **"Install"**

### 2. Configuration

The repository already includes a `.coderabbit.yaml` configuration file with:
- ✅ Security checks (SQL injection, XSS, secret exposure)
- ✅ Performance optimizations
- ✅ Code quality checks
- ✅ TypeScript/React/Next.js specific rules
- ✅ Payment processing security checks
- ✅ Database best practices

### 3. How It Works

Once installed, CodeRabbit will automatically:
- Review all new pull requests
- Provide AI-powered code suggestions
- Check for security vulnerabilities
- Suggest performance improvements
- Review code quality and best practices
- Generate PR summaries

### 4. Review Features

CodeRabbit will review:
- **Security**: Authentication, authorization, payment processing, webhook security
- **Performance**: Database queries, React re-renders, bundle sizes
- **Code Quality**: Duplication, complexity, maintainability
- **Best Practices**: TypeScript types, React hooks, Next.js patterns
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML

### 5. Chat with CodeRabbit

You can also chat with CodeRabbit directly in PR comments:
- Ask questions about the code
- Request explanations
- Get suggestions for improvements
- Discuss architectural decisions

### 6. Customization

To customize CodeRabbit behavior, edit `.coderabbit.yaml`:
- Adjust review focus areas
- Enable/disable specific checks
- Configure file-specific rules
- Set review thresholds

## Configuration File

The `.coderabbit.yaml` file includes:
- Language settings (TypeScript, JavaScript, JSON, YAML)
- Path inclusions/exclusions
- Review settings and focus areas
- Security, performance, and code quality rules
- File-specific rules for API routes, components, payments
- TypeScript, React, and Next.js specific checks

## Benefits

- **Automated Reviews**: Get instant feedback on every PR
- **Security**: Catch vulnerabilities before they reach production
- **Best Practices**: Learn and follow industry standards
- **Time Saving**: Reduce manual code review time
- **Consistency**: Ensure code quality across the team

## Troubleshooting

If CodeRabbit isn't reviewing your PRs:
1. Check that the GitHub App is installed
2. Verify repository access permissions
3. Ensure `.coderabbit.yaml` exists in the repository root
4. Check CodeRabbit dashboard for any errors
5. Make sure the PR has enough changes (default threshold: 10 lines)

## Resources

- [CodeRabbit Documentation](https://docs.coderabbit.ai/)
- [Configuration Guide](https://docs.coderabbit.ai/configure-coderabbit)
- [GitHub Integration](https://docs.coderabbit.ai/platforms/github-com)
