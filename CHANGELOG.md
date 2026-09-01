# Changelog

All notable changes to this project are documented in this file.

This format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Fixed
- Summary: Improved 15-minute idle auto-refresh reliability by preventing passive preview/dayboard fetches from blocking refresh and by guarding idle-trigger unsaved-check errors.
- Why: Idle time could continue increasing past the soft-refresh threshold when non-critical background loads were still marked in flight or when unsaved-work checks threw at trigger time.
- Files: src/UserInterface.js
- Validation: Updated `hasUiWorkInFlight(...)` to only treat passive loads as blocking when explicitly requested and wrapped `triggerIdleSafeRefresh(...)` unsaved-work evaluation in a safe error guard.

- Summary: Restored reliable 10-minute idle warning visibility on the main employee page by making idle-banner rendering and unsaved-draft checks fault-tolerant.
- Why: A runtime issue in draft-state evaluation could suppress the idle warning update path, and banner rendering should not depend on optional control lookup.
- Files: src/UserInterface.js
- Validation: Updated `setIdleRefreshBanner(...)` to render when bar/message nodes exist and guard button access, and wrapped idle unsaved-work evaluation in error-safe handling so warning state still updates.

- Summary: Fixed a false "refresh is waiting for current actions to finish" idle message on the main employee page when no action was actually running.
- Why: The top-level Processing indicator was visible on first load, and the idle in-flight guard treated that as active work, which blocked the 15-minute quiet refresh path.
- Files: src/UserInterface.js
- Validation: Hid the top-level loading indicator by default and switched the in-flight loading check to computed visibility so idle refresh only waits when the Processing indicator is truly visible.

- Summary: Standardized idle-session handling across interactive HTML surfaces by introducing a shared idle policy profile and reusable guard behavior in the main app, Schedule Tool, More Reports iframe, and Set Pay Period dialog.
- Why: Keeps stale-data protection consistent project-wide and makes idle behavior easier to tune/reuse from one policy shape instead of per-page ad hoc timings.
- Files: src/Code.js, src/UserInterface.js, src/ScheduleHTML.html
- Validation: Added `getStandardIdlePolicy_()` for shared timing defaults, switched main app and Schedule Tool to policy-driven constants, and added idle banner/lock flows with dirty-safe refresh controls to report/pay-period generated HTML.

- Summary: Added Schedule Tool idle-session refresh management with an inline idle banner and edit-safe refresh behavior that pauses automatic refresh when unsaved schedule edits exist.
- Why: Keeps schedule roster data fresher during long idle sessions while preventing silent overwrites of in-progress schedule edits.
- Files: src/ScheduleHTML.html
- Validation: Added schedule idle timers/activity tracking, in-flight guard flags for save/load/check/refresh operations, manual idle refresh button, and server refresh hydration that applies only when no unsaved local changes are pending.

- Summary: Stopped page scrolling from dismissing the idle refresh sidebar so users can review long sections without clearing the idle refresh prompt.
- Why: Scroll movement was being counted as activity, which hid the idle sidebar too aggressively during read-only navigation.
- Files: src/UserInterface.js
- Validation: Removed `scroll` from idle activity listeners while keeping click/keyboard/touch activity listeners intact.

- Summary: Added a blocking idle-session overlay that requires a full refresh after extended inactivity, with a guarded "Return to editing" path when unsaved drafts are present.
- Why: Prevents stale, long-idle sessions from continuing silently while still protecting users from unexpectedly losing in-progress edits.
- Files: src/UserInterface.js
- Validation: Added idle lock threshold handling, overlay UI state, online-aware refresh button behavior, and full reload unlock flow; confirmed unsaved-draft lock mode offers a non-destructive return option.

- Summary: Added a client-side idle refresh manager with a gray idle banner, a manual "Refresh now" action, and unsaved-edit detection that pauses automatic refresh while users are actively editing notes/time entries.
- Why: Keeps dayboard/status/entry data from going stale during long idle sessions without silently discarding in-progress edits.
- Files: src/UserInterface.js
- Validation: Added idle timers, activity listeners, and a safe refresh path that updates status/recent entries/schedule preview/dayboard only when no dirty drafts are present; manual refresh now prompts before proceeding if unsaved draft state exists.

- Summary: Added a cooldown-guarded global stale punch sweep on admin data loads so open entries older than the 14-hour cap are auto-closed even when the affected employee has not opened the app recently.
- Why: Previously stale auto-close was reliably triggered per-user in status checks, but long-open punches could remain until that specific employee returned; admin/dayboard workflows now quietly reconcile these stale entries.
- Files: src/Code.js
- Validation: Added `maybeAutoCloseStaleEntriesForAdminPath_()` with script lock + script-property cooldown and invoked it from `getAllEntriesForAdminView(...)`, which is used by admin/dayboard fetch paths; verified syntax and completed test deploy via `npm run push:test`.

- Summary: Moved the admin dayboard from inside Admin View to the main page under the signed-in user schedule preview, and now load/render it only for users with admin-view permissions.
- Why: The intended UX is an at-a-glance dashboard on the primary page for admins; non-admin users should not request or render this panel.
- Files: src/UserInterface.js
- Validation: Relocated dayboard markup below the employee schedule cards, removed admin-modal embedding and load triggers, added admin-gated bootstrap/refresh calls on the main page, and confirmed diagnostics are clean.

### Changed
- Summary: Added an admin-only punch-aware dayboard under the Admin View controls that shows who is in now, who clocked in today, today’s schedule chips, and multiple punch sessions adjacent to the expected schedule pills.
- Why: Matches the chosen A1 design direction and gives admins a fast at-a-glance view of current coverage and punch history without leaving the admin modal.
- Files: src/Code.js, src/UserInterface.js
- Validation: Added the new dayboard payload endpoint, client normalization/render/load helpers, admin modal markup and styling, and confirmed both touched files pass `node --check` plus language-server diagnostics with no errors.

### Changed
- Summary: Restyled the A1 punch-paired mockup to better match the Schedule Tool's dark slate theme, compact cards, and status accent colors, and updated the unscheduled example so it only appears as a punch-driven case.
- Why: The mockup now reads closer to the production schedule UI and better reflects the real rule that unscheduled employees surface only when they have punches.
- Files: mockups/option-a1-punch-paired.html
- Validation: Updated the mockup palette, card radii, typography, and state badges, then verified the edited HTML file reports no errors and passes `git diff --check`.

### Changed
- Summary: Expanded the A1 punch-paired mockup roster with additional employee examples, including one employee shown as not scheduled for the day.
- Why: Gives the A1 design a broader set of sample states so the paired expected-vs-actual layout can be reviewed against scheduled, off-duty, and unscheduled cases.
- Files: mockups/option-a1-punch-paired.html
- Validation: Added two new example lanes in the mockup and verified the edited HTML file reports no errors.

### Fixed
- Summary: Split the required clock-in note copy into separate messages for no on-duty shift today, early for a later shift, and late clock-in cases, and removed duplicated punctuation from the shared note helper.
- Why: The previous fallback collapsed different schedule states into one message and rendered awkward punctuation when the reason already included a trailing period.
- Files: src/UserInterface.js
- Validation: Updated `getClockNoteRequirement()` and `buildRequiredNoteMessage()` to branch on on-duty schedule timing, then verified the edited file is syntactically consistent with the existing UI logic.

### Changed
- Summary: Added a persisted `Schedule Snapshot` JSON field to every new `DataEntry` row and the archive copy path, populated from the current schedule state at creation time for regular clock-ins, manual entries, and midnight split rows without adding extra server fetches.
- Why: Captures the schedule active at punch time so payroll/audit workflows can trace which day schedule was in force when the entry was created, even for missed entries and cross-midnight time splits.
- Files: src/Code.js
- Validation: Added the new schema column, centralized snapshot generation with `buildEntryScheduleSnapshot_()`, and passed the snapshot through `buildDataEntryRow()` and the primary insertion paths; confirmed JavaScript syntax validates successfully with `node --check src/Code.js`.

### Fixed
- Summary: Restored the missing client-side `isVerifiedValue(...)` helper in the Admin View script scope so verified-state rendering and actions no longer throw a runtime ReferenceError.
- Why: Recent admin/client paths call `isVerifiedValue` in multiple render and action handlers; without the helper, the UI can fail with `isVerifiedValue is not defined`.
- Files: src/UserInterface.js
- Validation: Reintroduced the helper near other shared client utilities and confirmed diagnostics report no errors in the touched file.

### Changed
- Summary: Split Schedule Tool persistence into two Schedule-sheet keys by storing active roster data in `schedule_state_json` and deleted roster data in `schedule_deleted_employees_json`, and updated the Schedule Tool to lazy-load deleted employees only for explicit deleted-view and check-new-employee flows.
- Why: Reduces default schedule payload size and avoids loading deleted-roster data during normal schedule editing while preserving restore behavior for new-employee checks and deleted-row visibility.
- Files: src/Code.js, src/ScheduleHTML.html
- Validation: Added separate read/write helpers for active/deleted schedule state, added a dedicated `fetchDeletedScheduleEmployees()` endpoint, kept active-only fetch/save responses for normal schedule flow, and confirmed diagnostics show no errors in touched files.
- Summary: Refreshed Schedule Tool location and employee-type filter metadata immediately after lazy-loading deleted employees so deleted-only location/type values can be filtered without requiring another render cycle.
- Why: Prevents deleted employees from being temporarily omitted under certain sidebar filter combinations right after first-time deleted-data load.
- Files: src/ScheduleHTML.html
- Validation: Added post-fetch filter sync calls (`syncKnownLocationsFromData`, `rebuildLocationSelect`, `syncKnownEmployeeTypesFromData`, `rebuildEmployeeTypeFilter`) before sidebar re-render.

### Changed
- Summary: Reworked clock note guidance into a prioritized schedule-aware ruleset with a shared required-note template, adding Backup-required clock-in notes, On-Duty start-window helper text, first-punch late-lunch note gating, and the updated off-schedule phrase.
- Why: Keeps note guidance clear and lightweight for employees while reducing copy maintenance to one required-note template with per-rule reason phrases.
- Files: src/UserInterface.js
- Validation: Refactored `getClockNoteRequirement()` and `updateClockNoteRequirementUi()` to preserve existing submit flow, confirmed helper text now renders for informational and required states, and verified touched file diagnostics report no errors.

### Changed
- Summary: Expanded the Schedule Tool Add Employee modal so admins pick a start time and can optionally check extra days, then click an employee to auto-fill a full shift based on workweek rules (CA=8 hours, AWS=10 hours).
- Why: Replaces the old single 08:00 write with a faster onboarding flow that applies complete shifts consistently while preserving manual control over start hour and extra target days.
- Files: src/ScheduleHTML.html
- Validation: Added modal start-time/day controls, per-employee CA/AWS duration indicators, deterministic auto-fill assignment with 6th-hour lunch insertion (`L`), midnight rollover into following day, overwrite behavior for existing statuses, and a single post-apply render/dirty-state update.

### Changed
- Summary: Updated Schedule Tool uncovered-shift logic so only Driver employees count toward O/B coverage; Office employees remain visible/editable but no longer reduce uncovered totals.
- Why: Aligns uncovered calculations with dispatch coverage rules where only Driver staffing should satisfy slot coverage.
- Files: src/ScheduleHTML.html
- Validation: Added a dedicated driver-only day coverage set in render flow and switched uncovered evaluation to that set while preserving existing table rendering and status cycle behavior.

### Changed
- Summary: Added dynamic employee-type checkboxes under Show deleted in the Schedule Tool sidebar, auto-populated from schedule employee records and applied as an active visibility filter for both schedule columns and sidebar employee lists.
- Why: Lets admins quickly focus views by employee type (currently Driver and Office) while keeping the filter resilient to additional type values present in saved employee data.
- Files: src/ScheduleHTML.html
- Validation: Added type-filter UI rendering and state management, wired type checks into both filtered schedule data and sidebar deleted/active lists, and confirmed src/ScheduleHTML.html diagnostics report no errors.

### Changed
- Summary: Added a third schedule status `L` (Lunch) to the Schedule Tool edit cycle, save payload path, and schedule preview rendering, and introduced employee type metadata (`Office` or `Driver`) with a new `Change Type` submenu in the employee action menu.
- Why: Supports explicit lunch-state scheduling and allows admins to categorize employees directly from the existing sidebar dropdown workflow without schema-version changes.
- Files: src/ScheduleHTML.html, src/Code.js, src/UserInterface.js
- Validation: Updated status validation/cycling/rendering and warm-yellow Lunch styling in the Schedule Tool, extended server/client schedule segment normalization to preserve/render Lunch labels, added employeeType normalization/defaulting on client and server, placed `Change Type` beneath `Change Workweek` and above `Delete`, and verified no schema bump (remains `schemaVersion: 1`).

### Changed
- Summary: Performed a calendar-picker cleanup pass by removing unused legacy day-scan helper functions and simplifying the manual range helper text to remove the old "highlighted in red and rejected on submit" sentence.
- Why: The removed helper functions were no longer referenced after moving to date-only disable predicates, and the previous helper sentence no longer matches the streamlined picker guidance.
- Files: src/UserInterface.js
- Validation: Confirmed no remaining call sites for removed picker helpers and retained active date-disable logic on current flatpickr instances.

### Changed
- Summary: Standardized picker calendar date disabling so add/edit time pickers now disable only out-of-range dates (not times), and aligned edit-date bounds to payroll start through today.
- Why: Restores simple calendar day blocking with clearer behavior while keeping time validation in red-message/apply-submit checks instead of hard-locking time selectors.
- Files: src/UserInterface.js
- Validation: Reviewed existing range logic (`getManualAllowedWindow`, `getActivePayPeriodBounds`) and legacy day-disable helpers, then added a shared date-only disable predicate used by manual and admin flatpickr instances.

### Changed
- Summary: Upgraded the Admin Edit Times modal to run live rule-specific validation before Apply (including overlap checks) and to keep Apply disabled until all rules pass, matching missed-time picker behavior.
- Why: Ensures admins see the exact failed rule while adjusting times instead of learning about overlap/range failures only after clicking Apply.
- Files: src/UserInterface.js
- Validation: Added shared admin time-edit validation state helper, wired it into live picker/input events and Apply-click guard, and kept red field highlighting + message updates synchronized with button disable state.

### Changed
- Summary: Replaced generic red manual picker validation text with rule-specific messages so users now see the exact failing condition (before/after allowed range, overlap, open-entry boundary, missing Clock In, or 14-hour cap overflow).
- Why: The prior message bundled multiple rules into one sentence, which made it unclear what needed to be fixed.
- Files: src/UserInterface.js
- Validation: Added explicit invalid-reason helpers for manual Clock In/Clock Out checks and wired them into the existing red hint flow while preserving submit-disable behavior for invalid selections.

### Changed
- Summary: Locked background scrolling whenever the manual date/time entry modal or admin time-edit modal is open, and standardized both picker modals to use the top-right `x` close control while removing their inline Cancel buttons.
- Why: Prevents page movement behind active picker dialogs and aligns date/time modal close behavior with the rest of the app's modal UX.
- Files: src/UserInterface.js
- Validation: Added modal-open body scroll-lock toggling in open/close handlers, updated modal markup to use `modal-close-x`, removed Cancel actions from both picker modals, and confirmed diagnostics report no file errors.

### Changed
- Summary: Reworked the manual/admin time pickers to behave like Google Calendar by allowing out-of-range values to be selected without forcing them back to valid min/max boundaries, while keeping red invalid highlighting and submit/apply disabling until the fields are valid.
- Why: The old flatpickr flow was forcing date/time choices and making the UI feel restrictive and messy; the new flow keeps the existing rejection message as the fallback explanation but lets users pick a value first and then reject it on submit when it is actually invalid.
- Files: src/UserInterface.js
- Validation: Updated the picker initialization to stop locking min/max dates, default new entries to today 8:00 AM to 1:00 PM, preserve selected admin-edit values, and keep Submit/Apply disabled until the selected values pass validation. Verified the file still parses cleanly and the project deploy check runs successfully.

### Changed
- Summary: Removed first-load clock-in note-requirement lag by preloading the signed-in employee schedule preview into initial HTML and using it for immediate client-side gating before async schedule refresh completes.
- Why: Prevents delayed transitions in required vs not-required note state that previously depended on a post-load RPC round trip.
- Files: src/Code.js, src/UserInterface.js
- Validation: `doGet()` now passes preloaded schedule preview into `createMobileHtml(...)`, client initializes schedule state from that payload on boot, and the existing async refresh path remains for reconciliation.

### Changed
- Summary: Updated employee schedule preview segments to render in chronological day order with contiguous split blocks (for example separate overnight and evening Backup segments), and stack each time block pill vertically per day.
- Why: Better mirrors how shifts appear on the schedule timeline and avoids collapsing non-contiguous periods into one misleading range.
- Files: src/Code.js, src/UserInterface.js
- Validation: Reworked day-segment builder to emit contiguous O/B runs in start-time order and adjusted schedule pill layout to column flow so each block appears on its own line.

### Changed
- Summary: Added UI-only note gating for clock actions so clock-in requires a note when no On Duty schedule window is within +/-15 minutes, and clock-out requires a note once an open shift exceeds 5 hours.
- Why: Provides immediate employee guidance for off-schedule starts and long open-shift closures while keeping enforcement client-side only as requested.
- Files: src/UserInterface.js
- Validation: Wired note requirement checks into schedule preview updates, recent-entry refreshes, notes input typing, status refresh, and clock-toggle submit flow; confirmed no server-side verification changes were introduced.
- Summary: Refined clock note UX to keep note input placeholders fixed (`Clock in note`/`Clock out note`), moved requirement guidance to the red helper text, and added a first-load clock-out fallback check from the current status text to prevent delayed disable.
- Why: Keeps the input box text simple while making requirement messaging explicit below the field and tightening initial load behavior before recent-entry hydration completes.
- Files: src/UserInterface.js
- Validation: Confirmed the 5+ hour clock-out requirement now applies from either hydrated open-entry data or parsed status text and the helper text shows the full missed-break instruction copy.

### Changed
- Summary: Added an employee schedule preview directly below the clock button with today/tomorrow summaries, On Duty vs Backup color-coded pills, and a read-only full-week modal opened from the schedule pills.
- Why: Gives employees immediate visibility into current and next-day schedule expectations without opening admin-only tools, while preserving clear fallback messaging when no shift exists.
- Files: src/Code.js, src/UserInterface.js
- Validation: Added a current-user-only schedule preview RPC that reuses existing schedule normalization/roster helpers, wired client rendering into startup + refresh + clock-toggle success flows, and verified touched files pass diagnostics checks.

### Changed
- Summary: Made the Admin View employee name grouping row stay sticky at the top while scrolling long entry lists.
- Why: Keeps user context visible during long-scroll review and edit workflows without changing row actions or grouping logic.
- Files: src/UserInterface.js
- Validation: Added CSS-only sticky positioning on `.admin-group-row td` with top anchoring and layering; confirmed existing admin list scroll container (`overflow:auto; max-height:60vh`) already provides the sticky context.

### Changed
- Summary: Set the payroll PDF export to render in landscape A4 orientation and widened the HTML table layout so the 14-day summary remains readable in exported PDFs.
- Why: The payroll export was previously using a portrait default that compressed the 15-column summary, making the generated report harder to read and print.
- Files: src/Code.js
- Validation: Updated the PDF HTML `@page` rule and table sizing in `buildPayrollPdfHtml()`, and verified the export path still passes through the same preview cache and Drive-save flow without altering the actual payroll logic.

### Changed
- Summary: Auto-bootstrap schedule roster membership when the saved schedule is blank or missing the active user so the app discovers employees before admin or recent-entry loads.
- Why: Prevents a brand-new or empty schedule state from remaining stale; the schedule now self-heals once by scanning DataEntry and Archive for missing employee emails before data is rendered.
- Files: src/Code.js
- Validation: Verified the new bootstrap helper is called from the admin load path, the schedule tool data fetch, and the current-user recent-entry loaders, and confirmed the file remains syntactically valid with a focused parse check.

### Changed
- Summary: Limited all add-note inputs in the HTML interface to 150 characters using native maxlength attributes across employee and admin views.
- Why: Enforces a consistent lightweight client-side note length cap without adding server validation or extra client logic.
- Files: src/UserInterface.js
- Validation: Confirmed maxlength="150" is applied to clock note, manual entry note, recent add-note composers (table/card), and admin preview add-note textarea templates.

### Changed
- Summary: Started entryId-only mutation hardening by removing row-fallback targeting in server edit paths, threading entryId through recent/admin/clock-out UI calls, and switching interactive add-entry writes to append behavior instead of chronological row insertion.
- Why: Prevents mis-targeted edits when rows shift, enforces entryId as the canonical mutation key, and reduces mid-operation row movement caused by insert-time reordering.
- Files: src/Code.js, src/UserInterface.js
- Validation: Verified diagnostics show no errors in both touched files and ran targeted searches confirming no remaining interactive insert-sort call sites and no UI empty-string entryId payload fallbacks.

### Changed
- Summary: Updated the recent-entry and admin add-note controls so a second click while the composer is open behaves like pressing Enter and saves the draft immediately.
- Why: Users can now save a note either by hitting Enter or by clicking the add-note button again after typing, which reduces friction without changing the normal open-and-type flow.
- Files: src/UserInterface.js
- Validation: Confirmed both note composer handlers now check for an open composer with text and fall back to the existing save path; JavaScript diagnostics remain clean.

### Changed
- Summary: Added explicit optimistic UI guidance to the project agent rules so future UI work follows a consistent fast-feedback, pending-state, and rollback pattern.
- Why: The codebase increasingly relies on immediate row-level feedback and in-flight state handling; documenting those expectations avoids regressions and keeps actions consistent across admin and clock workflows.
- Files: AGENTS.md
- Validation: Updated the agent guidance with optimistic UI rules, pending-state expectations, rollback requirements, and destructive-action hold patterns.

### Added
- Summary: Added a manual "Check for new employees" action to the Schedule Tool that discovers missing employee emails and reports exactly who was added.
- Why: Keeps new employee discovery explicit instead of mutating schedule membership during normal load/save flows.
- Files: src/Code.js, src/ScheduleHTML.html
- Validation: Wired the new server action and client button/status path, then verified the touched files parse cleanly.

### Changed
- Summary: Compressed the admin entry action area into a single column so the add-note and delete/restore controls share the same cell and the row no longer carries an empty spacer cell.
- Why: Removes wasted horizontal space around the delete/restore icon column while keeping the same action behavior and row permissions.
- Files: src/UserInterface.js
- Validation: Updated the admin table row builder and header/empty-state colspans to 5 columns, then prepared for a test deployment check.

### Changed
- Summary: Replaced admin row delete/restore confirm dialogs with a 3-second press-and-hold interaction that shows a rotating countdown ring around the action icon while keeping optimistic pending states.
- Why: Prevents accidental destructive taps/clicks, removes blocking browser confirm prompts, and preserves the fast optimistic UI feel for admin actions.
- Files: src/UserInterface.js
- Validation: Verified delete/restore now trigger only after hold duration, release/cancel before 3 seconds does not submit, both actions remain in the same final column with icon swap by deleted state, and existing pending chip/status flow remains intact.
- Summary: Refined admin hold affordance into a full 3-second progress spinner that visibly fills to complete before delete/restore executes, while preserving the same hold timing and optimistic state flow.
- Why: The prior ring read as a thin rotating accent at different UI scales; a fill-to-complete spinner makes progress duration obvious and reduces ambiguity for destructive actions.
- Files: src/UserInterface.js
- Validation: Replaced the hold ring with a schedule-style SVG track/progress asset tied to the hold button size, wired 3-second stroke-dash fill animation on hold class, and confirmed src/UserInterface.js diagnostics report no errors.
- Summary: Simplified the admin hold spinner sizing model so icon and ring remain paired as one visual asset by using fixed SVG ring geometry inside the shared hold container.
- Why: Rem-based SVG radius/stroke overrides introduced drift between icon and ring proportions; fixed viewBox geometry scales consistently with the container and keeps the implementation minimal.
- Files: src/UserInterface.js
- Validation: Removed CSS geometry overrides (`r`/`stroke-width`) from the ring class, retained 3-second fill behavior, tied icon size to hold-size variable, and confirmed src/UserInterface.js diagnostics report no errors.
- Summary: Fixed the Admin View active-pay-period filter so it uses the configured pay-period end date instead of the current day.
- Why: The admin row list was leaking entries after the configured end date because the client-side bounds helper had been widened to today during the manual edit-range refactor.
- Files: src/UserInterface.js
- Validation: Updated the filter helper to use the preloaded active pay-period end label and kept the existing manual-entry fallback path intact.
- Summary: Updated the Schedule Tool to use the normalized email address as the employee identifier throughout the UI while showing a short local-part label for readability.
- Why: Keeps the schedule roster keyed by the canonical email value and avoids relying on a separate display name field for lookups or mutations.
- Files: src/ScheduleHTML.html
- Validation: Confirmed the schedule table, sidebar summary, and add-employee modal now render readable labels while still using email-based identity for edits and hover behavior.
- Summary: Standardized fast-feel client feedback for high-frequency actions by introducing shared pending-action helpers, instant clock-toggle feedback messaging, and visible row-level pending states for admin missed-time/create/delete/restore flows.
- Why: Reduces perceived latency by acknowledging clicks immediately, prevents duplicate in-flight actions, and makes optimistic/admin server-roundtrip states explicit in the rendered UI.
- Files: src/UserInterface.js
- Validation: Verified src/UserInterface.js diagnostics report no syntax errors and confirmed pending row/render paths are wired for optimistic missed-time creation plus delete/restore in-flight states.
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
- Summary: Fixed test environment reset to restore active pay period script properties from generated CSV suggested dates after clearing transient state.
- Why: Reset flow cleared `activePayPeriodStartDate`/`activePayPeriodEndDate` but never reapplied parsed fixture dates, causing fallback drift to a current-date 14-day range.
- Files: src/TestEnviromentReset.js
- Validation: Verified reset flow now calls `setActivePayPeriod(parsed.startDate, parsed.endDate)` after row load/flush and keeps MM/dd/yyyy property formatting via existing setter.
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
