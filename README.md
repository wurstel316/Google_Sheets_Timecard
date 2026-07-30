# Timecard GAS Workflow

This repo now uses a simplified release flow:
- One command for test deployments: `npm run push:test`
- Three human-only commands for live releases:
  - `CONFIRM_LIVE=YES npm run release:patch`
  - `CONFIRM_LIVE=YES npm run release:minor`
  - `CONFIRM_LIVE=YES npm run release:major`

## Commands You Should Use

### Daily development and testing
1. `npm run release:status`
2. `npm run push:test`

`push:test` does the full test path:
- Bumps push build version (`version:push`)
- Syncs test data (`sync:testdata`)
- Switches to test environment (`env:test`)
- Pushes and deploys to test Apps Script deployment

### Production release (human-only)
1. `npm run release:status`
2. Pick one release type:
   - Patch: `CONFIRM_LIVE=YES npm run release:patch`
   - Minor: `CONFIRM_LIVE=YES npm run release:minor`
   - Major: `CONFIRM_LIVE=YES npm run release:major`

Each release command now does all release work:
- Semantic version bump
- Automatic release commit with clear type label:
  - `release(patch): vX.Y.Z`
  - `release(minor): vX.Y.Z`
  - `release(major): vX.Y.Z`
- Automatically rolls `CHANGELOG.md` from `Unreleased` into a dated version section for that release
- Git tag creation via `npm version`
- Live environment switch
- Live `clasp push` and `clasp deploy`
- Automatic `git push` and `git push --tags`

## Safety Rules

### Agent safety
- Agents are only allowed to run: `npm run push:test`
- Agents must never run live release scripts.

### Live release safety gate
- Live release scripts require `CONFIRM_LIVE=YES`.
- Without that variable, release is blocked immediately by `guard-live-release.mjs`.

## Removed/Deprecated Scripts

The following scripts were removed to reduce ambiguity:
- `push`
- `deploy`
- `deploy:test`
- `deploy:live`
- `open:test`
- `open:live`

## Quick Reference

- Check status: `npm run release:status`
- Test deploy: `npm run push:test`
- Live patch release: `CONFIRM_LIVE=YES npm run release:patch`
- Live minor release: `CONFIRM_LIVE=YES npm run release:minor`
- Live major release: `CONFIRM_LIVE=YES npm run release:major`

## Changelog Workflow

- Keep `CHANGELOG.md` updated in the `Unreleased` section for every non-trivial change.
- On `release:patch|minor|major`, the release script automatically moves `Unreleased` notes into `## [version] - YYYY-MM-DD` and resets `Unreleased`.
- Each entry should include:
  - What changed
  - Why it changed
  - Key files touched
  - Validation performed
