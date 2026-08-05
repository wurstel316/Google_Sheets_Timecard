# Changelog

All notable changes to this project are documented in this file.

This format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Added
- _None yet._

### Changed
- Summary: Reworked release commands into a single automated release orchestrator that stages changes, versions, tags, pushes Git, and then performs live clasp deployment.
- Why: Removes manual release sequencing and enforces a consistent release pipeline from command execution through deployment.
- Files: package.json, run-release.mjs, README.md
- Validation: Verified release scripts now route through run-release.mjs and confirmed script execution path with local syntax and command checks.

### Fixed
- Summary: Fixed release version drift risk between remote Git and clasp deployment by pushing Git commit and tags before live clasp push/deploy.
- Why: Prevents deploying a release version to clasp that has not been successfully pushed to remote Git.
- Files: run-release.mjs, README.md
- Validation: Confirmed deployment step order in orchestrator is git push -> git push --tags -> env:live -> clasp push -> clasp deploy.

### Removed
- _None yet._

## [2.0.1] - 2026-07-30

### Added
- _None yet._

### Changed
- _None yet._

### Fixed
- Summary: Fixed push prerelease bumping so stable versions advance to the next patch prerelease.
- Why: Prevents patch release collisions with existing tags (for example trying to re-tag v2.0.0) and keeps semantic release progression aligned.
- Files: bump-push-version.mjs
- Validation: Verified bump logic now maps stable X.Y.Z to X.Y.(Z+1)-push.0 and existing X.Y.Z-push.N to X.Y.Z-push.(N+1).

### Removed
- _None yet._

## [2.0.0] - 2026-07-30

### Added
- _None yet._

### Changed
- _None yet._

### Fixed
- Summary: Fixed Admin View verify toggle updates by correctly mapping batch verify responses back to row indices.
- Why: Verify actions were being reverted in the UI because batch responses did not include row identifiers, causing every row to be treated as a failed update.
- Files: src/Code.js, src/UserInterface.js
- Validation: Verified the batch response now returns rowIndex per action, client mapping uses those rowIndex values, and failure/debug messages now include explicit server reason text.
- Summary: Hardened Admin View verify UI persistence when batch responses are partial or mixed.
- Why: Some successful server updates could still appear unsaved in the UI when response payload fields were incomplete or when mixed failures were masked by a generic success message.
- Files: src/UserInterface.js
- Validation: Added fallback result mapping by action position, fallback verified-state assignment from requested value, and accurate mixed-result status messaging.

### Removed
- _None yet._

## [2.0.0] - 2026-07-30

### Changed
- No documented changes were recorded in Unreleased before this release.

## Entry Template (copy into Unreleased)

### Changed
- Summary: <short description of what changed>
- Why: <reason for the change>
- Files: <comma-separated file paths>
- Validation: <tests/checks/run steps performed>
