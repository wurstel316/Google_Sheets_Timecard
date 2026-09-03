# Changelog

All notable changes to this project are documented in this file.

This format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Changed
- Summary: Corrected Add Missed Time text scaling so rem-based modal typography follows UI scale settings.
- Why: Text size appeared fixed across UI scale levels because font scaling was applied to body while component typography is defined in rem units.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Moved modal font scaling to root html font-size via `--modal-font-scale`; confirmed diagnostics report no file errors.

- Summary: Split Add Missed Time scaling into separate container-scale and font-scale tracks to align modal text sizing with global UI scale.
- Why: Modal text could appear visually compressed/smaller than surrounding page text when UI scale changed because only shell size was being tuned.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Added `--modal-font-scale` and mapped it directly from UI scale while retaining dampened `--modal-scale` for modal footprint; confirmed diagnostics report no file errors.

- Summary: Tuned Add Missed Time modal UI-scale behavior so desktop size growth is dampened above 100% scale.
- Why: At higher global UI scale, modal width expansion felt too aggressive and visually heavy relative to surrounding page context.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Added modal-specific UI-scale mapping (slower growth above 100%, gentler shrink below 100%) with capped modal scale band; confirmed diagnostics report no file errors.

- Summary: Removed Add Missed Time host iframe surface fill to eliminate large desktop background slab beneath the inner card.
- Why: Even after host chrome removal, the iframe background still rendered a tall dark rectangle because host height is fixed for responsive bounds.
- Files: src/UserInterface.js
- Validation: Set `#addMissedTimeFrame` background to transparent while preserving current host sizing; confirmed diagnostics report no file errors.

- Summary: Removed Add Missed Time host-modal chrome so the iframe content modal is the single visible dialog layer.
- Why: The host wrapper background/shadow/close chrome created a nested-modal look and made sizing appear incorrect.
- Files: src/UserInterface.js, src/AddMissedTimeModalHTML.html
- Validation: Dropped outer Add Missed host close button and host panel chrome, restored inner modal card styling, and preserved mobile full-space behavior; confirmed diagnostics report no file errors.

- Summary: Applied second-pass Add Missed Time visual cleanup with desktop detail-grid layout and stronger mobile full-space behavior.
- Why: Reduces unused vertical space by placing Work Type and Note side-by-side on desktop, softens allowed-range visual weight, and prevents small-looking modal sizing on phones.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Added desktop-only `detail-grid` (Work Type + Note), reduced allowed-range chip contrast, and set mobile modal shell to full viewport height/width; confirmed diagnostics report no file errors.

- Summary: Simplified Add Missed Time modal chrome and spacing to remove duplicate range text and reduce nested modal appearance.
- Why: The modal showed allowed-range text twice and had extra framing/padding that made it read as a modal-inside-a-modal.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Removed duplicate range hint rendering, tightened header/body/footer spacing, made status line collapse when empty, and confirmed diagnostics report no file errors.

- Summary: Switched server manual-entry allowed-range computation to mode-driven constants aligned with Add Missed Time range policy.
- Why: Ensures `validateManualTimeEntry(...)` uses the same configurable range mode semantics as current Add Missed Time behavior instead of fixed hardcoded range limits.
- Files: src/Code.js
- Validation: Added server constants (`pay_period_only | pay_period_to_now | allow_all`) and wired `getAllowedDateRange()` to compute bounds by `ADD_MISSED_TIME_ALLOWED_RANGE_MODE`; confirmed diagnostics report no file errors.

- Summary: Added explicit removal-marker comments on now-unreferenced employee legacy manual-picker helpers retained in the main UI bundle.
- Why: These helpers are no longer referenced after employee Add Time Entry switched to the shared Add Missed Time modal, so comments now mark safe cleanup targets for a later removal pass.
- Files: src/UserInterface.js
- Validation: Verified helpers are unreferenced in-file before annotation (`ceilToManualStep`, `isSelectableManualClockIn`, `isSelectableManualClockOut`) and confirmed diagnostics report no file errors.

- Summary: Routed employee Add Time Entry in the main user interface to the shared Add Missed Time iframe modal contract, while preserving the admin-target legacy entry modal path.
- Why: The reusable modal was already integrated for host loading/bridging and documented with a canonical payload, so employee users now use the same validated contract and conflict-context behavior.
- Files: src/UserInterface.js
- Validation: Added employee modal option builder (`targetEmail`, `targetLabel`, `minDate`, `maxDate`, `rangeLabel`, defaults, `conflictContext`, `refreshConflictContext`), wired employee button flow through `openAddMissedTimeModal(...)` with best-effort preload, submitted modal payload via `submitManualTimeEntry(...)` using `isoClockIn`/`isoClockOut`, and confirmed diagnostics report no file errors.

- Summary: Refreshed Add Missed Time modal inline contract comments to reflect current host wiring and range/debugging behavior.
- Why: Recent range-policy and context-wiring fixes changed practical integration requirements, so comments were updated to prevent drift and future miswiring.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Documented host responsibilities for `minDate`/`maxDate` picker keys, `rangeLabel` display text, no extra range RPC expectation, and legacy fallback rationale; confirmed diagnostics report no file errors.

- Summary: Normalized allowed-range display text to U.S. date format (`MM/DD/YYYY`) across Admin timeline and shared Add Missed Time modal hints/messages.
- Why: Active pay period labels already use U.S. formatting, so showing allowed ranges in ISO format was inconsistent and confusing for admins.
- Files: src/AdminModalHTML.html, src/AddMissedTimeModalHTML.html
- Validation: Added U.S. date format helpers for range labels and bounds validation messages, updated shared modal fallback range hint formatting, and confirmed diagnostics report no file errors.

- Summary: Corrected Admin Timeline pay-period-to-now mode so allowed range ends at current time instead of active pay period end.
- Why: The configured mode text and behavior were inconsistent when today was after pay period end, showing a pay-period-only upper bound while labeled as through-now.
- Files: src/AdminModalHTML.html
- Validation: Updated `getAddMissedTimeAllowedBoundsMs()` so `pay_period_to_now` uses `Date.now()` as `endMs` (with start clamp), then confirmed diagnostics report no file errors.

- Summary: Unified Admin Timeline Add Missed Time and Edit Times to the same mode-driven allowed range, and made that range visibly render in modal UIs.
- Why: Confirms both workflows enforce identical date bounds and gives admins immediate visual confirmation of current range policy.
- Files: src/AdminModalHTML.html, src/AddMissedTimeModalHTML.html
- Validation: Verified shared Add Missed options pass `minDate`, `maxDate`, and `rangeLabel`; updated Edit picker opens to use the same computed bounds and added Edit apply-time bounds validation; added explicit allowed-range display blocks in shared Add Missed header and Admin fallback/edit modals; diagnostics report no file errors.

- Summary: Added a single 3-mode Admin Timeline constant for Add Missed Time date bounds, defaulting to pay-period-start through now.
- Why: Makes allowed-range behavior easy to switch between strict active-period bounds, active-period-start-through-now bounds, or unrestricted client-side bounds without rewiring modal code.
- Files: src/AdminModalHTML.html
- Validation: Added `ADD_MISSED_TIME_ALLOWED_RANGE_MODE` with `pay_period_only | pay_period_to_now | allow_all`, wired range computation into shared modal `minDate/maxDate/rangeLabel`, applied same bounds to fallback picker defaults, and added submit-time bounds validation for fallback entry path; diagnostics report no file errors.

- Summary: Fixed Admin timeline pay-period context wiring so active pay-period labels are loaded from parent in-memory state at modal initialization and rendered prominently in the header.
- Why: Ensures Add Missed Time has pay-period bounds immediately available without a second server call and makes the active period clearly visible at the top of the admin timeline view.
- Files: src/UserInterface.js, src/AdminModalHTML.html
- Validation: Added `getAdminTimelineContextSnapshot()` parent accessor and updated iframe bridge `getAdminContext()` to use it, added visible `activePayPeriodBanner` rendering from initialized context, fixed startup preload invocation to call `preloadAddMissedTimeModal` correctly, and confirmed diagnostics report no file errors.

- Summary: Refined shared Add Missed Time modal UX by syncing target-day text with selected datetime, keeping validation errors in a single bottom pill, and hiding native datetime picker affordances when HTML picker bridge is available.
- Why: Improves clarity and responsiveness during day changes, removes duplicate error rendering, and keeps picker interaction consistent with the shared HTML picker flow.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Added dynamic target label refresh from current Clock In/Out values, removed status-line mirroring for validation messages so overlap/conflict feedback appears once in the bottom error pill, conditionally toggled native datetime picker indicators via `html-picker-available` class when `openDateTimePickerModal` bridge is present, and confirmed diagnostics report no file errors.

- Summary: Added explicit transitional/stale-candidate comments around fallback Add Missed Time paths and bridge compatibility shims.
- Why: Makes future validation and cleanup safer by clearly marking rollout-only behaviors that should be rechecked before removal.
- Files: src/AddMissedTimeModalHTML.html, src/AdminModalHTML.html, src/UserInterface.js
- Validation: Marked fallback manual modal state/handlers, host bridge compatibility shims, and legacy parsing/preload compatibility branches with targeted comments; diagnostics report no file errors.

- Summary: Wired Admin timeline Add Missed Time to the new shared AddMissedTime modal path, including host open/preload bridge plumbing and server HTML endpoint.
- Why: Enables incremental cutover from embedded admin-only modal logic to one reusable modal with faster warm-load behavior and shared validation UX.
- Files: src/AddMissedTimeModalHTML.html, src/Code.js, src/UserInterface.js, src/AdminModalHTML.html
- Validation: Added API/wiring comments in modal, exposed `getAddMissedTimeModalDialogHtml(...)`, added parent modal iframe lifecycle helpers (`openAddMissedTimeModal`, `closeAddMissedTimeModal`, preload/caching, frame bridge injection), extended admin iframe bridge with shared modal open/preload functions, routed add-missed action through shared modal payload submission with employee conflict context, and confirmed diagnostics report no file errors.

- Summary: Implemented Phase 1 and Phase 2 in the reusable Add Missed Time modal with non-blocking DateTime picker preloading and live employee conflict-context validation.
- Why: Improves first-picker interaction speed and gives immediate overlap/open-punch feedback while users edit times.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Added picker warm-state tracking and optional host preload hook usage (`preloadDateTimePickerModal`), configurable `preloadDateTimePicker` behavior, and live conflict checks using `openEntryStartIso/openEntryStartMs`, merged `conflictIntervals`, and optional `refreshConflictContext` callback; submit is disabled in real time when conflicts are present.

- Summary: Fixed Add Missed Time picker return normalization so valid local datetime strings are accepted consistently in both employee and admin flows.
- Why: A valid picker return such as `2026-09-02 08:10:00` could be rejected as invalid-format in some modal paths due to narrow string matching.
- Files: src/UserInterface.js, src/AdminModalHTML.html
- Validation: Expanded picker return parsing to accept local `YYYY-MM-DD HH:MM[:SS]` and `YYYY-MM-DDTHH:MM[:SS]` forms with optional milliseconds/quotes/timezone suffixes and normalize them to `datetime-local` input values.

- Summary: Added a reusable Add Missed Time modal artifact that follows the DateTimePicker blueprint and returns canonical picker-compatible datetime payloads.
- Why: Standardizes missed-time UI and validation behavior in one reusable file, and prevents downstream callers from needing extra datetime normalization.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Implemented strict live validation for ordering, active-range bounds, future-time blocking, 14-hour max span, required note, and canonical submit payload fields (`clockInDateTime`, `clockOutDateTime`, `workType`, `note`, `isoClockIn`, `isoClockOut`) with datetime strings emitted as `YYYY-MM-DD HH:MM:SS`.

- Summary: Added host-driven style token support and DateTimePicker-style presentation hooks to the reusable Add Missed Time modal.
- Why: Keeps modal visuals consistent with existing picker/UI themes while avoiding hardcoded visual dependencies and allowing runtime style overrides.
- Files: src/AddMissedTimeModalHTML.html
- Validation: Confirmed modal supports `themeMode/theme`, `uiScalePercent` aliases, host theme/scale events, and `styleTokens` semantic overrides with safe defaults when tokens are omitted.

- Summary: Replaced Date-object-based picker return validation with deterministic string-contract mapping to `datetime-local` values.
- Why: A valid picker return (`2026-09-02 08:05:00`) was still being rejected; mapping directly from the known picker contract avoids runtime date-constructor edge cases and false invalid-format errors.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified picker consumers now convert return strings via `pickerReturnToInputValue(...)` and assign `YYYY-MM-DDTHH:MM` directly to inputs.

- Summary: Improved picker-format error diagnostics by showing the returned picker string in UI error/status messages and logging the full value to console warnings.
- Why: Makes format mismatches immediately visible during testing without additional instrumentation.
- Files: src/UserInterface.js, src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified invalid-format branches now include `Returned: "..."` plus `console.warn(...)` payload logging.

- Summary: Adjusted strict DateTime picker contract parser to accept `YYYY-MM-DD HH:MM[:SS]` and `YYYY-MM-DDTHH:MM[:SS]` return shapes.
- Why: Keeps parsing deterministic while handling expected separator/seconds variants that can appear across cached picker iframe versions, preventing false "Picked date time format was invalid" errors.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified picker consumers still parse only explicit contract-like datetime strings via `parsePickerDateTimeValue(...)`.

- Summary: Simplified DateTime picker return handling to strict contract parsing (`YYYY-MM-DD HH:MM:SS`) and removed broad normalization behavior for picker results.
- Why: Uses the known picker output format directly, avoids unnecessary normalization layers, and ensures consistent value acceptance across employee/admin picker consumers.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified both `openManualEntryDateTimePicker(...)` and `openAdminTimeEditDateTimePicker(...)` now parse picker output via strict `parsePickerDateTimeValue(...)` before writing to inputs.

- Summary: Fixed false "Picked date time format was invalid" errors in employee Add Missed Time by broadening DateTime picker return normalization to accept common local/ISO datetime variants.
- Why: Some valid picker return strings were being rejected by an overly strict parser shape check, preventing selected values from loading into employee manual-entry fields.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified normalization now accepts `YYYY-MM-DD HH:MM[:SS]`, `YYYY-MM-DDTHH:MM[:SS]` with optional milliseconds/`Z`, plus Date-parseable fallback formatting.

- Summary: Fixed employee Add Missed Time picker value application by adding deterministic local datetime parsing for `datetime-local` values.
- Why: Prevents browser-dependent `new Date(...)` parsing from treating valid picker return strings as invalid and triggering fallback resets, which made selected times appear not to load.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified `parseDateTimeInputValue(...)` now explicitly parses `YYYY-MM-DDTHH:MM[:SS]` / `YYYY-MM-DD HH:MM[:SS]` into local Date values before fallback parsing.

- Summary: Aligned employee Add Missed Time DateTime picker open flow with Admin modal behavior by rebuilding picker bounds on each open and adding an in-flight open guard for trigger buttons.
- Why: Improves reopen reliability in the employee modal by reducing pre-open state churn and preventing duplicate open races that can leave picker interactions appearing unresponsive after first use.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified employee picker launch now uses a single in-flight request gate with both trigger buttons disabled during open and restored in `finally`.

- Summary: Hardened DateTime picker reopen reliability by ignoring stale picker promise callbacks from prior sessions when a new open request is active.
- Why: Prevents late resolution of an old picker promise from closing or resolving the current picker open, which could make the picker appear to only open once.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified picker promise `.then/.catch` handlers now check active request identity before resolving/rejecting and closing host modal.

- Summary: Fixed intermittent DateTime picker modal load stalls by preserving the iframe load handler while an in-flight picker frame load promise is active.
- Why: Prevents a close/reopen race from clearing `frame.onload` too early, which could leave shared loader promises unresolved and make modal opens appear stuck without console errors.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified `closeDateTimePickerModal(...)` now clears `frame.onload` only when no frame-load promise is active.

- Summary: Enforced allowed-range forwarding on all current DateTime picker launch points by passing active pay-period bounds for Admin timeline Add Missed Time and Edit Times picker button opens.
- Why: Guarantees consistent date-range restrictions across employee/manual, admin/missed-time, and admin/edit-time picker flows.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified Admin timeline picker calls for `manualClockIn`, `manualClockOut`, `editClockIn`, and `editClockOut` now pass `{ useActivePeriodBounds: true }`, while UserInterface employee/admin picker launches already pass explicit `minDate`/`maxDate` options.

- Summary: Removed Flatpickr completely from the main user interface and switched manual-entry/admin-edit datetime handling to direct `datetime-local` inputs with standalone DateTime picker launch buttons.
- Why: Simplifies the date-time stack to one picker implementation and avoids adapter complexity while preserving existing validation and overlap safeguards.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors, verified no `flatpickr` references remain under `src/`, verified manual and admin edit pickers still open via `openDateTimePickerModal(...)`, and verified allowed `minDate`/`maxDate` values are passed in picker options on open.

- Summary: Matched employee Add Time Entry Clock In/Out field visuals to the Admin modal datetime field style and fixed picker overlay stacking so the DateTime picker appears above the Add Missed Time modal.
- Why: Ensures consistent field appearance across admin/employee flows and prevents the picker from rendering behind the parent modal.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors, verified employee manual fields now render as `datetime-local` inputs with admin-matching input tokens, and verified `#dateTimePickerModal` z-index is above `#manualEntryModal`.

- Summary: Aligned employee Add Time Entry date-time field wrapper and calendar-trigger styling/classes with the same side-button pattern used in Admin modal pickers.
- Why: Keeps picker launch controls visually consistent across employee and admin missed-time/edit flows for easier reuse and lower UI drift.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors and verified employee manual Clock In/Out now use the same `field-input-with-trigger` and `field-calendar-trigger` pattern/geometry as Admin modal.

- Summary: Wired employee Add Time Entry Clock In/Out controls to the standalone DateTime picker with right-side trigger buttons and disabled legacy flatpickr popup opening for those fields.
- Why: Unifies date/time entry UX across employee and admin flows while preserving the existing manual-entry validation engine and keeping picker launches fast.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors, verified picker options include `minDate`/`maxDate` from the existing manual allowed-range/rule state on each open, and verified selected values are written back into the existing manual-entry inputs used by submit/overlap validation logic.

- Summary: Wired Edit Times clock-in/clock-out inputs in timeline Admin to the standalone DateTime picker using right-side calendar trigger buttons and hidden native picker indicators.
- Why: Keeps date/time interactions consistent with Add Missed Time and standardizes future picker rollout while preserving existing edit-save validation and overlap checks.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors, verified Edit Times inputs now use custom trigger buttons for picker launch, and verified Add Missed Time remains pay-period bounded while Edit Times picker launch remains unbounded.

- Summary: Hardened DateTime picker reuse by normalizing host open options and adding explicit picker API contract comments for future call-site consistency.
- Why: Supports seamless rollout across all date/time entry points by accepting common option aliases (`use24Hour`, `timeMode`, scale aliases) while keeping behavior deterministic.
- Files: src/UserInterface.js, src/DateTimePickerModal.html
- Validation: Confirmed diagnostics report no file errors and verified `openDateTimePickerModal(...)` now normalizes option aliases before each launch while picker-side `applyOptions(...)` recognizes `timeMode` and `use24Hour` consistently.

- Summary: Optimized DateTime picker host loading by caching picker HTML after first fetch and reusing a warm iframe between opens, while preserving fresh per-open option application.
- Why: Reduces repeated server round trips and iframe reparse cost for faster back-to-back picker launches during admin Add Missed Time workflows without risking stale default/range data.
- Files: src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors, verified host now performs a single lazy picker HTML fetch per page session, verified close no longer tears down picker iframe content, and verified each `openDateTimePickerModal(options)` call still applies a fresh options object before opening.

- Summary: Rewired only the Add Missed Time clock-in/clock-out calendar triggers in timeline Admin to open the new standalone DateTime picker modal through the parent iframe host bridge.
- Why: Enables incremental migration in one controlled location while preserving existing Add Missed Time validation, submission flow, and data contract behavior.
- Files: src/AdminModalHTML.html, src/UserInterface.js
- Validation: Confirmed diagnostics report no file errors, verified new Admin host bridge exposes `openDateTimePickerModal(options)`, and verified clicking the new calendar trigger buttons beside Add Missed Time fields opens the standalone picker and writes confirmed selections back into existing `datetime-local` inputs.

- Summary: Started DateTime picker Phase 1 production wiring by adding a dedicated picker HTML payload, server endpoint, and parent iframe modal bridge in the main UI without replacing existing call sites.
- Why: Establishes the Schedule/Admin-style host architecture for incremental rollout so current flows remain stable while the new picker contract is integrated.
- Files: src/DateTimePickerModal.html, src/Code.js, src/UserInterface.js
- Validation: Confirmed diagnostics report no errors for touched files, verified `getDateTimePickerDialogHtml(preferredThemeMode)` serves themed HTML, and verified host bridge functions (`openDateTimePickerModal`, `closeDateTimePickerModal`, `buildDateTimePickerFrameHtml`) load the child picker API and resolve/cancel promise results.

- Summary: Reworked Calendar V3 into a compact modal-style click/tap picker with side-by-side desktop layout, stacked mobile layout, and a top selected datetime display.
- Why: Aligns the V3 direction to a production-ready small modal picker concept that can be called with allowed date range and default datetime inputs and return a datetime string output.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed the mock exposes a callable API (`window.CalendarCompactPicker.open(options)`), enforces min/max allowed date selection in calendar interactions, supports click/tap-only date and time picking (including 12h/24h toggle), and resolves selected value as `YYYY-MM-DD HH:MM:00` on confirmation.

- Summary: Refined Calendar V3 clock flow so tapping an hour automatically advances to minute selection on the same clock face and removed the separate minute button grid below the clock.
- Why: Keeps the picker compact and reduces extra UI controls while making hour-to-minute selection faster on touch devices.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed hour taps switch the active selection state to minute mode immediately and minute selection continues on the radial clock without the lower minute grid.

- Summary: Added an AM/PM toggle beside the minute box in Calendar V3 for 12-hour mode period selection.
- Why: Makes period changes explicit and fast in compact touch flow without reopening or reselecting hour values.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed AM/PM controls appear next to the minute box in 12h mode, hide in 24h mode, and correctly shift selected time between AM and PM while preserving hour/minute value.

- Summary: Corrected Calendar V3 24-hour clock layout so hour labels render in proper centered inner/outer rings with improved sizing and radial alignment.
- Why: Fixes off-center and undersized 24h labels while keeping the compact clock interaction usable and visually balanced.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed 24h labels now map to a two-ring geometry (0-11 outer, 12-23 inner), hand alignment follows hour angle correctly, and 12h mode behavior remains unchanged.

- Summary: Fixed Calendar V3 clock-face render timing so 24h labels are positioned only after modal layout is visible and sized.
- Why: Prevents collapsed/off-corner number placement caused by computing radial coordinates while the hidden modal reports near-zero clock width.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed open flow now defers number layout until after modal open paint and radial labels render centered on the clock face in 24h mode.

- Summary: Updated Calendar V3 interaction polish so 24h hand length targets inner or outer ring based on selected hour, and added hover highlights with live hand preview for clock/calendar options.
- Why: Improves 24h ring clarity and gives immediate visual feedback while hovering candidate selections before click/tap commit.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed in 24h hour mode the hand shortens for inner-ring hours (12-23) and extends for outer-ring hours (0-11), calendar/clock items show hover highlighting, and hovering clock values dynamically previews hand angle/length.

- Summary: Added a theme-and-scale integration prewire pass to Calendar V3 so the compact modal can adopt main-app light/dark mode tokens and dynamic UI scale signals when embedded.
- Why: Reduces migration effort when moving the mockup into production by aligning with existing `data-theme` and `timecard-ui-scale-change` patterns used by current modals.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed the mock exposes `applyThemeMode` and `applyScalePercent`, accepts `themeMode` and scale options in `open(...)`, reads parent theme/font-scale fallbacks, listens for host scale/theme events, and reflows clock geometry after scale changes.

- Summary: Added an in-file production integration blueprint to Calendar V3 describing the extraction path to `DateTimePickerModal.html` and host bridge contracts.
- Why: Captures the exact API and wiring plan in the mockup so migration into Code.js/UserInterface.js follows existing Schedule/Admin modal patterns with less ambiguity.
- Files: mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Confirmed comments now define endpoint naming, frame host function expectations, open options shape, result contract, and theme/scale bridge event expectations.

- Summary: Added three standalone calendar replacement mockups covering vertical time scroll, snap time reel, and clock-based picking with 12h/24h mode toggle, all linked from the mockup index.
- Why: Creates focused alternatives for replacing the current admin/calendar picker experience while preserving keyboard-first workflows and touch/mouse parity before production integration.
- Files: mockups/index.html, mockups/option-calendar-v1-date-plus-time-scroll.html, mockups/option-calendar-v2-date-time-reel.html, mockups/option-calendar-v3-date-plus-clock-toggle.html
- Validation: Verified each mockup runs as standalone HTML, supports typed entry with tab flow, supports wheel/swipe interactions for time selection, enforces min/max date restrictions by disabling out-of-range days and blocking out-of-range typed values, and is reachable from the mockup index.

- Summary: Removed inline note-save flashing in timeline Admin so save feedback relies on status messaging instead of pending pulse visuals.
- Why: Reduces visual distraction during frequent note updates while preserving clear save-state communication.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified inline note saves still apply optimistically with status updates and rollback on failure.

- Summary: Removed the timeline helper legend footer text and adjusted content top padding so the first employee/email row sits flush under the header divider.
- Why: Reduces visual noise and reclaims vertical space while improving alignment with the top divider.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors after removing legend markup/styles and tightening content spacing.

- Summary: Ran a compact top-chrome pass on timeline Admin by reducing header/title/control sizing and converting toolbar/switch rows to horizontal scroll strips to reclaim vertical space.
- Why: Increases default visible rows within the modal without changing feature behavior.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified all header controls remain available while taking less vertical space.

- Summary: Updated timeline Admin V3 notes to use true optimistic inline saving (note appears instantly, sync runs in background, rollback on failure) and removed fixed-height content capping so the view fills modal height.
- Why: Improves perceived responsiveness for note entry and fixes wasted vertical space inside the admin modal.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified inline notes render immediately, save via Enter/Save, and revert on server failure.

- Summary: Promoted the V3 inline note workflow into the live timeline Admin notes panel so plus opens an in-grid typable note tile with Save/Cancel and keyboard controls.
- Why: Lets admins add notes directly in context without leaving the day notes surface while keeping timeline-dot edit modal behavior intact.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified inline composer supports Enter to save, Shift+Enter for line breaks, and Escape to cancel.

- Summary: Updated the V3 inline note composer keyboard behavior so Enter saves the note in-place (with Shift+Enter reserved for line breaks).
- Why: Makes inline note entry faster and matches expected quick-add behavior during admin review.
- Files: mockups/option-notes-v3-hybrid-grid.html
- Validation: Confirmed Enter saves, Save button still works, and Escape still cancels the inline composer.

- Summary: Iterated V3 notes mockup with inline note composition so plus opens an in-place typable note tile (save/cancel) instead of modal-style behavior.
- Why: Supports faster UX iteration for day-level note entry directly inside the contained notes grid before applying production Admin UI changes.
- Files: mockups/option-notes-v3-hybrid-grid.html
- Validation: Confirmed inline composer opens from per-note plus buttons, supports Save/Cancel and keyboard shortcuts (Ctrl/Cmd+Enter, Esc), and inserts saved notes back into the same grid style.

- Summary: Applied the selected V3 notes containment style to timeline Admin: one large day-level notes box using a compact responsive grid so shorter notes share rows when space allows.
- Why: Increases information density while keeping a clean daily notes surface and preserving per-note plus actions.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors after replacing row-stack notes rendering with hybrid-grid tile rendering.

- Summary: Added three focused note-containment mockups to evaluate denser day-level note grouping before further production UI changes.
- Why: Speeds iteration by comparing layout density options side-by-side (single stream, wrapped shared rows, and hybrid grid) for the new Admin timeline notes surface.
- Files: mockups/option-notes-v1-single-stream.html, mockups/option-notes-v2-wrap-rows.html, mockups/option-notes-v3-hybrid-grid.html, mockups/index.html
- Validation: Confirmed files render as standalone HTML mockups and linked all variants from the mockup index for one-click review.

- Summary: Unified timeline Admin day notes into a single cross-entry notes list so note rows are grouped by day instead of by underlying sheet entry, with one plus action rendered per note row.
- Why: Matches admin workflow expectations where daily notes matter more than internal entry boundaries.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified plus actions still route through existing add-note flow.

- Summary: Reworked timeline Admin day detail cards into a single grouped notes panel per day, removing duplicated time/hour text and removing pencil actions so timeline dots remain the edit entrypoint while plus buttons continue to add notes.
- Why: Tightens visual hierarchy and matches intended interaction model (timeline for edits, notes panel for note management).
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified add-note buttons still open the edit modal focused on note input.

- Summary: Corrected timeline Admin user-row sticky behavior by removing overflow clipping on employee sections so each user header stays pinned until the next user section reaches the top.
- Why: Restores legacy-style sticky grouping behavior for easier scanning in long admin lists.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors after the CSS adjustment.

- Summary: Updated the timeline Admin modal to match legacy control details by making employee headers sticky, converting filter options to legacy-style switch tracks, and using icon-style row actions including a dedicated add-note affordance.
- Why: Improves visual/interaction parity so old vs new Admin testing focuses on behavior differences instead of control styling inconsistencies.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified new controls still route through existing edit/add-note flows.

- Summary: Flattened the new AdminModalHTML container so it renders full-bleed inside the parent iframe modal and removed the duplicate in-frame close button.
- Why: Prevents the new Admin timeline UI from appearing as a second nested modal during testing.
- Files: src/AdminModalHTML.html
- Validation: Confirmed diagnostics report no file errors and verified layout now uses the parent modal as the sole shell.

- Summary: Completed the first full AdminModalHTML implementation pass by replacing the scaffold with a live B2.1-style timeline admin app, wiring real admin mutations (verify/edit/delete/restore/note/manual add), and adding a persistent test-mode toggle to switch between legacy and timeline Admin UIs.
- Why: Enables side-by-side migration testing with safe rollback while exercising real server contracts from the new dedicated Admin HTML surface.
- Files: src/AdminModalHTML.html, src/UserInterface.js, src/Code.js
- Validation: Confirmed diagnostics report no errors, verified new iframe host bridge provides context and legacy handoff hooks, and ensured Admin View routing now honors persisted mode (`legacy` vs `timeline`) for repeatable testing.

- Summary: Started AdminModalHTML migration by adding a dedicated server HTML endpoint, parent iframe modal/bridge wiring, guarded rollout switch routing from Admin View, and an initial AdminModalHTML scaffold that loads and groups admin entries.
- Why: Establishes the new ScheduleHTML-style architecture for Admin UI while preserving the legacy Admin modal path for phased rollout and safe fallback.
- Files: src/Code.js, src/UserInterface.js, src/AdminModalHTML.html
- Validation: Confirmed endpoint/theme injection path compiles conceptually against existing modal patterns, retained legacy show/hide admin behavior behind `USE_ADMIN_MODAL_HTML`, and scaffolded child UI to load `getAllEntriesForAdminView(...)` through iframe bridge hooks.

- Summary: Expanded B2.1 implementation comments for Add Missed Time with explicit server hook routing, optimistic reconcile/rollback flow, and a custom picker module plan that avoids reusing the current calendar picker stack.
- Why: Prepares the mockup as an implementation-ready spec for a dedicated Admin HTML modal with fast, reliable data flow and clear ownership of missed-time validation/submission behavior.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Reviewed live hook compatibility (`submitManualEntryFromMenu`, `submitManualTimeEntry`), documented custom picker contract and error handling flow, and confirmed diagnostics report no file errors.

- Summary: Completed an internal consistency pass on B2.1 by wiring `warn`/CHECK rows to timeline color states and adding explicit implementation comments about adopting established `--tc-*` dark/light styling tokens during production migration.
- Why: Ensures example data matches legend semantics (missing schedule snippet visibly renders as CHECK) and keeps future Admin HTML migration aligned with the existing theme-token architecture.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed rows with `status: 'warn'` render warn-colored dots/lines in timeline view, legend semantics now match visible state, and diagnostics report no file errors.

- Summary: Expanded B2.1 mockup implementation comments with a performance-first backend/data-flow plan for the future dedicated Admin HTML modal migration.
- Why: Establishes concrete non-visual optimization guidance for responsive UX, including normalized client stores, row/day patch rendering, optimistic rollback scopes, delta payloads, lazy deleted-data loading, and batched verify contracts.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed added comments map to existing live endpoints and workflows (`getAllEntriesForAdminView`, `adminSaveEntryUpdate`, `adminSetEntryVerifiedBatch`, iframe bridge pattern) and diagnostics report no file errors.

- Summary: Added an in-file implementation blueprint to B2.1 with a deep-dive parity map against the current admin modal, including concrete hook names, mutation endpoints, and a dedicated Admin HTML-file migration/data-flow plan.
- Why: Captures the implementation path before production changes so the mockup doubles as a technical spec for moving Admin View into its own HTML surface (Schedule Tool style).
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Verified comments reference current live client/server hook names (`getAllEntriesForAdminView`, `adminSaveEntryUpdate`, `adminSetEntryVerifiedBatch`, schedule iframe bridge pattern) and diagnostics report no file errors.

- Summary: Added a red strike-through visual state for deleted B2.1 timeline entries so deleted punches render crossed out until restored.
- Why: Makes deleted-row state immediately visible on the timeline while preserving recoverability through restore.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed deleted rows render red strike overlays across the punch segment with muted red-labeled dots, and restored rows return to normal styling; diagnostics report no file errors.

- Summary: Corrected B2.1 timeline hour-label alignment by replacing auto-distributed tick layout with exact percentage-positioned tick anchors.
- Why: Ensures the text above the bars lines up precisely with the 24-hour grid and expected-bar positions.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed each 2-hour tick is anchored at exact 1/12 intervals from 00:00 through 24:00 and diagnostics report no file errors.

- Summary: Adjusted B2.1 edit-modal behavior so saving a note is note-only and does not trigger time-edit pending flows, and Apply now skips time-edit execution when Clock In/Out are unchanged.
- Why: Prevents note-only workflows from appearing to edit punches and avoids creating synthetic time-edit actions when no actual time change was made.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed Save Note updates only the modal notes list with toast feedback, and Apply with unchanged times closes modal with a no-op message instead of running edit mutation flow.

- Summary: Updated B2.1 Edit Times inputs to 24-hour HH:MM format for both display and save behavior.
- Why: Keeps edit fields consistent with timeline dot labels and avoids AM/PM ambiguity during admin edits.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed opening Edit Times now pre-fills Clock In/Out as HH:MM, applying edits persists HH:MM values, and diagnostics report no file errors.

- Summary: Cleaned B2.1 punch/timeline visuals by switching punch-dot captions to 24-hour HH:MM format only and removing IN/OUT and AM/PM text, while aligning expected bars to parsed schedule hours and hiding expected-bar text labels.
- Why: Reduces visual noise on dense timelines and improves hour alignment readability by anchoring schedule bars to explicit start/end clock times.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed punch dots render HH:MM labels only, expected bars render without text overlays, and schedule bars use time-parsed placement across the full 24-hour axis with clean diagnostics.

- Summary: Performed a B2.1 timeline formatting pass to reduce clipping, switch to a full 24-hour axis, and render all punch entries on one shared visual row.
- Why: Improves scan consistency and makes the timeline a complete-day view while avoiding edge clipping for punch anchors and labels.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed timeline ticks render 00:00 through 24:00, hourly grid spans full width, punch dots and connectors share a single row, and diagnostics report no file errors.

- Summary: Refined B2.1 edit-modal controls by restoring the original icon-style hold-delete/green-restore button behavior, closing the edit modal immediately after a completed hold-delete, removing day-row cards under the timeline, and adding Enter-to-save note support.
- Why: Keeps the timeline as the only row-level interaction surface, preserves safer delete confirmation ergonomics, and speeds note entry workflows without extra pointer travel.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed row edit opens from timeline dots only, active rows require 3-second hold on DEL icon before delete, modal closes immediately after hold-delete completes, restore uses green pill state, and pressing Enter (without Shift) in note input saves the note.

- Summary: Updated B2.1 Edit Times modal so active rows require a 3-second hold action to delete, while deleted rows can be restored with a normal click.
- Why: Preserves the safer hold-to-delete pattern after moving row controls into the modal and prevents accidental deletes during fast edit workflows.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed active modal row actions now show Hold 3s to Delete, only delete after sustained hold, and keep restore as a one-click action with clean diagnostics.

- Summary: Moved B2.1 note management and delete/restore controls into the Edit Times modal, and simplified the day note list to timestamp rows that open the modal.
- Why: Consolidates row editing workflows into one popup, reduces visual clutter below the timeline, and keeps timeline space prioritized while preserving existing admin actions.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed clicking timeline dots or day-row Open Edit launches the modal with row details, existing notes, add-note input, and delete/restore toggle; verified day panel no longer renders inline note/delete controls and diagnostics report no errors.

- Summary: Updated B2.1 to use a single day-level verify control in the day header and removed per-entry verify controls from the timeline area.
- Why: Frees horizontal space for the day timeline while preserving the same verification workflow semantics at the day scope.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed one Verify Day button appears on each day row, toggles all non-deleted entries for that day, and timeline width expands after removing the left verify rail.

- Summary: Simplified B2.1 day details by removing duplicate per-session in/out/schedule bars below the timeline and replacing them with a day-level notes panel containing timestamped notes plus delete/restore actions.
- Why: In/out and schedule context are already represented in the day timeline, so the lower area now focuses on note auditing and entry removal workflows with less visual duplication.
- Files: mockups/option-b2-1-day-timeline.html
- Validation: Confirmed timeline remains the primary source for in/out and schedule context, dot-click edit and left-rail verify interactions remain active, and add-note stays alongside the note lines for each timestamped note item.

- Summary: Consolidated mockup exploration around B2 by removing non-B2 variants and adding B2.1 as a full workflow-parity day-timeline iteration.
- Why: Review focus shifted to timeline-first admin UX; B2.1 preserves current admin workflows while testing one timeline per user-day with dot-driven edit interaction.
- Files: mockups/index.html, mockups/option-b2-1-day-timeline.html, mockups/option-a1-punch-paired.html, mockups/option-b1-row-audit.html, mockups/option-b3-exception-queue.html, mockups/option-b4-current-view-sync.html, mockups/option-b5-full-admin-workflow-parity.html
- Validation: Verified B2 remains unchanged as baseline, B2.1 includes full parity controls/modals, clickable in/out dots open edit flow, verify controls sit left of timeline, add-note action is located by note lines, and removed options are no longer listed in index.

- Summary: Upgraded B2 from a directional timeline concept to a full workflow-parity admin mock while retaining timeline-overlay visualization.
- Why: B2 needed the same functional depth as the parity mock so timeline-first review can validate complete admin workflows, not just visual treatment.
- Files: mockups/index.html, mockups/option-b2-timeline-overlay.html
- Validation: Added interactive admin controls and modal workflows (verify/edit/add-note/hold-delete/restore/add-missed/payroll preview+export/AWS settings/holiday pay/schedule tool/more reports) and preserved per-punch schedule snippet + +/-15 minute sync cues on timeline tracks.

- Summary: Added a full workflow parity admin mockup (B5) that preserves current Admin View controls and end-to-end workflows while layering in per-punch schedule sync context.
- Why: Directional concepts were not sufficient for implementation planning; this provides a closer functional simulation of the existing admin experience before production edits.
- Files: mockups/index.html, mockups/option-b5-full-admin-workflow-parity.html
- Validation: Implemented interactive mock flows for row verify/edit/add-note/delete-hold/restore and modal workflows for missed time, payroll preview/export, AWS settings, holiday pay, schedule tool, and more reports.

- Summary: Added a fourth admin mockup option (B4) that closely mirrors the current Admin View layout while adding per-punch schedule snippets and +/-15 minute sync flags.
- Why: Provides a low-risk visual path for rollout by keeping familiar grouping, controls, and punch rows while exposing schedule alignment at the exact punch level.
- Files: mockups/index.html, mockups/option-b4-current-view-sync.html
- Validation: Confirmed B4 is linked from the mockup index and verified the new file is isolated to the mockups directory.

- Summary: Added three new admin-view mockup options focused on per-punch schedule snippet visibility and out-of-sync highlighting using a +/-15 minute leeway model.
- Why: Provides side-by-side design directions for quickly auditing punch-to-schedule alignment before implementation changes to production files.
- Files: mockups/index.html, mockups/option-b1-row-audit.html, mockups/option-b2-timeline-overlay.html, mockups/option-b3-exception-queue.html
- Validation: Confirmed new mockup files exist, updated the mockup index with navigation cards for each option, and verified changes were isolated to the mockups directory plus changelog documentation.

- Summary: Performed a simplification pass by removing the legacy dark-only override block that had become redundant after token migration, and replaced it with a single shared `.info` rule.
- Why: Reduces CSS size and cascade complexity while preserving identical theme behavior through existing token-based styles.
- Files: src/UserInterface.js
- Validation: Confirmed removed dark override selectors had no remaining unique behavior requirements, added token-based `.info` base styling, and verified diagnostics plus node --check pass.

- Summary: Completed a hardcoded style/color cleanup pass by tokenizing remaining semantic action/button/row states, recent-card accents, iframe and preview-shell inline colors, and AWS error/empty-state inline text colors.
- Why: Eliminates non-standard hardcoded colors outside token definitions so light/dark theming is consistent and easier to maintain without extra runtime logic.
- Files: src/UserInterface.js
- Validation: Replaced remaining selector and inline-style hardcoded hex values with theme variables, verified no non-token hardcoded color selectors remain in targeted sweeps, and confirmed diagnostics plus node --check pass.

- Summary: Standardized element-level color tokens for form fields, picker surfaces, modal secondary/close controls, note surfaces, table row borders, and empty-state text so border/background/text behavior is consistent across light and dark mode.
- Why: Removes remaining hardcoded neutral colors in high-use UI elements, improving visual consistency and reducing dark-mode contrast glitches without adding runtime overhead.
- Files: src/UserInterface.js
- Validation: Added shared field/picker/neutral tokens to both theme roots, migrated targeted selectors and inline empty-state styles to token usage, and confirmed src/UserInterface.js diagnostics plus node --check pass.

- Summary: Completed Zone 5 theme tokenization for the admin dayboard, payroll preview table, holiday matrix surfaces, and AWS settings container, and removed now-redundant dark-only overrides for those selectors.
- Why: Finishes the staged minimal-CSS refactor by collapsing duplicated dark override rules into shared token-based selectors for lower cascade complexity and stable runtime repaint behavior.
- Files: src/UserInterface.js
- Validation: Repaired malformed Zone 5 CSS block boundaries, replaced hardcoded color values with semantic variables, removed matching dark overrides, updated runtime placeholder styles to use tokens, and confirmed src/UserInterface.js passes diagnostics plus node --check.

- Summary: Started zone-by-zone tokenization by converting shared shell/primitives to semantic theme tokens and trimming redundant dark-mode overrides.
- Why: Reduces CSS cascade complexity and runtime styling conflict risk while keeping theme switching fast and visually stable.
- Files: src/UserInterface.js
- Validation: Tokenized shared controls/status/buttons/inputs/modal shell text colors, removed matching dark-only override entries that became redundant, and confirmed diagnostics plus syntax checks pass.

- Summary: Added project-wide light/dark mode support with integrated theme controls, per-user theme persistence, and cross-frame synchronization between the main app, Schedule Tool, and admin report surfaces.
- Why: Enables users to swap all interactive UI to light or dark mode consistently across the application and retain their preference across sessions.
- Files: src/UserInterface.js, src/ScheduleHTML.html, src/Code.js
- Validation: Added theme token layers and runtime toggles, passed theme mode into embedded dialogs/iframes, synced iframe theme updates back to the parent app, and confirmed diagnostics report no errors for all touched files.

- Summary: Reduced theme runtime overhead by removing redundant live cross-frame theme listeners and unused theme read API while preserving per-user persistence and open-time theme alignment.
- Why: Keeps implementation minimal and improves stability/performance by avoiding extra event wiring and parent-frame mutation work.
- Files: src/UserInterface.js, src/ScheduleHTML.html, src/Code.js
- Validation: Removed `timecard-theme-change` emit/listener flow and parent write-back path in schedule iframe, retained server-side theme injection for generated HTML, and confirmed diagnostics/syntax checks pass.

- Summary: Fixed malformed UI scale control CSS introduced during theme edits.
- Why: Prevents style parsing glitches and unintended button coloration/regressions.
- Files: src/UserInterface.js
- Validation: Restored proper rule closure and consistent token-based styling for `ui-scale-step-btn`/`ui-scale-value`; verified diagnostics and syntax checks pass.

- Summary: Aligned the top control pills into a single left-edge stack by placing Display Menu, idle timer pill, and Admin View together with matching widths.
- Why: Ensures consistent edge alignment and equal visual sizing for the requested top-of-page controls.
- Files: src/UserInterface.js
- Validation: Added a shared top-left controls container, removed split left/right absolute button placement, and confirmed diagnostics report no file errors.

- Summary: Repositioned the idle timer into a small inline pill directly below the Display Menu control, removed the manual refresh button, and limited copy to two countdown lines: Auto Refresh and Lock.
- Why: Restores the intended compact pill presentation and keeps timer status consistent and unobtrusive during testing.
- Files: src/UserInterface.js
- Validation: Updated idle timer markup/CSS to inline pill geometry, removed refresh-action elements, normalized countdown copy format, and confirmed diagnostics report no file errors.

- Summary: Restored the top idle timer to a compact floating pill style instead of a full-width banner while keeping always-visible countdown behavior.
- Why: Prevents regression from the expected small pill presentation used during testing.
- Files: src/UserInterface.js
- Validation: Updated idle timer container/button styling to pill geometry, kept always-visible state messaging, and verified diagnostics report no file errors.

- Summary: Made the top idle timer pill always visible on the main page by showing live auto-refresh and lock countdown states instead of hiding the pill before the idle refresh threshold.
- Why: In testing, the timer needed to remain visible at all times so admins can confirm refresh/lock timing behavior without waiting for warning gates.
- Files: src/UserInterface.js
- Validation: Replaced idle hide paths with countdown/status messaging for pre-refresh, paused, offline, and post-refresh states; confirmed diagnostics report no file errors.

- Summary: Simplified main-page idle refresh behavior to auto-refresh every 5 minutes of inactivity and lock the session at 30 minutes, removing separate warning-threshold gating.
- Why: Matches the requested behavior so refresh happens on a strict idle cadence without waiting for an earlier warning-only phase.
- Files: src/UserInterface.js
- Validation: Set fixed idle soft-refresh and lock thresholds in client logic, replaced warning-gate check with soft-refresh gating, and confirmed diagnostics report no file errors.

- Summary: Removed the admin dayboard hour sidebar in the main app and kept employee name/status metadata in a fixed left column beside expected and actual punch tracks across viewport sizes.
- Why: Aligns production UI with the approved A1 review direction for cleaner scan flow while preserving side-by-side lane readability.
- Files: src/UserInterface.js
- Validation: Removed hour-rail markup generation and CSS selectors, kept two-column lane layout at desktop and mobile breakpoints, and verified diagnostics show no file errors.

- Summary: Updated the A1 dayboard mockup to match the current production-style light layout while removing the left hour sidebar, and consolidated mockup review scope to A1 only.
- Why: Supports the requested UI direction review (no hour rail) before applying changes to live project files and removes stale alternative mockups.
- Files: mockups/option-a1-punch-paired.html, mockups/index.html, mockups/option-a-timeline-board.html, mockups/option-a2-punch-timeline.html, mockups/option-a3-dual-track.html, mockups/option-b-split-focus.html, mockups/option-c-dense-grid.html
- Validation: Verified mockups directory now contains only index + A1, updated index links to A1 only, and confirmed edited files applied cleanly.

### Fixed
- Summary: Added a neutral clock-in note message branch for between-shifts cases where an earlier on-duty start has already passed and a later on-duty start is still upcoming.
- Why: The prior wording could read as misleading "early for later shift" guidance when users were between two scheduled on-duty windows after missing an earlier start.
- Files: src/UserInterface.js
- Validation: Updated `getClockNoteRequirement()` decision ordering and rule-table documentation to classify between-shifts timing separately while keeping required-note gating unchanged; confirmed touched-file diagnostics report no errors.

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
