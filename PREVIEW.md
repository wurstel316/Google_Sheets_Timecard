# Local UI Preview Workbench

Git policy for this phase: **push only to `ui-preview-workbench`.**
Do not push UI refinement work to `main`, `newUI_AdminUI`, `NewScheduleFeature`, or live/test clasp unless a human explicitly asks.

Goal: refine HTML/CSS/client UI without `clasp push`. Validate by opening static files and screenshots.

## Start

From repo root:

```bash
npm run preview
```

Then open http://127.0.0.1:4173/mockups/

## What maps where

| Surface | Live source | Mockups that inform it |
|---|---|---|
| Admin dayboard / timeline | `src/AdminModalHTML.html` | B2 overlay, B2.1 one-timeline-per-day, notes V3, sync-status plan |
| Schedule tool | `src/ScheduleHTML.html` | Live schedule launcher (no separate mockup series) |
| Date/time picker | `src/DateTimePickerModal.html` | Calendar V1 / V2 / V3 (V3 clock is the closest ancestor of live) |
| Add missed time | `src/AddMissedTimeModalHTML.html` | Live modal launcher |
| Employee clock shell | `src/UserInterface.js` (`createMobileHtml`) | Not standalone HTML yet |

## How to validate an edit

1. Change the live `src/*.html` file (or a mockup if exploring).
2. Refresh the preview URL.
3. Screenshot mobile + desktop if layout changed.
4. Record the check in `CHANGELOG.md` Unreleased.

`google.script.run` calls will not hit Sheets. Live HTML files are for layout, theme, tap targets, and client-only behavior.

## Do not use clasp for visual iteration

`npm run push:test` stays available for server-contract checks only. It is not the UI loop.
