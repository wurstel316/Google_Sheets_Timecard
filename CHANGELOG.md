# Changelog

All notable changes to this project are documented in this file.

This format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

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
