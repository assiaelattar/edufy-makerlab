# Edufy / Atlas Operating Agreement

Before material work, read `ATLAS_BUILD_CONTEXT.md` and the relevant section of `actionplan.md`. Preserve the existing dirty worktree and stage only files owned by the current task.

## Release

- Use `$hostinger-main-release` for every push, publish, or Hostinger deployment request.
- Hostinger reads `origin/main`. A push to `agent/atlas-saas-platform` or another feature branch is not a deployment.
- Run `npm.cmd run build` in the clean main-based release worktree before pushing.
- The production URL is not yet registered in the release skill. Obtain and record the exact URL before claiming live verification.
- Treat Firebase rules, indexes, configuration, and `api/` as explicit-approval scope.
- Never commit `.env`, service-account files, credentials, tokens, build output, logs, or production data.
