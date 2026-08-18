# Changelog

All notable changes to this project are documented in this file.

This format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Added
- Summary: Added a manual "Check for new employees" action to the Schedule Tool that discovers missing employee emails and reports exactly who was added.
- Why: Keeps new employee discovery explicit instead of mutating schedule membership during normal load/save flows.
- Files: src/Code.js, src/ScheduleHTML.html
- Validation: Wired the new server action and client button/status path, then verified the touched files parse cleanly.

### Changed
- Summary: Updated the Schedule Tool to use the normalized email address as the employee identifier throughout the UI while showing a short local-part label for readability.
- Why: Keeps the schedule roster keyed by the canonical email value and avoids relying on a separate display name field for lookups or mutations.
- Files: src/ScheduleHTML.html
- Validation: Confirmed the schedule table, sidebar summary, and add-employee modal now render readable labels while still using email-based identity for edits and hover behavior.
- Summary: Consolidated schedule persistence into a single `schedule_state_json` blob with active `Employee_data` and `deleted_employee_data` arrays, plus AWS fields stored on each employee record.
- Why: Removes split schedule keys, makes email the stable employee identifier, and keeps deleted employees recoverable without hard deletion.
- Files: src/Code.js, src/ScheduleHTML.html, src/TestEnviromentReset.js
- Validation: Updated schedule load/save hydration, AWS derivation, deleted-employee move/restore flows, and test reset cleanup; confirmed `src/Code.js`, `src/ScheduleHTML.html`, and `src/TestEnviromentReset.js` have no syntax errors.
- Summary: Updated Schedule Tool autosave to run only after in-memory edits and disabled the Save button when there are no unsaved changes.
- Why: Prevents unnecessary save attempts before edits and keeps manual save behavior consistent with edit-driven persistence.
- Files: src/ScheduleHTML.html
- Validation: Verified mutation paths mark the schedule dirty, countdown idles with "Waiting for changes" until edits occur, clean manual save is skipped, and successful saves clear dirty state and disable Save again.

### Added
- Summary: Added an Admin View Schedule Tool launch path with a near full-screen modal/iframe container and permission gating.
- Why: Allows schedule management to be opened directly from Admin workflows with maximum usable screen space.
- Files: src/UserInterface.js, src/Code.js
- Validation: Confirmed new toolbar button wiring, permission guards, modal open/close handlers, and server HTML loader method are present.

### Changed
- Summary: Migrated AWS config and employee email cache persistence from Script Properties to the new Schedule worksheet key/value storage.
- Why: Moves schedule-adjacent source data into sheet-backed storage for v3 direction and removes dependency on Script Properties for these domains.
- Files: src/Code.js
- Validation: Updated read/write paths for getAWSConfig/buildAndCacheAWSConfig/saveAWSConfigFromWeb and employee cache helpers to use Schedule sheet settings.
- Summary: Wired Schedule Tool save/load RPCs to persist and retrieve schedule array data from the Schedule worksheet.
- Why: Replaces in-memory placeholder behavior with durable sheet-backed persistence.
- Files: src/ScheduleHTML.html, src/Code.js
- Validation: Implemented fetchScheduleToolData/saveScheduleToolData server methods and client-side google.script.run handlers.
- Summary: Schedule fetch now auto-adds missing users by scanning DataEntry and Archive emails and appending blank employee schedule rows.
- Why: Keeps Schedule Tool roster aligned with real time-entry users without requiring manual first-time seeding.
- Files: src/Code.js
- Validation: Added checkForNewUsers_ helper, invoked it from fetchScheduleToolData, and persist updated schedule payload when new users are discovered.
- Summary: Optimized the doGet hot path to avoid full-sheet `getDataRange()` reads for employee status/history lookup.
- Why: Large DataEntry used-ranges can make web app loads stall for over a minute when doGet scans unnecessary columns/cells.
- Files: src/Code.js
- Validation: Updated getEmployeeEntries and findLatestEmployeeEntry to read only `lastRow` and `DATA_COL_COUNT` columns, then verified diagnostics are clean.

### Fixed
- Summary: Removed the redundant schedule-array `awsEnabled` flag and made `workweek` the single source of truth for CA/AWS state.
- Why: The schedule array stored the same decision in two places, which caused the sidebar to show the wrong label when the payload carried conflicting values.
- Files: src/Code.js, src/ScheduleHTML.html
- Validation: Updated the normalization and AWS config application paths to write only `workweek`, then verified the project still deploys via `npm run push:test`.
- Summary: Updated the test environment reset flow to clear Schedule-backed state and stale pay-period preview properties, then repopulate only DataEntry test rows.
- Why: The reset helper was still leaving Schedule worksheet data and script-property pay-period state behind, which made the new schedule storage model incompatible with a clean test reset.
- Files: src/TestEnviromentReset.js
- Validation: Ran `npm run push:test` successfully after the change to confirm the updated reset code deployed cleanly.
- Summary: Fixed clasp environment switching to read env source files from `clasp.test.json`/`clasp.live.json`, write the active target to `.clasp.json`, and corrected the missing-config error message.
- Why: The switch script previously looked for wrong source filenames and then regressed by writing to `clasp.json`, which caused clasp to fail with "Project settings not found."
- Files: clasp-env.mjs
- Validation: Ran `node clasp-env.mjs test && node clasp-env.mjs status && node clasp-env.mjs live` to confirm switching works and the active config is restored.

### Removed
- Summary: Replaced legacy src/ScheduleHTML.js prototype artifact with an Apps Script HTML file.
- Why: Prevents invalid JS source and enables HtmlService file loading.
- Files: ScheduleHTML.js, src/ScheduleHTML.html
- Validation: Renamed file into HtmlService-compatible extension and updated server loading path.

## [2.2.1] - 2026-08-05

### Added
- _None yet._

### Changed
- Summary: Hardened automated release commands to clear injected Git author/committer environment variables before running version and git steps.
- Why: Prevents signed release commits from failing when editor tooling injects generic identity values (for example GitHub noreply committer values).
- Files: run-release.mjs
- Validation: Verified release script now runs all child commands with sanitized env and no inherited GIT_AUTHOR/GIT_COMMITTER overrides.

### Fixed
- Summary: Preserved Entry ID values when archiving entries so archived rows keep the same identifier as their DataEntry source.
- Why: Archive rows previously lost the new Entry ID column and could not carry the same identifier forward for downstream review or matching.
- Files: src/Code.js
- Validation: Reviewed the archive row construction and header/schema setup paths to confirm Entry ID is now included in archived payloads and archive results.

### Removed
- _None yet._

## [2.1.0] - 2026-08-05

### Changed
- No documented changes were recorded in Unreleased before this release.

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
