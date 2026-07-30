# Copilot Safety Instructions

## Deployment Safety
- Agents may run only `npm run push:test` for deployment-related tasks.
- Agents must never run live release scripts:
  - `npm run release:live`
  - `npm run release:patch`
  - `npm run release:minor`
  - `npm run release:major`
  - `npm run env:live`

## Human-Only Live Release
- Live release commands are manual operations.
- Required confirmation gate: `CONFIRM_LIVE=YES`.
- Valid usage examples:
  - `CONFIRM_LIVE=YES npm run release:patch`
  - `CONFIRM_LIVE=YES npm run release:minor`
  - `CONFIRM_LIVE=YES npm run release:major`

## Default Workflow
- Use `npm run push:test` for all agent-executed deploy/testing cycles.

## Changelog Requirements
- For any non-trivial code change, update `CHANGELOG.md` under the `Unreleased` section before finishing.
- Include: what changed, why, key files touched, and validation performed.
- Append entries only; do not delete or rewrite prior release history.
- Human release commands auto-roll `Unreleased` into a dated release section via `update-changelog-for-release.mjs`.