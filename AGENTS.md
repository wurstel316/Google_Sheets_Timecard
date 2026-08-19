# Development Guide

## Project Overview
This is a Google Apps Script time tracking application with a web interface for employees and admin tools for payroll management.

## Key Commands
- `npm run login` - One-time Google authentication
- `npm run create` - Create new Sheets-bound script project  
- `npm run push:test` - Deploy JavaScript code to test environment (the only deploy command agents are allowed to run)
- `npm run release:status` - Show git status and recent commits before a release
- `CONFIRM_LIVE=YES npm run release:patch|minor|major` - Human-only live release commands with semantic version bump + live push/deploy
- Do not run NPM or clasp commands without specific request. Agents must never run live release scripts.

## Agent Safety Rules (Critical)
- Agents are only allowed to run `npm run push:test` for deployment actions.
- Agents must never run `npm run release:live`.
- Agents must never run `npm run release:patch`, `npm run release:minor`, or `npm run release:major`.
- Agents must never run `npm run env:live`.
- Live production releases are manual human operations only and require `CONFIRM_LIVE=YES`.

## Changelog Rules (Critical)
- For any non-trivial code change, agents must update `CHANGELOG.md` in the `Unreleased` section before finishing.
- Changelog entries must include: what changed, why it changed, key files touched, and validation performed.
- Agents must append entries and never rewrite or remove existing historical release sections.
- Human release commands automatically move `Unreleased` into a dated release section via `update-changelog-for-release.mjs`.


## Deployment Configuration Files
	The project uses environment-specific configuration files managed by OpenCode:

	.clasp.test.json - Test environment settings including script ID
	.clasp.live.json - Live production environment settings including script ID
	Environment Management Commands
	Switching Environments
	npm run env:test    # Switch to test environment
	npm run env:live    # Switch to live (production) environment - human-only
	Deployment Workflow
	npm run login       # One-time Google authentication
	npm run push:test   # Deploy code to test environment (approved test workflow)
	CONFIRM_LIVE=YES npm run release:patch|minor|major   # Human-only live release workflow
	Key Points
	Environment switching modifies the active clasp configuration file (.clasp.test.json or .clasp.live.json)
	Deployment ID is stored in the respective .clasp.*.json file's scriptId field
	This setup provides explicit control over environments rather than implicit behavior, with clear separation between test and production deployments.
	
	## Important Notes
	Only `npm run push:test`. 
	Live release commands require `CONFIRM_LIVE=YES` and are human-only.
	Agents always default to `npm run push:test`.

## Architecture
- **Core file**: Code.js contains main logic and server functions
- **Web UI**: UserInterface.js builds HTML template with embedded JavaScript
- **Data structure**: Three sheets - DataEntry, Archive, AdminUsers
- **Entry point**: `doGet()` function serves web app interface

## Development Workflow
1. Make changes in local files (Code.js, UserInterface.js)
2. Deploy using `npm run push:test`.
3. For production release (human-only), run `CONFIRM_LIVE=YES npm run release:patch|minor|major`.

## Important Patterns
- All employee data stored in single DataEntry sheet sorted by email and timestamp
- Midnight rollover handling splits entries across multiple rows when clock-in and clock-out span different dates
- Permission-based access control using AdminUsers sheet with comma-separated permissions (edit, verify, payroll, export, admin)
- Auto-clock-out after 14 hours for stale entries
- California overtime calculation rules implemented

### Hold Spinner Icon Pattern
- For destructive admin actions, use a 3-second press-and-hold interaction instead of confirm dialogs.
- Keep icon and spinner in one shared asset container (`.admin-hold-asset`) so sizing stays paired.
- Use a fixed-geometry SVG ring inside that container (`viewBox="0 0 100 100"`, `r="43"`, `stroke-width="14"`) and scale only the container size variable.
- Animate progress with `stroke-dashoffset` over 3 seconds to show a full fill-to-complete spinner before firing the action.
- Keep implementation minimal: one button, one asset wrapper, one SVG ring (`track` + `progress`), and existing hold start/cancel/complete handlers.

### Optimistic UI Best Practices
- Acknowledge user actions immediately with fast feedback before the server round-trip completes.
- Update the targeted row or control state optimistically, but keep a clear pending/in-flight state so duplicate submits are blocked.
- Use shared pending-action helpers and visible status chips/messages for actions such as missed-time creation, delete/restore, and save flows.
- Preserve rollback data (`baseline`/`draft` state or a temp row snapshot) so the UI can revert cleanly if the server rejects the action.
- Keep optimistic updates limited to the exact action being triggered; never lie about unrelated data or pretend a request succeeded without a valid server response.
- For destructive or irreversible actions, prefer a brief hold-to-confirm pattern instead of blocking browser confirm dialogs.
- Clear pending state on both success and failure, and refresh or rehydrate the affected data when validation/server responses require it.
- When an optimistic update fails, show the user the error and restore the prior UI state rather than leaving stale “success” indicators behind.

## Critical Implementation Details

### Google Apps Script APIs Only
Always use official Google Apps Script APIs for Sheets/UI/HTML/Drive/UrlFetch operations; do not introduce non-GAS APIs or browser-only functions.

### Logging Standards  
- Use simple logs (`Logger.log`) for high-signal milestones only: start/end, major branch, and failures.
- Use debug logs (`debugLog(message, data)`) for detailed context (durations, row indices, counts, payload shape).
- Never add ad-hoc debug toggles; honor `isDebugEnabled()` and existing Script Property key `debug_payroll_enabled`.
- Keep debug payloads structured objects and avoid long concatenated strings.
- For web app JS, use existing `debugClientLog()` / `debugClientError()` guarded by `clientDebugEnabled`.

### Permissions Workflow
- Source of truth: AdminUsers sheet column B (Permissions), comma-separated values.
- Supported permissions: edit, verify, payroll, export, admin.
- admin is legacy-only and does not automatically grant other permissions.
- Admin View visibility: granted when user has any of edit, verify, payroll, or export.
- `doGet()` passes `permissionFlags` into `createMobileHtml(...)`; client logic must gate/disable admin actions using those flags, while server checks remain the final fallback.
- `verify` permission scope:
	- Server: `adminSetEntryVerified(...)` requires `hasPermission('verify')`.
	- UI: only verify toggle is enabled by `canVerify`; disabled controls show "Verify permission required." title.
- `edit` permission scope:
	- Server: `adminSaveEntryUpdate(...)` and `submitManualEntryFromMenu(...)` require `hasPermission('edit')`.
	- UI: edit-time actions are enabled by `canEdit` (edit in/out times, add notes, delete/restore, add missed time in admin view).
- `payroll` permission scope:
	- Server: `fetchAWSConfigForDialog(...)` and `saveAWSConfigFromWeb(...)` require `hasPermission('payroll')`.
	- UI: payroll report preview workflow is payroll-only (`Create Payroll Report` + `Generate Report`) and AWS settings controls are payroll-only.
- `export` permission scope:
	- Server: `exportPayrollPreviewFromWeb(...)` requires `hasPermission('export')`.
	- UI: `Export Report` button is enabled only for `canExport`.
- Current intended split:
	- Preview/compute payroll data: payroll.
	- Export generated report: export.
	- Verify rows: verify.
	- Mutate entries/notes/times/manual admin entries: edit.
- Keep permission-denied server messages (for example "Verify permission required.") even when UI disables buttons; those are required as fallback if client checks are bypassed.

### Data Organization
- Data is sorted by Email (alphabetically) → Clock In timestamp (ascending) per email group
- Use findChronologicalInsertPosition() to find correct row index for insertion
- insertRowChronologically() handles insertion, color-coding by email group, and visual merge formatting

### Dynamic Formulas with Row Numbers  
Formulas built as strings with row numbers: =TEXT(C${rowIndex},"MM/dd/yyyy-ddd") for dates, =If(D${rowIndex}<>"", (D${rowIndex}-C${rowIndex})*24, "") for hours
Always set number format after formula: Clock In/Out use HH:mm (time only), Hours use 0.00 (decimal), dates use MM/dd/yyyy-ddd (day name)

### Midnight Rollover Handling
When clock-in and clock-out span different dates:
- First row ends at 11:59:59 PM on the clock-in date 
- Second row created via insertRowChronologically() starting at 00:00:00 next day to actual clock-out
- Both rows include note "Entry crossed midnight and was auto-split." plus any user notes

### Web App Client-Server Communication
Client-side (JavaScript in UserInterface.js): google.script.run.withSuccessHandler(callback).submitClockAction(action, notes)
Server-side returns: { success: bool, message: string, status: string, isClockedIn: bool }
Never return raw Date objects to HTML; format via Utilities.formatDate() before returning

### Performance Optimization
Batch formatting: batchFormatRows() for 10+ rows = 11 API calls vs 1,200+ for individual calls (99%+ reduction)
Script Properties: Cache frequently-used values like pay period dates via getSetting()/setSetting()
Data-first calculations: Use data array for lookups and color calculations instead of sheet API calls where possible

### California Overtime Rules
Daily Rules (applied per-day within each workday):
- ≤8h = RT (Regular Time)
- 8-12h = 8h RT + (hours-8) OT (Overtime)  
- >12h = 8h RT + 4h OT + (hours-12) DT (Double Time)

Weekly Rules (applied per-week after daily rules):
- Hours >40 in RT (after daily OT/DT applied) → reclassified as OT
- No pyramiding: Daily OT/DT hours never recounted toward 40h threshold

7th Day Rule (applied per-workweek within pay period):
- 7th consecutive workday in a week: 0-8h = OT, 8h+ = 8h OT + (hours-8) DT
- Week 1 = days 0-6 of pay period; Week 2 = days 7-13 of pay period (each resets consecutiveDays)

### AWS Employee Overtime Rules
AWS employees have different thresholds:
- Daily threshold: 10 hours instead of 8 hours for regular time
- Daily Rules (applied per-day within each workday):
  - ≤10h = RT
  - 10-12h = 10h RT + (hours-10) OT  
  - >12h = 10h RT + 2h OT + (hours-12) DT
- Weekly Rules: Same as California rules, but with different daily thresholds
- 7th Day Rule: Disabled for AWS employees

## Testing
- Web app testing requires `npm run push:test` first, wich pushes and deployes in one step
- Sheet menu testing: refresh browser and test Payroll Tools menu
- Manual entry validation tests check date range constraints
- Archive review functionality tests lazy loading of bounds

## Tool Usage Rules (Strict)
- **ALWAYS read the target file first** using the "read" tool before using "edit".
- Never guess the oldString. Always read → then do precise search/replace.
- Make small, atomic edits. One change at a time is better.
- Use exact string matching (including whitespace and indentation).
- After planning, output ONLY the tool call(s) — no extra text before the tool call.
- If appending new content at the end, prefer the "write" tool or use a unique anchor string at the bottom.
- For deployment tasks, agents may run only `npm run push:test` and must refuse all live-release scripts.
- For non-trivial code changes, agents must add an `Unreleased` entry in `CHANGELOG.md`.

## Modal Management Best Practices
When managing modals in the web interface:
- Modals are implemented as overlays with `position: fixed` and `inset: 0`
- Only one modal should be visible at a time (display:flex) 
- When closing a modal, ensure proper cleanup of state before opening another
- For payroll export completion flow specifically:
  - Close preview modal using `closeAdminHtmlPreviewModal()` 
  - Force admin view to become visible by setting `adminViewModal.style.display = 'flex'`
  - Ensure active filter is reset (`adminShowOnlyActivePayPeriod = false`) to prevent stale data filtering
  - Update period labels from export result if needed
  - Call `loadAdminEntries()` to refresh with current data
- Never use page reloads or navigation for modal transitions as this loses state and context