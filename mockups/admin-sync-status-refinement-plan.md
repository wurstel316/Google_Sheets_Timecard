# Admin Timeline Sync Status Refinement Plan

## Objective
Clarify and separate timeline meaning for timing drift, missing context, open entries, pending saves, deleted rows, and no-data summary cases.

## Canonical Row Statuses
- ok
- warn
- bad
- unknown
- open
- saving
- deleted

## Canonical Summary States
- ok
- warn
- bad
- no-data

## Threshold Contract
- ok: maxDeltaMinutes <= 15
- warn: maxDeltaMinutes > 15 and <= 30
- bad: maxDeltaMinutes > 30

Notes:
- This resolves overlap and keeps timing categories deterministic.
- maxDeltaMinutes = max(abs(inDeltaMinutes), abs(outDeltaMinutes)).

## Classification Order
Use this exact priority so non-timing states do not get mislabeled as timing risk.

1. deleted
2. saving
3. open
4. unknown
5. timing threshold classification (ok, warn, bad)

## Unknown Rules
Use unknown when timing cannot be reliably computed.

- no schedule segments for the row
- invalid or missing clock times for required anchors
- invalid segment start/end values

## Open Rules
- A row is open when clock-in exists and clock-out is missing.
- Open is not warning by default.
- Open rows can still show timeline progress line styling but should not be included in drift scoring.

## Summary Rules
- If visible row count is zero: no-data.
- Else if any visible row is bad: bad.
- Else if any visible row is warn or unknown: warn.
- Else: ok.

Summary text:
- Show in-sync fraction based on sync-scored rows only.
- Append counts for unknown and open as contextual suffix.

## UI Copy
Legend labels:
- Valid
- Warning
- Out of Sync
- Unknown
- Open
- Saving
- Deleted

Tooltip copy should include reason and, when available, numeric deltas.

Examples:
- OK: max delta 9m (in 9m, out 4m)
- Warning: max delta 24m (in 24m, out 5m)
- Out of sync: max delta 41m (in 41m, out 2m)
- Unknown: no schedule segments
- Open: clock-out missing; sync deferred

## Internal Comment Block (for code)
Status classification contract:
- State statuses: deleted, saving, open, unknown.
- Timing statuses: ok, warn, bad.
- Priority order: deleted -> saving -> open -> unknown -> timing.
- Timing thresholds:
  - ok: maxDelta <= 15
  - warn: maxDelta > 15 and <= 30
  - bad: maxDelta > 30
- unknown means sync cannot be computed due to missing/invalid schedule or timestamps.
- no-data is summary-only and should not be used as a row status.

## Mockup Validation Matrix
- Row with max delta 5 renders ok.
- Row with max delta 22 renders warn.
- Row with max delta 54 renders bad.
- Row with missing schedule renders unknown.
- Row with missing clock-out renders open.
- Row pending save renders saving style while request is in-flight.
- Deleted row renders deleted style and is excluded when deleted filter is off.
- User with no visible rows shows no-data summary state.
