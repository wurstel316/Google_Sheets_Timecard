# Development Guide

## Quick Start for Agents
1. **Always read the target file first** before making edits — use precise search/replace on actual content.
2. **For deployments**: Use only `npm run push:test` (test env) — never run live release commands.
3. **For non-trivial changes**: Update `CHANGELOG.md` under `Unreleased` section before finishing.
4. **For permission-gated features**: Check [AdminUsers sheet pattern](#permission-model) and use `hasPermission()` server-side + client-side gating.
5. **For UI changes**: Validate against [optimistic UI patterns](#optimistic-ui--pending-state-actions) and [modal rules](#modal-and-ui-best-practices).

## Project Overview
This project is a Google Apps Script time-tracking and payroll system built around a Google Sheet-backed data model. The app supports employee clock-in/out flows, admin review and editing, payroll preview/export, and a Schedule Tool for roster and AWS work-week configuration.

The current codebase is actively schedule-driven: the app now persists schedule/AWS state in the Schedule sheet via a single JSON blob (`schedule_state_json`) and uses permission-gated admin workflows for payroll, export, verify, and edit actions.

## Current Project Status
- Primary logic lives in `src/Code.js`.
- Employee-facing UI and admin UI logic live in `src/UserInterface.js`.
- Schedule Tool UI is in `src/ScheduleHTML.html`.
- The project has a dedicated `Schedule` sheet in addition to the original `DataEntry`, `Archive`, and `AdminUsers` sheets.
- Current features include schedule preview, per-user note gating, optimistic row updates, admin hold-to-delete flows, AWS employee config, payroll preview/export, and modern permission checks.
- The changelog reflects a newer schedule/AWS and UI cleanup phase that should be treated as the current source of truth for implementation details.

## Key Commands
- `npm run login` - One-time Google authentication.
- `npm run create` - Create a new Sheets-bound Apps Script project.
- `npm run env:status` - Show active clasp environment state.
- `npm run env:test` - Switch to the test Apps Script environment.
- `npm run env:live` - Switch to the live environment; human-only.
- `npm run push:test` - Full test deploy path: bump push version, sync test data, switch to test env, push, and deploy. This is the only deploy command agents are allowed to run.
- `npm run release:status` - Show git status and recent commit history.
- `CONFIRM_LIVE=YES npm run release:patch|minor|major` - Human-only live release commands.
- `npm run release:live` - Reserved for human release flow; agents must not run it.

## Agent Safety Rules (Critical)
- Agents are only allowed to run `npm run push:test` for deployment actions.
- Agents must never run `npm run release:live`.
- Agents must never run `npm run release:patch`, `npm run release:minor`, or `npm run release:major` without explicit human approval and `CONFIRM_LIVE=YES`.
- Agents must never run `npm run env:live`.
- Production releases are manual human operations only.

## Changelog Rules (Critical)
- For any non-trivial change, update `CHANGELOG.md` in the `Unreleased` section before finishing.
- Changelog entries must include: what changed, why it changed, files touched, and validation performed.
- Append new entries; never rewrite or remove historical release sections.
- Human release scripts automatically roll `Unreleased` into dated release entries via update-changelog-for-release.mjs.

## Deployment Configuration Files
- `.clasp.test.json` contains the test Apps Script project ID.
- `.clasp.live.json` contains the live production project ID.
- `.clasp.json` is the active config that the current environment switch writes to.
- The env switching scripts (`clasp-env.mjs`) are responsible for switching between test and live config files.

## Architecture
- Core server logic: `src/Code.js`
- Employee/admin web UI: `src/UserInterface.js`
- Schedule Tool UI: `src/ScheduleHTML.html`
- Helper script migration code: `src/DataMigration.js`
- Test environment reset utilities: `src/TestEnviromentReset.js`
- Entry point: `doGet()` serves the employee web app and preloads schedule context for the current user.

## Data Model and Sheet Layout
The current implementation is broader than the older three-sheet description.

- `DataEntry` - active employee time entries, sorted by email and timestamp.
- `Archive` - archived entries including `Entry ID` and archival metadata.
- `AdminUsers` - admin user permissions, with permission text in column B.
- `Schedule` - sheet-backed schedule state and AWS config persistence.
- `schedule_state_json` - the canonical JSON blob for schedule roster state, employee records, deleted employees, and AWS settings.

Important current patterns:
- Row mutation should prefer `Entry ID` rather than row fallback targeting when the UI or server mutates entries.
- `findChronologicalInsertPosition()` and `insertRowChronologically()` remain relevant for insertion ordering when rows need to be rebalanced.
- Midnight rollover still splits an entry across rows with an explicit note explaining the split.
- Current schedule/AWS logic is stored in the `Schedule` sheet state, not only in Script Properties.

## Current Workflow and Feature Summary
- Employee clock-in/out flow with status, note gating, and recent-entry history.
- Admin view with verify/edit/delete/restore actions, row-level pending state, and optimistic UI feedback.
- Manual add-time and admin edit-time validation with clear rule-specific error messages.
- Payroll preview generation, AWS employee configuration, and export flow.
- Schedule Tool for roster management, employee discovery, and AWS/workweek settings.
- Current-user schedule preview under the clock button with day summaries and schedule modal.

## Permission Model
Source of truth: `AdminUsers` sheet column B, comma-separated permissions.

Supported permission values:
- `edit` - mutate entries, notes, times, manual admin entries, and delete/restore states.
- `verify` - verify/unverify entries.
- `payroll` - generate payroll preview and manage AWS settings.
- `export` - export payroll reports.
- `admin` - legacy flag only; it does not automatically grant other access.

Current server/UI expectations:
- `doGet()` passes `permissionFlags` into `createMobileHtml(...)`.
- Client-side controls must be gated by permission flags, but server-side `hasPermission()` checks remain the final enforcement.
- Admin View is visible when a user has any of `edit`, `verify`, `payroll`, or `export`.
- Payroll preview and AWS config are payroll scoped; export is separate; verify is separate; mutation is edit scoped.

## Logging and Debugging
- Use `Logger.log` for high-signal milestones only.
- Use `debugLog(message, data)` for structured detail when debug logging is enabled.
- Respect the existing debug flag and the current script-property-based debug state rather than adding ad hoc toggles.
- For web UI code, use the existing client-side debug helpers when they are already present in the UI flow.

## Important Implementation Patterns
### Optimistic UI / pending-state actions
- Acknowledge actions immediately before the server round trip finishes.
- Keep pending state explicit and block duplicate actions while in flight.
- Preserve rollback data and restore prior state on rejection.
- For destructive actions, prefer a brief hold-to-confirm pattern over blocking browser confirm dialogs.
- Clear pending state on both success and failure.

### Hold-to-confirm interaction pattern
- Destructive admin actions use a 3-second press-and-hold interaction.
- The icon and spinner remain in a shared asset container so sizing stays paired.
- Use a fixed SVG ring geometry and animate `stroke-dashoffset` over 3 seconds before firing the action.
- Keep the implementation minimal and aligned with the existing admin row handlers.

### Google Apps Script-only constraints
- Use official Apps Script APIs for Sheets, UI, HTML, Drive, and UrlFetch.
- Do not introduce non-GAS browser-only APIs into the script logic.

### Schedule/AWS state handling
- The current canonical setup stores schedule roster and AWS config in the `Schedule` sheet using `schedule_state_json`.
- `fetchScheduleToolData()` and `saveScheduleToolData()` are the main schedule persistence endpoints.
- `saveAWSConfigFromWeb()` persists AWS enrollment state back into the schedule payload.
- A helper like `checkForNewEmployees()` can discover users missing from the schedule roster and append them before save.

## Payroll and Overtime Rules
Current code continues to implement California rules with AWS-specific adjustments:
- Standard California daily/weekly overtime logic remains in place.
- AWS employees use a 10-hour daily threshold before overtime begins.
- The 7th-day rule is disabled for AWS employees.
- Payroll preview and export logic remain permission-gated and sheet-backed.

## Testing and Deployment
- Test deploy path: `npm run push:test`
- This command is the expected deployment entry point for agents.
- Human live release commands require `CONFIRM_LIVE=YES` and are intentionally separate.
- For non-trivial edits, keep `CHANGELOG.md` updated in the `Unreleased` section.
- Do targeted validation for the files touched; for UI work, confirm the flow matches the current optimistic/pending-state patterns and permission gating.

## Tool Usage Rules (Strict)
- Always read the target file before editing it.
- Do not guess the exact edit site; use precise search and replace on the actual file content.
- Keep edits small and focused.
- Prefer existing project patterns over introducing new abstractions.
- For deployment work, only `npm run push:test` is allowed.
- Never run live release scripts as part of an agent workflow.

## Modal and UI Best Practices
- Keep only one modal visible at a time.
- Close and clean up state before opening a new modal.
- Use the current modal patterns instead of adding ad hoc navigation/reload flows.
- When the payroll export completion path is involved, follow the existing admin preview modal clean-up flow and refresh the active admin data after closing the preview.
- Treat modal scroll lock as centralized state: whenever a modal opens or closes, call the shared lock updater immediately (do not rely on individual CSS or one-off toggles).
- Modal visibility checks for lock state should use computed visibility, not only inline `style.display`, so nested/stacked modal flows cannot leave the page locked.
- When no tracked modal is visible, explicitly clear lock classes and any temporary `overflow`/`overscroll` inline styles on both `html` and `body`.
- For iframe-based modals, avoid fixed desktop width/height caps; derive host/frame size from UI scale and clamp with viewport-based limits so modal footprint scales with typography.
- Keep host and iframe sizing in sync (parent container and iframe should grow/shrink together) to avoid "scaled text but fixed shell" regressions.

### Modal Architecture Gold Standard (All Modals)
Use these rules for all modal work across desktop and mobile, whether the modal is inline HTML or iframe-hosted.

- Reference implementation:
	- DateTimePicker remains the strongest concrete example of this pattern in current code.
	- Reuse its architecture decisions, but apply these rules generically to any modal type.
- Host/child integration contract:
	- Host is responsible for lifecycle, visibility, scroll-lock updates, and option/context passing.
	- Child is responsible for rendering, interaction state, and deterministic resolve/cancel return behavior.
	- If multiple option aliases can exist over time, normalize in host before opening so payload versions stay compatible.
- Container and shell layering:
	- Avoid duplicate chrome: if child renders full modal shell, host should not add extra close/header panels.
	- Keep host container and child surface sizes synchronized (child should fill resolved host bounds).
	- Resolve preferred modal size from content intent + UI scale, then clamp to viewport-safe max bounds.
- Responsive sizing strategy:
	- Do not hardcode one desktop size and reuse it everywhere.
	- Desktop: scale toward preferred dimensions with max caps.
	- Mobile: occupy practical viewport space (typically full-width/full-height or near-full-height) with safe clipping.
	- Recompute sizing on open, resize, and `visualViewport` resize to handle rotation and browser chrome shifts.
- Internal modal layout strategy:
	- Use stable shell regions: header, content body, footer.
	- Keep header/footer anchored; body is the overflow region when constrained.
	- Prevent critical title/meta rows from wrapping into broken multi-line layouts unless intentionally designed.
- Typography and scale strategy:
	- Decouple text scale from geometry scale.
	- Under pressure, compress geometry first; shrink text only as a last resort.
	- Keep touch targets readable and tappable after scaling (titles, control labels, action buttons, dense data labels).
	- Balance secondary text against primary readouts so one region is not disproportionately large/small.
- Mobile interaction ergonomics:
	- Allocate content areas intentionally to avoid dead space (for example, split-pane or weighted regions when appropriate).
	- Size interactive controls using measured available space when fixed tokens are not sufficient.
	- Ensure hidden mode-specific controls are removed from layout flow when needed to preserve centering/alignment.
- Action model and close behavior:
	- Keep primary action in footer and label it by outcome (`Apply`, `Save`, `Use`, etc.).
	- Cancel must always be available and deterministic.
	- All close paths should funnel through one cleanup function so promise resolution, pending state, and scroll lock remain consistent.

When implementing a new modal, start from this architecture and adapt only modal-specific UI/content behavior.

### Host modal z-index method (single source of truth)
- Canonical source lives in `src/UserInterface.js` at `HOST_MODAL_STACK`.
- Keep `HOST_MODAL_STACK` sorted from lowest to highest z-index and edit ordering there only.
- Do not hand-edit individual modal z-index CSS rules for host overlays; z-index CSS is generated from `HOST_MODAL_LAYER_CSS`.
- `HOST_MODAL_IDS` is derived from the same stack and is used by `updateDatePickerModalScrollLock()` to decide when page scroll lock must remain active.
- If you add a new host modal, add it once to `HOST_MODAL_STACK` and ensure its placement reflects open-flow nesting (child modal must be above parent modal).

Current layering contract (lowest -> highest):
- `archiveReviewModal`, `employeeScheduleModal`, `adminViewModal`: `1000`
- `manualEntryModal`: `1100`
- `adminTimeEditModal`: `1150`
- `adminModalHtmlModal`: `1200`
- `moreReportsModal`: `1250`
- `scheduleToolModal`: `1260`
- `adminHtmlPreviewModal`: `1270`
- `addMissedTimeModal`: `1275`
- `adminHtmlHolidayModal`: `1280`
- `adminHtmlAwsModal`: `1290`
- `dateTimePickerModal`: `1300`
- `idleLockOverlay`: `4000` (must remain above all modals)

Ordering rules to preserve:
- Payroll child modals (`adminHtmlHolidayModal`, `adminHtmlAwsModal`) must be above `adminHtmlPreviewModal`.
- `dateTimePickerModal` must remain above any modal that can launch it.
- `idleLockOverlay` must stay top-most.

## Common Pitfalls and Troubleshooting

### When editing entries or rows
- **Issue**: Changes don't persist to the correct row.
- **Solution**: Prefer `Entry ID` lookups over direct row indexes. Use `findEntryByID(ss, entryId)` pattern rather than `getRange(row, ...)`.

### When implementing schedule changes
- **Issue**: Schedule state not syncing back to the sheet.
- **Solution**: Always call `saveScheduleToolData()` after modifying `schedule_state_json`, not just local Script Properties.

### When adding admin actions
- **Issue**: User sees the action but it fails silently.
- **Solution**: Implement optimistic UI first, then await the server response. Store rollback state before sending the request. Use `hasPermission()` server-side as final gate.

### When working with idle/refresh
- **Issue**: Users report stale data or idle warnings not showing.
- **Solution**: The idle policy is now centralized in `getStandardIdlePolicy_()`. Update that one function to tune timings project-wide. Check that unsaved-work guards are fault-tolerant (wrapped in try/catch).

### When debugging
- **Issue**: Not seeing debug output.
- **Solution**: Use menu item to enable debug logging via `toggleDebugLogging()`, then use `debugLog(message, data)` in code. Check that `isDebugEnabled()` is true.

## Current Operational Notes
- The project is currently in a schedule/AWS modernization phase; agent guidance should assume schedule-backed roster logic is the source of truth.
- The changelog is the best record of recent feature intent and should be treated as the current implementation ledger.
- If a behavior is unclear, check `src/Code.js`, `src/UserInterface.js`, and `src/ScheduleHTML.html` before changing rules or permission assumptions.
- Recent work has focused on idle-session management and status visibility; validate idle changes against [scheduleHTML.html](src/ScheduleHTML.html) and [UserInterface.js](src/UserInterface.js) idle patterns.
