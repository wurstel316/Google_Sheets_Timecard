// Compiled using timecard-gas-project 2.2.2-push.79 (TypeScript 4.9.5)
function createMobileHtml(email, statusObj, entries, spreadsheetId, activePayPeriodStartDateStr, activePayPeriodEndDateStr, manualAllowedRange, scriptVersion, permissionFlags, preloadedSchedulePreviewFromServer) {
    const startMs = Date.now();
  const normalizedPermissionFlags = (permissionFlags && typeof permissionFlags === 'object')
    ? {
      canAccessAdminView: permissionFlags.canAccessAdminView === true,
      canEdit: permissionFlags.canEdit === true,
      canVerify: permissionFlags.canVerify === true,
      canPayroll: permissionFlags.canPayroll === true,
      canExport: permissionFlags.canExport === true
    }
    : {
      canAccessAdminView: !!permissionFlags,
      canEdit: !!permissionFlags,
      canVerify: !!permissionFlags,
      canPayroll: !!permissionFlags,
      canExport: !!permissionFlags
    };
  const canAccessAdminView = normalizedPermissionFlags.canAccessAdminView;
  const canManageEntries = normalizedPermissionFlags.canEdit;
  const canVerifyEntries = normalizedPermissionFlags.canVerify;
  const canRunPayrollPreview = normalizedPermissionFlags.canPayroll;
  const canExportPayrollReport = normalizedPermissionFlags.canExport;
  const canManageAwsConfig = normalizedPermissionFlags.canPayroll;
  const canManageScheduleTool = canManageEntries && canRunPayrollPreview;
    let entriesHtml = '';
    const preloadedManualRange = manualAllowedRange && manualAllowedRange.minDateISO && manualAllowedRange.maxDateISO
        ? {
            minDateISO: String(manualAllowedRange.minDateISO),
            maxDateISO: String(manualAllowedRange.maxDateISO),
            minDateStr: String(manualAllowedRange.minDateStr || ''),
            maxDateStr: String(manualAllowedRange.maxDateStr || '')
        }
        : null;
    const recentEntriesHeader = 'Open Unpaid Time Entries.';
    const nextPaycheckDisplay = `Next Paycheck is ${activePayPeriodStartDateStr} to ${activePayPeriodEndDateStr}`;
    const escapeHtmlForTemplate = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const buildTemplateNoteLines = (rawNotes) => {
        const lines = String(rawNotes || '')
            .split(';')
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
        if (lines.length === 0) {
            return '<div class="admin-note-line admin-note-line-empty">No notes</div>';
        }
        return lines
            .map((line) => `<div class="admin-note-line">${escapeHtmlForTemplate(line)}</div>`)
            .join('');
    };
      const isVerifiedValueForTemplate = (value) => {
        if (value === true)
          return true;
        if (typeof value === 'string') {
          const normalized = value.trim().toLowerCase();
          return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1';
        }
        return value === 1;
      };
      const normalizeEntryTypeForTemplate = (entryType) => {
        const value = String(entryType || '').trim().toLowerCase();
        return value === 'vacation' || value === 'sick' ? value : 'worked';
      };
      const getEntryTypeMetaForTemplate = (entryType) => {
        const normalized = normalizeEntryTypeForTemplate(entryType);
        if (normalized === 'vacation') {
          return { rowClass: 'entry-type-vacation-row', chipHtml: '<span class="entry-type-emoji entry-type-vacation" title="Vacation" aria-label="Vacation">🏖️</span>' };
        }
        if (normalized === 'sick') {
          return { rowClass: 'entry-type-sick-row', chipHtml: '<span class="entry-type-emoji entry-type-sick" title="Sick" aria-label="Sick">🤒</span>' };
        }
        return { rowClass: '', chipHtml: '' };
      };
      const getRecentEntryOutMarkerHtmlForTemplate = (entryType) => {
        const typeMeta = getEntryTypeMetaForTemplate(entryType);
        return typeMeta.chipHtml || '<span class="recent-out-marker recent-out-marker-spacer" aria-hidden="true"></span>';
      };
      const mergeDayToneForTemplate = (currentTone, nextEntryType) => {
        if (!currentTone) return nextEntryType;
        if (currentTone === nextEntryType) return currentTone;
        return 'mixed';
      };
      const getDayToneClassForTemplate = (dayTone) => {
        if (dayTone === 'vacation') return 'day-tone-vacation';
        if (dayTone === 'sick') return 'day-tone-sick';
        if (dayTone === 'mixed') return 'day-tone-mixed';
        return 'day-tone-worked';
      };
      const getDayToneSuffixForTemplate = (dayTone) => {
        if (dayTone === 'vacation') return ' - vacation';
        if (dayTone === 'sick') return ' - sick';
        return '';
      };
    if (entries.length === 0) {
        entriesHtml = '<tr><td colspan="4" style="text-align: center; color: #999;">No entries yet</td></tr>';
    }
    else {
      const displayEntries = entries.slice().reverse();
        const dayTotalsByKey = {};
          const dayToneByKey = {};
      displayEntries.forEach((entry) => {
            const dayDate = entry.clockIn ? new Date(entry.clockIn) : (entry.clockOut ? new Date(entry.clockOut) : null);
            if (!dayDate || isNaN(dayDate.getTime()))
                return;
            const dayKey = Utilities.formatDate(dayDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
              if (entry.deleted) return;
              const entryType = normalizeEntryTypeForTemplate(entry.entryType);
              dayToneByKey[dayKey] = mergeDayToneForTemplate(dayToneByKey[dayKey], entryType);
            if (entryType !== 'worked')
              return;
            const hours = Number(entry.hours || 0);
            dayTotalsByKey[dayKey] = (dayTotalsByKey[dayKey] || 0) + (isNaN(hours) ? 0 : hours);
        });
        let lastDayKey = '';
      displayEntries.forEach(entry => {
            const clockInStr = entry.clockIn ? Utilities.formatDate(new Date(entry.clockIn), Session.getScriptTimeZone(), 'hh:mm a') : '--:--';
            const clockOutStr = entry.clockOut ? Utilities.formatDate(new Date(entry.clockOut), Session.getScriptTimeZone(), 'hh:mm a') : '--:--';
            const dayDate = entry.clockIn ? new Date(entry.clockIn) : (entry.clockOut ? new Date(entry.clockOut) : null);
            const dayKey = dayDate && !isNaN(dayDate.getTime())
                ? Utilities.formatDate(dayDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
                : '';
            if (dayKey && dayKey !== lastDayKey) {
                const dayTone = dayToneByKey[dayKey] || 'worked';
                const dayLabel = Utilities.formatDate(dayDate, Session.getScriptTimeZone(), 'MM-dd-yyyy (EEE)') + ' - ' + Number(dayTotalsByKey[dayKey] || 0).toFixed(2) + 'Hrs' + getDayToneSuffixForTemplate(dayTone);
                const dayToneClass = getDayToneClassForTemplate(dayTone);
                entriesHtml += `
          <tr class="admin-day-row recent-day-row ${dayToneClass}">
            <td colspan="4"><div class="admin-day-meta"><div class="admin-day-left"><div class="admin-day-label">${escapeHtmlForTemplate(dayLabel)}</div></div></div></td>
          </tr>
        `;
                lastDayKey = dayKey;
            }
            const rowIndex = Number(entry.rowIndex || 0);
            const verifiedOn = isVerifiedValueForTemplate(entry.verified);
            const typeMeta = getEntryTypeMetaForTemplate(entry.entryType);
            const verifiedTitle = verifiedOn ? 'Verified' : 'Unverified';
            const verifiedIconHtml = '<span class="admin-verify-toggle static ' + (verifiedOn ? 'is-on' : '') + '" title="' + verifiedTitle + '" aria-label="' + verifiedTitle + '">' + (verifiedOn ? '&#10003;' : '&#9675;') + '</span>';
            const noteLinesHtml = buildTemplateNoteLines(entry.notes || '');
            const pendingComposerHtml = rowIndex > 0
              ? `<div class="admin-note-composer" id="pendingNoteComposer_${rowIndex}" style="display:none;" oninput="handlePendingNewNoteInput(${rowIndex})" onkeydown="handlePendingNewNoteKeyDown(${rowIndex}, event)"><textarea placeholder="Write a quick note..." spellcheck="false" maxlength="150"></textarea></div>`
              : '';
            const actionHtml = rowIndex > 0
              ? `<div class="admin-row-actions"><button type="button" class="admin-note-add-btn" onclick="togglePendingComposer(${rowIndex})" title="Add note">+ Add Note</button></div>`
              : '';
            const rowClasses = [];
            if (entry.deleted) rowClasses.push('admin-deleted-row');
            if (!entry.deleted && typeMeta.rowClass) rowClasses.push(typeMeta.rowClass);
            const rowClass = rowClasses.length ? ' class="' + rowClasses.join(' ') + '"' : '';
            entriesHtml += `
        <tr${rowClass}>
          <td data-label="Time"><div class="recent-time-stack"><div class="admin-in-cell">${verifiedIconHtml}<button type="button" class="admin-time-pill admin-time-in static" tabindex="-1"><span class="admin-time-label">In</span><span class="admin-time-value">${clockInStr}</span></button></div><div class="recent-time-out-row">${getRecentEntryOutMarkerHtmlForTemplate(entry.entryType)}<button type="button" class="admin-time-pill admin-time-out static" tabindex="-1"><span class="admin-time-label">Out</span><span class="admin-time-value">${clockOutStr}</span></button></div></div></td>
          <td data-label="Hours" class="admin-hours-cell"><span class="admin-hours-pill"><span class="admin-hours-pill-value">${entry.hours ? entry.hours.toFixed(2) : '0.00'}</span><span class="admin-hours-pill-unit">Hrs</span></span></td>
          <td data-label="Notes"><div class="admin-note-list" id="recentNotes_${rowIndex}">${noteLinesHtml}${pendingComposerHtml}</div></td>
          <td data-label="Action">${entry.deleted ? 'Deleted' : actionHtml}</td>
        </tr>
      `;
        });
    }
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <base target="_top">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
        <style>
          :root {
            font-size: 20px;
            --timecard-ui-scale-multiplier: 1;
            --timecard-picker-font-size: 1.02rem;
            --timecard-picker-cell-size: 2.1rem;
            --timecard-picker-time-font-size: 1.08rem;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
            color: #333; 
            min-height: 100dvh; 
            overflow: auto; 
            display: flex; 
            justify-content: center; 
            align-items: stretch; 
          }
          .container { 
            background-color: white; 
            padding: clamp(1.25rem, 4vw, 1.75rem); 
            border-radius: clamp(0.625rem, 2vw, 0.875rem); 
            box-shadow: 0 0.3125rem 0.625rem rgba(0, 0, 0, 0.1); 
            width: 100%; 
            max-width: 62rem;
            max-height: none; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            overflow-y: auto; 
            -webkit-overflow-scrolling: touch; 
            min-width: 0; 
            min-height: 45rem; 
            position: relative;
            box-sizing: border-box;
          }
          .admin-top-btn {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            width: auto;
            max-width: none;
            padding: 0.45rem 0.75rem;
            font-size: clamp(0.7rem, 2.2vw, 0.9rem);
            margin: 0;
            background: #0f9d58;
          }
          .menu-top-btn {
            position: absolute;
            top: 0.75rem;
            left: 0.75rem;
            width: auto;
            max-width: none;
            padding: 0.45rem 0.75rem;
            font-size: clamp(0.7rem, 2.2vw, 0.9rem);
            margin: 0;
            background: #eef3fb;
            color: #23466f;
            border: 1px solid #bfd1e8;
            box-shadow: none;
          }
          .admin-grid {
            width: max-content;
            min-width: 100%;
            border-collapse: collapse;
            font-size: clamp(0.72rem, 2.1vw, 0.9rem);
            table-layout: fixed;
          }
          .admin-grid th,
          .admin-grid td {
            border-bottom: 1px solid #ddd;
            padding: 6px;
            vertical-align: top;
          }
          .admin-grid input,
          .admin-grid textarea {
            width: 100%;
            margin: 0;
            padding: 4px;
            font-size: 0.8rem;
            max-width: none;
          }
          .admin-grid button {
            width: auto;
            max-width: none;
            margin: 0;
            padding: 0.4rem 0.6rem;
            font-size: 0.75rem;
          }
          .admin-grid td:nth-child(1),
          .admin-grid td:nth-child(2) {
            width: 9.5rem;
          }
          .admin-grid td:nth-child(3) {
            width: 5.75rem;
          }
          .admin-grid td:nth-child(4) {
            width: 27.3rem;
            max-width: 27.3rem;
          }
          .admin-grid td:nth-child(5) {
            width: 4.85rem;
          }
          .admin-save-clean {
            background: #9e9e9e;
            color: #fff;
          }
          .admin-save-dirty {
            background: #1a73e8;
            color: #fff;
          }
          .admin-raw-sub {
            margin-top: 0.2rem;
            color: #666;
            font-size: 0.72rem;
          }
          .admin-time-pill {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            min-height: 1.65rem;
            border-radius: 0.65rem !important;
            padding: 0.25rem 0.45rem !important;
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.4rem;
            font-size: 0.78rem !important;
            box-shadow: none;
          }
          .admin-in-cell {
            display: flex;
            align-items: center;
            gap: 0.35rem;
          }
          .admin-in-cell .admin-time-pill {
            flex: 1 1 auto;
            min-width: 0;
          }
          .admin-verify-toggle {
            width: 1.65rem !important;
            min-width: 1.65rem;
            height: 1.65rem;
            min-height: 1.65rem;
            border-radius: 999px;
            border: 1px solid #b8c3ce;
            background: #fff;
            color: #6b7785;
            padding: 0 !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.92rem !important;
            line-height: 1;
            cursor: pointer;
            transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
          }
          .admin-verify-toggle.is-on {
            background: #e8f5e9;
            border-color: #8fcf95;
            color: #1b5e20;
          }
          .admin-verify-toggle.static {
            cursor: default;
            opacity: 0.8;
          }
          .admin-time-pill.admin-time-in {
            background: #eaf7ef;
            color: #1f6a3b;
            border: 1px solid #bfe2cd;
          }
          .admin-time-pill.admin-time-out {
            background: #fff2f1;
            color: #8d2f2f;
            border: 1px solid #f3c6c3;
          }
          .admin-time-pill.static {
            pointer-events: none;
            opacity: 0.8;
          }
          .admin-time-pill .admin-time-label {
            font-weight: 700;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .admin-time-pill .admin-time-value {
            font-family: 'Roboto Mono', monospace;
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            font-size: 0.78rem;
          }
          .admin-delete-btn {
            background: #c62828;
            color: #fff;
            border: 1px solid #8e0000;
            border-radius: 999px;
            width: 1.65rem !important;
            min-width: 1.65rem;
            height: 1.65rem;
            min-height: 1.65rem;
            padding: 0 !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.92rem !important;
            line-height: 1;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
          }
          .admin-restore-btn {
            background: #388e3c;
            color: #fff;
            border: 1px solid #1f5f2b;
            border-radius: 999px;
            width: 1.65rem !important;
            min-width: 1.65rem;
            height: 1.65rem;
            min-height: 1.65rem;
            padding: 0 !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.92rem !important;
            line-height: 1;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
          }
          .admin-hold-action-btn {
            position: relative;
            overflow: visible;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            --admin-hold-size: 1.65rem;
            --admin-hold-ring-circumference: 270.2;
          }
          .admin-hold-asset {
            position: relative;
            width: var(--admin-hold-size);
            height: var(--admin-hold-size);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            overflow: hidden;
          }
          .admin-hold-ring {
            position: absolute;
            inset: 0;
            transform: rotate(-90deg);
            opacity: 0;
            pointer-events: none;
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.28));
          }
          .admin-hold-ring circle {
            fill: none;
          }
          .admin-hold-ring .track {
            stroke: rgba(255, 255, 255, 0.24);
            stroke-width: 14;
          }
          .admin-hold-ring .progress {
            stroke: rgba(255, 255, 255, 0.98);
            stroke-width: 14;
            stroke-linecap: round;
            stroke-dasharray: var(--admin-hold-ring-circumference);
            stroke-dashoffset: var(--admin-hold-ring-circumference);
          }
          .admin-hold-action-btn .admin-action-icon {
            position: relative;
            z-index: 2;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: calc(var(--admin-hold-size) * 0.56);
            line-height: 1;
          }
          .admin-hold-action-btn.is-holding .admin-hold-ring {
            opacity: 1;
          }
          .admin-hold-action-btn.is-holding .admin-hold-ring .progress {
            animation: adminHoldCountdownFill 3s linear 1 forwards;
          }
          @keyframes adminHoldCountdownFill {
            from { stroke-dashoffset: var(--admin-hold-ring-circumference); }
            to   { stroke-dashoffset: 0; }
          }
          .admin-group-row td {
            background: #eceff1;
            font-weight: 700;
            font-size: 0.92rem;
            position: sticky;
            top: 0;
            z-index: 6;
            box-shadow: inset 0 -1px 0 #cdd6de;
          }
          .admin-group-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
          }
          .admin-group-left,
          .admin-day-left {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
          }
          .admin-collapse-btn {
            width: 1.2rem !important;
            height: 1.2rem;
            min-width: 1.2rem !important;
            max-width: 1.2rem !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0.2rem !important;
            border: 1px solid #b8c3d1;
            background: #f8fafc;
            color: #334155;
            box-shadow: none;
            font-size: 0.8rem !important;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
          }
          .admin-group-add-missed-btn {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0.35rem 0.55rem !important;
            border-radius: 0.45rem !important;
            font-size: 0.74rem !important;
            line-height: 1.2;
            background: #eef6ff;
            color: #1f4f8a;
            border: 1px solid #c8dcf8;
            box-shadow: none;
            white-space: nowrap;
          }
          .admin-day-row td {
            background: #dde8f5;
            font-weight: 600;
            font-size: 1.02rem;
          }
          .admin-day-row.day-tone-worked td {
            background: #c7dbf3;
            color: #1f3f66;
          }
          .admin-day-row.day-tone-vacation td {
            background: #f3e1b8;
            color: #6b4b0b;
          }
          .admin-day-row.day-tone-sick td {
            background: #f2cccc;
            color: #7b2c2f;
          }
          .admin-day-row.day-tone-mixed td {
            background: #d7d4ef;
            color: #3f3566;
          }
          .admin-pending-row {
            position: relative;
            background: linear-gradient(90deg, rgba(255, 243, 205, 0.45) 0%, rgba(255, 255, 255, 0) 100%);
            animation: adminPendingPulse 1.4s ease-in-out infinite;
          }
          .admin-pending-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            margin-top: 0.35rem;
            padding: 0.1rem 0.45rem;
            border-radius: 999px;
            border: 1px solid #d9b95c;
            background: #fff8e1;
            color: #7a5a00;
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.01em;
          }
          .admin-deleted-chip {
            border-color: #c8a8a8;
            background: #f5e8e8;
            color: #6b4444;
          }
          @keyframes adminPendingPulse {
            0% { box-shadow: inset 0 0 0 0 rgba(217, 185, 92, 0.14); }
            50% { box-shadow: inset 0 0 0 100vmax rgba(217, 185, 92, 0.06); }
            100% { box-shadow: inset 0 0 0 0 rgba(217, 185, 92, 0.14); }
          }
          .admin-hours-cell,
          .admin-day-hours {
            font-weight: 700;
            color: #1a73e8;
          }
          .admin-day-total-wrap {
            display: flex;
            justify-content: flex-end;
            align-items: baseline;
            gap: 0.35rem;
            width: 100%;
          }
          .admin-day-meta {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
          }
          .admin-day-label {
            text-align: left;
            white-space: nowrap;
            flex: 1 1 auto;
          }
          .admin-day-indent {
            padding-left: 1.35rem;
          }
          .admin-day-total-value {
            font-weight: 800;
            color: #1a73e8;
            display: inline-block;
            min-width: 5ch;
            text-align: right;
            font-variant-numeric: tabular-nums;
            font-family: 'Roboto Mono', monospace;
          }
          .admin-hours-cell {
            text-align: center;
            font-variant-numeric: tabular-nums;
            font-family: 'Roboto Mono', monospace;
          }
          .admin-hours-pill {
            width: 100%;
            min-height: 1.65rem;
            border-radius: 0.65rem;
            padding: 0.25rem 0.45rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.3rem;
            background: #edf3ff;
            color: #1d4f9a;
            border: 1px solid #c5d8fb;
            box-sizing: border-box;
          }
          .admin-hours-pill-value {
            font-family: 'Roboto Mono', monospace;
            font-variant-numeric: tabular-nums;
            font-weight: 800;
          }
          .admin-hours-pill-unit {
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .admin-deleted-row td {
            text-decoration: line-through;
            color: #999;
            background: #fafafa;
            font-style: italic;
          }
          .entry-type-vacation-row td {
            background: #fff7e3;
          }
          .entry-type-sick-row td {
            background: #fdeeee;
          }
          .entry-type-emoji {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.05rem;
            min-width: 1.05rem;
            height: 1.05rem;
            min-height: 1.05rem;
            font-size: 0.95rem;
            line-height: 1.1;
            white-space: nowrap;
            margin-right: 0.18rem;
            border: none;
            background: transparent;
            flex: 0 0 auto;
          }
          .entry-type-vacation-row .entry-type-emoji {
            filter: saturate(1.05) contrast(1.02);
          }
          .entry-type-sick-row .entry-type-emoji {
            filter: saturate(1.05) contrast(1.02);
          }
          .admin-in-cell .entry-type-emoji {
            margin-left: 0;
          }
          .admin-deleted-row textarea {
            text-decoration: line-through;
            color: #aaa;
          }
          .admin-deleted-meta {
            display: block;
            font-size: 0.68rem;
            color: #c62828;
            text-decoration: none;
            font-style: normal;
            font-weight: 600;
            margin-top: 0.15rem;
          }
          .admin-note-list {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .admin-note-line {
            white-space: pre-wrap;
            line-height: 1.25;
            overflow-wrap: anywhere;
            word-break: break-word;
            font-size: 0.78rem;
            border: 1px solid #d9e2ec;
            border-radius: 0.45rem;
            background: #fbfdff;
            padding: 0.35rem 0.5rem;
          }
          .admin-note-line-empty {
            color: #9aa0a6;
            font-style: italic;
            background: #fff;
            border-style: dashed;
          }
          .admin-note-composer {
            margin-top: 0.35rem;
          }
          .admin-note-composer textarea {
            width: 100%;
            min-height: 2.2rem;
            resize: vertical;
            margin-top: 0.25rem;
            white-space: pre-wrap;
          }
          .admin-note-add-btn {
            margin-top: 0.35rem !important;
            width: 1.65rem !important;
            min-width: 1.65rem;
            height: 1.65rem;
            min-height: 1.65rem;
            border-radius: 999px;
            background: #e8f0fe;
            color: #1a73e8;
            border: 1px solid #c6dafc;
            font-size: 0.92rem !important;
            line-height: 1;
            padding: 0 !important;
          }
          .admin-row-actions {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
          }
          .admin-row-actions .admin-note-add-btn {
            margin-top: 0 !important;
          }
          .admin-workflow-box {
            border: 1px solid #d9e2f1;
            border-radius: 0.5rem;
            padding: 0.6rem;
            background: #f8fbff;
          }
          .admin-preview-grid {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 0.78rem;
          }
          .admin-preview-grid th,
          .admin-preview-grid td {
            border: 1px solid #d6dde7;
            padding: 0.25rem 0.3rem;
            text-align: center;
            vertical-align: middle;
          }
          .admin-preview-grid col.admin-col-email { width: var(--admin-preview-email-width, 7rem); }
          .admin-preview-grid col.admin-col-week { width: var(--admin-preview-week-width, 2.35rem); }
          .admin-preview-grid col.admin-col-additional { width: var(--admin-preview-additional-width, 2.65rem); }
          .admin-preview-grid col.admin-col-total { width: var(--admin-preview-total-width, 2.65rem); }
          .admin-preview-grid col.admin-col-notes { width: var(--admin-preview-notes-width, 18rem); }
          .admin-preview-grid col.admin-col-aws { width: var(--admin-preview-aws-width, 6.25rem); }
          .admin-preview-grid .admin-preview-title {
            background: #f3f6fb;
            color: #203040;
            font-weight: 700;
            letter-spacing: 0.01em;
            text-align: left;
          }
          .admin-preview-grid .admin-preview-group {
            background: #dfe8f6;
            color: #24364d;
            font-weight: 700;
          }
          .admin-preview-grid .admin-preview-subhead {
            background: #eef3fb;
            color: #31445f;
            font-weight: 700;
          }
          .admin-preview-grid td:nth-child(1) {
            text-align: left;
            background: #ffffff;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .admin-preview-grid td:nth-child(2),
          .admin-preview-grid td:nth-child(3),
          .admin-preview-grid td:nth-child(4) {
            background: #d9ead3;
          }
          .admin-preview-grid td:nth-child(5),
          .admin-preview-grid td:nth-child(6),
          .admin-preview-grid td:nth-child(7) {
            background: #cfe2f3;
          }
          .admin-preview-grid td:nth-child(8),
          .admin-preview-grid td:nth-child(9),
          .admin-preview-grid td:nth-child(10),
          .admin-preview-grid td:nth-child(11) {
            background: #ffffff;
          }
          .admin-preview-grid td:nth-child(12) {
            background: #b6d7a8;
          }
          .admin-preview-grid td:nth-child(13) {
            background: #93c47d;
          }
          .admin-preview-grid td:nth-child(14) {
            background: #6aa84f;
            color: #10320f;
            font-weight: 700;
          }
          .admin-preview-grid td:nth-child(16) {
            background: #e8e8e8;
            font-weight: 600;
          }
          .admin-preview-grid td:nth-child(15) {
            vertical-align: top;
            padding-top: 0.1rem;
            padding-bottom: 0.1rem;
          }
          .admin-preview-grid .admin-preview-empty {
            background: #fff;
            color: #999;
            text-align: center;
          }
          .admin-modal-content .admin-preview-note-input {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 1.4rem !important;
            margin: 0 !important;
            padding: 0.1rem 0.2rem !important;
            height: auto !important;
            overflow: hidden !important;
            resize: none !important;
            font-size: 0.72rem !important;
            line-height: 1.05 !important;
            border: 1px solid #cfd8e3;
            border-radius: 0.25rem;
            box-sizing: border-box;
            background: #fff;
            display: block;
          }
          .admin-aws-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.35rem 0;
            border-bottom: 1px solid #eef2f7;
          }
          .admin-aws-row .admin-switch {
            min-width: 18rem;
          }
          .admin-aws-row .admin-switch-label {
            font-size: 0.82rem;
            color: #334155;
          }
          .admin-aws-row input[type="date"] {
            width: auto;
            min-width: 10.8rem;
            margin: 0;
            padding: 0.5rem 0.65rem;
            font-size: clamp(1rem, 3.5vw, 1.1rem);
            min-height: 2.45rem;
            line-height: 1.2;
          }
          .admin-holiday-detected {
            margin-top: 0.35rem;
            color: #2458a6;
            font-size: 0.84rem;
          }
          .admin-holiday-grid-wrap {
            border: 1px solid #d8e0ea;
            border-radius: 0.5rem;
            background: #fff;
            max-height: 50vh;
            overflow: auto;
          }
          .admin-holiday-grid {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            font-size: 1.6rem;
          }
          .admin-holiday-grid th,
          .admin-holiday-grid td {
            border: 1px solid #e2e8f0;
            padding: 0.4rem 0.45rem;
            text-align: center;
            vertical-align: middle;
            white-space: nowrap;
            font-size: inherit;
          }
          .admin-holiday-grid input[type="checkbox"] {
            width: 1.25rem;
            height: 1.25rem;
            accent-color: #2458a6;
            cursor: pointer;
          }
          .admin-holiday-grid th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #f3f6fb;
            color: #24364d;
            font-weight: 700;
          }
          .admin-holiday-grid td:first-child,
          .admin-holiday-grid th:first-child {
            text-align: left;
            position: sticky;
            left: 0;
            z-index: 2;
            background: #fff;
          }
          .admin-holiday-grid th:first-child {
            background: #f3f6fb;
          }
          .admin-holiday-total {
            font-weight: 700;
            color: #1e3a8a;
          }
          h2 { 
            font-size: clamp(1.75rem, 6vw, 2rem); 
            color: #1a73e8; 
            margin: clamp(0.625rem, 2.5vw, 0.875rem) 0; 
          }
          h1 { 
            font-size: clamp(1.5rem, 5.5vw, 1.75rem); 
            color: #333; 
            margin: clamp(0.625rem, 2.5vw, 0.875rem) 0; 
          }
          p { 
            font-size: clamp(1.25rem, 4.5vw, 1.5rem); 
            margin: clamp(0.875rem, 3.5vw, 1.25rem) 0; 
            text-align: center; 
            word-break: break-word; 
            max-width: 90%; 
          }
          .status-row {
            width: 90%;
            max-width: 25rem;
            margin: clamp(0.875rem, 3.5vw, 1.25rem) 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          #status {
            min-height: 2.5rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 0;
            max-width: none;
            flex: 1 1 auto;
            text-align: left;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            padding: 0.45rem 0.75rem;
            border-radius: 999px;
            border: 1px solid #c7d8f2;
            background: #ecf3ff;
            color: #1f4f8a;
            box-sizing: border-box;
            font-size: clamp(1.25rem, 4.5vw, 1.5rem);
            font-weight: 700;
          }
          .status-refresh-btn {
            width: 2.5rem;
            min-width: 2.5rem;
            height: 2.5rem;
            padding: 0;
            margin: 0;
            margin-top: 0.1rem;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            line-height: 1;
            flex: 0 0 auto;
          }
          .status-refresh-btn .refresh-icon {
            display: inline-block;
          }
          .status-refresh-btn.is-spinning .refresh-icon {
            animation: archiveSpin 0.8s linear infinite;
          }
          .status-refresh-btn:disabled {
            background-color: #1a73e8;
            opacity: 0.8;
            cursor: progress;
          }
          .secondary-action-btn {
            background: #edf2f7;
            color: #1f3a5f;
            border: 1px solid #cfd8e3;
            box-shadow: none;
            margin-top: clamp(0.35rem, 1.8vw, 0.55rem);
            margin-bottom: clamp(0.5rem, 2vw, 0.7rem);
            font-size: clamp(1.05rem, 3.8vw, 1.2rem);
            padding: clamp(0.72rem, 2.9vw, 0.95rem);
          }
          .secondary-action-btn:hover {
            background: #e3ebf5;
          }
          .secondary-action-btn:disabled {
            background: #e5e7eb;
            color: #6b7280;
            border-color: #d1d5db;
            box-shadow: none;
          }
          .manual-entry-helper {
            width: 90%;
            max-width: 25rem;
            margin: -0.35rem 0 0.4rem;
            font-size: clamp(0.86rem, 2.7vw, 0.98rem);
            color: #546173;
            text-align: center;
            line-height: 1.2;
          }
          .clock-note-hint {
            width: 90%;
            max-width: 25rem;
            margin: -0.35rem 0 0.45rem;
            font-size: clamp(0.78rem, 2.5vw, 0.92rem);
            color: #8d2f2f;
            text-align: left;
            line-height: 1.25;
            display: none;
          }
          .employee-schedule-block {
            width: 90%;
            max-width: 25rem;
            display: flex;
            flex-direction: column;
            gap: 0.42rem;
            margin: 0.15rem 0 0.5rem;
          }
          .schedule-summary-pill {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0.6rem 0.75rem;
            border-radius: 0.7rem;
            border: 1px solid #c9daef;
            background: #f6faff;
            color: #243e63;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            gap: 0.4rem;
            text-align: left;
          }
          .schedule-summary-pill:hover {
            background: #edf5ff;
          }
          .schedule-pill-title {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #4d6380;
          }
          .schedule-pill-body {
            display: block;
            width: 100%;
          }
          .schedule-pill-segments {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.24rem;
          }
          .schedule-segment {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.17rem 0.45rem;
            border-radius: 999px;
            border: 1px solid transparent;
            font-size: 0.72rem;
            font-weight: 700;
            line-height: 1.2;
            white-space: nowrap;
          }
          .schedule-segment.on-duty {
            background: #eaf7ef;
            color: #1f6a3b;
            border-color: #bfe2cd;
          }
          .schedule-segment.backup {
            background: #f1edff;
            color: #5b46a8;
            border-color: #d7ccff;
          }
          .schedule-segment.lunch {
            background: #fff7df;
            color: #8a5b00;
            border-color: #f2d27a;
          }
          .schedule-segment-range {
            font-family: 'Roboto Mono', monospace;
            font-variant-numeric: tabular-nums;
          }
          .schedule-segment-label {
            opacity: 0.88;
          }
          .schedule-pill-empty {
            color: #5d6c80;
            font-size: 0.8rem;
            font-style: italic;
          }
          .employee-schedule-week-list {
            display: flex;
            flex-direction: column;
            gap: 0.55rem;
          }
          .employee-schedule-day-row {
            border: 1px solid #d8e2ee;
            border-radius: 0.65rem;
            padding: 0.55rem;
            background: #fbfdff;
          }
          .employee-schedule-day-name {
            font-size: 0.86rem;
            font-weight: 700;
            color: #40556f;
            margin-bottom: 0.35rem;
          }
          .employee-schedule-day-body {
            display: flex;
            flex-wrap: wrap;
            gap: 0.32rem;
          }
          .ui-scale-controls {
            width: 90%;
            max-width: 25rem;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0.28rem;
            margin: 0.15rem auto 0.8rem;
            color: #556477;
            font-size: clamp(0.8rem, 2.5vw, 0.95rem);
          }
          .is-hidden {
            display: none;
          }
          .ui-scale-controls label {
            margin: 0;
            font-weight: 600;
            color: #4f5f72;
            text-align: left;
          }
          .ui-scale-stepper {
            display: flex;
            align-items: stretch;
            gap: 0.45rem;
            width: 100%;
          }
          .ui-scale-step-btn,
          .ui-scale-value {
            min-height: 2.6rem;
            margin: 0 !important;
            padding: 0.5rem 0.6rem;
            border-radius: 0.45rem;
            border: 1px solid #c7d3e2;
            box-sizing: border-box;
            line-height: 1.2;
          }
          .ui-scale-step-btn {
            width: 3.2rem !important;
            min-width: 3.2rem;
            max-width: 3.2rem !important;
            background: #f6f9fd;
            color: #335377;
            font-size: 1.25rem;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: none;
            touch-action: manipulation;
          }
          .ui-scale-value {
            flex: 1 1 auto;
            width: auto;
            background: #fff;
            color: #2f3f53;
            font-size: 1rem;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .message { 
            font-size: clamp(1.25rem, 4.5vw, 1.5rem); 
            margin: clamp(0.875rem, 3.5vw, 1.25rem) 0; 
            text-align: center; 
            color: #28a745; 
          }
          .error { 
            font-size: clamp(1.25rem, 4.5vw, 1.5rem); 
            margin: clamp(0.875rem, 3.5vw, 1.25rem) 0; 
            text-align: center; 
            color: #dc3545; 
          }
          button { 
            margin: clamp(0.625rem, 2.5vw, 0.875rem) 0; 
            padding: clamp(0.875rem, 3.5vw, 1.25rem); 
            width: 90%; 
            max-width: 25rem; 
            background-color: #1a73e8; 
            color: white; 
            border: none; 
            border-radius: clamp(0.5rem, 1.5vw, 0.75rem); 
            cursor: pointer; 
            font-size: clamp(1.25rem, 4.5vw, 1.5rem); 
            box-shadow: 0 0.1875rem 0.375rem rgba(0, 0, 0, 0.1); 
          }
          button:disabled { 
            background-color: #ccc; 
            cursor: not-allowed; 
          }
          input, textarea { 
            margin: clamp(0.875rem, 3.5vw, 1.25rem) 0; 
            padding: clamp(0.875rem, 3.5vw, 1.25rem); 
            width: 90%; 
            max-width: 25rem; 
            font-size: clamp(1.25rem, 4.5vw, 1.5rem); 
            border: 1px solid #ddd; 
            border-radius: clamp(0.5rem, 1.5vw, 0.75rem); 
          }
          textarea { min-height: 80px; resize: vertical; }
          .manual-entry-type-group {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.56rem 0.94rem;
            margin-top: 0.1rem;
          }
          .manual-entry-type-option {
            display: inline-flex;
            align-items: center;
            gap: 0.44rem;
            margin: 0;
            padding: 0.25rem 0.56rem;
            border: 1px solid #cfd8e3;
            border-radius: 999px;
            background: #fff;
            font-size: 1rem;
            color: #243447;
          }
          .manual-entry-type-option input {
            margin: 0;
            width: auto;
            min-width: 0;
            transform: scale(3);
            transform-origin: center;
          }
          .loading { 
            display: none; 
            font-style: italic; 
            color: #666; 
            font-size: clamp(1rem, 3.5vw, 1.25rem); 
          }
          .entries { 
            width: 100%; 
            overflow-x: auto; 
            margin-top: 1rem; 
          }
          .recent-entries {
            margin-top: 1.35rem;
            padding-right: 0.18rem;
          }
          .recent-entries-header {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
          }
          .recent-entries h3 {
            margin: 0 0 0.4rem;
            line-height: 1.2;
          }
          .recent-entries .entries-subtitle {
            margin: 0 0 0.85rem;
          }
          .recent-entries .recent-unpaid-grid th,
          .recent-entries .recent-unpaid-grid td {
            padding-top: 0.4rem;
            padding-bottom: 0.4rem;
          }
          .recent-cards {
            display: none;
          }
          body.mobile-recent-layout .recent-unpaid-grid {
            display: none;
          }
          body.mobile-recent-layout .recent-cards {
            display: block;
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0 0.25rem 0.55rem;
            overflow-x: hidden;
            overflow-y: auto;
            max-height: min(62dvh, 34rem);
            -webkit-overflow-scrolling: touch;
          }
          body.mobile-recent-layout .recent-entries {
            width: 100%;
            padding-right: 0;
            overflow: visible;
          }
          body.mobile-recent-layout .recent-entries-header,
          body.mobile-recent-layout .recent-day-group,
          body.mobile-recent-layout .recent-day-entries,
          body.mobile-recent-layout .recent-card,
          body.mobile-recent-layout .recent-card-top,
          body.mobile-recent-layout .recent-card-top-left,
          body.mobile-recent-layout .recent-card-notes {
            width: 100%;
            box-sizing: border-box;
          }
          body.mobile-recent-layout .recent-card {
            max-width: none;
          }
          .recent-day-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 0.55rem;
          }
          .recent-day-entries {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .recent-card-day {
            background: #dfe9f6;
            border-radius: 12px;
            padding: 0.45rem 0.65rem;
            font-weight: 700;
            color: #1f3f66;
            font-size: 0.88rem;
            margin: 0 0 0.2rem 0.18rem;
            position: sticky;
            top: 0.2rem;
            z-index: 2;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
          }
          .recent-card-day.day-tone-worked {
            background: #c7dbf3;
            color: #1f3f66;
          }
          .recent-card-day.day-tone-vacation {
            background: #f3e1b8;
            color: #6b4b0b;
          }
          .recent-card-day.day-tone-sick {
            background: #f2cccc;
            color: #7b2c2f;
          }
          .recent-card-day.day-tone-mixed {
            background: #d7d4ef;
            color: #3f3566;
          }
          .recent-card {
            position: relative;
            border: 1px solid #d8e0ea;
            border-radius: 13px;
            background: #fff;
            box-shadow: 0 3px 10px rgba(14, 30, 58, 0.08);
            padding: 14px 14px 12px;
            overflow: hidden;
          }
          .recent-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: #88b1e8;
          }
          .recent-card.recent-card-accent-vacation::before {
            background: #d9a441;
          }
          .recent-card.recent-card-accent-sick::before {
            background: #d98084;
          }
          .recent-card.recent-card-accent-worked::before {
            background: #88b1e8;
          }
          .recent-card.entry-type-vacation-row {
            background: #fff7e9;
          }
          .recent-card.entry-type-sick-row {
            background: #feeff0;
          }
          .recent-card.admin-deleted-row {
            background: #fafafa;
          }
          .recent-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.55rem;
            margin-bottom: 0.55rem;
          }
          .recent-card-top-left {
            display: flex;
            align-items: center;
            gap: 0.42rem;
            flex: 1 1 auto;
            min-width: 0;
          }
          .recent-card-time-pills {
            display: flex;
            align-items: center;
            gap: 0.38rem;
            min-width: 0;
            flex-wrap: nowrap;
          }
          .recent-card .admin-verify-toggle {
            width: 1.55rem !important;
            min-width: 1.55rem;
            height: 1.55rem;
            min-height: 1.55rem;
          }
          .recent-card .entry-type-emoji {
            margin-right: 0;
            width: 1.08rem;
            min-width: 1.08rem;
            height: 1.08rem;
            min-height: 1.08rem;
            font-size: 0.94rem;
          }
          .recent-card-time-pills .admin-time-pill {
            width: clamp(5rem, 31vw, 6rem) !important;
            min-width: clamp(5rem, 31vw, 6rem);
            justify-content: center;
            padding: 0.29rem 0.36rem !important;
            gap: 0;
          }
          .recent-card-time-pills .admin-time-pill .admin-time-label {
            display: none;
          }
          .recent-card-time-pills .admin-time-pill .admin-time-value {
            font-size: 0.76rem;
            white-space: nowrap;
          }
          .recent-card-hours {
            flex: 0 0 auto;
            align-self: flex-start;
          }
          .recent-card-hours .admin-hours-pill {
            min-height: 2rem;
            padding: 0.42rem 0.58rem;
            border-radius: 999px;
          }
          .recent-card-hours .admin-hours-pill-value {
            font-size: 0.86rem;
          }
          .recent-card-hours .admin-hours-pill-unit {
            font-size: 0.69rem;
          }
          .recent-card-notes {
            display: flex;
            flex-direction: column;
            gap: 0.32rem;
            margin-top: 0.22rem;
          }
          .recent-card-notes .admin-note-line {
            margin: 0;
            border-radius: 0.62rem;
            background: #f9fbff;
            border-color: #d6dfeb;
          }
          .recent-card-notes .admin-note-line-empty {
            background: #ffffff;
            border-style: dashed;
          }
          .recent-card-note-footer {
            display: flex;
            justify-content: flex-end;
            margin-top: 0.18rem;
          }
          .recent-card-note-footer .admin-note-add-btn {
            width: auto !important;
            min-width: 6.5rem;
            height: 2.75rem;
            min-height: 2.75rem;
            margin-top: 0 !important;
            font-size: 1.08rem !important;
            font-weight: 700;
            padding: 0.38rem 0.85rem !important;
            border-radius: 999px;
            background: #e6f0ff;
            border-color: #bfd3f7;
            color: #1a73e8;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(26, 115, 232, 0.2);
          }
          .recent-card-deleted-text {
            color: #9a5a5d;
            font-size: 0.72rem;
            font-weight: 600;
            padding: 0.2rem 0.45rem;
            border: 1px solid #e4c4c8;
            border-radius: 999px;
            background: #fff4f5;
          }
          .recent-card-notes .admin-note-composer {
            margin-top: 0.22rem;
          }
          .recent-card-notes .admin-note-composer textarea {
            border-radius: 0.62rem;
            border: 1px solid #c9d7ea;
            background: #fff;
            min-height: 2.5rem;
          }
          .recent-grid {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100%;
            min-width: 0;
            table-layout: fixed;
            font-size: clamp(1.08rem, 3.15vw, 1.35rem);
          }
          .recent-grid th:nth-child(1),
          .recent-grid th:nth-child(2),
          .recent-grid th:nth-child(3),
          .recent-grid th:nth-child(4),
          .recent-grid td:nth-child(1),
          .recent-grid td:nth-child(2),
          .recent-grid td:nth-child(3),
          .recent-grid td:nth-child(4) {
            width: auto;
            max-width: none;
          }
          .recent-grid th:nth-child(1),
          .recent-grid td:nth-child(1) {
            width: 10.4rem; // Keep IN/OUT stack readable while reducing unused width
          }
          .recent-grid th:nth-child(2),
          .recent-grid td:nth-child(2) {
            width: 4.35rem; // Keep hour pill stable while freeing space for Notes and Action columns
          }
          .recent-grid th:nth-child(3),
          .recent-grid td:nth-child(3) {
            width: auto; // Allow the notes column to take up remaining space, but it will be constrained by the overall table width and the fixed widths of the other columns
          }
          .recent-grid th:nth-child(4),
          .recent-grid td:nth-child(4) {
            width: 6.25rem; // Reserve room for the wider "+ Add Note" action pill
          }
          .recent-grid td:nth-child(2) {
            padding-left: 0.15rem;
            padding-right: 0.15rem;
          }
          .recent-grid td:nth-child(3) {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          }
          .recent-grid .admin-time-pill {
            width: auto !important;
            min-width: 0;
            max-width: 100%;
            justify-content: flex-start;
            gap: 0.22rem;
            padding: 0.29rem 0.42rem !important;
            min-height: 1.62rem;
          }
          .recent-grid .recent-time-stack {
            display: flex;
            flex-direction: column;
            gap: 0.28rem;
            align-items: flex-start;
          }
          .recent-grid .admin-in-cell,
          .recent-grid .recent-time-out-row {
            display: flex;
            align-items: center;
            gap: 0.28rem;
            width: 100%;
          }
          .recent-grid .admin-in-cell .admin-time-pill {
            flex: 0 0 auto;
          }
          .recent-grid .recent-out-marker {
            width: 1.25rem;
            min-width: 1.25rem;
            height: 1.25rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
          }
          .recent-grid .recent-out-marker-spacer {
            visibility: hidden;
          }
          .recent-grid .admin-time-pill.admin-time-in,
          .recent-grid .admin-time-pill.admin-time-out {
            width: 7.1rem !important;
            min-width: 7.1rem; 
          }
          .recent-grid .admin-time-pill .admin-time-label {
            font-size: 0.93rem;
            white-space: nowrap;
          }
          .recent-grid .admin-time-pill .admin-time-value {
            font-size: 1.02rem;
            white-space: nowrap;
          }
          .recent-grid .admin-verify-toggle {
            width: 1.25rem !important;
            min-width: 1.25rem;
            height: 1.25rem;
            min-height: 1.25rem;
            font-size: 0.72rem !important;
            flex: 0 0 auto;
          }
          .recent-grid .admin-hours-cell {
            text-align: left;
          }
          .recent-grid .admin-hours-pill {
            width: auto;
            min-height: 3.52rem;
            min-width: 4.1rem;
            padding: 0.18rem 0.3rem;
            justify-content: center;
            gap: 0.3rem;
          }
          .recent-grid .admin-hours-pill-value {
            font-size: 1.08rem;
          }
          .recent-grid .admin-hours-pill-unit {
            font-size: 0.93rem;
          }
          .recent-grid .admin-note-add-btn {
            width: auto !important;
            min-width: 6.25rem;
            height: 1.94rem;
            min-height: 1.94rem;
            padding: 0.28rem 0.55rem !important;
            font-size: 0.94rem !important;
            font-weight: 700;
            white-space: nowrap;
          }
          .recent-grid .admin-row-actions {
            justify-content: center;
            width: 100%;
          }
          .recent-grid td:nth-child(4),
          .recent-grid th:nth-child(4) {
            text-align: center;
            padding-left: 0.12rem;
            padding-right: 0.24rem;
          }
          .recent-grid .admin-note-line {
            font-size: 1.02rem;
            padding: 0.24rem 0.3rem;
          }
          .recent-grid .admin-raw-sub {
            font-size: 0.87rem;
          }
          .recent-grid .admin-note-list {
            min-width: 0;
            margin-right: 0.08rem;
          }
          .entries-subtitle {
            margin: 0.25rem 0 0.75rem;
            text-align: left;
            color: #555;
            font-size: clamp(0.9rem, 2.8vw, 1.05rem);
            max-width: 100%;
          }
          .app-version {
            margin-top: 1rem;
            color: #666;
            font-size: clamp(0.75rem, 2.4vw, 0.9rem);
            text-align: center;
          }
          .layout-debug {
            display: none;
            margin-top: 0.25rem;
            color: #8a94a6;
            font-size: clamp(0.72rem, 2.2vw, 0.86rem);
            text-align: center;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: clamp(0.8rem, 2.5vw, 1rem); 
          }
          th, td { 
            padding: 8px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
          }
          th { 
            background: #f5f5f5; 
            font-weight: 600; 
          }
          a { 
            color: #1a73e8; 
            text-decoration: none; 
            font-size: clamp(1rem, 3vw, 1.2rem); 
          }
          #offlineBar {
            display: none;
            background-color: #ff9800;
            color: white;
            padding: clamp(0.875rem, 3.5vw, 1.25rem);
            text-align: center;
            font-size: clamp(1rem, 3.5vw, 1.25rem);
            font-weight: 600;
            width: 100%;
            margin-bottom: 1rem;
            border-radius: clamp(0.5rem, 1.5vw, 0.75rem);
            box-sizing: border-box;
          }
          .modal {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.5);
            padding: 1rem;
            z-index: 1000;
          }
          body.timecard-modal-open {
            overflow: hidden;
            overscroll-behavior: none;
          }
          #adminViewModal {
            z-index: 1000;
          }
          #manualEntryModal {
            z-index: 1100;
          }
          .modal-content {
            background: #fff;
            width: min(32rem, 96vw);
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 0.75rem;
            padding: clamp(1rem, 3vw, 1.5rem);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            position: relative;
          }
          .admin-modal-content {
            position: relative;
            padding-top: clamp(1.4rem, 3.4vw, 1.9rem);
          }
          .admin-close-btn {
            position: absolute;
            top: 0.6rem;
            right: 0.6rem;
            width: 2rem !important;
            height: 2rem;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 999px !important;
            border: 1px solid #cbd5e1;
            background: #eef2f7;
            color: #475569;
            font-size: 1.2rem !important;
            line-height: 1;
            box-shadow: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .admin-toolbar-row {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            flex-wrap: nowrap;
            width: 100%;
            overflow-x: auto;
          }
          .admin-toolbar-btn {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0.45rem 0.6rem !important;
            border-radius: 0.45rem !important;
            font-size: 0.78rem !important;
            line-height: 1.2;
            white-space: nowrap;
            box-shadow: none;
            flex: 0 0 auto;
          }
          .admin-switches {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .admin-switch {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            margin: 0;
            cursor: pointer;
            user-select: none;
          }
          .admin-switch input {
            position: absolute;
            opacity: 0;
            width: 0 !important;
            max-width: 0 !important;
            height: 0;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
          }
          .admin-switch-track {
            position: relative;
            width: 2.2rem;
            height: 1.25rem;
            border-radius: 999px;
            background: #9aa3ad;
            transition: background 0.2s ease;
            flex: 0 0 auto;
          }
          .admin-switch-track::after {
            content: '';
            position: absolute;
            top: 0.14rem;
            left: 0.16rem;
            width: 0.95rem;
            height: 0.95rem;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s ease;
          }
          .admin-switch-label {
            font-size: 0.88rem;
            font-weight: 600;
            color: #5f6a76;
          }
          .admin-switch input:checked + .admin-switch-track {
            background: #1f9d54;
          }
          .admin-switch input:checked + .admin-switch-track::after {
            transform: translateX(0.95rem);
          }
          .admin-switch input:checked ~ .admin-switch-label {
            color: #176a39;
          }
          .modal-content h3 {
            margin: 0;
            font-size: clamp(1.5rem, 5vw, 1.75rem);
            color: #1a73e8;
          }
          .admin-title-sub {
            font-size: 0.88rem;
            color: #5f6a76;
            font-weight: 600;
            margin-left: 0.45rem;
          }
          .modal-note {
            margin: 0;
            font-size: clamp(1rem, 3.5vw, 1.1rem);
            color: #555;
          }
          .modal-content label {
            font-weight: 600;
            font-size: clamp(1rem, 3.5vw, 1.1rem);
          }
          .modal-content input,
          .modal-content textarea {
            width: 100%;
            max-width: none;
            font-size: clamp(1rem, 3.5vw, 1.1rem);
            box-sizing: border-box;
          }
          .modal-content input[type="date"],
          .modal-content input[type="datetime-local"],
          .modal-content input.manual-datetime-picker,
          .modal-content input.admin-datetime-picker {
            min-height: 2.45rem;
            padding: 0.5rem 0.65rem;
            line-height: 1.2;
          }
          .modal-content input[type="date"]::-webkit-calendar-picker-indicator,
          .modal-content input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            transform: scale(1.15);
            transform-origin: center;
            cursor: pointer;
          }
          .flatpickr-calendar {
            font-size: var(--timecard-picker-font-size);
            background: #ffffff !important;
            border: 1px solid #cfd8e3;
            border-radius: 0.6rem;
            box-shadow: 0 0.45rem 1rem rgba(15, 23, 42, 0.24);
            width: min(20rem, 92vw);
            opacity: 1 !important;
            z-index: 2200 !important;
            isolation: isolate;
          }
          .flatpickr-calendar.open,
          .flatpickr-calendar.inline {
            opacity: 1 !important;
            visibility: visible !important;
          }
          .flatpickr-calendar,
          .flatpickr-calendar * {
            backdrop-filter: none !important;
          }
          .flatpickr-calendar .flatpickr-days,
          .flatpickr-calendar .dayContainer {
            background: #ffffff !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
          }
          .flatpickr-rContainer,
          .flatpickr-innerContainer,
          .flatpickr-months,
          .flatpickr-weekdays,
          .flatpickr-month {
            background: #ffffff !important;
            opacity: 1 !important;
          }
          .flatpickr-calendar .flatpickr-day,
          .flatpickr-calendar span.flatpickr-weekday {
            width: calc(var(--timecard-picker-cell-size) - 0.02rem);
            max-width: calc(var(--timecard-picker-cell-size) - 0.02rem);
            height: var(--timecard-picker-cell-size);
            line-height: var(--timecard-picker-cell-size);
          }
          .flatpickr-time {
            background: #ffffff !important;
            border-top: 1px solid #e2e8f0;
            opacity: 1 !important;
            position: relative;
            z-index: 1;
          }
          .flatpickr-time input,
          .flatpickr-time .flatpickr-am-pm,
          .flatpickr-time .numInputWrapper {
            background: #ffffff !important;
            opacity: 1 !important;
          }
          .flatpickr-calendar .flatpickr-weekday {
            font-size: 0.88em;
            font-weight: 600;
          }
          .flatpickr-months .flatpickr-month,
          .flatpickr-current-month {
            height: 2.45rem;
          }
          .flatpickr-current-month {
            font-size: 1.08em;
            padding-top: 0.3rem;
          }
          .flatpickr-time input.flatpickr-hour,
          .flatpickr-time input.flatpickr-minute {
            font-size: var(--timecard-picker-time-font-size);
            font-weight: 600;
          }
          .flatpickr-time .flatpickr-am-pm {
            font-size: calc(var(--timecard-picker-time-font-size) * 0.95);
          }
          .modal-content input.manual-picker-invalid,
          .modal-content input.admin-picker-invalid {
            border-color: #d93025 !important;
            background: #fff2f2 !important;
            box-shadow: 0 0 0 1px rgba(217, 48, 37, 0.22) inset;
          }
          .flatpickr-day.flatpickr-disabled,
          .flatpickr-time .flatpickr-disabled {
            text-decoration: line-through;
            opacity: 0.4;
          }
          .modal-actions {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            width: 100%;
          }
          .modal-actions button {
            width: 100%;
          }
          .modal-actions .secondary {
            background: #e0e0e0;
            color: #333;
          }
          .modal-close-x {
            position: absolute;
            top: 0.6rem;
            right: 0.6rem;
            width: 1.75rem;
            min-width: 1.75rem;
            height: 1.75rem;
            min-height: 1.75rem;
            padding: 0;
            margin: 0;
            border-radius: 999px;
            border: 1px solid #d0d7de;
            background: #fff;
            color: #666;
            font-size: 1rem;
            font-weight: 700;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .modal-close-x:hover {
            background: #f4f4f4;
            color: #333;
          }
          .archive-loading {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: clamp(0.95rem, 3.2vw, 1.05rem);
            color: #666;
          }
          .archive-spinner {
            width: 1rem;
            height: 1rem;
            border: 2px solid #ddd;
            border-top-color: #1a73e8;
            border-radius: 50%;
            animation: archiveSpin 0.8s linear infinite;
          }
          @keyframes archiveSpin {
            to { transform: rotate(360deg); }
          }
          .archive-table th,
          .archive-table td {
            font-size: inherit;
          }
          #archiveReviewModal .modal-content {
            width: min(56rem, 96vw);
            max-height: 86vh;
            padding: 0.95rem 0.95rem 0.75rem;
            gap: 0.55rem;
          }
          #archiveReviewModal .modal-note {
            font-size: clamp(0.95rem, 2.7vw, 1.08rem);
            line-height: 1.3;
          }
          #archiveReviewModal .modal-actions {
            margin-top: 0.1rem;
          }
          #archiveReviewModal .modal-actions button {
            width: 100%;
            max-width: 31rem;
            align-self: flex-start;
          }
          .archive-table {
            font-size: clamp(0.82rem, 2.1vw, 0.95rem);
          }
          .archive-table thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #f5f7fa;
          }
          .archive-table.recent-grid th,
          .archive-table.recent-grid td {
            padding-top: 0.28rem;
            padding-bottom: 0.28rem;
          }
          .archive-table .admin-day-label {
            font-size: clamp(0.9rem, 2.5vw, 1rem);
          }
          .archive-table .recent-time-stack {
            gap: 0.1rem;
          }
          .archive-table .admin-time-pill.admin-time-in,
          .archive-table .admin-time-pill.admin-time-out {
            width: 6.85rem !important;
            min-width: 6.85rem;
            min-height: 1.35rem;
            padding: 0.18rem 0.34rem !important;
          }
          .archive-table .admin-time-pill .admin-time-label {
            font-size: 0.8rem;
          }
          .archive-table .admin-time-pill .admin-time-value {
            font-size: 0.92rem;
          }
          .archive-table .admin-verify-toggle {
            width: 1.1rem !important;
            min-width: 1.1rem;
            height: 1.1rem;
            min-height: 1.1rem;
            font-size: 0.65rem !important;
          }
          .archive-table .recent-verify-spacer {
            width: 1.1rem;
            min-width: 1.1rem;
            height: 1.1rem;
          }
          .archive-table .admin-hours-pill {
            min-height: 2.2rem;
            padding: 0.12rem 0.24rem;
            gap: 0.22rem;
          }
          .archive-table .admin-hours-pill-value {
            font-size: 0.98rem;
          }
          .archive-table .admin-hours-pill-unit {
            font-size: 0.8rem;
          }
          .archive-table .admin-note-list {
            gap: 0.16rem;
          }
          .archive-table .admin-note-line {
            font-size: 0.88rem;
            padding: 0.2rem 0.34rem;
            border-radius: 0.38rem;
          }
          .archive-table td[data-label="Archived"] {
            font-variant-numeric: tabular-nums;
            color: #36414d;
          }
          .archive-table.recent-grid th:nth-child(4),
          .archive-table.recent-grid td:nth-child(4) {
            width: 8rem;
            max-width: 8rem;
            white-space: nowrap;
            text-align: left;
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          }
          .archive-range-panel {
            display: none;
            width: 100%;
            background: #f7f9fc;
            border: 1px solid #dfe5ee;
            border-radius: 0.6rem;
            padding: 0.65rem;
            box-sizing: border-box;
          }
          .archive-range-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.65rem;
          }
          .archive-range-field {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .archive-range-field label {
            font-size: clamp(0.92rem, 2.8vw, 1rem);
            font-weight: 600;
          }
          .archive-range-field input {
            margin: 0;
            font-size: clamp(1rem, 3.5vw, 1.1rem);
            padding: 0.5rem 0.65rem;
            min-height: 2.45rem;
          }
          #archiveReviewModal .modal-actions button {
            font-size: clamp(1rem, 3vw, 1.2rem);
            padding: 0.65rem 0.95rem;
          }
          .archive-entries {
            max-height: 50vh;
            overflow-y: auto;
            margin-top: 0.25rem;
          }
          @media (max-width: 680px) {
            .archive-range-grid {
              grid-template-columns: 1fr;
            }
            body {
              font-size: 1.2rem;
            }
            .container {
              padding: 1rem 0.9rem 1.1rem;
              border-radius: 0.65rem;
            }
            h1 {
              font-size: 2.15rem;
              margin: 0.35rem 0 0.55rem;
            }
            .status-row {
              width: 94%;
              max-width: 30rem;
              gap: 0.7rem;
            }
            #status {
              font-size: 1.25rem;
            }
            .status-refresh-btn {
              width: 3rem;
              min-width: 3rem;
              height: 3rem;
            }
            #notes,
            input,
            textarea {
              width: 94%;
              max-width: 30rem;
              font-size: 1.2rem;
              padding: 1rem;
            }
            button {
              width: 94%;
              max-width: 30rem;
              font-size: 1.35rem;
              padding: 1rem 1.1rem;
            }
            .manual-entry-helper {
              width: 94%;
              max-width: 30rem;
              font-size: 1rem;
              margin: -0.3rem 0 0.55rem;
            }
            .entries {
              margin-top: 1.25rem;
            }
            .recent-entries {
              margin-top: 1.75rem;
              padding-right: 0;
              width: 100%;
            }
            .recent-entries h3 {
              font-size: 1.25rem;
              margin-bottom: 0.35rem;
            }
            .recent-entries .entries-subtitle {
              font-size: 1rem;
              margin-bottom: 0.9rem;
            }
            .recent-unpaid-grid {
              font-size: 1.25rem;
            }
            .recent-unpaid-grid th,
            .recent-unpaid-grid td {
              padding: 0.55rem 0.45rem;
            }
            .recent-unpaid-grid th:nth-child(1),
            .recent-unpaid-grid td:nth-child(1) {
              width: 9.6rem;
            }
            .recent-unpaid-grid th:nth-child(2),
            .recent-unpaid-grid td:nth-child(2) {
              width: 4.6rem;
            }
            .recent-unpaid-grid th:nth-child(3),
            .recent-unpaid-grid td:nth-child(3) {
              width: auto;
            }
            .recent-unpaid-grid th:nth-child(4),
            .recent-unpaid-grid td:nth-child(4) {
              width: 2.7rem;
              padding-right: 0.35rem;
            }
            .recent-unpaid-grid .recent-time-stack {
              gap: 0.42rem;
            }
            .recent-unpaid-grid .admin-in-cell,
            .recent-unpaid-grid .recent-time-out-row {
              gap: 0.4rem;
            }
            .recent-unpaid-grid .admin-time-pill.admin-time-in,
            .recent-unpaid-grid .admin-time-pill.admin-time-out {
              width: 7.5rem !important;
              min-width: 7.5rem;
            }
            .recent-unpaid-grid .admin-time-pill {
              min-height: 2rem;
              padding: 0.38rem 0.55rem !important;
            }
            .recent-unpaid-grid .admin-time-pill .admin-time-label {
              font-size: 1rem;
            }
            .recent-unpaid-grid .admin-time-pill .admin-time-value {
              font-size: 1.1rem;
            }
            .recent-unpaid-grid .admin-hours-pill {
              min-height: 4rem;
              min-width: 4.9rem;
              padding: 0.26rem 0.45rem;
            }
            .recent-unpaid-grid .admin-hours-pill-value {
              font-size: 1.2rem;
            }
            .recent-unpaid-grid .admin-hours-pill-unit {
              font-size: 1rem;
            }
            .recent-unpaid-grid .admin-note-line {
              font-size: 1.06rem;
              padding: 0.34rem 0.45rem;
            }
            .recent-unpaid-grid .admin-note-add-btn {
              width: auto !important;
              min-width: 7.8rem;
              height: 2.94rem;
              min-height: 2.94rem;
              padding: 0.38rem 0.85rem !important;
              font-size: 1.18rem !important;
            }
            .recent-unpaid-grid .admin-verify-toggle,
            .recent-unpaid-grid .recent-out-marker {
              width: 1.4rem !important;
              min-width: 1.4rem;
              height: 1.4rem;
              min-height: 1.4rem;
            }
            body.mobile-recent-layout .recent-cards {
              padding-left: 0;
              padding-right: 0;
            }
            #archiveReviewModal .modal-actions button {
              max-width: none;
            }
            .archive-table .admin-time-pill.admin-time-in,
            .archive-table .admin-time-pill.admin-time-out {
              width: 6.5rem !important;
              min-width: 6.5rem;
            }
            .archive-entries {
              max-height: 46vh;
            }
            .layout-debug-label-desktop {
              display: none;
            }
            .layout-debug-label-mobile {
              display: inline;
            }
          }
          @media (max-width: 420px) {
            .status-row {
              width: 96%;
              gap: 0.55rem;
            }
            #status {
              font-size: 1.18rem;
            }
            .recent-unpaid-grid {
              font-size: 1.17rem;
            }
            .recent-unpaid-grid th:nth-child(1),
            .recent-unpaid-grid td:nth-child(1) {
              width: 9.1rem;
            }
            .recent-unpaid-grid th:nth-child(2),
            .recent-unpaid-grid td:nth-child(2) {
              width: 4.3rem;
            }
            .recent-unpaid-grid .admin-time-pill.admin-time-in,
            .recent-unpaid-grid .admin-time-pill.admin-time-out {
              width: 7rem !important;
              min-width: 7rem;
            }
          }
        </style>
      </head>
      <body>
        <div id="offlineBar">⚠️ You are offline. Clock actions are disabled until your connection returns.</div>
        <div class="container">
          <img src="data:image/png;base64,${LOGO_BASE64}" alt="Logo" style="height: 200px; width: auto; margin-bottom: 1rem;">
          <button id="uiScaleMenuBtn" class="menu-top-btn" type="button" onclick="toggleUiScaleControls()" aria-controls="uiScaleControls" aria-expanded="false">Display Menu</button>
          ${canAccessAdminView ? '<button class="admin-top-btn" onclick="showAdminView()">Admin View</button>' : ''}
          <h1>Welcome ${email}!</h1>
          <div class="status-row">
            <p id="status">${statusObj.status}</p>
            <button id="refreshStatusBtn" class="status-refresh-btn" type="button" onclick="refreshStatus()" aria-label="Refresh status" title="Refresh status">
              <span class="refresh-icon" aria-hidden="true">↻</span>
            </button>
          </div>
          <p id="message" class="message" style="display: none;"></p>
          <p id="error" class="error" style="display: none;"></p>
          <p id="loading" class="loading">Processing...</p>
          
          <input type="text" id="notes" placeholder="Clock in note" maxlength="150">
          <p id="clockNoteHint" class="clock-note-hint"></p>
          
           <button id="clockToggle" onclick="submitClockToggle()">
             ${statusObj.isClockedIn ? '🔴 Clock Out' : '🟢 Clock In'}
           </button>

          <div id="employeeSchedulePreview" class="employee-schedule-block" aria-live="polite">
            <button id="scheduleTodayPill" type="button" class="schedule-summary-pill" onclick="openEmployeeScheduleModal()" title="View full schedule">
              <span class="schedule-pill-title">Today</span>
              <span id="scheduleTodaySummary" class="schedule-pill-body"><span class="schedule-pill-empty">Loading schedule...</span></span>
            </button>
            <button id="scheduleTomorrowPill" type="button" class="schedule-summary-pill" onclick="openEmployeeScheduleModal()" title="View full schedule">
              <span class="schedule-pill-title">Tomorrow</span>
              <span id="scheduleTomorrowSummary" class="schedule-pill-body"><span class="schedule-pill-empty">Loading schedule...</span></span>
            </button>
          </div>

          <button id="manualEntryBtn" type="button" onclick="showManualEntryForm(event)">
            ➕ Add Time Entry
          </button>
          <p class="manual-entry-helper">Worked, Sick, or Vacation.</p>

          <button id="archiveReviewBtn" class="secondary-action-btn is-hidden" onclick="showArchiveReview()">
            Review Archived Entries
          </button>
          <div id="uiScaleControls" class="ui-scale-controls is-hidden">
            <label for="uiScaleValue">UI Scale</label>
            <div class="ui-scale-stepper">
              <button type="button" class="ui-scale-step-btn" onclick="stepUiScale(-1)" aria-label="Decrease UI scale">-</button>
              <div id="uiScaleValue" class="ui-scale-value" aria-live="polite">100%</div>
              <button type="button" class="ui-scale-step-btn" onclick="stepUiScale(1)" aria-label="Increase UI scale">+</button>
            </div>
          </div>

          <div id="manualEntryModal" class="modal" style="display: none;">
            <div class="modal-content">
              <button class="modal-close-x" onclick="hideManualEntryForm()" title="Close missed time" aria-label="Close missed time">x</button>
              <h3>Add Missed Time</h3>
              <p id="manualTargetInfo" class="modal-note" style="display:none;"></p>
              <p id="dateRangeInfo" class="modal-note">Loading allowed date range...</p>

              <label for="manualClockIn">Clock In</label>
              <input type="text" id="manualClockIn" class="manual-datetime-picker" required autocomplete="off">

              <label for="manualClockOut">Clock Out</label>
              <input type="text" id="manualClockOut" class="manual-datetime-picker" required autocomplete="off">

              <div class="manual-entry-type-group">
                <label class="manual-entry-type-option"><input type="checkbox" id="manualEntryTypeWorked" onchange="handleManualEntryTypeChange('worked')"> Worked</label>
                <label class="manual-entry-type-option"><input type="checkbox" id="manualEntryTypeVacation" onchange="handleManualEntryTypeChange('vacation')"> Vacation</label>
                <label class="manual-entry-type-option"><input type="checkbox" id="manualEntryTypeSick" onchange="handleManualEntryTypeChange('sick')"> Sick</label>
              </div>

              <textarea id="manualNotes" placeholder="Required: explain why this entry is needed" maxlength="150"></textarea>

              <p id="manualError" class="error" style="display: none;"></p>

              <div class="modal-actions">
                <button id="manualSubmit" type="button" onclick="submitManualEntry(event)">Submit</button>
              </div>
            </div>
          </div>

          <div id="archiveReviewModal" class="modal" style="display: none;">
            <div class="modal-content">
              <button class="modal-close-x" onclick="hideArchiveReview()" title="Close archived entries" aria-label="Close archived entries">x</button>
              <h3>Archived Entries</h3>
              <p id="archiveReviewInfo" class="modal-note">Loading archive range...</p>

              <div id="archiveRangePanel" class="archive-range-panel">
                <div class="archive-range-grid">
                  <div class="archive-range-field">
                    <label for="archiveStartDate">Start Date</label>
                    <input type="date" id="archiveStartDate" required>
                  </div>
                  <div class="archive-range-field">
                    <label for="archiveEndDate">End Date</label>
                    <input type="date" id="archiveEndDate" required>
                  </div>
                </div>
              </div>

              <p id="archiveReviewError" class="error" style="display: none;"></p>

              <div class="modal-actions">
                <button id="archiveReviewLoad" onclick="onArchiveReviewAction()">Set Date Range &amp; Load Entries</button>
              </div>

              <div id="archiveReviewLoading" class="archive-loading" style="display: none;">
                <span class="archive-spinner"></span>
                <span>Loading archived entries...</span>
              </div>

              <div class="entries archive-entries">
                <table class="archive-table recent-grid">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Hours</th>
                      <th>Notes</th>
                      <th>Archived</th>
                    </tr>
                  </thead>
                  <tbody id="archiveReviewBody">
                    <tr><td colspan="4" style="text-align: center; color: #999;">Select dates to load entries.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="employeeScheduleModal" class="modal" style="display: none;">
            <div class="modal-content" style="width:min(34rem,96vw);">
              <button class="modal-close-x" onclick="closeEmployeeScheduleModal()" title="Close schedule" aria-label="Close schedule">x</button>
              <h3>Your Schedule</h3>
              <p id="employeeScheduleModalMeta" class="modal-note">Current week schedule</p>
              <div id="employeeScheduleWeekList" class="employee-schedule-week-list"></div>
            </div>
          </div>

          <div id="adminViewModal" class="modal" style="display: none;">
            <div class="modal-content admin-modal-content" style="width:min(64.8rem,96vw);">
              <button class="admin-close-btn" type="button" aria-label="Close admin view" title="Close" onclick="hideAdminView()">&#10005;</button>
              <h3>Admin View <span class="admin-title-sub">(Active pay period: ${activePayPeriodStartDateStr} to ${activePayPeriodEndDateStr})</span></h3>
              <div class="admin-toolbar-row">
                <button class="admin-toolbar-btn" onclick="loadAdminEntries()">Refresh Entries</button>
                <button id="adminHtmlPreviewBtn" class="admin-toolbar-btn" onclick="openAdminHtmlPreviewModal()"${canRunPayrollPreview ? '' : ' disabled title="Payroll permission required."'}>Create Payroll Report</button>
                <button id="adminScheduleToolBtn" class="admin-toolbar-btn secondary" onclick="openScheduleToolModal()"${canManageScheduleTool ? '' : ' disabled title="Payroll and edit permissions required."'}>Schedule Tool</button>
                <button id="adminMoreReportsBtn" class="admin-toolbar-btn secondary" onclick="openMoreReportsModal()"${canAccessAdminView ? '' : ' disabled title="Admin view permission required."'}>More Reports</button>
              </div>
              <div class="admin-switches">
                <label class="admin-switch">
                  <input type="checkbox" id="adminShowRawTimes" onchange="toggleAdminRawTimes()">
                  <span class="admin-switch-track"></span>
                  <span class="admin-switch-label">Show raw times</span>
                </label>
                <label class="admin-switch">
                  <input type="checkbox" id="adminShowDeleted" onchange="toggleAdminShowDeletedRows()">
                  <span class="admin-switch-track"></span>
                  <span class="admin-switch-label">Show deleted rows</span>
                </label>
                <label class="admin-switch">
                  <input type="checkbox" id="adminShowOnlyActivePayPeriod" onchange="toggleAdminActivePayPeriodFilter()" checked>
                  <span class="admin-switch-track"></span>
                  <span class="admin-switch-label">Show only active pay period</span>
                </label>
                <label class="admin-switch">
                  <input type="checkbox" id="adminAutoCollapseVerifiedDays" onchange="toggleAdminAutoCollapseVerifiedDays()">
                  <span class="admin-switch-track"></span>
                  <span class="admin-switch-label">Auto-collapse verified days</span>
                </label>
              </div>
              <div id="adminLoadMsg" class="info">Loading...</div>
              <div style="overflow:auto; max-height:60vh;">
                <table class="admin-grid">
                  <tbody id="adminEntriesBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="moreReportsModal" class="modal" style="display: none;">
            <div class="modal-content admin-modal-content" style="width:min(46rem,96vw); height:min(48rem,92vh); padding:0; overflow:hidden; position:relative;">
              <button class="admin-close-btn" type="button" aria-label="Close more reports" title="Close" onclick="closeMoreReportsModal()">&#10005;</button>
              <iframe id="moreReportsFrame" title="Create Report" style="width:100%; height:100%; border:0; background:#fff;"></iframe>
            </div>
          </div>

          <div id="scheduleToolModal" class="modal" style="display: none;">
            <div class="modal-content admin-modal-content" style="width:min(98vw,120rem); height:min(96vh,78rem); padding:0; overflow:hidden; position:relative;">
              <button class="admin-close-btn" type="button" aria-label="Close schedule tool" title="Close" onclick="closeScheduleToolModal()">&#10005;</button>
              <iframe id="scheduleToolFrame" title="Schedule Tool" style="width:100%; height:100%; border:0; background:#fff;"></iframe>
            </div>
          </div>

          <div id="adminHtmlPreviewModal" class="modal" style="display: none;">
            <div class="modal-content admin-modal-content" style="width:min(70rem,96vw);">
              <button class="admin-close-btn" type="button" aria-label="Close HTML preview" title="Close" onclick="closeAdminHtmlPreviewModal()">&#10005;</button>
              <h3>Payroll Report</h3>
              <div class="admin-toolbar-row" style="gap:8px; margin-bottom:8px; align-items:center;">
                <button id="adminHtmlGenerateBtn" class="admin-toolbar-btn" onclick="generateAdminHtmlPreview()"${canRunPayrollPreview ? '' : ' disabled title="Payroll permission required."'}>Generate Report</button>
                <button id="adminHtmlExportBtn" class="admin-toolbar-btn secondary" onclick="exportAdminHtmlPreview()" disabled${canExportPayrollReport ? '' : ' title="Export permission required."'}>Export and Archive Payroll</button>
                <button id="adminHtmlHolidayPayBtn" type="button" class="admin-toolbar-btn secondary" onclick="openAdminHtmlHolidayModal()"${canRunPayrollPreview ? '' : ' disabled title="Payroll permission required."'}>Add Holiday Pay</button>
                <button id="adminHtmlAwsSummaryBtn" type="button" class="admin-toolbar-btn secondary" style="margin-left:auto;" onclick="openAdminHtmlAwsModal()"${canManageAwsConfig ? '' : ' disabled title="Payroll permission required."'}>AWS : ?</button>
              </div>
              <div id="adminHtmlPreviewMsg" class="info">Refresh entries and generate preview to see totals.</div>
              <div id="adminHtmlHolidayDetectedLine" class="admin-holiday-detected" style="display:none;">holidays detected in pay period</div>

              <div style="overflow:auto; max-height:52vh; border:1px solid #e0e0e0; border-radius:8px;">
                <table class="admin-preview-grid" style="min-width:0;">
                  <colgroup>
                    <col class="admin-col-email">
                    <col class="admin-col-week">
                    <col class="admin-col-week">
                    <col class="admin-col-week">
                    <col class="admin-col-week">
                    <col class="admin-col-week">
                    <col class="admin-col-week">
                    <col class="admin-col-additional">
                    <col class="admin-col-additional">
                    <col class="admin-col-additional">
                    <col class="admin-col-additional">
                    <col class="admin-col-total">
                    <col class="admin-col-total">
                    <col class="admin-col-total">
                    <col class="admin-col-notes">
                    <col class="admin-col-aws">
                  </colgroup>
                  <thead>
                    <tr>
                      <th id="adminHtmlPreviewTableTitle" class="admin-preview-title" colspan="16">Pay Period Preview</th>
                    </tr>
                    <tr class="admin-preview-group">
                      <th rowspan="2">Email</th>
                      <th colspan="3">First Week</th>
                      <th colspan="3">Second Week</th>
                      <th colspan="4">Additional</th>
                      <th colspan="3">TOTAL</th>
                      <th rowspan="2">Notes</th>
                      <th rowspan="2">AWS Status</th>
                    </tr>
                    <tr>
                      <th class="admin-preview-subhead">RT</th>
                      <th class="admin-preview-subhead">OT</th>
                      <th class="admin-preview-subhead">DT</th>
                      <th class="admin-preview-subhead">RT</th>
                      <th class="admin-preview-subhead">OT</th>
                      <th class="admin-preview-subhead">DT</th>
                      <th class="admin-preview-subhead">Vacation</th>
                      <th class="admin-preview-subhead">Holiday</th>
                      <th class="admin-preview-subhead">Sick</th>
                      <th>Hours > 40</th>
                      <th class="admin-preview-subhead">RT</th>
                      <th class="admin-preview-subhead">OT</th>
                      <th class="admin-preview-subhead">DT</th>
                    </tr>
                  </thead>
                  <tbody id="adminHtmlPreviewBody">
                    <tr><td class="admin-preview-empty" colspan="16">No preview generated yet.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="adminHtmlAwsModal" class="modal" style="display: none;">
            <div class="modal-content admin-modal-content" style="width:min(44rem,96vw);">
              <button class="admin-close-btn" type="button" aria-label="Close AWS settings" title="Close" onclick="closeAdminHtmlAwsModal()">&#10005;</button>
              <h3>AWS Settings</h3>
              <p class="modal-note">Rarely used setting. Enable only where needed and set each effective date.</p>
              <div id="adminHtmlAwsSettingsList" style="border:1px solid #d8e0ea; border-radius:6px; background:#fff; max-height:48vh; overflow-y:auto; padding:8px 10px;">
                <div style="text-align:center; color:#999;">Loading employees...</div>
              </div>
              <p id="adminHtmlAwsError" class="error" style="display:none;"></p>
              <div class="modal-actions">
                <button id="adminHtmlAwsSaveBtn" onclick="saveAdminHtmlAwsSettings()"${canManageAwsConfig ? '' : ' disabled title="Payroll permission required."'}>Save AWS Settings</button>
              </div>
            </div>
          </div>

          <div id="adminHtmlHolidayModal" class="modal" style="display: none;">
            <div class="modal-content admin-modal-content" style="width:min(66rem,96vw);">
              <button class="admin-close-btn" type="button" aria-label="Close holiday pay" title="Close" onclick="closeAdminHtmlHolidayModal()">&#10005;</button>
              <h3>Add Holiday Pay</h3>
              <p id="adminHtmlHolidayHelp" class="modal-note">Choose holidays per employee. Checked holidays add 8 hours (non-AWS) or 10 hours (AWS on holiday date).</p>
              <div class="admin-holiday-grid-wrap">
                <div id="adminHtmlHolidayMatrix" style="min-height:8rem; display:flex; align-items:center; justify-content:center; color:#7a8797;">Generate report preview to load employees and holidays.</div>
              </div>
              <p id="adminHtmlHolidayError" class="error" style="display:none;"></p>
              <div class="modal-actions">
                <button id="adminHtmlHolidayApplyBtn" type="button" onclick="applyAdminHtmlHolidayAssignments()">Apply Holiday Pay</button>
                <button class="secondary" type="button" onclick="closeAdminHtmlHolidayModal()">Cancel</button>
              </div>
            </div>
          </div>

          <div id="adminTimeEditModal" class="modal" style="display: none;">
            <div class="modal-content" style="width:min(34rem,96vw);">
              <button class="modal-close-x" onclick="closeAdminTimeEditor()" title="Close time editor" aria-label="Close time editor">x</button>
              <h3>Edit Times</h3>
              <p class="modal-note" id="adminTimeEditRowLabel">Row</p>
              <p class="modal-note" id="adminTimeEditRawInfo">Raw times</p>

              <label for="adminEditClockIn">Clock In</label>
              <input type="text" id="adminEditClockIn" class="admin-datetime-picker" autocomplete="off">

              <label for="adminEditClockOut">Clock Out</label>
              <input type="text" id="adminEditClockOut" class="admin-datetime-picker" autocomplete="off">

              <p id="adminEditError" class="error" style="display:none;"></p>

              <div class="modal-actions">
                <button id="adminTimeEditApplyBtn" onclick="applyAdminTimeEdit()" disabled>Apply</button>
              </div>
            </div>
          </div>
          
          <div class="entries recent-entries">
            <div class="recent-entries-header">
              <h3>${recentEntriesHeader}</h3>
              <p class="entries-subtitle">${nextPaycheckDisplay}</p>
            </div>
            <table class="admin-grid recent-grid recent-unpaid-grid">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="recentEntriesBody">
                ${entriesHtml}
              </tbody>
            </table>
            <div id="recentEntriesCards" class="recent-cards" aria-live="polite"></div>
          </div>

          <p class="app-version">Running script version: ${scriptVersion || 'unknown'}</p>
          <p id="layoutDebug" class="layout-debug">Layout: initializing...</p>
          
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
        <script>
          const clientDebugEnabled = ${isDebugEnabled() ? 'true' : 'false'};
          const UI_SCALE_STORAGE_KEY = 'timecard_ui_scale_percent';
          const UI_SCALE_DEFAULT_MOBILE_PERCENT = 175;
          const UI_SCALE_DEFAULT_DESKTOP_PERCENT = 110;
          const UI_SCALE_MIN_PERCENT = 85;
          const UI_SCALE_MAX_PERCENT = 300;
          const UI_SCALE_BASE_FONT_SIZE_PX = 20;
          const UI_SCALE_PRESET_VALUES = [85, 90, 95, 100, 105, 110, 115, 120, 130, 140, 150, 175, 200, 225, 250, 275, 300];
          const MANUAL_ENTRY_MAX_SPAN_MS = 14 * 60 * 60 * 1000;
          const MANUAL_PICKER_MINUTE_INCREMENT = 1;
          const MANUAL_PICKER_STEP_MS = MANUAL_PICKER_MINUTE_INCREMENT * 60 * 1000;
          // Refactor note: Manual Add Time range is preloaded by doGet/createMobileHtml
          // so the modal opens with constraints immediately and without a range RPC.
          const preloadedAllowedRange = ${JSON.stringify(preloadedManualRange)};
          const preloadedSchedulePreview = ${JSON.stringify(preloadedSchedulePreviewFromServer || null)};
          const currentUserEmail = ${JSON.stringify(email || '')};
          const adminPermissions = ${JSON.stringify(normalizedPermissionFlags)};
          let activePayPeriodStartLabel = ${JSON.stringify(activePayPeriodStartDateStr || '')};
          let activePayPeriodEndLabel = ${JSON.stringify(activePayPeriodEndDateStr || '')};
          let recentEntries = [];
          let recentEntriesLastUpdated = 0;
          const recentEntriesTtlMs = 5 * 60 * 1000;
          let archiveBounds = null;
          let archiveRangePanelVisible = false;
          let adminEntriesByRow = {};
          let adminBaselineByRow = {};
          let adminDraftByRow = {};
          let adminVerifySaveInFlightByRow = {};
          let adminVerifyQueueByRow = {};
          let adminVerifyQueueOrder = [];
          let adminVerifyQueueTimer = null;
          let adminVerifyQueueInFlight = false;
          const ADMIN_HOLD_ACTION_MS = 3000;
          const adminHoldActionStateByKey = {};
          let adminShowRawTimes = false;
          let adminShowOnlyActivePayPeriod = true;
          let adminAutoCollapseVerifiedDays = false;
          let adminCollapsedUsers = {};
          let adminCollapsedDays = {};
          let adminManualEntryTargetEmail = '';
          let manualEntryType = 'worked';
          let manualEntryModalOpenedAtMs = 0;
          let manualClockInPicker = null;
          let manualClockOutPicker = null;
          let manualPickerRuleState = null;
          let adminEditClockInPicker = null;
          let adminEditClockOutPicker = null;
          let adminTempRowSeed = -1;
          let adminEditingRowIndex = null;
          let adminPreviewReady = false;
          let adminHtmlPreviewAwsConfig = {};
          let adminHtmlPreviewAwsDraftConfig = {};
          let adminHtmlPreviewLastResult = null;
          let adminHtmlPreviewStartIso = '';
          let adminHtmlPreviewNotesByEmail = {};
          const uiPendingActionsByKey = {};
          let pendingClockAction = false;
          let pendingRefreshStatus = false;
          let isClockedIn = ${statusObj.isClockedIn ? 'true' : 'false'};
          let latestStatusTextRaw = ${JSON.stringify(statusObj && statusObj.status ? statusObj.status : '')};
          let employeeSchedulePreview = null;
          let employeeSchedulePreviewInFlight = false;
          const CLOCK_IN_SCHEDULE_NOTE_TOLERANCE_MS = 15 * 60 * 1000;
          const CLOCK_OUT_NOTE_THRESHOLD_MS = 5 * 60 * 60 * 1000;

          function getScheduleDayNamesClient() {
            return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          }

          function getTodayScheduleDayIndex() {
            const dayIndex = new Date().getDay();
            return (dayIndex + 6) % 7;
          }

          function getDefaultEmployeeSchedulePreview() {
            const dayNames = getScheduleDayNamesClient();
            const week = dayNames.map((dayName) => ({ dayName: dayName, hasSchedule: false, summaryText: 'Not scheduled', segments: [] }));
            const todayIndex = getTodayScheduleDayIndex();
            const tomorrowIndex = (todayIndex + 1) % 7;
            const today = Object.assign({}, week[todayIndex], { summaryText: 'Not scheduled today' });
            const tomorrow = Object.assign({}, week[tomorrowIndex], { summaryText: 'Not scheduled tomorrow' });
            return { week: week, today: today, tomorrow: tomorrow, updatedAt: '' };
          }

          function normalizeScheduleSegmentClient(segment) {
            const source = segment && typeof segment === 'object' ? segment : {};
            const status = String(source.status || '').trim().toUpperCase();
            return {
              status: status === 'O' || status === 'B' || status === 'L' ? status : '',
              label: String(source.label || ''),
              rangeText: String(source.rangeText || '').trim(),
              startHour: Number(source.startHour),
              endHourExclusive: Number(source.endHourExclusive)
            };
          }

          function normalizeScheduleDayClient(dayData, fallbackDayName, fallbackSummaryText) {
            const source = dayData && typeof dayData === 'object' ? dayData : {};
            const segments = Array.isArray(source.segments)
              ? source.segments.map((segment) => normalizeScheduleSegmentClient(segment)).filter((segment) => !!segment.rangeText)
              : [];
            const hasSchedule = source.hasSchedule === true || segments.length > 0;
            const summaryText = String(source.summaryText || '').trim() || (hasSchedule
              ? segments.map((segment) => {
                  const label = segment.status === 'O'
                    ? 'On Duty'
                    : (segment.status === 'B' ? 'Backup' : 'Lunch');
                  return segment.rangeText + ' ' + label;
                }).join(' | ')
              : String(fallbackSummaryText || 'Not scheduled'));
            return {
              dayName: String(source.dayName || fallbackDayName || ''),
              hasSchedule: hasSchedule,
              summaryText: summaryText,
              segments: segments
            };
          }

          function normalizeSchedulePreviewClient(preview) {
            const base = getDefaultEmployeeSchedulePreview();
            const source = preview && typeof preview === 'object' ? preview : {};
            const dayNames = getScheduleDayNamesClient();
            const sourceWeek = Array.isArray(source.week) ? source.week : [];
            const week = dayNames.map((dayName, index) => normalizeScheduleDayClient(sourceWeek[index], dayName, 'Not scheduled'));
            const todayIndex = getTodayScheduleDayIndex();
            const tomorrowIndex = (todayIndex + 1) % 7;
            const today = normalizeScheduleDayClient(source.today || week[todayIndex], week[todayIndex].dayName, 'Not scheduled today');
            const tomorrow = normalizeScheduleDayClient(source.tomorrow || week[tomorrowIndex], week[tomorrowIndex].dayName, 'Not scheduled tomorrow');
            if (!today.hasSchedule) today.summaryText = 'Not scheduled today';
            if (!tomorrow.hasSchedule) tomorrow.summaryText = 'Not scheduled tomorrow';
            return {
              week: week,
              today: today,
              tomorrow: tomorrow,
              updatedAt: String(source.updatedAt || base.updatedAt || '')
            };
          }

          // Initialize from server-preloaded schedule to avoid first-load gating lag.
          employeeSchedulePreview = normalizeSchedulePreviewClient(preloadedSchedulePreview);

          function buildScheduleSegmentsHtml(segments) {
            const source = Array.isArray(segments) ? segments : [];
            if (!source.length) {
              return '<span class="schedule-pill-empty">Not scheduled</span>';
            }
            const chips = [];
            for (let i = 0; i < source.length; i++) {
              const segment = source[i] || {};
              const status = String(segment.status || '').toUpperCase();
              const className = status === 'O'
                ? 'on-duty'
                : (status === 'B' ? 'backup' : 'lunch');
              const label = status === 'O'
                ? 'On Duty'
                : (status === 'B' ? 'Backup' : 'Lunch');
              chips.push(
                '<span class="schedule-segment ' + className + '">' +
                  '<span class="schedule-segment-range">' + escapeHtml(segment.rangeText || '') + '</span>' +
                  '<span class="schedule-segment-label">' + escapeHtml(label) + '</span>' +
                '</span>'
              );
            }
            return '<span class="schedule-pill-segments">' + chips.join('') + '</span>';
          }

          function renderEmployeeSchedulePreview() {
            if (!employeeSchedulePreview) {
              employeeSchedulePreview = getDefaultEmployeeSchedulePreview();
            }
            const todaySummaryEl = document.getElementById('scheduleTodaySummary');
            const tomorrowSummaryEl = document.getElementById('scheduleTomorrowSummary');
            if (!todaySummaryEl || !tomorrowSummaryEl) return;
            const today = employeeSchedulePreview.today || { hasSchedule: false, summaryText: 'Not scheduled today', segments: [] };
            const tomorrow = employeeSchedulePreview.tomorrow || { hasSchedule: false, summaryText: 'Not scheduled tomorrow', segments: [] };
            todaySummaryEl.innerHTML = today.hasSchedule ? buildScheduleSegmentsHtml(today.segments) : '<span class="schedule-pill-empty">' + escapeHtml(today.summaryText || 'Not scheduled today') + '</span>';
            tomorrowSummaryEl.innerHTML = tomorrow.hasSchedule ? buildScheduleSegmentsHtml(tomorrow.segments) : '<span class="schedule-pill-empty">' + escapeHtml(tomorrow.summaryText || 'Not scheduled tomorrow') + '</span>';
          }

          function renderEmployeeScheduleModal() {
            if (!employeeSchedulePreview) {
              employeeSchedulePreview = getDefaultEmployeeSchedulePreview();
            }
            const weekList = document.getElementById('employeeScheduleWeekList');
            const meta = document.getElementById('employeeScheduleModalMeta');
            if (!weekList || !meta) return;
            const week = Array.isArray(employeeSchedulePreview.week) ? employeeSchedulePreview.week : [];
            const rows = [];
            for (let i = 0; i < week.length; i++) {
              const day = week[i] || {};
              rows.push(
                '<div class="employee-schedule-day-row">' +
                  '<div class="employee-schedule-day-name">' + escapeHtml(day.dayName || '') + '</div>' +
                  '<div class="employee-schedule-day-body">' +
                    (day.hasSchedule ? buildScheduleSegmentsHtml(day.segments) : '<span class="schedule-pill-empty">Not scheduled</span>') +
                  '</div>' +
                '</div>'
              );
            }
            weekList.innerHTML = rows.join('');
            meta.innerText = employeeSchedulePreview.updatedAt ? 'Updated ' + employeeSchedulePreview.updatedAt : 'Current week schedule';
          }

          function loadEmployeeSchedulePreview() {
            if (employeeSchedulePreviewInFlight) return;
            employeeSchedulePreviewInFlight = true;
            google.script.run
              .withSuccessHandler((result) => {
                employeeSchedulePreviewInFlight = false;
                const preview = result && result.preview ? result.preview : null;
                employeeSchedulePreview = normalizeSchedulePreviewClient(preview);
                renderEmployeeSchedulePreview();
                updateClockNotePlaceholder();
              })
              .withFailureHandler((error) => {
                employeeSchedulePreviewInFlight = false;
                debugClientError('loadEmployeeSchedulePreview.failure', {
                  message: (error && error.message) ? error.message : 'Unknown error'
                });
                if (!employeeSchedulePreview) {
                  employeeSchedulePreview = getDefaultEmployeeSchedulePreview();
                }
                renderEmployeeSchedulePreview();
                updateClockNotePlaceholder();
              })
              .getCurrentUserSchedulePreview();
          }

          function openEmployeeScheduleModal() {
            renderEmployeeScheduleModal();
            const modal = document.getElementById('employeeScheduleModal');
            if (modal) {
              modal.style.display = 'flex';
            }
          }

          function closeEmployeeScheduleModal() {
            const modal = document.getElementById('employeeScheduleModal');
            if (modal) {
              modal.style.display = 'none';
            }
          }

          function formatCompactStatusText(statusText) {
            const raw = String(statusText || '').trim();
            if (!raw) return 'NONE';
            const match = raw.match(/(?:last at|since)\\s+(\\d{1,2}:\\d{2}\\s*[AP]M)\\s+on\\s+(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/i);
            if (!match) return 'NONE';
            const timeText = String(match[1] || '').replace(/\\s+/g, ' ').trim().toUpperCase();
            const month = String(match[2] || '').padStart(2, '0');
            const day = String(match[3] || '').padStart(2, '0');
            const prefix = /clocked out|last at/i.test(raw) ? 'OUT' : 'IN';
            return prefix + ' @ ' + timeText + ', ' + month + '/' + day;
          }

          function setStatusText(statusText) {
            const statusEl = document.getElementById('status');
            if (!statusEl) return;
            statusEl.innerText = formatCompactStatusText(statusText);
          }

          function beginUiAction(actionKey) {
            const key = String(actionKey || '').trim();
            if (!key) return false;
            if (uiPendingActionsByKey[key]) return false;
            uiPendingActionsByKey[key] = Date.now();
            return true;
          }

          function endUiAction(actionKey) {
            const key = String(actionKey || '').trim();
            if (!key) return;
            delete uiPendingActionsByKey[key];
          }

          function setUiResultMessage(message, isError, timeoutMs) {
            const messageEl = document.getElementById('message');
            const errorEl = document.getElementById('error');
            const text = String(message || '').trim();
            if (!messageEl || !errorEl) return;
            if (!text) {
              messageEl.style.display = 'none';
              errorEl.style.display = 'none';
              return;
            }

            const targetEl = isError ? errorEl : messageEl;
            const otherEl = isError ? messageEl : errorEl;
            otherEl.style.display = 'none';
            targetEl.innerText = text;
            targetEl.style.display = 'block';

            if (timeoutMs && Number(timeoutMs) > 0) {
              const expectedText = text;
              setTimeout(() => {
                if (targetEl.innerText === expectedText) {
                  targetEl.style.display = 'none';
                }
              }, Number(timeoutMs));
            }
          }

          function getDefaultUiScalePercent() {
            const layoutInfo = getRecentLayoutDebugInfo();
            return layoutInfo.mobileLayout ? UI_SCALE_DEFAULT_MOBILE_PERCENT : UI_SCALE_DEFAULT_DESKTOP_PERCENT;
          }

          function clampUiScalePercent(value) {
            const numeric = Number(value);
            if (!isFinite(numeric)) return getDefaultUiScalePercent();
            return Math.min(UI_SCALE_MAX_PERCENT, Math.max(UI_SCALE_MIN_PERCENT, Math.round(numeric)));
          }

          function readStoredUiScalePercent() {
            try {
              const rawValue = window.localStorage.getItem(UI_SCALE_STORAGE_KEY);
              if (rawValue === null || rawValue === '') return null;
              const parsed = Number(rawValue);
              if (!isFinite(parsed)) return null;
              return clampUiScalePercent(parsed);
            } catch (e) {
              return null;
            }
          }

          function persistUiScalePercent(value) {
            try {
              window.localStorage.setItem(UI_SCALE_STORAGE_KEY, String(value));
            } catch (e) {
              // No-op when storage is unavailable.
            }
          }

          function applyPickerScalePercent(percent) {
            const ratio = Math.min(1.55, Math.max(1, percent / 100));
            const fontSizeRem = (1.02 * ratio).toFixed(3) + 'rem';
            const cellSizeRem = (2.1 * ratio).toFixed(3) + 'rem';
            const timeFontSizeRem = (1.08 * ratio).toFixed(3) + 'rem';
            document.documentElement.style.setProperty('--timecard-ui-scale-multiplier', ratio.toFixed(3));
            document.documentElement.style.setProperty('--timecard-picker-font-size', fontSizeRem);
            document.documentElement.style.setProperty('--timecard-picker-cell-size', cellSizeRem);
            document.documentElement.style.setProperty('--timecard-picker-time-font-size', timeFontSizeRem);

            // If pickers are mounted, redraw so open popups reflect current scale immediately.
            try {
              if (manualClockInPicker && typeof manualClockInPicker.redraw === 'function') manualClockInPicker.redraw();
              if (manualClockOutPicker && typeof manualClockOutPicker.redraw === 'function') manualClockOutPicker.redraw();
              if (adminEditClockInPicker && typeof adminEditClockInPicker.redraw === 'function') adminEditClockInPicker.redraw();
              if (adminEditClockOutPicker && typeof adminEditClockOutPicker.redraw === 'function') adminEditClockOutPicker.redraw();
            } catch (e) {
              // No-op when picker instance is unavailable.
            }
          }

          function applyUiScalePercent(value) {
            const percent = clampUiScalePercent(value);
            const computedFontSizePx = (UI_SCALE_BASE_FONT_SIZE_PX * percent / 100).toFixed(2);
            document.documentElement.style.fontSize = computedFontSizePx + 'px';
            applyPickerScalePercent(percent);
            const uiScaleValue = document.getElementById('uiScaleValue');
            if (uiScaleValue) {
              uiScaleValue.innerText = String(percent) + '%';
            }
            try {
              window.dispatchEvent(new CustomEvent('timecard-ui-scale-change', { detail: { percent: percent } }));
            } catch (e) {
              // No-op when CustomEvent is unavailable.
            }
            return percent;
          }

          function getClosestUiScalePreset(value) {
            let closest = UI_SCALE_PRESET_VALUES[0];
            let smallestDelta = Math.abs(closest - value);
            for (let i = 1; i < UI_SCALE_PRESET_VALUES.length; i++) {
              const candidate = UI_SCALE_PRESET_VALUES[i];
              const delta = Math.abs(candidate - value);
              if (delta < smallestDelta) {
                closest = candidate;
                smallestDelta = delta;
              }
            }
            return closest;
          }

          function setUiScalePercent(value, shouldPersist) {
            const percent = applyUiScalePercent(value);
            if (shouldPersist !== false) {
              persistUiScalePercent(percent);
            }
            return percent;
          }

          function stepUiScale(direction) {
            const current = readStoredUiScalePercent();
            const closest = getClosestUiScalePreset(current);
            const currentIndex = UI_SCALE_PRESET_VALUES.indexOf(closest);
            if (currentIndex < 0) return;
            const nextIndex = Math.min(UI_SCALE_PRESET_VALUES.length - 1, Math.max(0, currentIndex + (direction < 0 ? -1 : 1)));
            const percent = setUiScalePercent(UI_SCALE_PRESET_VALUES[nextIndex], true);
            debugClientLog('uiScale.step', { percent, direction });
          }

          function initializeUiScale() {
            const storedPercent = readStoredUiScalePercent();
            const basePercent = storedPercent === null ? getDefaultUiScalePercent() : storedPercent;
            const closestPreset = getClosestUiScalePreset(basePercent);
            const percent = setUiScalePercent(closestPreset, true);
            debugClientLog('uiScale.initialized', {
              percent,
              source: storedPercent === null ? 'device-default' : 'stored'
            });
          }

          function initializeUiScaleMenu() {
            const controls = document.getElementById('uiScaleControls');
            const archiveReviewBtn = document.getElementById('archiveReviewBtn');
            const menuBtn = document.getElementById('uiScaleMenuBtn');
            if (!controls || !menuBtn) return;
            controls.classList.add('is-hidden');
            if (archiveReviewBtn) {
              archiveReviewBtn.classList.add('is-hidden');
            }
            menuBtn.setAttribute('aria-expanded', 'false');
          }

          function toggleUiScaleControls() {
            const controls = document.getElementById('uiScaleControls');
            const archiveReviewBtn = document.getElementById('archiveReviewBtn');
            const menuBtn = document.getElementById('uiScaleMenuBtn');
            if (!controls || !menuBtn) return;
            const shouldShow = controls.classList.contains('is-hidden');
            controls.classList.toggle('is-hidden', !shouldShow);
            if (archiveReviewBtn) {
              archiveReviewBtn.classList.toggle('is-hidden', !shouldShow);
            }
            menuBtn.setAttribute('aria-expanded', shouldShow ? 'true' : 'false');
          }

          function updateClockNotePlaceholder() {
            const notesInput = document.getElementById('notes');
            if (!notesInput) return;
            const requirement = getClockNoteRequirement();
            notesInput.placeholder = isClockedIn ? 'Clock out note' : 'Clock in note';
            updateClockNoteRequirementUi(requirement);
          }

          function parseClockInMsFromStatusText(statusText) {
            const raw = String(statusText || '').trim();
            if (!raw) return NaN;
            const match = raw.match(/since\\s+(\\d{1,2}):(\\d{2})\\s*([AP]M)\\s+on\\s+(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/i);
            if (!match) return NaN;
            const hour12 = Number(match[1]);
            const minute = Number(match[2]);
            const meridiem = String(match[3] || '').toUpperCase();
            const month = Number(match[4]);
            const day = Number(match[5]);
            const year = Number(match[6]);
            if (!isFinite(hour12) || !isFinite(minute) || !isFinite(month) || !isFinite(day) || !isFinite(year)) return NaN;
            let hour24 = hour12 % 12;
            if (meridiem === 'PM') hour24 += 12;
            const parsed = new Date(year, month - 1, day, hour24, minute, 0, 0);
            const ms = parsed.getTime();
            return isNaN(ms) ? NaN : ms;
          }

          function buildRequiredNoteMessage(reasonPhrase) {
            const reason = String(reasonPhrase || '').trim();
            if (!reason) return 'A note is required before submitting this clock action.';
            return 'Note required: ' + reason + '. Please add a note to continue.';
          }

          function formatClockHelperTimeFromMs(ms) {
            if (!isFinite(ms)) return '';
            return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          }

          function getTodayPunchCount() {
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth();
            const todayDate = today.getDate();
            return (recentEntries || []).filter((entry) => {
              if (!entry || !entry.clockIn || entry.deleted) return false;
              const clockInDate = new Date(entry.clockIn);
              return clockInDate.getFullYear() === todayYear
                && clockInDate.getMonth() === todayMonth
                && clockInDate.getDate() === todayDate;
            }).length;
          }

          function getClockNoteRequirement() {
            if (isClockedIn) {
              const openEntry = getLatestOpenRecentEntry();
              let clockInMs = openEntry && openEntry.clockIn ? new Date(openEntry.clockIn).getTime() : NaN;
              if (!isFinite(clockInMs)) {
                clockInMs = parseClockInMsFromStatusText(latestStatusTextRaw);
              }
              const todayPunchCount = getTodayPunchCount();
              const isFirstPunchOfDay = todayPunchCount <= 1;
              if (isFinite(clockInMs)
                && (Date.now() - clockInMs) > CLOCK_OUT_NOTE_THRESHOLD_MS
                && isFirstPunchOfDay) {
                return {
                  required: true,
                  reason: 'clock-out-late-lunch',
                  placeholder: 'Clock out note',
                  message: buildRequiredNoteMessage('explain late lunch')
                };
              }
              return { required: false, reason: '', placeholder: 'Clock out note', message: '' };
            }

            const today = employeeSchedulePreview && employeeSchedulePreview.today ? employeeSchedulePreview.today : null;
            const segments = today && Array.isArray(today.segments) ? today.segments : [];
            const now = new Date();
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const nowMs = now.getTime();

            const activeBackupSegment = segments.find((segment) => {
              if (!segment || String(segment.status || '').toUpperCase() !== 'B') return false;
              const startHour = Number(segment.startHour);
              const endHour = Number(segment.endHourExclusive);
              if (!isFinite(startHour) || !isFinite(endHour)) return false;
              const startMs = dayStart + (startHour * 60 * 60 * 1000);
              const endMs = dayStart + (endHour * 60 * 60 * 1000);
              return nowMs >= startMs && nowMs < endMs;
            });

            if (activeBackupSegment) {
              return {
                required: true,
                reason: 'clock-in-backup',
                placeholder: 'Clock in note',
                message: buildRequiredNoteMessage('you are currently on Backup')
              };
            }

            let nearestOnDutyStartMs = NaN;
            segments.forEach((segment) => {
              if (!segment || String(segment.status || '').toUpperCase() !== 'O') return;
              const startHour = Number(segment.startHour);
              if (!isFinite(startHour)) return;
              const startMs = dayStart + (startHour * 60 * 60 * 1000);
              const deltaMs = Math.abs(nowMs - startMs);
              if (deltaMs > CLOCK_IN_SCHEDULE_NOTE_TOLERANCE_MS) return;
              if (!isFinite(nearestOnDutyStartMs) || deltaMs < Math.abs(nowMs - nearestOnDutyStartMs)) {
                nearestOnDutyStartMs = startMs;
              }
            });

            if (isFinite(nearestOnDutyStartMs)) {
              const scheduledTime = formatClockHelperTimeFromMs(nearestOnDutyStartMs);
              return {
                required: false,
                reason: 'clock-in-on-duty-window',
                placeholder: 'Clock in note',
                message: 'You are scheduled to clock in at ' + scheduledTime + '. Please clock in.'
              };
            }

            return {
              required: true,
              reason: 'clock-in-off-schedule',
              placeholder: 'Clock in note',
              message: buildRequiredNoteMessage('No schedule detected or late Clock in.')
            };
          }

          function updateClockNoteRequirementUi(requirement) {
            const notesInput = document.getElementById('notes');
            const clockToggleBtn = document.getElementById('clockToggle');
            const hintEl = document.getElementById('clockNoteHint');
            const noteText = notesInput ? String(notesInput.value || '').trim() : '';
            const mustHaveNote = requirement && requirement.required === true;
            const missingRequiredNote = mustHaveNote && !noteText;
            const helperMessage = requirement ? String(requirement.message || '').trim() : '';

            if (hintEl) {
              if (helperMessage) {
                hintEl.innerText = helperMessage;
                hintEl.style.display = 'block';
              } else {
                hintEl.innerText = '';
                hintEl.style.display = 'none';
              }
            }

            if (!clockToggleBtn) return;

            if (missingRequiredNote) {
              clockToggleBtn.disabled = true;
              clockToggleBtn.title = requirement.message || 'Note required before continuing.';
              return;
            }

            const shouldDisableForState = pendingClockAction || pendingRefreshStatus || !navigator.onLine;
            clockToggleBtn.disabled = shouldDisableForState;
            if (clockToggleBtn.title && clockToggleBtn.title.toLowerCase().indexOf('note required') >= 0) {
              clockToggleBtn.title = '';
            }
          }

          function setRefreshStatusBusy(isBusy) {
            const refreshBtn = document.getElementById('refreshStatusBtn');
            if (!refreshBtn) return;
            refreshBtn.disabled = isBusy;
            refreshBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
            refreshBtn.classList.toggle('is-spinning', isBusy);
          }

          function parseAdminDateFromLabel(dateLabel) {
            const match = String(dateLabel || '').match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
            if (!match) return null;
            const month = Number(match[1]);
            const day = Number(match[2]);
            const year = Number(match[3]);
            if (!month || !day || !year) return null;
            const parsed = new Date(year, month - 1, day);
            return isNaN(parsed.getTime()) ? null : parsed;
          }

          function buildDateOnlyDisablePredicate(minDateObj, maxDateObj) {
            if (!(minDateObj instanceof Date) || isNaN(minDateObj.getTime()) || !(maxDateObj instanceof Date) || isNaN(maxDateObj.getTime())) {
              return function() { return false; };
            }
            const min = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate()).getTime();
            const max = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate()).getTime();
            return function(dateObj) {
              if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return true;
              const dayMs = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
              return dayMs < min || dayMs > max;
            };
          }

          function getActivePayPeriodBounds() {
            const startDate = parseAdminDateFromLabel(activePayPeriodStartLabel);
            const endDate = parseAdminDateFromLabel(activePayPeriodEndLabel);
            if (!startDate || !endDate) return null;
            const startMs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0).getTime();
            const endMs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
            return { startMs: startMs, endMs: endMs };
          }

          function isInActivePayPeriod(isoValue) {
            const bounds = getActivePayPeriodBounds();
            if (!bounds) return true;
            if (!isoValue) return false;
            const d = new Date(isoValue);
            if (isNaN(d.getTime())) return false;
            const ms = d.getTime();
            return ms >= bounds.startMs && ms <= bounds.endMs;
          }

          function getRecentLayoutDebugInfo() {
            const userAgentDataMobile = !!(navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean' && navigator.userAgentData.mobile);
            const hasTouch = Number(navigator.maxTouchPoints || 0) > 0;
            const coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
            const noHover = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
            let source = 'fallback';
            let mobileLayout = false;

            if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
              mobileLayout = navigator.userAgentData.mobile;
              source = 'uaData.mobile';
            } else if (hasTouch && (coarsePointer || noHover)) {
              mobileLayout = true;
              source = 'touch+capability';
            }

            return {
              mobileLayout,
              source,
              userAgentDataMobile,
              hasTouch,
              coarsePointer,
              noHover
            };
          }

          function isCompactRecentLayout() {
            return getRecentLayoutDebugInfo().mobileLayout;
          }

          function applyRecentLayoutMode() {
            const layoutInfo = getRecentLayoutDebugInfo();
            const isMobileRecentLayout = layoutInfo.mobileLayout;
            document.body.classList.toggle('mobile-recent-layout', isMobileRecentLayout);
            const layoutDebug = document.getElementById('layoutDebug');
            if (layoutDebug) {
              // layoutDebug.innerText = 'Layout: ' + (isMobileRecentLayout ? 'mobile recent cards' : 'desktop recent table') + ' | source=' + layoutInfo.source + ' | uaDataMobile=' + (layoutInfo.userAgentDataMobile ? 'yes' : 'no') + ' | hasTouch=' + (layoutInfo.hasTouch ? 'yes' : 'no') + ' | coarse=' + (layoutInfo.coarsePointer ? 'yes' : 'no') + ' | noHover=' + (layoutInfo.noHover ? 'yes' : 'no');
            }
          }

          function debugClientLog(eventName, payload) {
            if (!clientDebugEnabled) return;
            try {
              console.log('[TimeCard][DEBUG] ' + eventName, payload || {});
            } catch (e) {
              // No-op for logging failures
            }
          }

          function debugClientError(eventName, payload) {
            if (!clientDebugEnabled) return;
            try {
              console.error('[TimeCard][DEBUG] ' + eventName, payload || {});
            } catch (e) {
              // No-op for logging failures
            }
          }

           // Initialize offline state
           function initializeOfflineDetection() {
             const updateOfflineBar = () => {
               const offlineBar = document.getElementById('offlineBar');
               const clockToggleBtn = document.getElementById('clockToggle');
               const manualEntryBtn = document.getElementById('manualEntryBtn');
               const archiveReviewBtn = document.getElementById('archiveReviewBtn');
               const refreshStatusBtn = document.getElementById('refreshStatusBtn');
               
               if (!navigator.onLine) {
                 offlineBar.style.display = 'block';
                 if (clockToggleBtn) clockToggleBtn.disabled = true;
                 manualEntryBtn.disabled = true;
                 if (archiveReviewBtn) archiveReviewBtn.disabled = true;
                 if (refreshStatusBtn) {
                   refreshStatusBtn.disabled = true;
                   refreshStatusBtn.classList.remove('is-spinning');
                   refreshStatusBtn.setAttribute('aria-busy', 'false');
                 }
               } else {
                 offlineBar.style.display = 'none';
                 if (clockToggleBtn) clockToggleBtn.disabled = pendingClockAction;
                 manualEntryBtn.disabled = false;
                 if (archiveReviewBtn) archiveReviewBtn.disabled = false;
                 if (refreshStatusBtn) {
                   refreshStatusBtn.disabled = pendingRefreshStatus;
                   refreshStatusBtn.classList.toggle('is-spinning', pendingRefreshStatus);
                   refreshStatusBtn.setAttribute('aria-busy', pendingRefreshStatus ? 'true' : 'false');
                 }
                 updateClockNotePlaceholder();
               }
             };
             
             window.addEventListener('online', updateOfflineBar);
             window.addEventListener('offline', updateOfflineBar);
              applyRecentLayoutMode();
             updateOfflineBar();
           }
          
          initializeOfflineDetection();
          initializeUiScaleMenu();
          initializeUiScale();
          setStatusText(document.getElementById('status') ? document.getElementById('status').innerText : '');
          updateClockNotePlaceholder();
          const notesInput = document.getElementById('notes');
          if (notesInput) {
            notesInput.addEventListener('input', updateClockNotePlaceholder);
          }
          renderEmployeeSchedulePreview();
          loadEmployeeSchedulePreview();
          refreshRecentEntries();

          function formatDisplayDate(value) {
            if (!value) return '';
            const date = new Date(value);
            if (isNaN(date.getTime())) return '';
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const y = date.getFullYear();
            const h = String(date.getHours()).padStart(2, '0');
            const mi = String(date.getMinutes()).padStart(2, '0');
            return m + '/' + d + '/' + y + ' ' + h + ':' + mi;
          }

          function formatDisplayTime(value) {
            if (!value) return '';
            const date = new Date(value);
            if (isNaN(date.getTime())) return '';
            let h = date.getHours();
            const mi = String(date.getMinutes()).padStart(2, '0');
            const suffix = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            if (h === 0) h = 12;
            return String(h).padStart(2, '0') + ':' + mi + ' ' + suffix;
          }

          function formatAdminPreviewEmail(email) {
            const emailText = String(email || '').trim();
            if (!emailText) return '';
            const atIndex = emailText.indexOf('@');
            return atIndex > 0 ? emailText.slice(0, atIndex) : emailText;
          }

          function normalizeEntryTypeClient(entryType) {
            const value = String(entryType || '').trim().toLowerCase();
            return value === 'vacation' || value === 'sick' ? value : 'worked';
          }

          function isVerifiedValue(value) {
            if (value === true || value === 1) return true;
            if (typeof value === 'string') {
              const normalized = value.trim().toLowerCase();
              return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1';
            }
            return false;
          }

          function mergeDayTone(currentTone, nextEntryType) {
            if (!currentTone) return nextEntryType;
            if (currentTone === nextEntryType) return currentTone;
            return 'mixed';
          }

          function getDayToneClass(dayTone) {
            if (dayTone === 'vacation') return 'day-tone-vacation';
            if (dayTone === 'sick') return 'day-tone-sick';
            if (dayTone === 'mixed') return 'day-tone-mixed';
            return 'day-tone-worked';
          }

          function getDayToneSuffix(dayTone) {
            if (dayTone === 'vacation') return ' - vacation';
            if (dayTone === 'sick') return ' - sick';
            return '';
          }

          function getEntryTypeMeta(entryType) {
            const normalized = normalizeEntryTypeClient(entryType);
            if (normalized === 'vacation') {
              return { value: normalized, label: 'Vacation', rowClass: 'entry-type-vacation-row', chipClass: 'entry-type-emoji entry-type-vacation', chipHtml: '<span class="entry-type-emoji entry-type-vacation" title="Vacation" aria-label="Vacation">🏖️</span>' };
            }
            if (normalized === 'sick') {
              return { value: normalized, label: 'Sick', rowClass: 'entry-type-sick-row', chipClass: 'entry-type-emoji entry-type-sick', chipHtml: '<span class="entry-type-emoji entry-type-sick" title="Sick" aria-label="Sick">🤒</span>' };
            }
            return { value: 'worked', label: 'Worked', rowClass: '', chipClass: '', chipHtml: '' };
          }

          function getEntryTypeChipHtml(entryType) {
            const meta = getEntryTypeMeta(entryType);
            return meta.chipHtml || '';
          }

          function getEntryTypeChipOrSpacerHtml(entryType) {
            const chipHtml = getEntryTypeChipHtml(entryType);
            return chipHtml || '<span class="entry-type-emoji entry-type-spacer" aria-hidden="true"></span>';
          }

          function getRecentEntryOutMarkerHtml(entryType) {
            return getEntryTypeChipHtml(entryType) || '<span class="recent-out-marker recent-out-marker-spacer" aria-hidden="true"></span>';
          }

          function applyAdminPreviewColumnWidths(rows) {
            const table = document.querySelector('#adminHtmlPreviewModal .admin-preview-grid');
            if (!table) return;

            const rowList = Array.isArray(rows) ? rows : [];
            const emailWidthCh = Math.max(7, rowList.reduce((max, row) => {
              const localPart = formatAdminPreviewEmail(row && row.email);
              return Math.max(max, localPart.length || 0);
            }, 0) + 1);

            let notesWidthCh = 34;
            rowList.forEach((row) => {
              const noteLength = String((row && row.notes) || '').trim().length;
              if (noteLength > 0) {
                notesWidthCh = Math.max(notesWidthCh, Math.min(70, noteLength * 0.9));
              }
            });

            table.style.setProperty('--admin-preview-email-width', emailWidthCh + 'ch');
            table.style.setProperty('--admin-preview-week-width', '2.35rem');
            table.style.setProperty('--admin-preview-additional-width', '2.65rem');
            table.style.setProperty('--admin-preview-total-width', '2.65rem');
            table.style.setProperty('--admin-preview-notes-width', notesWidthCh + 'ch');
            table.style.setProperty('--admin-preview-aws-width', '6.25rem');
          }

          function getHoursString(hoursValue) {
            const hoursNumber = typeof hoursValue === 'number' ? hoursValue : parseFloat(hoursValue);
            return isNaN(hoursNumber) ? '0.00' : hoursNumber.toFixed(2);
          }

          function getPayrollPreviewHoursString(hoursValue) {
            const hoursNumber = typeof hoursValue === 'number' ? hoursValue : parseFloat(hoursValue);
            if (isNaN(hoursNumber)) return '0.00';
            return hoursNumber === 0 ? '-' : hoursNumber.toFixed(2);
          }

          function resizeAdminPreviewNotes() {
            const tbody = document.getElementById('adminHtmlPreviewBody');
            if (!tbody) return;

            const textareas = tbody.querySelectorAll('.admin-preview-note-input');
            textareas.forEach((textarea) => {
              if (!textarea) return;
              textarea.style.height = 'auto';
              textarea.style.height = Math.max(textarea.scrollHeight, 22) + 'px';
            });
          }

          function renderEntriesTable(entries) {
            const tbody = document.getElementById('recentEntriesBody');
            const cards = document.getElementById('recentEntriesCards');
            if (!tbody && !cards) return;

            const displayEntries = Array.isArray(entries) ? entries.slice().reverse() : [];
            const emptyHtml = '<div class="recent-day-group"><div class="recent-card"><div class="recent-card-notes"><div class="admin-note-line admin-note-line-empty">No entries yet</div></div></div></div>';

            function formatRecentCardDayLabel(isoValue, totalHoursStr, dayTone) {
              const suffix = getDayToneSuffix(dayTone);
              const hasTotal = typeof totalHoursStr === 'string' && totalHoursStr.length > 0;
              if (!isoValue) return (hasTotal ? 'Unknown day · ' + totalHoursStr + ' Hrs' : 'Unknown day') + suffix;
              const d = new Date(isoValue);
              if (isNaN(d.getTime())) return (hasTotal ? 'Unknown day · ' + totalHoursStr + ' Hrs' : 'Unknown day') + suffix;
              const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const y = d.getFullYear();
              if (hasTotal) {
                return m + '-' + day + '-' + y + ' (' + weekday + ') · ' + totalHoursStr + ' Hrs' + suffix;
              }
              return m + '-' + day + '-' + y + ' (' + weekday + ')' + suffix;
            }

            if (displayEntries.length === 0) {
              if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No entries yet</td></tr>';
              if (cards) cards.innerHTML = emptyHtml;
              return;
            }

            const dayTotalsByKey = {};
            const dayToneByKey = {};
            displayEntries.forEach((entry) => {
              const daySource = entry.clockIn || entry.clockOut;
              const dayKey = getAdminDayKey(daySource);
              if (!dayKey) return;
              if (entry.deleted) return;
              const entryType = normalizeEntryTypeClient(entry.entryType);
              dayToneByKey[dayKey] = mergeDayTone(dayToneByKey[dayKey], entryType);
              if (entryType !== 'worked') return;
              const hours = Number(entry.hours || 0);
              dayTotalsByKey[dayKey] = (dayTotalsByKey[dayKey] || 0) + (isNaN(hours) ? 0 : hours);
            });

            renderEntriesTable._lastDayKey = '';

            const rows = displayEntries.map(entry => {
              const clockInStr = formatDisplayTime(entry.clockIn) || '--:--';
              const clockOutStr = formatDisplayTime(entry.clockOut) || '--:--';
              const daySource = entry.clockIn || entry.clockOut;
              const dayKey = getAdminDayKey(daySource);
              const hoursStr = getHoursString(entry.hours);
              const isDeleted = !!entry.deleted;
              const typeMeta = getEntryTypeMeta(entry.entryType);
              const noteLines = splitAdminNotes(entry.notes || '');
              const verifiedOn = isVerifiedValue(entry.verified);
              const verifiedTitle = verifiedOn ? 'Verified' : 'Unverified';
              const rowClasses = [];
              if (isDeleted) rowClasses.push('admin-deleted-row');
              if (!isDeleted && typeMeta.rowClass) rowClasses.push(typeMeta.rowClass);
              const rowClass = rowClasses.length ? ' class="' + rowClasses.join(' ') + '"' : '';
                const pendingComposer = isDeleted ? '' :
                  '<div class="admin-note-composer" id="pendingNoteComposer_' + entry.rowIndex + '" style="display:none;"' +
                  ' oninput="handlePendingNewNoteInput(' + entry.rowIndex + ')"' +
                  ' onkeydown="handlePendingNewNoteKeyDown(' + entry.rowIndex + ', event)">' +
                  '<textarea placeholder="Write a quick note..." spellcheck="false" maxlength="150"></textarea>' +
                '</div>';
              const pendingButton = isDeleted ? '' :
                '<button type="button" class="admin-note-add-btn admin-pending-composer-static"' +
                  'onclick="togglePendingComposer(' + entry.rowIndex + ')" title="Add note">+ Add Note</button>';
              const action = entry.deleted
                ? 'Deleted'
                : '<div class="admin-row-actions">' + pendingButton + '</div>' +
                  '';
              const verifiedIcon = '<span class="admin-verify-toggle static ' + (verifiedOn ? 'is-on' : '') + '" title="' + verifiedTitle + '" aria-label="' + verifiedTitle + '">' + (verifiedOn ? '&#10003;' : '&#9675;') + '</span>';
              const notesHtml = noteLines.length > 0
                ? noteLines.map((line) => '<div class="admin-note-line">' + escapeHtml(line) + '</div>').join('')
                : '<div class="admin-note-line admin-note-line-empty">No notes</div>';
              let dayHeaderHtml = '';
              if (dayKey && dayKey !== renderEntriesTable._lastDayKey) {
                const dayTone = dayToneByKey[dayKey] || 'worked';
                const dayLabel = formatAdminDayLabel(daySource, getHoursString(dayTotalsByKey[dayKey] || 0), dayTone);
                const dayToneClass = getDayToneClass(dayTone);
                dayHeaderHtml = '<tr class="admin-day-row recent-day-row ' + dayToneClass + '"><td colspan="4"><div class="admin-day-meta"><div class="admin-day-left"><div class="admin-day-label">' + escapeHtml(dayLabel) + '</div></div></div></td></tr>';
                renderEntriesTable._lastDayKey = dayKey;
              }
              return dayHeaderHtml + '<tr' + rowClass + '>' +
                '<td data-label="Time"><div class="recent-time-stack"><div class="admin-in-cell">' + verifiedIcon + '<button type="button" class="admin-time-pill admin-time-in static" tabindex="-1"><span class="admin-time-label">In</span><span class="admin-time-value">' + escapeHtml(clockInStr) + '</span></button></div><div class="recent-time-out-row">' + getRecentEntryOutMarkerHtml(entry.entryType) + '<button type="button" class="admin-time-pill admin-time-out static" tabindex="-1"><span class="admin-time-label">Out</span><span class="admin-time-value">' + escapeHtml(clockOutStr) + '</span></button></div></div></td>' +
                '<td data-label="Hours" class="admin-hours-cell"><span class="admin-hours-pill"><span class="admin-hours-pill-value">' + hoursStr + '</span><span class="admin-hours-pill-unit">Hrs</span></span></td>' +
                '<td data-label="Notes"><div class="admin-note-list" id="recentNotes_' + entry.rowIndex + '">' + notesHtml + pendingComposer + '</div></td>' +
                '<td data-label="Action">' + action + '</td>' +
                '</tr>';
            });

            const cardsHtml = [];
            renderEntriesTable._lastCardDayKey = '';
            let isCardDayGroupOpen = false;

            function closeCardDayGroup() {
              if (!isCardDayGroupOpen) return;
              cardsHtml.push('</div></section>');
              isCardDayGroupOpen = false;
            }

            displayEntries.forEach((entry) => {
              const clockInStr = formatDisplayTime(entry.clockIn) || '--:--';
              const clockOutStr = formatDisplayTime(entry.clockOut) || '--:--';
              const daySource = entry.clockIn || entry.clockOut;
              const dayKey = getAdminDayKey(daySource);
              const hoursStr = getHoursString(entry.hours);
              const isDeleted = !!entry.deleted;
              const typeMeta = getEntryTypeMeta(entry.entryType);
              const noteLines = splitAdminNotes(entry.notes || '');
              const rowClasses = [];
              if (isDeleted) rowClasses.push('admin-deleted-row');
              if (!isDeleted && typeMeta.rowClass) rowClasses.push(typeMeta.rowClass);
              const verifiedOn = isVerifiedValue(entry.verified);
              const verifiedTitle = verifiedOn ? 'Verified' : 'Unverified';
              const verifiedIcon = '<span class="admin-verify-toggle static ' + (verifiedOn ? 'is-on' : '') + '" title="' + verifiedTitle + '" aria-label="' + verifiedTitle + '">' + (verifiedOn ? '&#10003;' : '&#9675;') + '</span>';
              const pendingComposer = isDeleted ? '' :
                '<div class="admin-note-composer" id="pendingNoteComposer_' + entry.rowIndex + '_card" style="display:none;"' +
                ' oninput="handlePendingNewNoteInput(' + entry.rowIndex + ', &quot;card&quot;)"' +
                ' onkeydown="handlePendingNewNoteKeyDown(' + entry.rowIndex + ', event, &quot;card&quot;)">' +
                '<textarea placeholder="Write a quick note..." spellcheck="false" maxlength="150"></textarea></div>';
              const pendingButton = isDeleted ? '' :
                '<button type="button" class="admin-note-add-btn admin-pending-composer-static recent-card-add-note-btn" onclick="togglePendingComposer(' + entry.rowIndex + ', &quot;card&quot;)" title="Add note">+ Add Note</button>';
              const notesCardHtml = noteLines.length > 0
                ? noteLines.map((line) => '<div class="admin-note-line">' + escapeHtml(line) + '</div>').join('')
                : '<div class="admin-note-line admin-note-line-empty">No notes</div>';

              const shouldStartDayGroup = !isCardDayGroupOpen || dayKey !== renderEntriesTable._lastCardDayKey;
              if (shouldStartDayGroup) {
                closeCardDayGroup();
                const dayTotalStr = dayKey ? getHoursString(dayTotalsByKey[dayKey] || 0) : '';
                const dayTone = dayToneByKey[dayKey] || 'worked';
                const dayLabel = formatRecentCardDayLabel(daySource, dayTotalStr, dayTone);
                const dayToneClass = getDayToneClass(dayTone);
                cardsHtml.push(
                  '<section class="recent-day-group">' +
                    '<div class="recent-card-day ' + dayToneClass + '">' + escapeHtml(dayLabel) + '</div>' +
                    '<div class="recent-day-entries">'
                );
                isCardDayGroupOpen = true;
                renderEntriesTable._lastCardDayKey = dayKey;
              }

              const cardAccentClass = typeMeta.value === 'vacation'
                ? 'recent-card-accent-vacation'
                : (typeMeta.value === 'sick' ? 'recent-card-accent-sick' : 'recent-card-accent-worked');
              const cardClassNames = ['recent-card', cardAccentClass].concat(rowClasses).join(' ');
              const typeEmojiHtml = typeMeta.chipHtml || '';
              const notesFooterHtml = isDeleted
                ? '<div class="recent-card-note-footer"><span class="recent-card-deleted-text">Deleted</span></div>'
                : '<div class="recent-card-note-footer">' + pendingButton + '</div>';

              cardsHtml.push(
                '<article class="' + cardClassNames + '">' +
                  '<div class="recent-card-top">' +
                    '<div class="recent-card-top-left">' +
                      verifiedIcon +
                      typeEmojiHtml +
                      '<div class="recent-card-time-pills">' +
                        '<button type="button" class="admin-time-pill admin-time-in static" tabindex="-1"><span class="admin-time-value">' + escapeHtml(clockInStr) + '</span></button>' +
                        '<button type="button" class="admin-time-pill admin-time-out static" tabindex="-1"><span class="admin-time-value">' + escapeHtml(clockOutStr) + '</span></button>' +
                      '</div>' +
                    '</div>' +
                    '<div class="recent-card-hours"><span class="admin-hours-pill"><span class="admin-hours-pill-value">' + hoursStr + '</span><span class="admin-hours-pill-unit">Hrs</span></span></div>' +
                  '</div>' +
                  '<div class="recent-card-notes" id="recentNotes_' + entry.rowIndex + '_card">' + notesCardHtml + pendingComposer + notesFooterHtml + '</div>' +
                '</article>'
              );
            });

            closeCardDayGroup();

            if (tbody) tbody.innerHTML = rows.join('');
            if (cards) cards.innerHTML = cardsHtml.join('');
          }

          function refreshRecentEntries(onComplete) {
            const startedAt = Date.now();
            google.script.run
              .withSuccessHandler((entries) => {
                recentEntries = entries || [];
                recentEntriesLastUpdated = Date.now();
                renderEntriesTable(recentEntries);
                updateClockNotePlaceholder();
                if (isManualEntryModalVisible() && !adminManualEntryTargetEmail) {
                  refreshManualDateTimePickers(true);
                }
                debugClientLog('refreshRecentEntries.success', {
                  entriesCount: recentEntries.length,
                  targetFound: !!document.getElementById('recentEntriesBody'),
                  durationMs: Date.now() - startedAt
                });
                if (typeof onComplete === 'function') {
                  onComplete();
                }
              })
              .withFailureHandler((error) => {
                const errorEl = document.getElementById('error');
                debugClientError('refreshRecentEntries.failure', {
                  message: (error && error.message) ? error.message : 'Unknown error',
                  durationMs: Date.now() - startedAt
                });
                if (errorEl) {
                  errorEl.innerText = error.message || 'Unable to refresh entries.';
                  errorEl.style.display = 'block';
                }
                if (typeof onComplete === 'function') {
                  onComplete(error);
                }
              })
              .getRecentEntriesJson();
          }

          function entriesAreStale() {
            return Date.now() - recentEntriesLastUpdated > recentEntriesTtlMs;
          }

          function getLatestOpenRecentEntry() {
            const openEntries = (recentEntries || []).filter((entry) => entry && entry.clockIn && !entry.clockOut && !entry.deleted);
            if (!openEntries.length) return null;
            openEntries.sort((a, b) => {
              const aTs = a && a.clockIn ? new Date(a.clockIn).getTime() : 0;
              const bTs = b && b.clockIn ? new Date(b.clockIn).getTime() : 0;
              return bTs - aTs;
            });
            return openEntries[0] || null;
          }

          function getRecentEntryByRowIndex(rowIndex) {
            const rowNum = Number(rowIndex);
            return (recentEntries || []).find((entry) => Number(entry && entry.rowIndex) === rowNum) || null;
          }

           function submitClockToggle() {
             if (pendingClockAction || !beginUiAction('clock-toggle')) return;
             const clockToggleBtn = document.getElementById('clockToggle');
             if (!clockToggleBtn || clockToggleBtn.disabled) {
               endUiAction('clock-toggle');
               return;
             }
             const action = isClockedIn ? 'Clock Out' : 'Clock In';
             const notes = document.getElementById('notes').value || '';
             const noteRequirement = getClockNoteRequirement();
             if (noteRequirement.required && !String(notes).trim()) {
               endUiAction('clock-toggle');
               setUiResultMessage(noteRequirement.message, true, 4500);
               updateClockNotePlaceholder();
               return;
             }
             pendingClockAction = true;
             clockToggleBtn.disabled = true;
             clockToggleBtn.innerText = isClockedIn ? '⏳ Clock Out' : '⏳ Clock In';
             setUiResultMessage('Processing ' + action + '...', false);
             const openEntry = isClockedIn ? getLatestOpenRecentEntry() : null;
             const actionEntryId = openEntry && openEntry.entryId ? String(openEntry.entryId).trim() : '';
             if (isClockedIn && !actionEntryId) {
               pendingClockAction = false;
               endUiAction('clock-toggle');
               clockToggleBtn.disabled = false;
               clockToggleBtn.innerText = isClockedIn ? '🔴 Clock Out' : '🟢 Clock In';
               setUiResultMessage('Unable to clock out because the active entry ID is missing. Refresh and try again.', true, 4500);
               return;
             }
             const startedAt = Date.now();
             document.getElementById('loading').style.display = 'block';
             document.getElementById('error').style.display = 'none';
             google.script.run
               .withSuccessHandler((result) => {
                 document.getElementById('loading').style.display = 'none';
                 pendingClockAction = false;
                 endUiAction('clock-toggle');
                 isClockedIn = !!(result && result.isClockedIn);
                 updateClockNotePlaceholder();
                 if (clockToggleBtn) {
                   clockToggleBtn.innerText = isClockedIn ? '🔴 Clock Out' : '🟢 Clock In';
                   clockToggleBtn.disabled = false;
                 }
                 latestStatusTextRaw = String((result && result.status) || latestStatusTextRaw || '');
                 setStatusText((result && result.status) || document.getElementById('status').innerText);
                 document.getElementById('notes').value = '';
                 updateClockNotePlaceholder();
                 if (result && result.success) {
                   setUiResultMessage(result.message || (action + ' successful.'), false, 3000);
                   refreshRecentEntries();
                   loadEmployeeSchedulePreview();
                 } else if (result) {
                   setUiResultMessage(result.message || 'Action failed.', true, 4000);
                 }
               })
               .withFailureHandler((error) => {
                 document.getElementById('loading').style.display = 'none';
                 pendingClockAction = false;
                 endUiAction('clock-toggle');
                 if (clockToggleBtn) {
                   clockToggleBtn.innerText = isClockedIn ? '🔴 Clock Out' : '🟢 Clock In';
                   clockToggleBtn.disabled = false;
                 }
                 updateClockNotePlaceholder();
                 setUiResultMessage((error && error.message) || 'Unable to process request.', true, 4000);
               })
                 .submitClockAction(action, notes, actionEntryId);
           }

          function getPendingComposerId(rowIndex, view) {
            return view === 'card' ? 'pendingNoteComposer_' + rowIndex + '_card' : 'pendingNoteComposer_' + rowIndex;
          }

          function getRecentNotesIds(rowIndex) {
            return ['recentNotes_' + rowIndex, 'recentNotes_' + rowIndex + '_card'];
          }

          function handlePendingNewNoteInput(rowIndex, view) {
            const textarea = document.getElementById(getPendingComposerId(rowIndex, view))?.querySelector('textarea');
            if (!textarea) return;
            // Inline edit: user can continue typing new notes or close composer with Ctrl+Enter
          }
           
            function handlePendingNewNoteKeyDown(rowIndex, event, view) {
             const textarea = document.getElementById(getPendingComposerId(rowIndex, view))?.querySelector('textarea');
             if (!event || !textarea || textarea.value === '') return;
             if (event.key === 'Enter' && !event.ctrlKey) {
               event.preventDefault();
               savePendingNote(rowIndex, view);
             }
           }
           
           function togglePendingComposer(rowIndex, view) {
            const composer = document.getElementById(getPendingComposerId(rowIndex, view));
            if (!composer) return;
            const textarea = composer.querySelector('textarea');
            const hasText = !!(textarea && String(textarea.value || '').trim());
            if (composer.style.display === 'block') {
              if (hasText) {
                savePendingNote(rowIndex, view);
                return;
              }
              composer.style.display = 'none';
              textarea?.blur();
              composer.onmouseleave = null;
              composer.onfocusin = null;
              return;
            }
            composer.style.display = 'block';
            setTimeout(() => textarea?.focus(), 50);
            composer.onmouseleave = () => {
              setTimeout(() => textarea?.focus(), 50);
            };
            composer.onfocusout = () => {
              setTimeout(() => textarea?.focus(), 50);
            };
          }
           
           function savePendingNote(rowIndex, view) {
            const textarea = document.getElementById(getPendingComposerId(rowIndex, view))?.querySelector('textarea');
            if (!textarea || textarea.value === '') return;
            const nextNote = textarea.value.trim();
            const entry = getRecentEntryByRowIndex(rowIndex);
            const entryId = entry && entry.entryId ? String(entry.entryId).trim() : '';
            if (!entryId) {
              setUiResultMessage('Unable to save note because entry ID is missing. Refresh and try again.', true, 4500);
              return;
            }
            const noteEls = getRecentNotesIds(rowIndex).map((id) => document.getElementById(id)).filter(Boolean);
              const composerEl = document.getElementById(getPendingComposerId(rowIndex, view));
            const statusEl = document.getElementById('status');
            const originalStatus = statusEl ? statusEl.innerText : '';
            const previousNoteHtmlById = noteEls.map((noteEl) => ({ noteEl, html: noteEl.innerHTML }));
              const previousComposerDisplay = composerEl ? composerEl.style.display : '';
            appendPendingNoteToRecentEntry(rowIndex, nextNote);
            if (statusEl) {
              statusEl.innerText = 'Saving note to row ' + rowIndex + '...';
            }
            google.script.run
              .withSuccessHandler((result) => {
                if (result && result.success) {
                    if (statusEl) {
                      statusEl.innerText = 'Saved note to row ' + rowIndex + '.';
                      setTimeout(() => {
                        if (statusEl.innerText === 'Saved note to row ' + rowIndex + '.') {
                          statusEl.innerText = originalStatus;
                        }
                      }, 1500);
                    }
                } else if (result?.message) {
                  if (previousNoteHtmlById.length) {
                    previousNoteHtmlById.forEach(({ noteEl, html }) => { noteEl.innerHTML = html; });
                  }
                  if (composerEl) {
                    composerEl.style.display = previousComposerDisplay || 'block';
                  }
                  textarea.value = nextNote;
                  if (statusEl) {
                    statusEl.innerText = originalStatus;
                  }
                  debugClientError('savePendingNote.failure', { message: result.message });
                }
              })
              .withFailureHandler((error) => {
                if (previousNoteHtmlById.length) {
                  previousNoteHtmlById.forEach(({ noteEl, html }) => { noteEl.innerHTML = html; });
                }
                if (composerEl) {
                  composerEl.style.display = previousComposerDisplay || 'block';
                }
                textarea.value = nextNote;
                if (statusEl) {
                  statusEl.innerText = originalStatus;
                }
                debugClientError('savePendingNote.network_failure', error);
              })
                .updateEntryNote(entryId, nextNote, true);
            // Composer stays visible when user types new notes so they can continue typing or close it
          }

            function appendPendingNoteToRecentEntry(rowIndex, noteText) {
              const noteEls = getRecentNotesIds(rowIndex).map((id) => document.getElementById(id)).filter(Boolean);
              if (!noteEls.length) return;
              const noteValue = String(noteText || '').trim();
              if (!noteValue) return;

              noteEls.forEach((noteEl) => {
                const emptyNote = noteEl.querySelector('.admin-note-line-empty');
                if (emptyNote) {
                  emptyNote.remove();
                }
                const noteLine = document.createElement('div');
                noteLine.className = 'admin-note-line';
                noteLine.textContent = noteValue;
                const composer = noteEl.querySelector('.admin-note-composer');
                if (composer) {
                  noteEl.insertBefore(noteLine, composer);
                  const textarea = composer.querySelector('textarea');
                  if (textarea) {
                    textarea.value = '';
                    textarea.style.height = '';
                  }
                  composer.style.display = 'none';
                } else {
                  noteEl.appendChild(noteLine);
                }
              });
            }
           
           function inlineEditEntryNote(rowIndex) {
            const nextNote = prompt('Enter note for this entry:');
            if (nextNote === null || nextNote.trim() === '') return;
              const entry = getRecentEntryByRowIndex(rowIndex);
              const entryId = entry && entry.entryId ? String(entry.entryId).trim() : '';
              if (!entryId) {
                setUiResultMessage('Unable to save note because entry ID is missing. Refresh and try again.', true, 4500);
                return;
              }
            google.script.run
              .withSuccessHandler((result) => {
                if (result && result.success) {
                  refreshRecentEntries();
                  // Composer stays visible with new notes, user can continue typing or close composer
                } else if (result?.message) {
                  debugClientError('inlineEditEntryNote.failure', { message: result.message });
                }
              })
              .withFailureHandler((error) => {
                debugClientError('inlineEditEntryNote.network_failure', error);
              })
                .updateEntryNote(entryId, nextNote.trim());
          }

          function showAdminView() {
            if (adminPermissions.canAccessAdminView !== true) {
              alert('Admin access required.');
              return;
            }
            document.getElementById('adminViewModal').style.display = 'flex';
            const periodToggle = document.getElementById('adminShowOnlyActivePayPeriod');
            adminShowOnlyActivePayPeriod = !(periodToggle && periodToggle.checked === false);
            loadAdminEntries();
          }

          function hideAdminView() {
            document.getElementById('adminViewModal').style.display = 'none';
          }

          function formatAdminDateForInput(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return y + '-' + m + '-' + day + 'T' + h + ':' + mi;
          }

          function escapeHtml(value) {
            const text = String(value || '');
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          }

          function toAdminIso(inputValue) {
            if (!inputValue) return '';
            const d = new Date(inputValue);
            if (isNaN(d.getTime())) return '';
            return d.toISOString();
          }

          function sameMinute(aIso, bIso) {
            if (!aIso || !bIso) return false;
            const a = new Date(aIso);
            const b = new Date(bIso);
            if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
            return Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);
          }

          function normalizeModifiedAgainstRaw(candidateIso, rawIso) {
            if (!candidateIso) return '';
            if (!rawIso) return candidateIso;
            return sameMinute(candidateIso, rawIso) ? '' : candidateIso;
          }

          function getAdminEffectiveFromDraft(rowIndex) {
            const entry = adminEntriesByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            if (!entry || !draft) return { clockIn: '', clockOut: '' };
            return {
              clockIn: draft.modifiedClockInISO || entry.rawClockIn || '',
              clockOut: draft.modifiedClockOutISO || entry.rawClockOut || ''
            };
          }

          function isAdminRowEditable(rowIndex) {
            const effective = getAdminEffectiveFromDraft(rowIndex);
            return isInActivePayPeriod(effective.clockIn);
          }

          function validateAdminLocalConflicts(rowIndex, proposedClockInIso, proposedClockOutIso, proposedDeleted) {
            if (proposedDeleted) {
              return { valid: true };
            }

            const currentEntry = adminEntriesByRow[rowIndex];
            if (!currentEntry) {
              return { valid: false, message: 'Row not found.' };
            }

            const proposedClockIn = proposedClockInIso ? new Date(proposedClockInIso) : null;
            const proposedClockOut = proposedClockOutIso ? new Date(proposedClockOutIso) : null;

            if (!(proposedClockIn instanceof Date) || isNaN(proposedClockIn.getTime())) {
              return { valid: false, message: 'Clock-in is required and must be valid.' };
            }

            if (proposedClockOut && (isNaN(proposedClockOut.getTime()) || proposedClockOut <= proposedClockIn)) {
              return { valid: false, message: 'Clock-out must be after clock-in.' };
            }

            const targetEmail = String(currentEntry.email || '').toLowerCase();
            const allRowIndices = Object.keys(adminEntriesByRow).map((v) => Number(v));

            for (let i = 0; i < allRowIndices.length; i++) {
              const otherRowIndex = allRowIndices[i];
              if (otherRowIndex === rowIndex) continue;

              const otherEntry = adminEntriesByRow[otherRowIndex];
              const otherDraft = adminDraftByRow[otherRowIndex] || {};
              if (!otherEntry) continue;
              if (String(otherEntry.email || '').toLowerCase() !== targetEmail) continue;

              const otherDeleted = otherDraft.deleted === true || otherEntry.deleted === true;
              if (otherDeleted) continue;

              const otherInIso = otherDraft.modifiedClockInISO || otherEntry.rawClockIn || '';
              const otherOutIso = otherDraft.modifiedClockOutISO || otherEntry.rawClockOut || '';
              const otherIn = otherInIso ? new Date(otherInIso) : null;
              const otherOut = otherOutIso ? new Date(otherOutIso) : null;

              if (!(otherIn instanceof Date) || isNaN(otherIn.getTime())) continue;

              if (!proposedClockOut) {
                if (!(otherOut instanceof Date) || isNaN(otherOut.getTime())) {
                  return { valid: false, message: 'Another open entry already exists for this employee.' };
                }
                if (proposedClockIn >= otherIn && proposedClockIn < otherOut) {
                  return { valid: false, message: 'Open entry overlaps an existing time range.' };
                }
                continue;
              }

              if (!(otherOut instanceof Date) || isNaN(otherOut.getTime())) {
                if (otherIn >= proposedClockIn && otherIn < proposedClockOut) {
                  return { valid: false, message: 'Updated range overlaps an existing open entry.' };
                }
                continue;
              }

              const overlaps = proposedClockIn < otherOut && proposedClockOut > otherIn;
              if (overlaps) {
                return { valid: false, message: 'Updated range overlaps another entry for this employee.' };
              }
            }

            return { valid: true };
          }

          function computeAdminRowDirty(rowIndex) {
            const baseline = adminBaselineByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            if (!baseline || !draft) return false;
            return baseline.modifiedClockInISO !== draft.modifiedClockInISO ||
              baseline.modifiedClockOutISO !== draft.modifiedClockOutISO ||
              baseline.deleted !== draft.deleted ||
              String(draft.pendingNewNoteText || '').trim().length > 0;
          }

          function splitAdminNotes(notes) {
            return String(notes || '')
              .split(';')
              .map((part) => part.trim())
              .filter((part) => part.length > 0);
          }

          function composeAdminNotesForSave(rowIndex) {
            const draft = adminDraftByRow[rowIndex];
            if (!draft) return '';
            const baseNotes = String(draft.notes || '').trim();
            const pending = String(draft.pendingNewNoteText || '').trim();
            if (!pending) return baseNotes;
            return baseNotes ? baseNotes + '; ' + pending : pending;
          }

          function formatAdminAuditTimestamp(dateObj) {
            const d = dateObj instanceof Date ? dateObj : new Date();
            const h = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const y = d.getFullYear();
            return h + ':' + mi + ' ' + m + '/' + day + '/' + y;
          }

          function buildAdminTimeEditedNote() {
            const actorLocalPart = String(currentUserEmail || '').split('@')[0] || 'unknown';
            return 'Time edited by ' + actorLocalPart + ' at ' + formatAdminAuditTimestamp(new Date());
          }

          function toggleAdminNewNoteComposer(rowIndex) {
            const composer = document.getElementById('adminNoteComposer_' + rowIndex);
            const textarea = document.getElementById('adminNewNote_' + rowIndex);
            if (!composer || !textarea) return;
            const hasText = String(textarea.value || '').trim().length > 0;
            if (composer.style.display === 'block') {
              if (hasText) {
                saveAdminRow(rowIndex);
                return;
              }
              composer.style.display = 'none';
              textarea.blur();
              return;
            }
            composer.style.display = 'block';
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }

          function handleAdminNewNoteInput(rowIndex) {
            const textarea = document.getElementById('adminNewNote_' + rowIndex);
            if (!textarea || !adminDraftByRow[rowIndex]) return;
            adminDraftByRow[rowIndex].pendingNewNoteText = textarea.value;
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 36) + 'px';
          }

          function handleAdminNewNoteKeyDown(rowIndex, event) {
            if (!event || event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            saveAdminRow(rowIndex);
          }

          function formatAdminDayLabel(isoValue, totalHoursStr, dayTone) {
            const suffix = getDayToneSuffix(dayTone);
            const hasTotal = typeof totalHoursStr === 'string' && totalHoursStr.length > 0;
            if (!isoValue) return (hasTotal ? 'Unknown day (- ' + totalHoursStr + 'Hrs)' : 'Unknown day') + suffix;
            const d = new Date(isoValue);
            if (isNaN(d.getTime())) return (hasTotal ? 'Unknown day (- ' + totalHoursStr + 'Hrs)' : 'Unknown day') + suffix;
            const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const y = d.getFullYear();
            if (hasTotal) {
              return m + '-' + day + '-' + y + ' (' + weekday + ' - ' + totalHoursStr + 'Hrs)' + suffix;
            }
            return m + '-' + day + '-' + y + ' (' + weekday + ')' + suffix;
          }

          function getAdminDayKey(isoValue) {
            if (!isoValue) return '';
            const d = new Date(isoValue);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + day;
          }

          function getAdminHoursForDisplay(effectiveClockInIso, effectiveClockOutIso, fallbackHours) {
            const inDate = effectiveClockInIso ? new Date(effectiveClockInIso) : null;
            const outDate = effectiveClockOutIso ? new Date(effectiveClockOutIso) : null;

            const hasValidIn = inDate instanceof Date && !isNaN(inDate.getTime());
            const hasValidOut = outDate instanceof Date && !isNaN(outDate.getTime());

            if (hasValidIn && hasValidOut) {
              const diffMs = outDate.getTime() - inDate.getTime();
              if (diffMs > 0) {
                return diffMs / (1000 * 60 * 60);
              }
              return 0;
            }

            if (hasValidIn && !hasValidOut) {
              return 0;
            }

            const fallback = Number(fallbackHours || 0);
            return isFinite(fallback) ? fallback : 0;
          }

          function setAdminPreviewWorkflowState(previewReady, message) {
            adminPreviewReady = previewReady === true;
            const exportBtn = document.getElementById('adminWorkflowExportBtn');
            const msg = document.getElementById('adminWorkflowMsg');
            if (exportBtn) {
              exportBtn.disabled = !adminPreviewReady;
            }
            if (msg && message) {
              msg.innerText = message;
            }
          }

          function formatDateIsoForInput(dateObj) {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
            return String(dateObj.getFullYear()) + '-' +
              String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
              String(dateObj.getDate()).padStart(2, '0');
          }

          function parseIsoDateLocal(isoDate) {
            const parts = String(isoDate || '').split('-');
            if (parts.length !== 3) return null;
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (isNaN(d.getTime())) return null;
            d.setHours(0, 0, 0, 0);
            return d;
          }

          function getSafeElementKey(value) {
            return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
          }

          function openMoreReportsModal() {
            if (adminPermissions.canAccessAdminView !== true) {
              const msg = document.getElementById('adminLoadMsg');
              if (msg) msg.innerText = 'Admin view permission required.';
              return;
            }
            const modal = document.getElementById('moreReportsModal');
            const frame = document.getElementById('moreReportsFrame');
            const msg = document.getElementById('adminLoadMsg');
            if (msg) msg.innerText = 'Loading Create Report...';
            google.script.run
              .withSuccessHandler((html) => {
                if (!frame || !modal) {
                  if (msg) msg.innerText = 'Create Report modal unavailable.';
                  return;
                }
                frame.srcdoc = buildMoreReportsFrameHtml(html || '');
                modal.style.display = 'flex';
                if (msg) msg.innerText = 'Create Report loaded.';
              })
              .withFailureHandler((error) => {
                const message = (error && error.message) ? error.message : 'Unable to load Create Report.';
                if (msg) msg.innerText = message;
                alert(message);
              })
              .getCreateReportDialogHtml();
          }

          function closeMoreReportsModal() {
            const modal = document.getElementById('moreReportsModal');
            const frame = document.getElementById('moreReportsFrame');
            if (frame) {
              frame.srcdoc = '';
            }
            if (modal) {
              modal.style.display = 'none';
            }
          }

          function openScheduleToolModal() {
            if (adminPermissions.canPayroll !== true || adminPermissions.canEdit !== true) {
              const msg = document.getElementById('adminLoadMsg');
              if (msg) msg.innerText = 'Payroll and edit permissions are required.';
              return;
            }
            const modal = document.getElementById('scheduleToolModal');
            const frame = document.getElementById('scheduleToolFrame');
            const msg = document.getElementById('adminLoadMsg');
            if (msg) msg.innerText = 'Loading Schedule Tool...';
            google.script.run
              .withSuccessHandler((html) => {
                if (!frame || !modal) {
                  if (msg) msg.innerText = 'Schedule Tool modal unavailable.';
                  return;
                }
                frame.srcdoc = buildScheduleToolFrameHtml(html || '');
                modal.style.display = 'flex';
                if (msg) msg.innerText = 'Schedule Tool loaded.';
              })
              .withFailureHandler((error) => {
                const message = (error && error.message) ? error.message : 'Unable to load Schedule Tool.';
                if (msg) msg.innerText = message;
                alert(message);
              })
              .getScheduleToolDialogHtml();
          }

          function closeScheduleToolModal() {
            const modal = document.getElementById('scheduleToolModal');
            const frame = document.getElementById('scheduleToolFrame');
            if (frame) {
              frame.srcdoc = '';
            }
            if (modal) {
              modal.style.display = 'none';
            }
          }

          function buildScheduleToolFrameHtml(rawHtml) {
            const html = String(rawHtml || '');
            const scriptOpen = '<scr' + 'ipt>';
            const scriptClose = '</scr' + 'ipt>';
            const bridgeScript = scriptOpen + '(function(){' +
              'var p=window.parent;' +
              'window.google=window.google||{};' +
              'window.google.script=window.google.script||{};' +
              'if(p&&p.google&&p.google.script&&p.google.script.run){window.google.script.run=p.google.script.run;}' +
              'window.google.script.host={close:function(){if(p&&typeof p.closeScheduleToolModal==="function"){p.closeScheduleToolModal();}}};' +
              '})();' + scriptClose;
            if (html.indexOf('<body>') > -1) {
              return html.replace('<body>', '<body>' + bridgeScript);
            }
            return bridgeScript + html;
          }

          function buildMoreReportsFrameHtml(rawHtml) {
            const html = String(rawHtml || '');
            const scriptOpen = '<scr' + 'ipt>';
            const scriptClose = '</scr' + 'ipt>';
            const bridgeScript = scriptOpen + '(function(){' +
              'var p=window.parent;' +
              'window.google=window.google||{};' +
              'window.google.script=window.google.script||{};' +
              'if(p&&p.google&&p.google.script&&p.google.script.run){window.google.script.run=p.google.script.run;}' +
              'window.google.script.host={close:function(){if(p&&typeof p.closeMoreReportsModal==="function"){p.closeMoreReportsModal();}}};' +
              'function applyParentUiScale(){' +
                'try{' +
                  'if(!p||!p.document||!document.documentElement)return;' +
                  'var root=p.document.documentElement;' +
                  'var computed=p.getComputedStyle?p.getComputedStyle(root):null;' +
                  'var rootFontPx=computed?parseFloat(computed.fontSize):NaN;' +
                  'if(!isFinite(rootFontPx)||rootFontPx<=0){rootFontPx=' + String(UI_SCALE_BASE_FONT_SIZE_PX) + ';}' +
                  'var scale=Math.max(0.5,Math.min(3,rootFontPx/' + String(UI_SCALE_BASE_FONT_SIZE_PX) + '));' +
                  'document.documentElement.style.zoom=String(scale);' +
                  'document.documentElement.style.transformOrigin="top left";' +
                '}catch(_e){}' +
              '}' +
              'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",applyParentUiScale);}else{applyParentUiScale();}' +
              'if(p&&p.addEventListener){p.addEventListener("timecard-ui-scale-change",applyParentUiScale);}' +
              '})();' + scriptClose;
            if (html.indexOf('<body>') > -1) {
              return html.replace('<body>', '<body>' + bridgeScript);
            }
            return bridgeScript + html;
          }

          function openAdminHtmlPreviewModal() {
            if (adminPermissions.canPayroll !== true) {
              setAdminHtmlPreviewMessage('Payroll permission required.');
              return;
            }
            const modal = document.getElementById('adminHtmlPreviewModal');
            const startDate = parseAdminDateFromLabel(activePayPeriodStartLabel) || new Date();
            const startIso = formatDateIsoForInput(startDate);
            adminHtmlPreviewLastResult = null;
            adminHtmlPreviewStartIso = startIso;
            adminHtmlPreviewNotesByEmail = {};
            updateAdminHtmlPreviewEndDate();
            loadAdminHtmlPreviewAWSConfig();
            setAdminHtmlPreviewTableTitle('', '');
            setAdminHtmlPreviewMessage('Set AWS options, then click Generate.');
            updateAdminHtmlExportButtonState();
            updateAdminHtmlHolidayControls();
            // Disable the generate button while loading AWS config
            const generateBtn = document.getElementById('adminHtmlGenerateBtn');
            if (generateBtn) generateBtn.disabled = true;
            if (modal) modal.style.display = 'flex';
          }

          function closeAdminHtmlPreviewModal() {
            const modal = document.getElementById('adminHtmlPreviewModal');
            if (modal) modal.style.display = 'none';
            closeAdminHtmlHolidayModal();
          }

          function updateAdminHtmlPreviewEndDate() {
            const periodInfoEl = document.getElementById('adminHtmlPreviewPeriodInfo');
            const startDate = parseIsoDateLocal(adminHtmlPreviewStartIso || '');
            if (!startDate) {
              if (periodInfoEl) periodInfoEl.innerText = 'Active pay period: --';
              return;
            }
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 13);
            const startKey = formatDateIsoForInput(startDate);
            const endKey = formatDateIsoForInput(endDate);
            if (periodInfoEl) {
              periodInfoEl.innerText = 'Active pay period: ' + startKey + ' to ' + endKey;
            }
          }

          function setAdminHtmlPreviewMessage(message) {
            const el = document.getElementById('adminHtmlPreviewMsg');
            if (el) {
              el.innerText = message || '';
            }
          }

          function getAdminHtmlUnverifiedEntryCount() {
            if (!adminHtmlPreviewLastResult || !adminHtmlPreviewLastResult.payload) return 0;
            const summary = adminHtmlPreviewLastResult.payload.unverifiedSummary;
            const count = summary && typeof summary.count === 'number' ? Number(summary.count) : 0;
            return isFinite(count) && count > 0 ? count : 0;
          }

          function updateAdminHtmlExportButtonState(forceDisabledReason) {
            const exportBtn = document.getElementById('adminHtmlExportBtn');
            if (!exportBtn) return;

            if (typeof forceDisabledReason === 'string' && forceDisabledReason) {
              exportBtn.disabled = true;
              exportBtn.title = forceDisabledReason;
              return;
            }

            if (adminPermissions.canExport !== true) {
              exportBtn.disabled = true;
              exportBtn.title = 'Export permission required.';
              return;
            }

            if (!adminHtmlPreviewLastResult) {
              exportBtn.disabled = true;
              exportBtn.title = 'Generate report first.';
              return;
            }

            const unverifiedCount = getAdminHtmlUnverifiedEntryCount();
            if (unverifiedCount > 0) {
              exportBtn.disabled = true;
              exportBtn.title = 'Export disabled: ' + unverifiedCount + ' unverified entr' + (unverifiedCount === 1 ? 'y' : 'ies') + '. Verify all entries to export.';
              return;
            }

            exportBtn.disabled = false;
            exportBtn.title = 'Export report';
          }

          function showExportCompleteWithCountdown(result) {
            let msg = 'Export completed for ' + (result.startDateStr || 'selected period') + ' to ' + (result.endDateStr || '') + '.';
            if (result && result.archivedCount > 0) {
              msg += ' Archived ' + result.archivedCount + ' entries.';
            } else if (result && result.archiveMessage) {
              msg += ' ' + result.archiveMessage;
            }
            
            // Show the message with countdown
            setAdminHtmlPreviewMessage(msg);
            
            // Start 5-second countdown
            let count = 5;
            const countdownInterval = setInterval(() => {
              count--;
              if (count >= 0) {
                setAdminHtmlPreviewMessage(msg + ' (closing in ' + count + ' seconds)');
              }
              
              if (count <= 0) {
                clearInterval(countdownInterval);
                // close payroll report modal then load the admin view pane (no reload, no history nav)
                closeAdminHtmlPreviewModal();
                if (result && result.nextStartDateStr && result.nextEndDateStr) {
                  activePayPeriodStartLabel = result.nextStartDateStr;
                  activePayPeriodEndLabel = result.nextEndDateStr;
                  const sub = document.querySelector('#adminViewModal .admin-title-sub');
                  if (sub) sub.innerText = '(Active pay period: ' + result.nextStartDateStr + ' to ' + result.nextEndDateStr + ')';
                }
                // server advanced active period + may have archived; client active bounds are stale baked-in strings.
                // force the "active only" filter off or render will drop every row and look blank.
                const ap = document.getElementById('adminShowOnlyActivePayPeriod');
                if (ap) ap.checked = false;
                adminShowOnlyActivePayPeriod = false;
                showAdminView(); // reveals admin modal + reloads entries using updated pay-period labels
              }
            }, 1000);
          }

          function loadAdminHtmlPreviewAWSConfig() {
            if (adminPermissions.canPayroll !== true) {
              adminHtmlPreviewAwsConfig = {};
              adminHtmlPreviewAwsDraftConfig = {};
              renderAdminHtmlPreviewAWSConfig();
              updateAdminHtmlAwsSummary();
              const generateBtn = document.getElementById('adminHtmlGenerateBtn');
              if (generateBtn) {
                generateBtn.disabled = !(adminPermissions.canPayroll === true);
              }
              return;
            }
            const container = document.getElementById('adminHtmlAwsSettingsList');
            if (container) {
              container.innerHTML = '<div style="text-align:center; color:#999;">Loading employees...</div>';
            }
            google.script.run
              .withSuccessHandler((config) => {
                adminHtmlPreviewAwsConfig = config || {};
                adminHtmlPreviewAwsDraftConfig = JSON.parse(JSON.stringify(adminHtmlPreviewAwsConfig || {}));
                renderAdminHtmlPreviewAWSConfig();
                updateAdminHtmlAwsSummary();
                // Re-enable the generate button once AWS list is loaded
                const generateBtn = document.getElementById('adminHtmlGenerateBtn');
                if (generateBtn) generateBtn.disabled = !(adminPermissions.canPayroll === true);
              })
              .withFailureHandler((error) => {
                if (container) {
                  container.innerHTML = '<div style="color:#d32f2f;">Failed to load AWS config: ' + escapeHtml((error && error.message) ? error.message : 'Unknown error') + '</div>';
                }
                // Re-enable the generate button even on failure
                const generateBtn = document.getElementById('adminHtmlGenerateBtn');
                if (generateBtn) generateBtn.disabled = !(adminPermissions.canPayroll === true);
              })
              .fetchAWSConfigForDialog();
          }

          function renderAdminHtmlPreviewAWSConfig() {
            const container = document.getElementById('adminHtmlAwsSettingsList');
            if (!container) return;
            const emails = Object.keys(adminHtmlPreviewAwsDraftConfig || {}).sort();
            if (emails.length === 0) {
              container.innerHTML = '<div style="color:#999;">No employees found.</div>';
              return;
            }

            const chunks = [];
            emails.forEach((email) => {
              const entry = adminHtmlPreviewAwsDraftConfig[email] || {};
              const safeKey = getSafeElementKey(email);
              const checked = entry.enabled ? 'checked' : '';
              const effectiveDate = entry.effectiveDate || '';
              chunks.push(
                '<div class="admin-aws-row">' +
                  '<label class="admin-switch" for="adminHtmlAws_' + safeKey + '">' +
                    '<input type="checkbox" id="adminHtmlAws_' + safeKey + '" ' + checked + '>' +
                    '<span class="admin-switch-track"></span>' +
                    '<span class="admin-switch-label">' + escapeHtml(email) + '</span>' +
                  '</label>' +
                  '<input type="date" id="adminHtmlAwsDate_' + safeKey + '" value="' + escapeHtml(effectiveDate) + '">' +
                '</div>'
              );
            });
            container.innerHTML = chunks.join('');
          }

          function updateAdminHtmlAwsSummary() {
            const summaryBtn = document.getElementById('adminHtmlAwsSummaryBtn');
            if (!summaryBtn) return;
            const emails = Object.keys(adminHtmlPreviewAwsConfig || {});
            let enabledCount = 0;
            for (let i = 0; i < emails.length; i++) {
              if (adminHtmlPreviewAwsConfig[emails[i]] && adminHtmlPreviewAwsConfig[emails[i]].enabled === true) {
                enabledCount++;
              }
            }
            summaryBtn.innerText = 'AWS : ' + enabledCount;
          }

          function openAdminHtmlAwsModal() {
            if (adminPermissions.canPayroll !== true) {
              setAdminHtmlPreviewMessage('Payroll permission required.');
              return;
            }
            adminHtmlPreviewAwsDraftConfig = JSON.parse(JSON.stringify(adminHtmlPreviewAwsConfig || {}));
            renderAdminHtmlPreviewAWSConfig();
            const errorEl = document.getElementById('adminHtmlAwsError');
            const statusEl = document.getElementById('adminHtmlAwsStatus');
            const saveBtn = document.getElementById('adminHtmlAwsSaveBtn');
            if (errorEl) {
              errorEl.style.display = 'none';
              errorEl.innerText = '';
            }
            if (statusEl) {
              statusEl.innerText = 'Edit settings and save to persist.';
            }
            if (saveBtn) {
              saveBtn.disabled = false;
            }
            const modal = document.getElementById('adminHtmlAwsModal');
            if (modal) modal.style.display = 'flex';
          }

          function closeAdminHtmlAwsModal() {
            const modal = document.getElementById('adminHtmlAwsModal');
            if (modal) modal.style.display = 'none';
            // Re-enable the generate button when AWS modal is closed
            const generateBtn = document.getElementById('adminHtmlGenerateBtn');
            if (generateBtn) generateBtn.disabled = false;
          }

          function saveAdminHtmlAwsSettings() {
            if (adminPermissions.canPayroll !== true) {
              setAdminHtmlPreviewMessage('Payroll permission required.');
              return;
            }
            const emails = Object.keys(adminHtmlPreviewAwsDraftConfig || {});
            const nextConfig = {};
            const errorEl = document.getElementById('adminHtmlAwsError');
            const statusEl = document.getElementById('adminHtmlAwsStatus');
            const saveBtn = document.getElementById('adminHtmlAwsSaveBtn');

            for (let i = 0; i < emails.length; i++) {
              const email = emails[i];
              const safeKey = getSafeElementKey(email);
              const checkbox = document.getElementById('adminHtmlAws_' + safeKey);
              const dateInput = document.getElementById('adminHtmlAwsDate_' + safeKey);
              const enabled = !!(checkbox && checkbox.checked);
              const effectiveDate = String((dateInput && dateInput.value) || '').trim();

              if (enabled && !effectiveDate) {
                if (errorEl) {
                  errorEl.innerText = 'Please select an AWS effective date for ' + email + '.';
                  errorEl.style.display = 'block';
                }
                return;
              }

              nextConfig[email] = {
                enabled: enabled,
                effectiveDate: enabled
                  ? (effectiveDate || (adminHtmlPreviewAwsConfig[email] && adminHtmlPreviewAwsConfig[email].effectiveDate) || '')
                  : ''
              };
            }

            if (errorEl) {
              errorEl.style.display = 'none';
              errorEl.innerText = '';
            }
            if (statusEl) {
              statusEl.innerText = 'Saving AWS settings...';
            }
            if (saveBtn) {
              saveBtn.disabled = true;
            }

            const previousConfig = JSON.parse(JSON.stringify(adminHtmlPreviewAwsConfig || {}));
            adminHtmlPreviewAwsConfig = nextConfig;
            updateAdminHtmlAwsSummary();
            setAdminHtmlPreviewMessage('Saving AWS settings...');

            google.script.run
              .withSuccessHandler((result) => {
                if (!result || result.success !== true) {
                  adminHtmlPreviewAwsConfig = previousConfig;
                  updateAdminHtmlAwsSummary();
                  if (saveBtn) saveBtn.disabled = false;
                  if (statusEl) {
                    statusEl.innerText = 'Save failed.';
                  }
                  if (errorEl) {
                    errorEl.innerText = (result && result.message) ? result.message : 'Failed to save AWS settings.';
                    errorEl.style.display = 'block';
                  }
                  setAdminHtmlPreviewMessage((result && result.message) ? result.message : 'Failed to save AWS settings.');
                  return;
                }

                if (statusEl) {
                  statusEl.innerText = 'AWS settings saved.';
                }
                if (saveBtn) {
                  saveBtn.disabled = false;
                }
                setAdminHtmlPreviewMessage('AWS settings saved.');
                closeAdminHtmlAwsModal();
                if (adminHtmlPreviewLastResult && adminHtmlPreviewLastResult.payload) {
                  applyHolidaySelectionsToPreviewRows(adminHtmlPreviewLastResult.payload, adminHtmlPreviewAwsConfig || {});
                  renderAdminHtmlPreviewRows(adminHtmlPreviewLastResult.payload);
                }
              })
              .withFailureHandler((error) => {
                adminHtmlPreviewAwsConfig = previousConfig;
                updateAdminHtmlAwsSummary();
                if (saveBtn) saveBtn.disabled = false;
                if (statusEl) {
                  statusEl.innerText = 'Save failed.';
                }
                if (errorEl) {
                  errorEl.innerText = (error && error.message) ? error.message : 'Failed to save AWS settings.';
                  errorEl.style.display = 'block';
                }
                setAdminHtmlPreviewMessage((error && error.message) ? error.message : 'Failed to save AWS settings.');
              })
              .saveAWSConfigFromWeb(nextConfig);
          }

          function collectAdminHtmlAwsSelections() {
            return { success: true, config: JSON.parse(JSON.stringify(adminHtmlPreviewAwsConfig || {})) };
          }

          function formatDateKeyToDisplay(dateKey) {
            const parts = String(dateKey || '').split('-');
            if (parts.length !== 3) return String(dateKey || '');
            const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (isNaN(date.getTime())) return String(dateKey || '');
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return weekdays[date.getDay()] + ' ' + mm + '/' + dd;
          }

          function createLocalDate(year, monthIndex, day) {
            const date = new Date(year, monthIndex, day);
            date.setHours(0, 0, 0, 0);
            return date;
          }

          function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
            const first = createLocalDate(year, monthIndex, 1);
            const delta = (weekday - first.getDay() + 7) % 7;
            return createLocalDate(year, monthIndex, 1 + delta + ((nth - 1) * 7));
          }

          function lastWeekdayOfMonth(year, monthIndex, weekday) {
            const last = createLocalDate(year, monthIndex + 1, 0);
            const delta = (last.getDay() - weekday + 7) % 7;
            return createLocalDate(year, monthIndex, last.getDate() - delta);
          }

          function observedDateForFixedHoliday(dateObj) {
            const day = dateObj.getDay();
            if (day === 6) {
              return createLocalDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() - 1);
            }
            if (day === 0) {
              return createLocalDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
            }
            return createLocalDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
          }

          function buildUsHolidayCandidatesForYear(year) {
            const holidays = [];
            const addFloating = (name, dateObj) => {
              holidays.push({ name: name, date: createLocalDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()) });
            };
            const addFixedObserved = (name, monthIndex, day) => {
              const baseDate = createLocalDate(year, monthIndex, day);
              holidays.push({ name: name, date: observedDateForFixedHoliday(baseDate) });
            };

            addFixedObserved("New Year's Day", 0, 1);
            addFloating('Martin Luther King Jr. Day', nthWeekdayOfMonth(year, 0, 1, 3));
            addFloating("Presidents' Day", nthWeekdayOfMonth(year, 1, 1, 3));
            addFloating('Memorial Day', lastWeekdayOfMonth(year, 4, 1));
            addFixedObserved('Juneteenth', 5, 19);
            addFixedObserved('Independence Day', 6, 4);
            addFloating('Labor Day', nthWeekdayOfMonth(year, 8, 1, 1));
            addFloating('Columbus Day', nthWeekdayOfMonth(year, 9, 1, 2));
            addFixedObserved('Veterans Day', 10, 11);
            addFloating('Thanksgiving Day', nthWeekdayOfMonth(year, 10, 4, 4));
            addFixedObserved('Christmas Day', 11, 25);
            return holidays;
          }

          function computePayPeriodHolidays(startDateKey, endDateKey) {
            const start = parseIsoDateLocal(startDateKey);
            const end = parseIsoDateLocal(endDateKey);
            if (!start || !end) return [];

            const results = [];
            const seen = {};
            for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1; year++) {
              const yearHolidays = buildUsHolidayCandidatesForYear(year);
              for (let i = 0; i < yearHolidays.length; i++) {
                const holiday = yearHolidays[i];
                const key = formatDateIsoForInput(holiday.date);
                if (!key || key < startDateKey || key > endDateKey) continue;
                const dedupeKey = key + '|' + holiday.name;
                if (seen[dedupeKey]) continue;
                seen[dedupeKey] = true;
                results.push({
                  key: key,
                  name: holiday.name,
                  label: formatDateKeyToDisplay(key) + ' - ' + holiday.name
                });
              }
            }

            results.sort((a, b) => {
              if (a.key !== b.key) return a.key.localeCompare(b.key);
              return a.name.localeCompare(b.name);
            });
            return results;
          }

          function getAdminHtmlHolidayContext() {
            const payload = adminHtmlPreviewLastResult && adminHtmlPreviewLastResult.payload;
            const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
            const holidays = payload && Array.isArray(payload.detectedHolidays) ? payload.detectedHolidays : [];
            return { payload: payload || null, rows: rows, holidays: holidays };
          }

          function ensureAdminHolidayAssignments(payload) {
            if (!payload || !Array.isArray(payload.rows)) return;
            if (!payload.holidayAssignmentsByEmail || typeof payload.holidayAssignmentsByEmail !== 'object') {
              payload.holidayAssignmentsByEmail = {};
            }
            payload.rows.forEach((row) => {
              const email = String((row && row.email) || '').trim();
              if (!email) return;
              if (!payload.holidayAssignmentsByEmail[email] || typeof payload.holidayAssignmentsByEmail[email] !== 'object') {
                payload.holidayAssignmentsByEmail[email] = {};
              }
              if (typeof row.baseHolidayHours !== 'number') {
                row.baseHolidayHours = Number(row.holidayHours) || 0;
              }
            });
          }

          function getEmployeeHolidayAddedHours(email, assignments, holidays, awsConfig) {
            const map = assignments && assignments[email];
            if (!map || !Array.isArray(holidays) || holidays.length === 0) return 0;

            let added = 0;
            holidays.forEach((holiday) => {
              if (!holiday || !holiday.key) return;
              if (map[holiday.key] !== true) return;
              added += isEmployeeAWSClient(awsConfig, email, holiday.key) ? 10 : 8;
            });
            return added;
          }

          function applyHolidaySelectionsToPreviewRows(payload, awsConfig) {
            if (!payload || !Array.isArray(payload.rows)) return;
            ensureAdminHolidayAssignments(payload);
            const holidays = Array.isArray(payload.detectedHolidays) ? payload.detectedHolidays : [];
            const assignments = payload.holidayAssignmentsByEmail || {};
            payload.rows.forEach((row) => {
              const email = String((row && row.email) || '').trim();
              if (!email) return;
              const baseHoliday = Number(row.baseHolidayHours);
              const base = isNaN(baseHoliday) ? 0 : baseHoliday;
              const added = getEmployeeHolidayAddedHours(email, assignments, holidays, awsConfig);
              row.holidayHours = base + added;
            });
          }

          function getAdminHolidaySummaryText(holidays) {
            const holidayList = Array.isArray(holidays) ? holidays : [];
            if (holidayList.length === 0) return '';
            return 'holidays detected in pay period: ' + holidayList.map((holiday) => holiday.label).join(', ');
          }

          function updateAdminHtmlHolidayControls() {
            const holidayBtn = document.getElementById('adminHtmlHolidayPayBtn');
            const line = document.getElementById('adminHtmlHolidayDetectedLine');
            const ctx = getAdminHtmlHolidayContext();
            const provisionalStart = String(adminHtmlPreviewStartIso || '').trim();
            const provisionalStartDate = parseIsoDateLocal(provisionalStart);
            let provisionalHolidays = [];
            if (!ctx.payload && provisionalStartDate) {
              const provisionalEndDate = new Date(provisionalStartDate);
              provisionalEndDate.setDate(provisionalEndDate.getDate() + 13);
              provisionalHolidays = computePayPeriodHolidays(provisionalStart, formatDateIsoForInput(provisionalEndDate));
            }
            const displayHolidays = ctx.payload ? ctx.holidays : provisionalHolidays;

            if (line) {
              if (displayHolidays.length > 0) {
                line.style.display = 'block';
                line.innerText = getAdminHolidaySummaryText(displayHolidays);
              } else {
                line.style.display = 'none';
                line.innerText = '';
              }
            }

            if (!holidayBtn) return;
            if (adminPermissions.canPayroll !== true) {
              holidayBtn.disabled = true;
              holidayBtn.title = 'Payroll permission required.';
              return;
            }
            if (!ctx.payload) {
              holidayBtn.disabled = true;
              holidayBtn.title = 'Generate report first.';
              return;
            }
            if (ctx.holidays.length === 0) {
              holidayBtn.disabled = true;
              holidayBtn.title = 'No holidays detected in pay period.';
              return;
            }
            holidayBtn.disabled = false;
            holidayBtn.title = 'Add holiday pay by employee.';
          }

          function updateAdminHtmlHolidayRowTotal(email, assignments, holidays, awsConfig) {
            const totalCell = document.getElementById('adminHolidayTotal_' + getSafeElementKey(email));
            if (!totalCell) return;
            totalCell.innerText = getHoursString(getEmployeeHolidayAddedHours(email, assignments, holidays, awsConfig));
          }

          function renderAdminHtmlHolidayMatrix() {
            const matrix = document.getElementById('adminHtmlHolidayMatrix');
            if (!matrix) return;

            const ctx = getAdminHtmlHolidayContext();
            if (!ctx.payload) {
              matrix.innerHTML = '<div style="color:#7a8797;">Generate report preview to load employees and holidays.</div>';
              return;
            }
            if (ctx.rows.length === 0) {
              matrix.innerHTML = '<div style="color:#7a8797;">No employees in current preview.</div>';
              return;
            }
            if (ctx.holidays.length === 0) {
              matrix.innerHTML = '<div style="color:#7a8797;">No holidays detected in this pay period.</div>';
              return;
            }

            ensureAdminHolidayAssignments(ctx.payload);
            const assignments = ctx.payload.holidayAssignmentsByEmail;
            const awsConfig = adminHtmlPreviewLastResult && adminHtmlPreviewLastResult.awsConfig ? adminHtmlPreviewLastResult.awsConfig : {};

            const table = document.createElement('table');
            table.className = 'admin-holiday-grid';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            const employeeTh = document.createElement('th');
            employeeTh.textContent = 'Employee';
            headRow.appendChild(employeeTh);

            ctx.holidays.forEach((holiday) => {
              const th = document.createElement('th');
              th.textContent = holiday.label;
              headRow.appendChild(th);
            });

            const totalTh = document.createElement('th');
            totalTh.textContent = 'Added Hours';
            headRow.appendChild(totalTh);

            thead.appendChild(headRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            ctx.rows.forEach((row) => {
              const email = String((row && row.email) || '').trim();
              const tr = document.createElement('tr');
              const emailCell = document.createElement('td');
              emailCell.textContent = formatAdminPreviewEmail(email);
              emailCell.title = email;
              tr.appendChild(emailCell);

              if (!assignments[email] || typeof assignments[email] !== 'object') {
                assignments[email] = {};
              }

              ctx.holidays.forEach((holiday) => {
                const td = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = assignments[email][holiday.key] === true;
                checkbox.addEventListener('change', () => {
                  assignments[email][holiday.key] = checkbox.checked === true;
                  updateAdminHtmlHolidayRowTotal(email, assignments, ctx.holidays, awsConfig);
                });
                td.appendChild(checkbox);
                tr.appendChild(td);
              });

              const totalCell = document.createElement('td');
              totalCell.className = 'admin-holiday-total';
              totalCell.id = 'adminHolidayTotal_' + getSafeElementKey(email);
              totalCell.textContent = getHoursString(getEmployeeHolidayAddedHours(email, assignments, ctx.holidays, awsConfig));
              tr.appendChild(totalCell);
              tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            matrix.innerHTML = '';
            matrix.appendChild(table);
          }

          function openAdminHtmlHolidayModal() {
            if (adminPermissions.canPayroll !== true) {
              setAdminHtmlPreviewMessage('Payroll permission required.');
              return;
            }
            const ctx = getAdminHtmlHolidayContext();
            if (!ctx.payload) {
              setAdminHtmlPreviewMessage('Generate report first.');
              return;
            }
            if (ctx.holidays.length === 0) {
              setAdminHtmlPreviewMessage('No holidays detected in this pay period.');
              return;
            }

            const errorEl = document.getElementById('adminHtmlHolidayError');
            if (errorEl) {
              errorEl.style.display = 'none';
              errorEl.innerText = '';
            }
            renderAdminHtmlHolidayMatrix();
            const modal = document.getElementById('adminHtmlHolidayModal');
            if (modal) modal.style.display = 'flex';
          }

          function closeAdminHtmlHolidayModal() {
            const modal = document.getElementById('adminHtmlHolidayModal');
            if (modal) modal.style.display = 'none';
          }

          function applyAdminHtmlHolidayAssignments() {
            const ctx = getAdminHtmlHolidayContext();
            if (!ctx.payload) {
              setAdminHtmlPreviewMessage('Generate report first.');
              closeAdminHtmlHolidayModal();
              return;
            }

            applyHolidaySelectionsToPreviewRows(ctx.payload, adminHtmlPreviewLastResult.awsConfig || {});
            renderAdminHtmlPreviewRows(ctx.payload);

            const assignments = ctx.payload.holidayAssignmentsByEmail || {};
            let appliedCount = 0;
            Object.keys(assignments).forEach((email) => {
              const emailMap = assignments[email] || {};
              Object.keys(emailMap).forEach((holidayKey) => {
                if (emailMap[holidayKey] === true) appliedCount++;
              });
            });

            setAdminHtmlPreviewMessage('Holiday pay applied: ' + appliedCount + ' holiday selection' + (appliedCount === 1 ? '' : 's') + '.');
            closeAdminHtmlHolidayModal();
          }

          function parseDateKeyToUtcMs(dateKey) {
            const parts = String(dateKey || '').split('-');
            if (parts.length !== 3) return NaN;
            return Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }

          function getWeekNumFromDateKey(dateKey, startDateKey) {
            const oneDayMs = 1000 * 60 * 60 * 24;
            const diff = (parseDateKeyToUtcMs(dateKey) - parseDateKeyToUtcMs(startDateKey)) / oneDayMs;
            return diff < 7 ? 1 : 2;
          }

          function isEmployeeAWSClient(awsConfig, email, checkDateKey) {
            const emp = awsConfig && awsConfig[email];
            if (!emp) return false;
            if (emp.enabled !== true) return false;
            if (emp.effectiveDate && checkDateKey) {
              return String(checkDateKey) >= String(emp.effectiveDate);
            }
            return true;
          }

          function getEntryDateKey(entry) {
            if (entry && entry.effectiveClockInDateKey) {
              return String(entry.effectiveClockInDateKey);
            }
            const iso = entry && (entry.effectiveClockIn || entry.rawClockIn);
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          }

          function buildAdminHtmlPreviewData(startDateKey, awsConfig) {
            const startDate = parseIsoDateLocal(startDateKey);
            if (!startDate) {
              return { success: false, message: 'Invalid start date.' };
            }
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 13);
            const endDateKey = formatDateIsoForInput(endDate);

            const rowKeys = Object.keys(adminEntriesByRow || {});
            const filteredEntries = [];

            for (let i = 0; i < rowKeys.length; i++) {
              const rowIndex = Number(rowKeys[i]);
              const entry = adminEntriesByRow[rowIndex];
              if (!entry || entry.deleted) continue;
              const clockInIso = entry.effectiveClockIn || entry.rawClockIn || '';
              if (!clockInIso) continue;
              const clockIn = new Date(clockInIso);
              if (isNaN(clockIn.getTime())) continue;
              const dayKey = getEntryDateKey(entry);
              if (!dayKey) continue;
              if (dayKey < startDateKey || dayKey > endDateKey) continue;

              const clockOutIso = entry.effectiveClockOut || entry.rawClockOut || '';
              const clockOut = clockOutIso ? new Date(clockOutIso) : null;
              const safeClockOut = (clockOut instanceof Date && !isNaN(clockOut.getTime())) ? clockOut : null;
              const hours = getAdminHoursForDisplay(clockInIso, clockOutIso, entry.hours || 0);

              filteredEntries.push({
                email: entry.email || '',
                clockIn: clockIn,
                clockOut: safeClockOut,
                dayKey: dayKey,
                hours: hours,
                verified: isVerifiedValue(entry.verified),
                notes: entry.notes || '',
                entryType: normalizeEntryTypeClient(entry.entryType)
              });
            }

            if (filteredEntries.length === 0) {
              return { success: false, message: 'No entries found in the selected date range.' };
            }

            filteredEntries.sort((a, b) => {
              if (a.email !== b.email) return a.email.localeCompare(b.email);
              return a.clockIn.getTime() - b.clockIn.getTime();
            });

            const employeeMap = {};
            const summaryMap = {};
            filteredEntries.forEach((entry) => {
              const normalizedType = normalizeEntryTypeClient(entry.entryType);
              if (!summaryMap[entry.email]) {
                summaryMap[entry.email] = { wk1: [0, 0, 0], wk2: [0, 0, 0], vacationHours: 0, holidayHours: 0, sickHours: 0, ruleSet: '' };
              }
              if (normalizedType === 'vacation') {
                summaryMap[entry.email].vacationHours += entry.hours || 0;
                return;
              }
              if (normalizedType === 'sick') {
                summaryMap[entry.email].sickHours += entry.hours || 0;
                return;
              }
              const weekNum = getWeekNumFromDateKey(entry.dayKey, startDateKey);
              if (!employeeMap[entry.email]) employeeMap[entry.email] = {};
              if (!employeeMap[entry.email][weekNum]) employeeMap[entry.email][weekNum] = {};
              if (!employeeMap[entry.email][weekNum][entry.dayKey]) employeeMap[entry.email][weekNum][entry.dayKey] = 0;
              employeeMap[entry.email][weekNum][entry.dayKey] += entry.hours || 0;
            });

            Object.keys(employeeMap).forEach((email) => {
              const firstDayKey = Object.keys(employeeMap[email][1] || employeeMap[email][2] || {})[0];
              const primaryRuleSet = isEmployeeAWSClient(awsConfig, email, firstDayKey || startDateKey) ? 'AWS' : 'CA Standard';
              summaryMap[email] = summaryMap[email] || { wk1: [0, 0, 0], wk2: [0, 0, 0], vacationHours: 0, holidayHours: 0, sickHours: 0, ruleSet: '' };
              summaryMap[email].ruleSet = primaryRuleSet;

              [1, 2].forEach((weekNum) => {
                const week = employeeMap[email][weekNum] || {};
                const dayKeys = Object.keys(week).sort();
                let weekRT = 0;
                let weekOT = 0;
                let weekDT = 0;
                let consecutiveDays = 0;

                dayKeys.forEach((dayKey) => {
                  const totalHours = week[dayKey];
                  consecutiveDays++;
                  let dayRT = 0;
                  let dayOT = 0;
                  let dayDT = 0;

                  const isAWS = isEmployeeAWSClient(awsConfig, email, dayKey);
                  const dailyThreshold = isAWS ? 10 : 8;
                  const suppressSeventhDay = isAWS;

                  if (consecutiveDays === 7 && !suppressSeventhDay) {
                    if (totalHours <= 8) {
                      dayOT = totalHours;
                    } else {
                      dayOT = 8;
                      dayDT = totalHours - 8;
                    }
                  } else if (totalHours <= dailyThreshold) {
                    dayRT = totalHours;
                  } else if (totalHours <= 12) {
                    dayRT = dailyThreshold;
                    dayOT = totalHours - dailyThreshold;
                  } else {
                    dayRT = dailyThreshold;
                    dayOT = 12 - dailyThreshold;
                    dayDT = totalHours - 12;
                  }

                  weekRT += dayRT;
                  weekOT += dayOT;
                  weekDT += dayDT;
                });

                const excess = Math.max(0, weekRT - 40);
                if (excess > 0) {
                  weekRT -= excess;
                  weekOT += excess;
                }

                if (weekNum === 1) summaryMap[email].wk1 = [weekRT, weekOT, weekDT];
                if (weekNum === 2) summaryMap[email].wk2 = [weekRT, weekOT, weekDT];
              });
            });

            Object.keys(summaryMap).forEach((email) => {
              if (!summaryMap[email].ruleSet) {
                summaryMap[email].ruleSet = isEmployeeAWSClient(awsConfig, email, startDateKey) ? 'AWS' : 'CA Standard';
              }
            });

            const rows = Object.keys(summaryMap).sort().map((email) => {
              const wk1 = summaryMap[email].wk1;
              const wk2 = summaryMap[email].wk2;
              const wk1Total = wk1[0] + wk1[1] + wk1[2];
              const wk2Total = wk2[0] + wk2[1] + wk2[2];
              const totalOverage = (wk1Total > 40 ? wk1Total - 40 : 0) + (wk2Total > 40 ? wk2Total - 40 : 0);
              const baseHolidayHours = summaryMap[email].holidayHours || 0;
              return {
                email: email,
                wk1RT: wk1[0],
                wk1OT: wk1[1],
                wk1DT: wk1[2],
                wk2RT: wk2[0],
                wk2OT: wk2[1],
                sickHours: summaryMap[email].sickHours || 0,
                wk2DT: wk2[2],
                vacationHours: summaryMap[email].vacationHours || 0,
                holidayHours: baseHolidayHours,
                baseHolidayHours: baseHolidayHours,
                sickHours: summaryMap[email].sickHours || 0,
                totalOverage: totalOverage,
                totalRT: wk1[0] + wk2[0],
                totalOT: wk1[1] + wk2[1],
                totalDT: wk1[2] + wk2[2],
                notes: String((adminHtmlPreviewNotesByEmail && adminHtmlPreviewNotesByEmail[email]) || ''),
                ruleSet: summaryMap[email].ruleSet
              };
            });

            const unverifiedEntries = filteredEntries.filter((entry) => entry.verified !== true);
            const unverifiedSample = unverifiedEntries.slice(0, 5).map((entry) => {
              const when = entry.clockIn instanceof Date && !isNaN(entry.clockIn.getTime())
                ? formatDisplayDate(entry.clockIn.toISOString())
                : '';
              return when ? (entry.email + ' - ' + when) : entry.email;
            });
            const detectedHolidays = computePayPeriodHolidays(startDateKey, endDateKey);
            const holidayAssignmentsByEmail = {};
            rows.forEach((row) => {
              holidayAssignmentsByEmail[row.email] = {};
            });

            return {
              success: true,
              startDateKey: startDateKey,
              endDateKey: endDateKey,
              rows: rows,
              entriesCount: filteredEntries.length,
              detectedHolidays: detectedHolidays,
              holidayAssignmentsByEmail: holidayAssignmentsByEmail,
              unverifiedSummary: {
                count: unverifiedEntries.length,
                sample: unverifiedSample
              }
            };
          }

          function renderAdminHtmlPreviewRows(previewResult) {
            const tbody = document.getElementById('adminHtmlPreviewBody');
            if (!tbody) return;
            const rows = (previewResult && previewResult.rows) ? previewResult.rows : [];
            if (rows.length === 0) {
              tbody.innerHTML = '<tr><td class="admin-preview-empty" colspan="16">No rows in preview.</td></tr>';
              return;
            }

            applyAdminPreviewColumnWidths(rows);

            const htmlRows = rows.map((row) => {
              const emailLabel = formatAdminPreviewEmail(row.email);
              const noteText = String(row.notes || '');
              return '<tr>' +
                '<td title="' + escapeHtml(row.email) + '">' + escapeHtml(emailLabel) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.wk1RT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.wk1OT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.wk1DT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.wk2RT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.wk2OT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.wk2DT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.vacationHours) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.holidayHours) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.sickHours) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.totalOverage) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.totalRT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.totalOT) + '</td>' +
                '<td>' + getPayrollPreviewHoursString(row.totalDT) + '</td>' +
                '<td><textarea class="admin-preview-note-input" rows="1" data-email="' + escapeHtml(row.email) + '" oninput="updateAdminHtmlPreviewNote(this.dataset.email, this.value)">' + escapeHtml(noteText) + '</textarea></td>' +
                '<td>' + escapeHtml(row.ruleSet) + '</td>' +
                '</tr>';
            });
            tbody.innerHTML = htmlRows.join('');
            requestAnimationFrame(resizeAdminPreviewNotes);
          }

          function updateAdminHtmlPreviewNote(email, noteValue) {
            const emailKey = String(email || '').trim();
            if (!emailKey) return;
            adminHtmlPreviewNotesByEmail[emailKey] = String(noteValue || '');
            if (adminHtmlPreviewLastResult && adminHtmlPreviewLastResult.payload && adminHtmlPreviewLastResult.payload.rows) {
              const rows = adminHtmlPreviewLastResult.payload.rows;
              for (let i = 0; i < rows.length; i++) {
                if (rows[i].email === emailKey) {
                  rows[i].notes = adminHtmlPreviewNotesByEmail[emailKey];
                  break;
                }
              }
            }
            resizeAdminPreviewNotes();
          }

          function setAdminHtmlPreviewTableTitle(startDateKey, endDateKey) {
            const titleEl = document.getElementById('adminHtmlPreviewTableTitle');
            if (!titleEl) return;
            if (!startDateKey || !endDateKey) {
              titleEl.innerText = 'Payroll Report';
              return;
            }
            titleEl.innerText = 'Payroll Report for ' + startDateKey + ' to ' + endDateKey;
          }

          function generateAdminHtmlPreview() {
            if (adminPermissions.canPayroll !== true) {
              setAdminHtmlPreviewMessage('Payroll permission required.');
              return;
            }
            const generateBtn = document.getElementById('adminHtmlGenerateBtn');
            const startIso = String(adminHtmlPreviewStartIso || '').trim();
            if (!parseIsoDateLocal(startIso)) {
              setAdminHtmlPreviewMessage('Active pay period is not set. Please set current pay period first.');
              return;
            }

            const awsCollect = collectAdminHtmlAwsSelections();
            if (!awsCollect.success) {
              setAdminHtmlPreviewMessage(awsCollect.message || 'Invalid AWS selection.');
              return;
            }

            if (generateBtn) generateBtn.disabled = true;
            updateAdminHtmlExportButtonState('Generating report...');
            setAdminHtmlPreviewMessage('Refreshing entries and generating local preview...');

            adminHtmlPreviewStartIso = startIso;
            const awsConfig = awsCollect.config;
            loadAdminEntries((loadError) => {
              if (generateBtn) generateBtn.disabled = false;
              if (loadError) {
                setAdminHtmlPreviewMessage((loadError && loadError.message) ? loadError.message : 'Failed to refresh entries.');
                updateAdminHtmlExportButtonState();
                return;
              }

              const result = buildAdminHtmlPreviewData(startIso, awsConfig);
              if (!result.success) {
                adminHtmlPreviewLastResult = null;
                renderAdminHtmlPreviewRows({ rows: [] });
                setAdminHtmlPreviewMessage(result.message || 'No preview results found.');
                updateAdminHtmlExportButtonState();
                updateAdminHtmlHolidayControls();
                return;
              }

              adminHtmlPreviewLastResult = {
                startDateIso: startIso,
                awsConfig: awsConfig,
                payload: result
              };
              const noteMap = {};
              result.rows.forEach((row) => {
                noteMap[row.email] = (adminHtmlPreviewNotesByEmail[row.email] || row.notes || '');
                row.notes = noteMap[row.email];
              });
              ensureAdminHolidayAssignments(result);
              applyHolidaySelectionsToPreviewRows(result, awsConfig);
              adminHtmlPreviewNotesByEmail = noteMap;
              setAdminHtmlPreviewTableTitle(result.startDateKey, result.endDateKey);
              renderAdminHtmlPreviewRows(result);
              updateAdminHtmlExportButtonState();
              updateAdminHtmlHolidayControls();
              setAdminHtmlPreviewMessage('Preview ready: ' + result.rows.length + ' employees, ' + result.entriesCount + '.');
            });
          }

          function runAdminHtmlExport(forceUnverified) {
            if (!adminHtmlPreviewLastResult) {
              setAdminHtmlPreviewMessage('Generate preview first.');
              return;
            }
            updateAdminHtmlExportButtonState('Exporting preview to PDF...');
            setAdminHtmlPreviewMessage('Exporting preview to PDF...');
            const generateBtn = document.getElementById('adminHtmlGenerateBtn');
            if (generateBtn) generateBtn.disabled = true;

            google.script.run
              .withSuccessHandler((result) => {
                if (result && result.requiresUnverifiedConfirmation) {
                  const sampleLines = (result.sample || []).join('\\n');
                  const prompt = (result.message || 'Unverified entries found.') + '\\n\\n' + sampleLines + '\\n\\nExport anyway?';
                  if (confirm(prompt)) {
                    runAdminHtmlExport(true);
                    return;
                  }
                  if (generateBtn) generateBtn.disabled = false;
                  updateAdminHtmlExportButtonState();
                  setAdminHtmlPreviewMessage('Export cancelled.');
                  return;
                }

                if (!result || result.success !== true) {
                  if (generateBtn) generateBtn.disabled = false;
                  updateAdminHtmlExportButtonState();
                  setAdminHtmlPreviewMessage((result && result.message) ? result.message : 'Export failed.');
                  return;
                }

                if (result.driveUrl) {
                  window.open(result.driveUrl, '_blank');
                }
                showExportCompleteWithCountdown(result);
              })
                .withFailureHandler((error) => {
                  if (generateBtn) generateBtn.disabled = false;
                  updateAdminHtmlExportButtonState();
                  setAdminHtmlPreviewMessage((error && error.message) ? error.message : 'Export failed.');
                })
              .exportPayrollPreviewFromWeb(
                adminHtmlPreviewLastResult.startDateIso,
                adminHtmlPreviewLastResult.awsConfig,
                {
                  forceUnverified: forceUnverified === true,
                  notesByEmail: adminHtmlPreviewNotesByEmail,
                  cachedPreview: adminHtmlPreviewLastResult.payload,
                  unverifiedSummary: adminHtmlPreviewLastResult.payload
                    ? (adminHtmlPreviewLastResult.payload.unverifiedSummary || null)
                    : null
                }
              );
          }

          function exportAdminHtmlPreview() {
            if (adminPermissions.canExport !== true) {
              setAdminHtmlPreviewMessage('Export permission required.');
              return;
            }
            const unverifiedCount = getAdminHtmlUnverifiedEntryCount();
            if (unverifiedCount > 0) {
              updateAdminHtmlExportButtonState();
              setAdminHtmlPreviewMessage('Cannot export while unverified entries exist. Verify all entries first.');
              return;
            }

            updateAdminHtmlExportButtonState('Exporting preview to PDF...');
            setAdminHtmlPreviewMessage('Exporting preview to PDF...');

            runAdminHtmlExport(false);
          }

          function parseDeletedMeta(notes) {
            // Look for "Deleted by X at HH:mm MM/dd/yyyy" appended to notes
            if (!notes) return null;
            var match = String(notes).match(/Deleted by ([^\\s;]+) at (\\d{2}:\\d{2} \\d{2}\\/\\d{2}\\/\\d{4})/);
            if (!match) return null;
            return { by: match[1], at: match[2] };
          }

          function getAdminShowDeletedState() {
            return !!(document.getElementById('adminShowDeleted') && document.getElementById('adminShowDeleted').checked);
          }

          function buildAdminVisibleRecords() {
            const rowIndices = Object.keys(adminEntriesByRow).map((v) => Number(v));
            if (rowIndices.length === 0) return [];
            const showDeleted = getAdminShowDeletedState();

            return rowIndices.map((rowIndex) => {
              const entry = adminEntriesByRow[rowIndex];
              const draft = adminDraftByRow[rowIndex];
              const effective = getAdminEffectiveFromDraft(rowIndex);
              const dayKey = getAdminDayKey(effective.clockIn);
              const inMs = effective.clockIn ? new Date(effective.clockIn).getTime() : Number.MAX_SAFE_INTEGER;
              const hoursForDisplay = getAdminHoursForDisplay(effective.clockIn, effective.clockOut, entry ? entry.hours : 0);
              return {
                rowIndex: rowIndex,
                entry: entry,
                draft: draft,
                effective: effective,
                dayKey: dayKey,
                inMs: isNaN(inMs) ? Number.MAX_SAFE_INTEGER : inMs,
                hoursForDisplay: hoursForDisplay
              };
            }).filter((record) => {
              if (record.entry.deleted && !showDeleted) return false;
              if (!adminShowOnlyActivePayPeriod) return true;
              return isInActivePayPeriod(record.effective.clockIn);
            });
          }

          function applyAutoCollapseVerifiedDays(records) {
            const daySummary = {};
            (records || []).forEach((record) => {
              const entry = record && record.entry;
              if (!entry) return;
              const emailKey = String(entry.email || '').trim().toLowerCase();
              const dayKey = String(record.dayKey || '').trim();
              if (!emailKey || !dayKey || entry.deleted) return;

              const collapseKey = emailKey + '|' + dayKey;
              if (!daySummary[collapseKey]) {
                daySummary[collapseKey] = { eligibleCount: 0, verifiedCount: 0 };
              }
              daySummary[collapseKey].eligibleCount += 1;
              if (isVerifiedValue(entry.verified)) {
                daySummary[collapseKey].verifiedCount += 1;
              }
            });

            let collapsedNow = 0;
            Object.keys(daySummary).forEach((collapseKey) => {
              const summary = daySummary[collapseKey];
              if (!summary || summary.eligibleCount <= 0) return;
              if (summary.verifiedCount === summary.eligibleCount && adminCollapsedDays[collapseKey] !== true) {
                adminCollapsedDays[collapseKey] = true;
                collapsedNow += 1;
              }
            });
            return collapsedNow;
          }

          function toggleAdminAutoCollapseVerifiedDays() {
            const checkbox = document.getElementById('adminAutoCollapseVerifiedDays');
            adminAutoCollapseVerifiedDays = !!(checkbox && checkbox.checked);
            const msg = document.getElementById('adminLoadMsg');

            if (!adminAutoCollapseVerifiedDays) {
              adminCollapsedDays = {};
              renderAdminEntries();
              if (msg) {
                msg.innerText = 'Expanded all day groups.';
              }
              return;
            }

            const collapsedNow = applyAutoCollapseVerifiedDays(buildAdminVisibleRecords());
            renderAdminEntries();
            if (msg) {
              msg.innerText = 'Auto-collapse verified days enabled.' + (collapsedNow > 0 ? (' Collapsed ' + collapsedNow + ' day groups.') : '');
            }
          }

          function getAdminHoldActionKey(rowIndex, action) {
            return String(action || '') + ':' + String(rowIndex || '');
          }

          function getAdminHoldButtonId(rowIndex, action) {
            return 'adminHoldBtn_' + String(action || '') + '_' + String(rowIndex || '');
          }

          function applyAdminHoldVisualState(rowIndex, action, isHolding) {
            const button = document.getElementById(getAdminHoldButtonId(rowIndex, action));
            if (!button) return;
            if (isHolding) {
              button.classList.add('is-holding');
              return;
            }
            button.classList.remove('is-holding');
          }

          function cancelAdminRowHoldAction(rowIndex, action) {
            const key = getAdminHoldActionKey(rowIndex, action);
            const state = adminHoldActionStateByKey[key];
            if (!state) {
              applyAdminHoldVisualState(rowIndex, action, false);
              return;
            }
            if (state.timerId) {
              clearTimeout(state.timerId);
            }
            delete adminHoldActionStateByKey[key];
            applyAdminHoldVisualState(rowIndex, action, false);
          }

          function cancelAllAdminRowHoldActions() {
            const keys = Object.keys(adminHoldActionStateByKey);
            keys.forEach((key) => {
              const state = adminHoldActionStateByKey[key];
              if (state && state.timerId) {
                clearTimeout(state.timerId);
              }
              delete adminHoldActionStateByKey[key];
            });
          }

          function completeAdminRowHoldAction(rowIndex, action) {
            const key = getAdminHoldActionKey(rowIndex, action);
            const state = adminHoldActionStateByKey[key];
            if (!state) return;

            delete adminHoldActionStateByKey[key];
            applyAdminHoldVisualState(rowIndex, action, false);

            if (action === 'restore') {
              requestAdminRestore(rowIndex);
              return;
            }
            requestAdminDelete(rowIndex);
          }

          function startAdminRowHoldAction(rowIndex, action, event) {
            if (event && event.button !== undefined && event.button !== 0) return;

            const entry = adminEntriesByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            if (!entry || !draft || entry._pendingActionLabel) return;
            if (!isAdminRowEditable(rowIndex) || adminPermissions.canEdit !== true) return;
            if (action === 'restore' && !entry.deleted) return;
            if (action === 'delete' && entry.deleted) return;

            const key = getAdminHoldActionKey(rowIndex, action);
            if (adminHoldActionStateByKey[key]) return;

            if (event && typeof event.preventDefault === 'function') {
              event.preventDefault();
            }

            adminHoldActionStateByKey[key] = {
              timerId: setTimeout(() => {
                completeAdminRowHoldAction(rowIndex, action);
              }, ADMIN_HOLD_ACTION_MS)
            };

            applyAdminHoldVisualState(rowIndex, action, true);
          }

          function startAdminDeleteHold(rowIndex, event) {
            startAdminRowHoldAction(rowIndex, 'delete', event);
          }

          function cancelAdminDeleteHold(rowIndex) {
            cancelAdminRowHoldAction(rowIndex, 'delete');
          }

          function startAdminRestoreHold(rowIndex, event) {
            startAdminRowHoldAction(rowIndex, 'restore', event);
          }

          function cancelAdminRestoreHold(rowIndex) {
            cancelAdminRowHoldAction(rowIndex, 'restore');
          }

          function renderAdminEntries() {
            const body = document.getElementById('adminEntriesBody');
            if (!body) return;
            cancelAllAdminRowHoldActions();
            const records = buildAdminVisibleRecords();

            if (adminAutoCollapseVerifiedDays) {
              applyAutoCollapseVerifiedDays(records);
            }

            if (records.length === 0) {
              body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">No rows found for this filter.</td></tr>';
              return;
            }

            records.sort((a, b) => {
              const emailA = String((a.entry && a.entry.email) || '').toLowerCase();
              const emailB = String((b.entry && b.entry.email) || '').toLowerCase();
              if (emailA !== emailB) return emailA.localeCompare(emailB);
              if (a.dayKey !== b.dayKey) return String(a.dayKey || '').localeCompare(String(b.dayKey || ''));
              if (a.inMs !== b.inMs) return a.inMs - b.inMs;
              return a.rowIndex - b.rowIndex;
            });

            // Pre-compute day totals (active rows only) so each day header can show them inline
            const dayTotals = {};  // dayKey -> hours
            const dayTones = {};  // dayKey -> worked|vacation|sick|mixed
            records.forEach((record) => {
              if (record.entry.deleted) return;
              const toneKey = record.entry.email + '|' + record.dayKey;
              const entryType = normalizeEntryTypeClient(record.entry.entryType);
              dayTones[toneKey] = mergeDayTone(dayTones[toneKey], entryType);
              if (normalizeEntryTypeClient(record.entry.entryType) !== 'worked') return;
              const key = record.entry.email + '|' + record.dayKey;
              dayTotals[key] = (dayTotals[key] || 0) + Number(record.hoursForDisplay || 0);
            });

            const rowsHtml = [];
            let currentEmail = '';
            let currentDayKey = '';
            let currentEmailKey = '';
            let currentUserCollapsed = false;
            let currentDayCollapsed = false;

            records.forEach((record) => {
              const rowIndex = record.rowIndex;
              const entry = record.entry;
              const draft = record.draft;
              const effective = record.effective;
              const clockInDisplay = effective.clockIn ? formatDisplayTime(effective.clockIn) : '--:--';
              const clockOutDisplay = effective.clockOut ? formatDisplayTime(effective.clockOut) : '--:--';
              const rawInText = entry.rawClockIn ? formatDisplayTime(entry.rawClockIn) : 'none';
              const rawOutText = entry.rawClockOut ? formatDisplayTime(entry.rawClockOut) : 'none';
              const rawInSub = adminShowRawTimes ? '<div class="admin-raw-sub">Raw: ' + escapeHtml(rawInText) + '</div>' : '';
              const rawOutSub = adminShowRawTimes ? '<div class="admin-raw-sub">Raw: ' + escapeHtml(rawOutText) + '</div>' : '';
              const isDeleted = !!entry.deleted;
              const isEditable = !isDeleted && isAdminRowEditable(rowIndex);
              const hasEditPermission = adminPermissions.canEdit === true;
              const hasVerifyPermission = adminPermissions.canVerify === true;
              const rowPendingAction = String(entry._pendingActionLabel || '').trim();
              const isRowPending = !!rowPendingAction;
              const canEditActions = isEditable && hasEditPermission && !isRowPending;
              const verifyIsSaving = adminVerifySaveInFlightByRow[rowIndex] === true;
              const canVerifyAction = isEditable && hasVerifyPermission && !verifyIsSaving && !isRowPending;
              const canRestore = isDeleted && isAdminRowEditable(rowIndex) && hasEditPermission && !isRowPending;
              const editLockTitle = hasEditPermission
                ? (isEditable ? 'Edit row ' + rowIndex + ' times' : 'Locked outside active pay period')
                : 'Edit permission required.';
              const verifyLockTitle = hasVerifyPermission
                ? (verifyIsSaving ? 'Saving verified state...' : (isEditable ? ('Toggle verified for row ' + rowIndex) : 'Locked outside active pay period'))
                : 'Verify permission required.';
              const actionDisabledAttr = canEditActions ? '' : ' disabled';
              const restoreDisabledAttr = canRestore ? '' : ' disabled';
              const verifyDisabledAttr = canVerifyAction ? '' : ' disabled';
              const deleteHoldTitle = hasEditPermission
                ? (isEditable ? ('Hold 3 seconds to delete row ' + rowIndex) : 'Locked outside active pay period')
                : 'Edit permission required.';
              const restoreHoldTitle = canRestore
                ? ('Hold 3 seconds to restore row ' + rowIndex)
                : (hasEditPermission ? 'Locked outside active pay period' : 'Edit permission required.');
              const holdDeleteAttrs = canEditActions
                ? ' onpointerdown="startAdminDeleteHold(' + rowIndex + ', event)" onpointerup="cancelAdminDeleteHold(' + rowIndex + ')" onpointercancel="cancelAdminDeleteHold(' + rowIndex + ')" onpointerleave="cancelAdminDeleteHold(' + rowIndex + ')" oncontextmenu="return false;"'
                : '';
              const holdRestoreAttrs = canRestore
                ? ' onpointerdown="startAdminRestoreHold(' + rowIndex + ', event)" onpointerup="cancelAdminRestoreHold(' + rowIndex + ')" onpointercancel="cancelAdminRestoreHold(' + rowIndex + ')" onpointerleave="cancelAdminRestoreHold(' + rowIndex + ')" oncontextmenu="return false;"'
                : '';
              const deletedMeta = isDeleted ? parseDeletedMeta(entry.notes) : null;
              const pendingRowBadge = isRowPending
                ? '<span class="admin-pending-chip" title="Pending server response">' + escapeHtml(rowPendingAction) + '</span>'
                : (isDeleted ? '<span class="admin-pending-chip admin-deleted-chip" title="Entry deleted">Deleted</span>' : '');
              const noteLines = splitAdminNotes(entry.notes || '');
              const noteLinesHtml = noteLines.length > 0
                ? noteLines.map((line) => '<div class="admin-note-line">' + escapeHtml(line) + '</div>').join('')
                : '<div class="admin-note-line admin-note-line-empty">No notes</div>';
              const pendingNote = String(draft.pendingNewNoteText || '');
              const pendingNoteComposer = isDeleted ? '' :
                '<div class="admin-note-composer" id="adminNoteComposer_' + rowIndex + '"' + (pendingNote ? '' : ' style="display:none;"') + '>' +
                  '<textarea id="adminNewNote_' + rowIndex + '" placeholder="Add a new note..." oninput="handleAdminNewNoteInput(' + rowIndex + ')" onkeydown="handleAdminNewNoteKeyDown(' + rowIndex + ', event)" maxlength="150"' + (pendingNote ? ' style="height:auto;"' : '') + '>' + escapeHtml(pendingNote) + '</textarea>' +
                '</div>';
              const pendingNoteButton = isDeleted ? '' :
                '<button type="button" class="admin-note-add-btn"' + (canEditActions ? ' onclick="toggleAdminNewNoteComposer(' + rowIndex + ')"' : '') + actionDisabledAttr + ' title="' + escapeHtml(hasEditPermission ? (isEditable ? 'Add note' : 'Locked outside active pay period') : 'Edit permission required.') + '">+</button>';
              const typeMeta = getEntryTypeMeta(entry.entryType);

              // Employee group header
              if (entry.email !== currentEmail) {
                currentEmail = entry.email;
                currentDayKey = '';
                currentEmailKey = String(currentEmail || '').trim().toLowerCase();
                currentUserCollapsed = currentEmailKey ? adminCollapsedUsers[currentEmailKey] === true : false;
                const collapseSymbol = currentUserCollapsed ? '+' : '-';
                const collapseBtn = currentEmailKey
                  ? '<button type="button" class="admin-collapse-btn" data-email="' + escapeHtml(currentEmailKey) + '" onclick="toggleAdminUserCollapsed(this.dataset.email)" title="Expand/collapse user">' + collapseSymbol + '</button>'
                  : '';
                const addMissedBtn = currentEmailKey
                  ? '<button type="button" class="admin-group-add-missed-btn" data-email="' + escapeHtml(currentEmailKey) + '"' + (hasEditPermission ? ' onclick="openAdminManualEntryForEmployee(this.dataset.email, event)"' : '') + (hasEditPermission ? '' : ' disabled') + ' title="' + escapeHtml(hasEditPermission ? 'Add missed time for this employee' : 'Edit permission required.') + '">+ Add missed time</button>'
                  : '';
                rowsHtml.push('<tr class="admin-group-row"><td colspan="5"><div class="admin-group-meta"><div class="admin-group-left">' + collapseBtn + '<span>&#128100; ' + escapeHtml(currentEmail || 'Unknown') + '</span></div>' + addMissedBtn + '</div></td></tr>');
              }

              if (currentUserCollapsed) {
                return;
              }

              // Day header (with inline total hours from active rows only)
              if (record.dayKey !== currentDayKey) {
                currentDayKey = record.dayKey;
                const dayKey = entry.email + '|' + record.dayKey;
                const total = dayTotals[dayKey] || 0;
                const totalStr = getHoursString(total);
                const dayTone = dayTones[dayKey] || 'worked';
                const dayLabel = formatAdminDayLabel(effective.clockIn, totalStr, dayTone);
                const dayToneClass = getDayToneClass(dayTone);
                const dayCollapseKey = currentEmailKey + '|' + record.dayKey;
                currentDayCollapsed = adminCollapsedDays[dayCollapseKey] === true;
                const dayCollapseSymbol = currentDayCollapsed ? '+' : '-';
                const dayCollapseBtn = '<button type="button" class="admin-collapse-btn" data-email="' + escapeHtml(currentEmailKey) + '" data-day="' + escapeHtml(record.dayKey || '') + '" onclick="toggleAdminDayCollapsed(this.dataset.email, this.dataset.day)" title="Expand/collapse day">' + dayCollapseSymbol + '</button>';
                rowsHtml.push('<tr class="admin-day-row ' + dayToneClass + '">' +
                    '<td colspan="5"><div class="admin-day-meta admin-day-indent"><div class="admin-day-left">' + dayCollapseBtn + '<div class="admin-day-label">' + escapeHtml(dayLabel) + '</div></div></div></td>' +
                  '</tr>');
              }

              if (currentDayCollapsed) {
                return;
              }

              const deletedBadge = deletedMeta
                ? '<span class="admin-deleted-meta">Deleted by ' + escapeHtml(deletedMeta.by) + ' at ' + escapeHtml(deletedMeta.at) + '</span>'
                : (isDeleted ? '<span class="admin-deleted-meta">Deleted</span>' : '');

              const rowClasses = [];
              if (isDeleted) rowClasses.push('admin-deleted-row');
              if (isRowPending) rowClasses.push('admin-pending-row');
              if (!isDeleted && typeMeta.rowClass) rowClasses.push(typeMeta.rowClass);
              const rowClass = rowClasses.length ? 'class="' + rowClasses.join(' ') + '"' : '';
              const verifiedOn = isVerifiedValue(entry.verified);
              const verifiedToggleHtml = isDeleted
                ? '<span class="admin-verify-toggle static ' + (verifiedOn ? 'is-on' : '') + '" title="Verified">' + (verifiedOn ? '&#10003;' : '&#9675;') + '</span>'
                : '<button type="button" class="admin-verify-toggle ' + (verifiedOn ? 'is-on' : '') + '"' + (canVerifyAction ? ' onclick="toggleAdminVerified(' + rowIndex + ')"' : '') + verifyDisabledAttr + ' title="' + escapeHtml(verifyLockTitle) + '">' + (verifiedOn ? '&#10003;' : '&#9675;') + '</button>';
              const inButtonHtml = isDeleted
                ? '<span class="admin-time-pill admin-time-in static"><span class="admin-time-label">In</span><span class="admin-time-value">' + escapeHtml(clockInDisplay) + '</span></span>'
                : '<button type="button" class="admin-time-pill admin-time-in"' + (canEditActions ? ' onclick="openAdminTimeEditor(' + rowIndex + ')"' : '') + actionDisabledAttr + ' title="' + escapeHtml(editLockTitle) + '"><span class="admin-time-label">In</span><span class="admin-time-value">' + escapeHtml(clockInDisplay) + '</span></button>';
              const outButtonHtml = isDeleted
                ? '<span class="admin-time-pill admin-time-out static"><span class="admin-time-label">Out</span><span class="admin-time-value">' + escapeHtml(clockOutDisplay) + '</span></span>'
                : '<button type="button" class="admin-time-pill admin-time-out"' + (canEditActions ? ' onclick="openAdminTimeEditor(' + rowIndex + ')"' : '') + actionDisabledAttr + ' title="' + escapeHtml(editLockTitle) + '"><span class="admin-time-label">Out</span><span class="admin-time-value">' + escapeHtml(clockOutDisplay) + '</span></button>';

              rowsHtml.push('<tr ' + rowClass + '>' +
                '<td><div class="admin-in-cell">' + getEntryTypeChipOrSpacerHtml(entry.entryType) + verifiedToggleHtml + inButtonHtml + '</div>' + rawInSub + '</td>' +
                '<td>' + outButtonHtml + rawOutSub + '</td>' +
                '<td class="admin-hours-cell"><span class="admin-hours-pill"><span class="admin-hours-pill-value">' + getHoursString(record.hoursForDisplay) + '</span><span class="admin-hours-pill-unit">Hrs</span></span></td>' +
                '<td><div class="admin-note-list">' + noteLinesHtml + deletedBadge + pendingRowBadge + pendingNoteComposer + '</div></td>' +
                '<td><div class="admin-row-actions">' +
                  (isDeleted ? '' : pendingNoteButton) +
                  (isDeleted
                    ? '<button type="button" id="' + getAdminHoldButtonId(rowIndex, 'restore') + '" class="admin-restore-btn admin-hold-action-btn"' + holdRestoreAttrs + restoreDisabledAttr + ' title="' + escapeHtml(restoreHoldTitle) + '"><span class="admin-hold-asset"><svg class="admin-hold-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="track" cx="50" cy="50" r="43"></circle><circle class="progress" cx="50" cy="50" r="43"></circle></svg><span class="admin-action-icon" aria-hidden="true">&#9851;</span></span></button>'
                    : '<button type="button" id="' + getAdminHoldButtonId(rowIndex, 'delete') + '" class="admin-delete-btn admin-hold-action-btn"' + holdDeleteAttrs + actionDisabledAttr + ' title="' + escapeHtml(deleteHoldTitle) + '"><span class="admin-hold-asset"><svg class="admin-hold-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="track" cx="50" cy="50" r="43"></circle><circle class="progress" cx="50" cy="50" r="43"></circle></svg><span class="admin-action-icon" aria-hidden="true">&#128465;&#65039;</span></span></button>') +
                '</div></td>' +
                '</tr>');
            });

            body.innerHTML = rowsHtml.join('');
            if (isManualEntryModalVisible() && adminManualEntryTargetEmail) {
              refreshManualDateTimePickers(true);
            }
          }

          function loadAdminEntries(onComplete) {
            const msg = document.getElementById('adminLoadMsg');
            const body = document.getElementById('adminEntriesBody');
            if (!body || !msg) return;
            const includeDeleted = !!(document.getElementById('adminShowDeleted') && document.getElementById('adminShowDeleted').checked);
            msg.innerText = 'Loading entries...';
            google.script.run
              .withSuccessHandler((entries) => {
                adminEntriesByRow = {};
                adminBaselineByRow = {};
                adminDraftByRow = {};
                adminVerifySaveInFlightByRow = {};
                adminVerifyQueueByRow = {};
                adminVerifyQueueOrder = [];
                adminVerifyQueueInFlight = false;
                if (adminVerifyQueueTimer) {
                  clearTimeout(adminVerifyQueueTimer);
                  adminVerifyQueueTimer = null;
                }
                cancelAllAdminRowHoldActions();
                (entries || []).forEach((entry) => {
                  adminEntriesByRow[entry.rowIndex] = entry;
                  adminBaselineByRow[entry.rowIndex] = {
                    modifiedClockInISO: entry.modifiedClockIn || '',
                    modifiedClockOutISO: entry.modifiedClockOut || '',
                    notes: entry.notes || '',
                    deleted: entry.deleted === true,
                    pendingNewNoteText: ''
                  };
                  adminDraftByRow[entry.rowIndex] = {
                    modifiedClockInISO: entry.modifiedClockIn || '',
                    modifiedClockOutISO: entry.modifiedClockOut || '',
                    notes: entry.notes || '',
                    deleted: entry.deleted === true,
                    pendingNewNoteText: ''
                  };
                });
                renderAdminEntries();
                msg.innerText = 'Loaded ' + (entries ? entries.length : 0) + ' entries.';
                setAdminPreviewWorkflowState(false, 'Generate a preview, then export from this workflow panel.');
                if (typeof onComplete === 'function') {
                  onComplete(null, entries || []);
                }
              })
              .withFailureHandler((error) => {
                msg.innerText = error.message || 'Failed to load admin entries.';
                if (typeof onComplete === 'function') {
                  onComplete(error);
                }
              })
              .getAllEntriesForAdminView(includeDeleted);
          }

          function toggleAdminRawTimes() {
            const checkbox = document.getElementById('adminShowRawTimes');
            adminShowRawTimes = !!(checkbox && checkbox.checked);
            renderAdminEntries();
          }

          function toggleAdminActivePayPeriodFilter() {
            const checkbox = document.getElementById('adminShowOnlyActivePayPeriod');
            adminShowOnlyActivePayPeriod = !(checkbox && checkbox.checked === false);
            renderAdminEntries();
          }

          function toggleAdminShowDeletedRows() {
            const checkbox = document.getElementById('adminShowDeleted');
            const showDeleted = !!(checkbox && checkbox.checked);
            if (showDeleted) {
              loadAdminEntries();
            } else {
              renderAdminEntries();
            }
          }

          function toggleAdminUserCollapsed(email) {
            const key = String(email || '').trim().toLowerCase();
            if (!key) return;
            adminCollapsedUsers[key] = !(adminCollapsedUsers[key] === true);
            renderAdminEntries();
          }

          function toggleAdminDayCollapsed(email, dayKey) {
            const emailKey = String(email || '').trim().toLowerCase();
            const dayPart = String(dayKey || '').trim();
            if (!emailKey || !dayPart) return;
            const key = emailKey + '|' + dayPart;
            adminCollapsedDays[key] = !(adminCollapsedDays[key] === true);
            renderAdminEntries();
          }

          function openAdminTimeEditor(rowIndex) {
            const entry = adminEntriesByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            if (!entry || !draft || !isAdminRowEditable(rowIndex) || adminPermissions.canEdit !== true) return;
            adminEditingRowIndex = rowIndex;
            initializeAdminTimeEditPickers();
            const effective = getAdminEffectiveFromDraft(rowIndex);
            const applyBtn = document.getElementById('adminTimeEditApplyBtn');
            document.getElementById('adminTimeEditRowLabel').innerText = 'Row ' + rowIndex + ' - ' + (entry.email || '');
            document.getElementById('adminTimeEditRawInfo').innerText =
              'Raw In: ' + (entry.rawClockIn ? formatDisplayDate(entry.rawClockIn) : 'none') +
              ' | Raw Out: ' + (entry.rawClockOut ? formatDisplayDate(entry.rawClockOut) : 'none');
            document.getElementById('adminEditClockIn').value = formatAdminDateForInput(effective.clockIn);
            document.getElementById('adminEditClockOut').value = formatAdminDateForInput(effective.clockOut);
            if (applyBtn) {
              applyBtn.disabled = true;
            }
            if (adminEditClockInPicker && adminEditClockOutPicker) {
              adminEditClockInPicker.setDate(document.getElementById('adminEditClockIn').value, false, 'Y-m-d\\TH:i');
              adminEditClockOutPicker.setDate(document.getElementById('adminEditClockOut').value, false, 'Y-m-d\\TH:i');
              refreshAdminTimeEditPickerBounds();
            }
            document.getElementById('adminEditError').style.display = 'none';
            document.getElementById('adminTimeEditModal').style.display = 'flex';
            updateDatePickerModalScrollLock();
          }

          function closeAdminTimeEditor() {
            adminEditingRowIndex = null;
            document.getElementById('adminTimeEditModal').style.display = 'none';
            updateDatePickerModalScrollLock();
          }

          function applyAdminTimeEdit() {
            if (!adminEditingRowIndex) return;
            if (adminPermissions.canEdit !== true) return;
            const rowIndex = adminEditingRowIndex;
            const entry = adminEntriesByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            const errorEl = document.getElementById('adminEditError');
            if (!entry || !draft || !errorEl || !isAdminRowEditable(rowIndex)) return;

            const inDate = parseDateTimeInputValue(document.getElementById('adminEditClockIn').value);
            const outDate = parseDateTimeInputValue(document.getElementById('adminEditClockOut').value);
            const validation = getAdminTimeEditValidationState(rowIndex, inDate, outDate);

            setPickerInputInvalid(adminEditClockInPicker, validation.inInvalid, 'admin-picker-invalid');
            setPickerInputInvalid(adminEditClockOutPicker, validation.outInvalid, 'admin-picker-invalid');

            if (!validation.valid) {
              errorEl.innerText = validation.hint || 'Updated time range is invalid.';
              errorEl.style.display = 'block';
              return;
            }

            const nextInIso = inDate.toISOString();
            const nextOutIso = outDate.toISOString();

            const rollbackDraft = Object.assign({}, draft);
            const nextModifiedInIso = normalizeModifiedAgainstRaw(nextInIso, entry.rawClockIn || '');
            const nextModifiedOutIso = normalizeModifiedAgainstRaw(nextOutIso, entry.rawClockOut || '');
            const proposedEffectiveInIso = nextModifiedInIso || entry.rawClockIn || '';
            const proposedEffectiveOutIso = nextModifiedOutIso || entry.rawClockOut || '';
            const timeActuallyChanged = (rollbackDraft.modifiedClockInISO || '') !== (nextModifiedInIso || '') ||
              (rollbackDraft.modifiedClockOutISO || '') !== (nextModifiedOutIso || '');

            draft.modifiedClockInISO = nextModifiedInIso;
            draft.modifiedClockOutISO = nextModifiedOutIso;
            saveAdminRow(rowIndex, {
              closeEditor: true,
              rollbackDraft: rollbackDraft,
              appendTimeEditNote: timeActuallyChanged
            });
          }

          function getRequiredAdminEntryId(entry, actionLabel) {
            const entryId = entry && entry.entryId ? String(entry.entryId).trim() : '';
            if (!entryId) {
              alert((actionLabel || 'Action') + ' requires a valid entry ID. Refresh and try again.');
              return '';
            }
            return entryId;
          }

          function requestAdminRestore(rowIndex) {
            const entry = adminEntriesByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            if (!entry || !draft || !isAdminRowEditable(rowIndex) || adminPermissions.canEdit !== true) return;
            if (entry._pendingActionLabel) return;
            const entryId = getRequiredAdminEntryId(entry, 'Restore');
            if (!entryId) return;

            const payload = {
              entryId: entryId,
              modifiedClockInISO: draft.modifiedClockInISO || '',
              modifiedClockOutISO: draft.modifiedClockOutISO || '',
              notes: draft.notes || '',
              deleted: false
            };

            entry._pendingActionLabel = 'Restoring...';
            renderAdminEntries();
            const msg = document.getElementById('adminLoadMsg');
            if (msg) {
              msg.innerText = 'Restoring row ' + rowIndex + '...';
            }

            google.script.run
              .withSuccessHandler((result) => {
                if (!result || !result.success) {
                  delete entry._pendingActionLabel;
                  renderAdminEntries();
                  alert((result && result.message) ? result.message : 'Restore failed.');
                  return;
                }
                if (msg) {
                  msg.innerText = 'Restored row ' + rowIndex + '.';
                }
                loadAdminEntries();
              })
              .withFailureHandler((error) => {
                delete entry._pendingActionLabel;
                renderAdminEntries();
                alert(error.message || 'Restore failed.');
              })
              .adminSaveEntryUpdate(rowIndex, payload);
          }

          function requestAdminDelete(rowIndex) {
            const entry = adminEntriesByRow[rowIndex];
            const draft = adminDraftByRow[rowIndex];
            if (!entry || !draft || !isAdminRowEditable(rowIndex) || adminPermissions.canEdit !== true) return;
            if (entry._pendingActionLabel) return;
            const entryId = getRequiredAdminEntryId(entry, 'Delete');
            if (!entryId) return;

            const payload = {
              entryId: entryId,
              modifiedClockInISO: draft.modifiedClockInISO || '',
              modifiedClockOutISO: draft.modifiedClockOutISO || '',
              notes: draft.notes || '',
              deleted: true
            };

            const showDeleted = getAdminShowDeletedState();
            const msg = document.getElementById('adminLoadMsg');

            if (!showDeleted) {
              delete adminEntriesByRow[rowIndex];
              delete adminBaselineByRow[rowIndex];
              delete adminDraftByRow[rowIndex];
              renderAdminEntries();
              if (msg) {
                msg.innerText = 'Deleted row ' + rowIndex + '.';
              }
            } else {
              entry._pendingActionLabel = 'Deleting...';
              renderAdminEntries();
              if (msg) {
                msg.innerText = 'Deleting row ' + rowIndex + '...';
              }
            }

            google.script.run
              .withSuccessHandler((result) => {
                if (!result || !result.success) {
                  if (showDeleted && entry) {
                    delete entry._pendingActionLabel;
                    renderAdminEntries();
                  } else if (!showDeleted) {
                    adminEntriesByRow[rowIndex] = entry;
                    adminBaselineByRow[rowIndex] = draft;
                    adminDraftByRow[rowIndex] = draft;
                    renderAdminEntries();
                  }
                  alert((result && result.message) ? result.message : 'Delete failed.');
                  return;
                }
                if (showDeleted && entry) {
                  entry.deleted = true;
                  delete entry._pendingActionLabel;
                  renderAdminEntries();
                } else if (!showDeleted) {
                  if (msg) {
                    msg.innerText = 'Deleted row ' + rowIndex + '.';
                  }
                }
              })
              .withFailureHandler((error) => {
                if (showDeleted && entry) {
                  delete entry._pendingActionLabel;
                  renderAdminEntries();
                } else if (!showDeleted) {
                  adminEntriesByRow[rowIndex] = entry;
                  adminBaselineByRow[rowIndex] = draft;
                  adminDraftByRow[rowIndex] = draft;
                  renderAdminEntries();
                }
                alert(error.message || 'Delete failed.');
              })
              .adminSaveEntryUpdate(rowIndex, payload);
          }

          function toggleAdminVerified(rowIndex) {
            const entry = adminEntriesByRow[rowIndex];
            if (!entry || entry.deleted || !isAdminRowEditable(rowIndex) || adminPermissions.canVerify !== true) return;
            if (adminVerifySaveInFlightByRow[rowIndex] === true) return;
            const entryId = getRequiredAdminEntryId(entry, 'Verify');
            if (!entryId) return;

            const previousVerified = isVerifiedValue(entry.verified);
            const nextVerified = !previousVerified;
            if (adminVerifyQueueByRow[rowIndex]) return;
            adminVerifySaveInFlightByRow[rowIndex] = true;
            adminVerifyQueueByRow[rowIndex] = {
              rowIndex: rowIndex,
              entryId: entryId,
              previousVerified: previousVerified,
              nextVerified: nextVerified,
              previousNotes: String(entry.notes || '')
            };
            adminVerifyQueueOrder.push(rowIndex);
            entry.verified = nextVerified;
            renderAdminEntries();

            scheduleAdminVerifyQueueFlush();
          }

          function scheduleAdminVerifyQueueFlush() {
            if (adminVerifyQueueTimer) return;
            adminVerifyQueueTimer = setTimeout(() => {
              adminVerifyQueueTimer = null;
              flushAdminVerifyQueue();
            }, 250);
          }

          function flushAdminVerifyQueue() {
            if (adminVerifyQueueInFlight) return;
            const pendingRowIndices = adminVerifyQueueOrder.slice();
            if (pendingRowIndices.length === 0) return;

            const pendingActions = pendingRowIndices
              .map((rowIndex) => adminVerifyQueueByRow[rowIndex])
              .filter(Boolean);
            if (pendingActions.length === 0) {
              adminVerifyQueueOrder = [];
              return;
            }

            debugClientLog('adminVerify.batch.request', {
              total: pendingActions.length,
              rows: pendingActions.map((action) => action.rowIndex)
            });

            adminVerifyQueueInFlight = true;
            const msg = document.getElementById('adminLoadMsg');
            if (msg) {
              msg.innerText = 'Saving ' + pendingActions.length + ' verified change' + (pendingActions.length === 1 ? '' : 's') + '...';
            }

            google.script.run
              .withSuccessHandler((results) => {
                adminVerifyQueueInFlight = false;
                const resultList = Array.isArray(results) ? results : [];
                const resultByRow = {};
                resultList.forEach((result) => {
                  if (result && result.rowIndex !== undefined && result.rowIndex !== null) {
                    resultByRow[result.rowIndex] = result;
                  }
                });
                let successCount = 0;
                const failedRows = [];

                pendingActions.forEach((action) => {
                  const rowIndex = action.rowIndex;
                  const entry = adminEntriesByRow[rowIndex];
                  const result = resultByRow[rowIndex] || null;
                  delete adminVerifyQueueByRow[rowIndex];
                  delete adminVerifySaveInFlightByRow[rowIndex];

                  if (!result || !result.success) {
                    const failureReason = (result && result.message) ? result.message : 'Unknown verify error.';
                    if (entry) {
                      entry.verified = action.previousVerified;
                      entry.notes = action.previousNotes;
                    }
                    if (adminDraftByRow[rowIndex]) {
                      adminDraftByRow[rowIndex].notes = action.previousNotes;
                      adminDraftByRow[rowIndex].pendingNewNoteText = '';
                    }
                    if (adminBaselineByRow[rowIndex]) {
                      adminBaselineByRow[rowIndex].notes = action.previousNotes;
                      adminBaselineByRow[rowIndex].pendingNewNoteText = '';
                    }
                    debugClientError('adminVerify.batch.row_failure', {
                      rowIndex: rowIndex,
                      reason: failureReason,
                      result: result || null
                    });
                    failedRows.push({ rowIndex: rowIndex, reason: failureReason });
                    return;
                  }

                  successCount += 1;
                  debugClientLog('adminVerify.batch.row_success', {
                    rowIndex: rowIndex,
                    verified: (result.verified === undefined || result.verified === null)
                      ? action.nextVerified === true
                      : isVerifiedValue(result.verified)
                  });

                  if (entry) {
                    entry.verified = (result.verified === undefined || result.verified === null)
                      ? action.nextVerified === true
                      : isVerifiedValue(result.verified);
                    if (typeof result.notes === 'string') {
                      entry.notes = result.notes;
                    }
                  }
                  if (typeof result.notes === 'string') {
                    if (adminDraftByRow[rowIndex]) {
                      adminDraftByRow[rowIndex].notes = result.notes;
                      adminDraftByRow[rowIndex].pendingNewNoteText = '';
                    }
                    if (adminBaselineByRow[rowIndex]) {
                      adminBaselineByRow[rowIndex].notes = result.notes;
                      adminBaselineByRow[rowIndex].pendingNewNoteText = '';
                    }
                  }
                });

                adminVerifyQueueOrder = adminVerifyQueueOrder.filter((rowIndex) => adminVerifyQueueByRow[rowIndex]);
                renderAdminEntries();
                if (msg && adminVerifyQueueOrder.length === 0) {
                  if (failedRows.length > 0) {
                    const firstFailure = failedRows[0];
                    msg.innerText = 'Saved ' + successCount + ' verified change' + (successCount === 1 ? '' : 's') + '; ' +
                      'failed ' + failedRows.length + ' row' + (failedRows.length === 1 ? '' : 's') +
                      ' (first: row ' + firstFailure.rowIndex + ': ' + firstFailure.reason + ').';
                  } else {
                    msg.innerText = 'Saved ' + pendingActions.length + ' verified change' + (pendingActions.length === 1 ? '' : 's') + '.';
                  }
                }
                debugClientLog('adminVerify.batch.complete', {
                  requested: pendingActions.length,
                  succeeded: successCount,
                  failed: failedRows.length,
                  remainingQueued: adminVerifyQueueOrder.length
                });
                if (adminVerifyQueueOrder.length > 0) {
                  scheduleAdminVerifyQueueFlush();
                }
              })
              .withFailureHandler((error) => {
                adminVerifyQueueInFlight = false;
                debugClientError('adminVerify.batch.network_failure', {
                  rows: pendingActions.map((action) => action.rowIndex),
                  error: error || null
                });
                pendingActions.forEach((action) => {
                  const rowIndex = action.rowIndex;
                  const entry = adminEntriesByRow[rowIndex];
                  delete adminVerifyQueueByRow[rowIndex];
                  delete adminVerifySaveInFlightByRow[rowIndex];
                  if (entry) {
                    entry.verified = action.previousVerified;
                    entry.notes = action.previousNotes;
                  }
                  if (adminDraftByRow[rowIndex]) {
                    adminDraftByRow[rowIndex].notes = action.previousNotes;
                    adminDraftByRow[rowIndex].pendingNewNoteText = '';
                  }
                  if (adminBaselineByRow[rowIndex]) {
                    adminBaselineByRow[rowIndex].notes = action.previousNotes;
                    adminBaselineByRow[rowIndex].pendingNewNoteText = '';
                  }
                });
                adminVerifyQueueOrder = adminVerifyQueueOrder.filter((rowIndex) => adminVerifyQueueByRow[rowIndex]);
                renderAdminEntries();
                if (msg) {
                  msg.innerText = error.message || 'Failed to update verified state.';
                }
                alert(error.message || 'Failed to update verified state.');
                if (adminVerifyQueueOrder.length > 0) {
                  scheduleAdminVerifyQueueFlush();
                }
              })
                    .adminSetEntryVerifiedBatch(pendingActions.map((action) => ({ rowIndex: action.rowIndex, entryId: action.entryId, verified: action.nextVerified })));
          }

          function saveAdminRow(rowIndex, options) {
            if (adminPermissions.canEdit !== true) return;
            const saveOptions = options || {};
            const draft = adminDraftByRow[rowIndex];
            const entry = adminEntriesByRow[rowIndex];
            if (!draft) return;
            if (!computeAdminRowDirty(rowIndex)) return;

            const payload = {
              entryId: getRequiredAdminEntryId(entry, 'Save'),
              modifiedClockInISO: draft.modifiedClockInISO || '',
              modifiedClockOutISO: draft.modifiedClockOutISO || '',
              notes: composeAdminNotesForSave(rowIndex),
              deleted: draft.deleted === true,
              clientAppendedTimeEditNote: false
            };
            if (!payload.entryId) return;

            if (saveOptions.appendTimeEditNote === true && !payload.deleted) {
              const timeEditNote = buildAdminTimeEditedNote();
              payload.notes = payload.notes ? payload.notes + '; ' + timeEditNote : timeEditNote;
              payload.clientAppendedTimeEditNote = true;
            }
            const baselineBefore = adminBaselineByRow[rowIndex] ? Object.assign({}, adminBaselineByRow[rowIndex]) : null;
            const draftBefore = saveOptions.rollbackDraft
              ? Object.assign({}, saveOptions.rollbackDraft)
              : Object.assign({}, draft);
            const entryBefore = entry ? Object.assign({}, entry) : null;

            // Optimistic UI update: reflect the edit immediately before server round-trip.
            adminBaselineByRow[rowIndex] = {
              modifiedClockInISO: payload.modifiedClockInISO,
              modifiedClockOutISO: payload.modifiedClockOutISO,
              notes: payload.notes,
              deleted: payload.deleted,
              pendingNewNoteText: ''
            };

            if (entry) {
              entry.modifiedClockIn = payload.modifiedClockInISO || null;
              entry.modifiedClockOut = payload.modifiedClockOutISO || null;
              entry.effectiveClockIn = payload.modifiedClockInISO || entry.rawClockIn || null;
              entry.effectiveClockOut = payload.modifiedClockOutISO || entry.rawClockOut || null;
              entry.notes = payload.notes;
              entry.deleted = payload.deleted;
            }

            draft.pendingNewNoteText = '';
            draft.notes = payload.notes;

            if (saveOptions.closeEditor) {
              closeAdminTimeEditor();
            }

            renderAdminEntries();

            const msg = document.getElementById('adminLoadMsg');
            if (msg) {
              msg.innerText = 'Saving row ' + rowIndex + ' to server...';
            }

            google.script.run
              .withSuccessHandler((result) => {
                if (!result || !result.success) {
                  if (baselineBefore) {
                    adminBaselineByRow[rowIndex] = baselineBefore;
                  }
                  adminDraftByRow[rowIndex] = draftBefore;
                  if (entryBefore) {
                    adminEntriesByRow[rowIndex] = entryBefore;
                  }
                  renderAdminEntries();
                  if (msg) {
                    msg.innerText = 'Save failed for row ' + rowIndex + '.';
                  }
                  alert((result && result.message) ? result.message : 'Save failed.');
                  return;
                }
                if (payload.deleted) {
                  loadAdminEntries();
                  return;
                }
                if (msg) {
                  msg.innerText = 'Saved row ' + rowIndex + '.';
                }
              })
              .withFailureHandler((error) => {
                if (baselineBefore) {
                  adminBaselineByRow[rowIndex] = baselineBefore;
                }
                adminDraftByRow[rowIndex] = draftBefore;
                if (entryBefore) {
                  adminEntriesByRow[rowIndex] = entryBefore;
                }
                renderAdminEntries();
                if (msg) {
                  msg.innerText = 'Save failed for row ' + rowIndex + '.';
                }
                alert(error.message || 'Save failed.');
              })
              .adminSaveEntryUpdate(rowIndex, payload);
          }

           function refreshStatus() {
             if (pendingRefreshStatus) return;
             if (!navigator.onLine) {
               document.getElementById('error').innerText = 'Unable to refresh while offline.';
               document.getElementById('error').style.display = 'block';
               return;
             }
             const startedAt = Date.now();
             pendingRefreshStatus = true;
             setRefreshStatusBusy(true);
             document.getElementById('loading').style.display = 'block';
             document.getElementById('message').style.display = 'none';
             document.getElementById('error').style.display = 'none';
             const ct = document.getElementById('clockToggle'); if (ct) ct.disabled = true;
             
             google.script.run
              .withSuccessHandler((result) => {
                document.getElementById('loading').style.display = 'none';
                pendingRefreshStatus = false;
                setRefreshStatusBusy(false);
                debugClientLog('refreshStatus.success', {
                  isClockedIn: !!(result && result.isClockedIn),
                  durationMs: Date.now() - startedAt
                });
                 latestStatusTextRaw = String((result && result.status) || latestStatusTextRaw || '');
                 setStatusText(result.status);
                  if (typeof result.isClockedIn === 'boolean') { isClockedIn = result.isClockedIn; }
                    updateClockNotePlaceholder();
                  const ct = document.getElementById('clockToggle');
                  if (ct) { ct.innerText = isClockedIn ? '🔴 Clock Out' : '🟢 Clock In'; ct.disabled = false; }
                
                refreshRecentEntries();
                  loadEmployeeSchedulePreview();
              })
              .withFailureHandler((error) => {
                document.getElementById('loading').style.display = 'none';
                pendingRefreshStatus = false;
                setRefreshStatusBusy(false);
                debugClientError('refreshStatus.failure', {
                  message: (error && error.message) ? error.message : 'Unknown error',
                  durationMs: Date.now() - startedAt
                });
                 document.getElementById('error').innerText = error.message || 'Unable to refresh.';
                 document.getElementById('error').style.display = 'block';
               })
               .refreshCurrentStatus();
           }

           function setClockToggleEnabled(enabled) {
             const ct = document.getElementById('clockToggle');
             if (ct) ct.disabled = !enabled;
           }

          function updateDatePickerModalScrollLock() {
            const manualModalEl = document.getElementById('manualEntryModal');
            const adminTimeModalEl = document.getElementById('adminTimeEditModal');
            const manualModalOpen = !!(manualModalEl && manualModalEl.style.display === 'flex');
            const adminTimeModalOpen = !!(adminTimeModalEl && adminTimeModalEl.style.display === 'flex');
            document.body.classList.toggle('timecard-modal-open', manualModalOpen || adminTimeModalOpen);
          }

          function syncManualEntryTypeCheckboxes() {
            const worked = document.getElementById('manualEntryTypeWorked');
            const vacation = document.getElementById('manualEntryTypeVacation');
            const sick = document.getElementById('manualEntryTypeSick');
            if (worked) worked.checked = manualEntryType === 'worked';
            if (vacation) vacation.checked = manualEntryType === 'vacation';
            if (sick) sick.checked = manualEntryType === 'sick';
          }

          function setManualEntryType(nextType) {
            manualEntryType = normalizeEntryTypeClient(nextType);
            syncManualEntryTypeCheckboxes();
          }

          function handleManualEntryTypeChange(nextType) {
            setManualEntryType(nextType);
          }

          function getManualEntryType() {
            return normalizeEntryTypeClient(manualEntryType);
          }

          function formatForInput(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const mi = String(date.getMinutes()).padStart(2, '0');
            return y + '-' + m + '-' + d + 'T' + h + ':' + mi;
          }

          function parseDateTimeInputValue(value) {
            const text = String(value || '').trim();
            if (!text) return null;
            const parsed = new Date(text);
            return isNaN(parsed.getTime()) ? null : parsed;
          }

          function getCurrentManualTargetEmail() {
            const target = String(adminManualEntryTargetEmail || '').trim().toLowerCase();
            if (target) return target;
            return String(currentUserEmail || '').trim().toLowerCase();
          }

          function floorToManualStep(ms) {
            return Math.floor(ms / MANUAL_PICKER_STEP_MS) * MANUAL_PICKER_STEP_MS;
          }

          function ceilToManualStep(ms) {
            return Math.ceil(ms / MANUAL_PICKER_STEP_MS) * MANUAL_PICKER_STEP_MS;
          }

          function getManualAllowedWindow() {
            const now = new Date();
            let minDate = null;
            let maxDate = new Date(now.getTime());
            const range = preloadedAllowedRange;

            if (range && range.minDateISO && range.maxDateISO) {
              const minParts = String(range.minDateISO).split('-');
              minDate = new Date(parseInt(minParts[0], 10), parseInt(minParts[1], 10) - 1, parseInt(minParts[2], 10));
              minDate.setHours(0, 0, 0, 0);

              const maxParts = String(range.maxDateISO).split('-');
              const configuredMaxDate = new Date(parseInt(maxParts[0], 10), parseInt(maxParts[1], 10) - 1, parseInt(maxParts[2], 10));
              configuredMaxDate.setHours(23, 59, 59, 999);
              if (configuredMaxDate.getTime() < maxDate.getTime()) {
                maxDate = configuredMaxDate;
              }
            } else {
              maxDate.setSeconds(0, 0);
              minDate = new Date(maxDate);
              minDate.setDate(minDate.getDate() - 13);
              minDate.setHours(0, 0, 0, 0);
            }

            return {
              minDate,
              maxDate,
              minMs: minDate.getTime(),
              maxMs: maxDate.getTime()
            };
          }

          function collectManualConflictIntervals(targetEmail) {
            const intervals = [];
            const target = String(targetEmail || '').trim().toLowerCase();
            if (!target) return intervals;

            if (adminManualEntryTargetEmail) {
              const rowKeys = Object.keys(adminEntriesByRow || {});
              for (let i = 0; i < rowKeys.length; i++) {
                const rowIndex = Number(rowKeys[i]);
                const entry = adminEntriesByRow[rowIndex];
                if (!entry || entry.deleted) continue;
                const entryEmail = String(entry.email || '').trim().toLowerCase();
                if (entryEmail !== target) continue;

                const effective = getAdminEffectiveFromDraft(rowIndex);
                if (!effective || !effective.clockIn) continue;
                const start = new Date(effective.clockIn);
                if (isNaN(start.getTime())) continue;
                const end = effective.clockOut ? new Date(effective.clockOut) : new Date();
                if (isNaN(end.getTime())) continue;
                if (end.getTime() <= start.getTime()) continue;
                intervals.push({ startMs: start.getTime(), endMs: end.getTime() });
              }
            } else {
              const list = Array.isArray(recentEntries) ? recentEntries : [];
              for (let i = 0; i < list.length; i++) {
                const entry = list[i];
                if (!entry || entry.deleted || !entry.clockIn) continue;
                const start = new Date(entry.clockIn);
                if (isNaN(start.getTime())) continue;
                const end = entry.clockOut ? new Date(entry.clockOut) : new Date();
                if (isNaN(end.getTime())) continue;
                if (end.getTime() <= start.getTime()) continue;
                intervals.push({ startMs: start.getTime(), endMs: end.getTime() });
              }
            }

            intervals.sort((a, b) => a.startMs - b.startMs);
            const merged = [];
            for (let i = 0; i < intervals.length; i++) {
              const current = intervals[i];
              const last = merged.length > 0 ? merged[merged.length - 1] : null;
              if (!last || current.startMs > last.endMs) {
                merged.push({ startMs: current.startMs, endMs: current.endMs });
              } else {
                last.endMs = Math.max(last.endMs, current.endMs);
              }
            }
            return merged;
          }

          function isMsWithinAnyInterval(ms, intervals) {
            const list = Array.isArray(intervals) ? intervals : [];
            for (let i = 0; i < list.length; i++) {
              if (ms >= list[i].startMs && ms < list[i].endMs) {
                return true;
              }
            }
            return false;
          }

          function hasOverlapWithIntervals(startMs, endMs, intervals) {
            const list = Array.isArray(intervals) ? intervals : [];
            for (let i = 0; i < list.length; i++) {
              if (startMs < list[i].endMs && endMs > list[i].startMs) {
                return true;
              }
            }
            return false;
          }

          function buildManualPickerRuleState() {
            const windowBounds = getManualAllowedWindow();
            const targetEmail = getCurrentManualTargetEmail();
            const openEntryStart = adminManualEntryTargetEmail
              ? getOpenEntryStartForEmployee(targetEmail)
              : getOpenEntryStart();

            let latestAllowedMs = windowBounds.maxMs;
            if (openEntryStart && !isNaN(openEntryStart.getTime())) {
              latestAllowedMs = Math.min(latestAllowedMs, openEntryStart.getTime() - MANUAL_PICKER_STEP_MS);
            }
            latestAllowedMs = Math.max(latestAllowedMs, windowBounds.minMs);

            const clockInInput = document.getElementById('manualClockIn');
            const selectedClockIn = clockInInput ? parseDateTimeInputValue(clockInInput.value) : null;
            const selectedClockInMs = selectedClockIn ? floorToManualStep(selectedClockIn.getTime()) : null;

            const conflictIntervals = collectManualConflictIntervals(targetEmail);

            let outMinMs = windowBounds.minMs + MANUAL_PICKER_STEP_MS;
            let outMaxMs = latestAllowedMs;
            if (selectedClockInMs !== null) {
              outMinMs = Math.max(outMinMs, selectedClockInMs + MANUAL_PICKER_STEP_MS);
              outMaxMs = Math.min(outMaxMs, selectedClockInMs + MANUAL_ENTRY_MAX_SPAN_MS);
            }

            return {
              targetEmail,
              minMs: windowBounds.minMs,
              maxMs: windowBounds.maxMs,
              latestAllowedMs,
              selectedClockInMs,
              outMinMs,
              outMaxMs,
              conflictIntervals
            };
          }

          function isSelectableManualClockIn(dateObj) {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
            if (!manualPickerRuleState) return true;
            const ms = floorToManualStep(dateObj.getTime());
            if (ms < manualPickerRuleState.minMs || ms > manualPickerRuleState.latestAllowedMs) return false;
            if (isMsWithinAnyInterval(ms, manualPickerRuleState.conflictIntervals)) return false;

            const minOut = ms + MANUAL_PICKER_STEP_MS;
            const maxOut = Math.min(manualPickerRuleState.latestAllowedMs, ms + MANUAL_ENTRY_MAX_SPAN_MS);
            if (minOut > maxOut) return false;

            for (let probe = minOut; probe <= maxOut; probe += MANUAL_PICKER_STEP_MS) {
              if (!hasOverlapWithIntervals(ms, probe, manualPickerRuleState.conflictIntervals)) {
                return true;
              }
            }
            return false;
          }

          function getManualClockInInvalidReason(dateObj) {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
              return 'Clock In must be a valid date and time.';
            }
            if (!manualPickerRuleState) return '';

            const ms = floorToManualStep(dateObj.getTime());
            if (ms < manualPickerRuleState.minMs) {
              return 'Clock In is before the allowed date range.';
            }
            if (ms > manualPickerRuleState.latestAllowedMs) {
              if (manualPickerRuleState.latestAllowedMs < manualPickerRuleState.maxMs) {
                return 'Clock In must be before the current open clock-in entry.';
              }
              return 'Clock In is after the allowed date range.';
            }
            if (isMsWithinAnyInterval(ms, manualPickerRuleState.conflictIntervals)) {
              return 'Clock In overlaps an existing time entry.';
            }

            const minOut = ms + MANUAL_PICKER_STEP_MS;
            const maxOut = Math.min(manualPickerRuleState.latestAllowedMs, ms + MANUAL_ENTRY_MAX_SPAN_MS);
            if (minOut > maxOut) {
              return 'Clock In leaves no valid Clock Out window.';
            }
            for (let probe = minOut; probe <= maxOut; probe += MANUAL_PICKER_STEP_MS) {
              if (!hasOverlapWithIntervals(ms, probe, manualPickerRuleState.conflictIntervals)) {
                return '';
              }
            }
            return 'Clock In leaves no valid Clock Out window because of overlapping entries.';
          }

          function isSelectableManualClockOut(dateObj) {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
            if (!manualPickerRuleState) return true;
            if (manualPickerRuleState.selectedClockInMs === null) return false;
            const ms = floorToManualStep(dateObj.getTime());
            if (ms < manualPickerRuleState.outMinMs || ms > manualPickerRuleState.outMaxMs) return false;
            if (hasOverlapWithIntervals(manualPickerRuleState.selectedClockInMs, ms, manualPickerRuleState.conflictIntervals)) return false;
            return true;
          }

          function getManualClockOutInvalidReason(dateObj) {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
              return 'Clock Out must be a valid date and time.';
            }
            if (!manualPickerRuleState) return '';
            if (manualPickerRuleState.selectedClockInMs === null) {
              return 'Select Clock In first.';
            }

            const ms = floorToManualStep(dateObj.getTime());
            const minOut = manualPickerRuleState.selectedClockInMs + MANUAL_PICKER_STEP_MS;
            const maxSpanOut = manualPickerRuleState.selectedClockInMs + MANUAL_ENTRY_MAX_SPAN_MS;

            if (ms < minOut) {
              return 'Clock Out must be after Clock In.';
            }
            if (ms > maxSpanOut) {
              return 'Clock Out exceeds the 14-hour maximum shift length.';
            }
            if (ms < manualPickerRuleState.outMinMs) {
              return 'Clock Out is before the allowed date range.';
            }
            if (ms > manualPickerRuleState.outMaxMs) {
              if (manualPickerRuleState.outMaxMs < maxSpanOut) {
                return 'Clock Out must be before the current open clock-in entry.';
              }
              return 'Clock Out is after the allowed date range.';
            }
            if (hasOverlapWithIntervals(manualPickerRuleState.selectedClockInMs, ms, manualPickerRuleState.conflictIntervals)) {
              return 'Clock Out creates an overlap with an existing time entry.';
            }
            return '';
          }

          function setPickerInputInvalid(picker, invalid, className) {
            if (!picker) return;
            const targets = [picker.input, picker.altInput];
            targets.forEach((target) => {
              if (!target || !target.classList) return;
              target.classList.toggle(className, invalid === true);
            });
          }

          function getPickerSelectedDate(picker) {
            if (!picker || !Array.isArray(picker.selectedDates) || picker.selectedDates.length === 0) return null;
            const d = picker.selectedDates[0];
            return (d instanceof Date && !isNaN(d.getTime())) ? new Date(d.getTime()) : null;
          }

          function ensureNativeDateTimeFallback(inputIdList) {
            const ids = Array.isArray(inputIdList) ? inputIdList : [];
            ids.forEach((id) => {
              const el = document.getElementById(id);
              if (!el) return;
              if (el.type !== 'datetime-local') {
                el.type = 'datetime-local';
              }
              el.step = String(MANUAL_PICKER_STEP_MS / 1000);
              el.setAttribute('inputmode', 'numeric');
            });
          }

          function stepPickerTimeByInput(picker, inputEl, direction) {
            if (!picker || !inputEl || !direction) return;
            const baseDate = getPickerSelectedDate(picker) || new Date();
            const next = new Date(baseDate.getTime());
            if (inputEl.classList.contains('flatpickr-minute')) {
              next.setMinutes(next.getMinutes() + (MANUAL_PICKER_MINUTE_INCREMENT * direction));
            } else if (inputEl.classList.contains('flatpickr-hour')) {
              next.setHours(next.getHours() + direction);
            } else if (inputEl.classList.contains('flatpickr-am-pm')) {
              next.setHours(next.getHours() + (next.getHours() >= 12 ? -12 : 12));
            } else {
              return;
            }
            picker.setDate(next, true, 'Y-m-d\\TH:i');
          }

          function attachPickerTimeScrollInteractions(picker) {
            if (!picker || !picker.calendarContainer) return;
            const controls = picker.calendarContainer.querySelectorAll('.flatpickr-hour, .flatpickr-minute, .flatpickr-am-pm');
            controls.forEach((control) => {
              if (!control || control.dataset.timeScrollBound === '1') return;
              control.dataset.timeScrollBound = '1';
              control.addEventListener('wheel', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const direction = e.deltaY > 0 ? -1 : 1;
                stepPickerTimeByInput(picker, control, direction);
              }, { passive: false });
              let touchY = null;
              control.addEventListener('touchstart', function(e) {
                if (!e.touches || e.touches.length === 0) return;
                touchY = e.touches[0].clientY;
              }, { passive: true });
              control.addEventListener('touchmove', function(e) {
                if (!e.touches || e.touches.length === 0 || touchY === null) return;
                const nextY = e.touches[0].clientY;
                const delta = touchY - nextY;
                if (Math.abs(delta) >= 12) {
                  const direction = delta > 0 ? 1 : -1;
                  stepPickerTimeByInput(picker, control, direction);
                  touchY = nextY;
                }
              }, { passive: true });
              control.addEventListener('touchend', function() {
                touchY = null;
              }, { passive: true });
            });
          }

          function updateManualPickerValidityHints() {
            const errorEl = document.getElementById('manualError');
            const submitBtn = document.getElementById('manualSubmit');
            if (!manualClockInPicker || !manualClockOutPicker || !errorEl) return;
            const inDate = parseDateTimeInputValue(manualClockInPicker.input ? manualClockInPicker.input.value : '');
            const outDate = parseDateTimeInputValue(manualClockOutPicker.input ? manualClockOutPicker.input.value : '');
            const hasIn = !!(inDate && !isNaN(inDate.getTime()));
            const hasOut = !!(outDate && !isNaN(outDate.getTime()));
            const inReason = hasIn ? getManualClockInInvalidReason(inDate) : '';
            let outReason = '';
            let hint = '';
            const inInvalid = inReason !== '';
            let outInvalid = false;

            if (hasIn && hasOut) {
              if (outDate.getTime() <= inDate.getTime()) {
                outInvalid = true;
                hint = 'Clock Out must be after Clock In.';
              } else {
                outReason = getManualClockOutInvalidReason(outDate);
                outInvalid = outReason !== '';
                hint = outReason;
              }
            }
            if (!hint && inInvalid) {
              hint = inReason;
            }

            setPickerInputInvalid(manualClockInPicker, inInvalid, 'manual-picker-invalid');
            setPickerInputInvalid(manualClockOutPicker, outInvalid, 'manual-picker-invalid');

            const shouldDisableSubmit = !hasIn || !hasOut || inInvalid || outInvalid;
            if (submitBtn) {
              submitBtn.disabled = shouldDisableSubmit;
            }

            if (hint) {
              errorEl.innerText = hint;
              errorEl.style.display = 'block';
            } else if (
              errorEl.innerText.indexOf('Clock In ') === 0 ||
              errorEl.innerText.indexOf('Clock Out ') === 0 ||
              errorEl.innerText.indexOf('Select Clock In first.') === 0
            ) {
              errorEl.style.display = 'none';
              errorEl.innerText = '';
            }
          }

          function initializeManualDateTimePickers() {
            if (manualClockInPicker || manualClockOutPicker) return;
            if (typeof flatpickr !== 'function') {
              ensureNativeDateTimeFallback(['manualClockIn', 'manualClockOut']);
              return;
            }

            const clockInInput = document.getElementById('manualClockIn');
            const clockOutInput = document.getElementById('manualClockOut');
            if (!clockInInput || !clockOutInput) return;

            const commonOptions = {
              enableTime: true,
              dateFormat: 'Y-m-d\\TH:i',
              altInput: true,
              altFormat: 'm/d/Y h:i K',
              time_24hr: false,
              minuteIncrement: MANUAL_PICKER_MINUTE_INCREMENT,
              disableMobile: true,
              allowInput: false
            };

            manualClockInPicker = flatpickr(clockInInput, Object.assign({}, commonOptions, {
              onReady: function(_, __, instance) {
                attachPickerTimeScrollInteractions(instance);
              },
              onOpen: function() {
                attachPickerTimeScrollInteractions(manualClockInPicker);
                refreshManualDateTimePickers(true);
              },
              onChange: function() {
                refreshManualDateTimePickers(true);
              },
              onValueUpdate: function() {
                updateManualPickerValidityHints();
              }
            }));

            manualClockOutPicker = flatpickr(clockOutInput, Object.assign({}, commonOptions, {
              onReady: function(_, __, instance) {
                attachPickerTimeScrollInteractions(instance);
              },
              onOpen: function() {
                attachPickerTimeScrollInteractions(manualClockOutPicker);
                refreshManualDateTimePickers(true);
              },
              onChange: function() {
                updateManualPickerValidityHints();
              },
              onValueUpdate: function() {
                updateManualPickerValidityHints();
              }
            }));
          }

          function refreshManualDateTimePickers(keepClockOutValue) {
            initializeManualDateTimePickers();
            manualPickerRuleState = buildManualPickerRuleState();
            const manualWindow = getManualAllowedWindow();

            const clockInInput = document.getElementById('manualClockIn');
            const clockOutInput = document.getElementById('manualClockOut');
            const manualErrorEl = document.getElementById('manualError');
            if (!clockInInput || !clockOutInput) return;
            if (!manualClockInPicker || !manualClockOutPicker) return;

            const disableOutsideManualRange = buildDateOnlyDisablePredicate(manualWindow.minDate, manualWindow.maxDate);
            manualClockInPicker.set('disable', [disableOutsideManualRange]);
            manualClockOutPicker.set('disable', [disableOutsideManualRange]);

            if (!parseDateTimeInputValue(clockInInput.value)) {
              const fallbackClockIn = new Date();
              fallbackClockIn.setHours(8, 0, 0, 0);
              manualClockInPicker.setDate(fallbackClockIn, false, 'Y-m-d\\TH:i');
            }

            if (!keepClockOutValue || !parseDateTimeInputValue(clockOutInput.value)) {
              const fallbackClockOut = new Date();
              fallbackClockOut.setHours(13, 0, 0, 0);
              manualClockOutPicker.setDate(fallbackClockOut, false, 'Y-m-d\\TH:i');
            }

            if (manualErrorEl && manualErrorEl.style.display === 'none') {
              if (!parseDateTimeInputValue(clockInInput.value) || !parseDateTimeInputValue(clockOutInput.value)) {
                manualErrorEl.innerText = 'No available manual entry slot in the selected range.';
                manualErrorEl.style.display = 'block';
              }
            }
            updateManualPickerValidityHints();
          }

          function setDateTimeConstraints(callback) {
            const clockInInput = document.getElementById('manualClockIn');
            const clockOutInput = document.getElementById('manualClockOut');
            const dateRangeInfo = document.getElementById('dateRangeInfo');
            const range = preloadedAllowedRange;
            const now = new Date();
            const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
            const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0, 0);

            clockInInput.value = formatForInput(defaultStart);
            clockOutInput.value = formatForInput(defaultEnd);

            if (dateRangeInfo) {
              if (range && range.minDateISO && range.maxDateISO) {
                dateRangeInfo.innerText = 'Current pay period: ' + range.minDateStr + ' through ' + range.maxDateStr + '.';
              } else {
                dateRangeInfo.innerText = 'Use a date within the current pay period window.';
              }
            }

            refreshManualDateTimePickers(false);

            if (typeof callback === 'function') {
              callback();
            }
          }

          function initializeAdminTimeEditPickers() {
            if (adminEditClockInPicker || adminEditClockOutPicker) return;
            if (typeof flatpickr !== 'function') {
              ensureNativeDateTimeFallback(['adminEditClockIn', 'adminEditClockOut']);
              return;
            }

            const inEl = document.getElementById('adminEditClockIn');
            const outEl = document.getElementById('adminEditClockOut');
            if (!inEl || !outEl) return;

            const options = {
              enableTime: true,
              dateFormat: 'Y-m-d\\TH:i',
              altInput: true,
              altFormat: 'm/d/Y h:i K',
              time_24hr: false,
              minuteIncrement: MANUAL_PICKER_MINUTE_INCREMENT,
              disableMobile: true,
              allowInput: false
            };

            adminEditClockInPicker = flatpickr(inEl, Object.assign({}, options, {
              onReady: function(_, __, instance) {
                attachPickerTimeScrollInteractions(instance);
                updateAdminTimeEditValidityHints();
              },
              onOpen: function() {
                attachPickerTimeScrollInteractions(adminEditClockInPicker);
                refreshAdminTimeEditPickerBounds();
              },
              onChange: function() {
                refreshAdminTimeEditPickerBounds();
                updateAdminTimeEditValidityHints();
              },
              onValueUpdate: function() {
                updateAdminTimeEditValidityHints();
              }
            }));
            adminEditClockOutPicker = flatpickr(outEl, Object.assign({}, options, {
              onReady: function(_, __, instance) {
                attachPickerTimeScrollInteractions(instance);
                updateAdminTimeEditValidityHints();
              },
              onOpen: function() {
                attachPickerTimeScrollInteractions(adminEditClockOutPicker);
                refreshAdminTimeEditPickerBounds();
              },
              onChange: function() {
                updateAdminTimeEditValidityHints();
              },
              onValueUpdate: function() {
                updateAdminTimeEditValidityHints();
              }
            }));

            [inEl, outEl].forEach((el) => {
              if (!el || el.dataset.adminLiveValidationBound === '1') return;
              el.dataset.adminLiveValidationBound = '1';
              el.addEventListener('input', updateAdminTimeEditValidityHints);
              el.addEventListener('change', updateAdminTimeEditValidityHints);
            });
          }

          function getAdminTimeEditValidationState(rowIndex, inDate, outDate) {
            let inInvalid = false;
            let outInvalid = false;
            let hint = '';

            if (!inDate || isNaN(inDate.getTime())) {
              inInvalid = true;
              hint = 'Clock In is required.';
            } else if (!isInActivePayPeriod(inDate.toISOString())) {
              inInvalid = true;
              hint = 'Clock In is outside the active pay period.';
            }

            if (!hint && (!outDate || isNaN(outDate.getTime()))) {
              outInvalid = true;
              hint = 'Clock Out is required.';
            }

            if (!hint && inDate && outDate) {
              if (outDate.getTime() <= inDate.getTime()) {
                outInvalid = true;
                hint = 'Clock Out must be after Clock In.';
              } else if ((outDate.getTime() - inDate.getTime()) > MANUAL_ENTRY_MAX_SPAN_MS) {
                outInvalid = true;
                hint = 'Clock Out exceeds the 14-hour maximum shift length.';
              } else if (!isInActivePayPeriod(outDate.toISOString())) {
                outInvalid = true;
                hint = 'Clock Out is outside the active pay period.';
              }
            }

            if (!hint && inDate && outDate) {
              const entry = adminEntriesByRow[rowIndex];
              if (entry) {
                const nextInIso = inDate.toISOString();
                const nextOutIso = outDate.toISOString();
                const nextModifiedInIso = normalizeModifiedAgainstRaw(nextInIso, entry.rawClockIn || '');
                const nextModifiedOutIso = normalizeModifiedAgainstRaw(nextOutIso, entry.rawClockOut || '');
                const proposedEffectiveInIso = nextModifiedInIso || entry.rawClockIn || '';
                const proposedEffectiveOutIso = nextModifiedOutIso || entry.rawClockOut || '';
                const localConflictCheck = validateAdminLocalConflicts(rowIndex, proposedEffectiveInIso, proposedEffectiveOutIso, false);
                if (!localConflictCheck.valid) {
                  outInvalid = true;
                  hint = localConflictCheck.message || 'Updated range overlaps another entry for this employee.';
                }
              }
            }

            return {
              valid: !(inInvalid || outInvalid),
              inInvalid,
              outInvalid,
              hint
            };
          }

          function refreshAdminTimeEditPickerBounds() {
            if (!adminEditClockInPicker || !adminEditClockOutPicker) return;
            const bounds = getActivePayPeriodBounds();
            if (bounds) {
              const minDate = new Date(bounds.startMs);
              const maxDate = new Date(bounds.endMs);
              const disableOutsideEditRange = buildDateOnlyDisablePredicate(minDate, maxDate);
              adminEditClockInPicker.set('disable', [disableOutsideEditRange]);
              adminEditClockOutPicker.set('disable', [disableOutsideEditRange]);
            } else {
              adminEditClockInPicker.set('disable', []);
              adminEditClockOutPicker.set('disable', []);
            }
            updateAdminTimeEditValidityHints();
          }

          function updateAdminTimeEditValidityHints() {
            const errorEl = document.getElementById('adminEditError');
            const applyBtn = document.getElementById('adminTimeEditApplyBtn');
            if (!errorEl || !adminEditClockInPicker || !adminEditClockOutPicker) return;
            const inDate = parseDateTimeInputValue(adminEditClockInPicker.input ? adminEditClockInPicker.input.value : '');
            const outDate = parseDateTimeInputValue(adminEditClockOutPicker.input ? adminEditClockOutPicker.input.value : '');
            const rowIndex = adminEditingRowIndex;
            const validation = getAdminTimeEditValidationState(rowIndex, inDate, outDate);

            const shouldDisableApply = !validation.valid;
            if (applyBtn) {
              applyBtn.disabled = shouldDisableApply;
            }

            setPickerInputInvalid(adminEditClockInPicker, validation.inInvalid, 'admin-picker-invalid');
            setPickerInputInvalid(adminEditClockOutPicker, validation.outInvalid, 'admin-picker-invalid');

            if (validation.hint) {
              errorEl.innerText = validation.hint;
              errorEl.style.display = 'block';
            } else if (errorEl.innerText.indexOf('Clock In ') === 0 || errorEl.innerText.indexOf('Clock Out ') === 0 || errorEl.innerText.indexOf('Updated ') === 0 || errorEl.innerText.indexOf('Another ') === 0) {
              errorEl.style.display = 'none';
              errorEl.innerText = '';
            }
          }

          function isManualEntryModalVisible() {
            const modal = document.getElementById('manualEntryModal');
            return !!(modal && modal.style.display === 'flex');
          }

          function showManualEntryForm(event) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
            }
            const targetInfo = document.getElementById('manualTargetInfo');
            const notesInput = document.getElementById('manualNotes');
            const manualSubmit = document.getElementById('manualSubmit');
            document.getElementById('manualError').style.display = 'none';
            if (manualSubmit) {
              manualSubmit.disabled = true;
            }
            setManualEntryType('worked');
            if (notesInput) {
              // Avoid stale notes carrying into a new manual entry and accidental instant submit.
              notesInput.value = '';
            }
            if (targetInfo) {
              if (adminManualEntryTargetEmail) {
                targetInfo.innerText = 'Employee: ' + adminManualEntryTargetEmail;
                targetInfo.style.display = 'block';
              } else {
                targetInfo.innerText = '';
                targetInfo.style.display = 'none';
              }
            }
            setDateTimeConstraints(() => {
              if (!adminManualEntryTargetEmail && entriesAreStale()) {
                refreshRecentEntries();
              }
            });
            manualEntryModalOpenedAtMs = Date.now();
            document.getElementById('manualEntryModal').style.display = 'flex';
            updateDatePickerModalScrollLock();
          }

          function hideManualEntryForm() {
            adminManualEntryTargetEmail = '';
            manualEntryModalOpenedAtMs = 0;
            setManualEntryType('worked');
            const targetInfo = document.getElementById('manualTargetInfo');
            if (targetInfo) {
              targetInfo.innerText = '';
              targetInfo.style.display = 'none';
            }
            document.getElementById('manualEntryModal').style.display = 'none';
            updateDatePickerModalScrollLock();
          }

          function openAdminManualEntryForEmployee(email, event) {
            if (adminPermissions.canEdit !== true) return;
            adminManualEntryTargetEmail = String(email || '').trim().toLowerCase();
            showManualEntryForm(event);
          }

          function getOpenEntryStartForEmployee(email) {
            const target = String(email || '').trim().toLowerCase();
            if (!target) return null;

            let earliest = null;
            const rowKeys = Object.keys(adminEntriesByRow || {});
            for (let i = 0; i < rowKeys.length; i++) {
              const rowIndex = Number(rowKeys[i]);
              const entry = adminEntriesByRow[rowIndex];
              if (!entry || entry.deleted) continue;
              const entryEmail = String(entry.email || '').trim().toLowerCase();
              if (entryEmail !== target) continue;

              const effective = getAdminEffectiveFromDraft(rowIndex);
              if (!effective || !effective.clockIn || effective.clockOut) continue;
              const start = new Date(effective.clockIn);
              if (isNaN(start.getTime())) continue;
              if (!earliest || start < earliest) {
                earliest = start;
              }
            }
            return earliest;
          }

          function findOverlapEntryForEmployee(email, clockInDate, clockOutDate) {
            const target = String(email || '').trim().toLowerCase();
            if (!target) return null;

            const newStart = clockInDate.getTime();
            const newEnd = clockOutDate.getTime();
            const rowKeys = Object.keys(adminEntriesByRow || {});

            for (let i = 0; i < rowKeys.length; i++) {
              const rowIndex = Number(rowKeys[i]);
              const entry = adminEntriesByRow[rowIndex];
              if (!entry || entry.deleted) continue;
              const entryEmail = String(entry.email || '').trim().toLowerCase();
              if (entryEmail !== target) continue;

              const effective = getAdminEffectiveFromDraft(rowIndex);
              if (!effective || !effective.clockIn) continue;

              const existingStartDate = new Date(effective.clockIn);
              if (isNaN(existingStartDate.getTime())) continue;
              const existingEndDate = effective.clockOut ? new Date(effective.clockOut) : new Date();
              if (isNaN(existingEndDate.getTime())) continue;

              const existingStart = existingStartDate.getTime();
              const existingEnd = existingEndDate.getTime();
              if (newStart < existingEnd && newEnd > existingStart) {
                return {
                  clockIn: effective.clockIn,
                  clockOut: effective.clockOut,
                  hours: entry.hours,
                  notes: entry.notes
                };
              }
            }

            return null;
          }

          function showArchiveReview() {
            document.getElementById('archiveReviewModal').style.display = 'flex';
            document.getElementById('archiveReviewError').style.display = 'none';
            hideArchiveRangePanel();
            if (!archiveBounds) {
              loadArchiveBounds();
            } else {
              applyArchiveBounds();
            }
          }

          function hideArchiveReview() {
            document.getElementById('archiveReviewModal').style.display = 'none';
            hideArchiveRangePanel();
          }

          function setArchiveActionButtonLabel() {
            const loadBtn = document.getElementById('archiveReviewLoad');
            if (!loadBtn) return;
            if (!archiveBounds || !archiveBounds.hasEntries) {
              loadBtn.innerText = 'No Archived Entries';
              return;
            }
            loadBtn.innerText = archiveRangePanelVisible ? 'Load Entries' : 'Set Date Range & Load Entries';
          }

          function showArchiveRangePanel() {
            const panel = document.getElementById('archiveRangePanel');
            if (!panel) return;
            panel.style.display = 'block';
            archiveRangePanelVisible = true;
            setArchiveActionButtonLabel();
          }

          function hideArchiveRangePanel() {
            const panel = document.getElementById('archiveRangePanel');
            if (!panel) return;
            panel.style.display = 'none';
            archiveRangePanelVisible = false;
            setArchiveActionButtonLabel();
          }

          function onArchiveReviewAction() {
            const loadBtn = document.getElementById('archiveReviewLoad');
            if (loadBtn && loadBtn.disabled) return;
            if (!archiveRangePanelVisible) {
              showArchiveRangePanel();
              return;
            }
            loadArchivedEntries();
          }

          function loadArchiveBounds() {
            // Archive review bounds stay lazy-loaded on modal open because they depend on
            // scanning user-specific archive data and are not needed for initial page render.
            const infoEl = document.getElementById('archiveReviewInfo');
            const errorEl = document.getElementById('archiveReviewError');
            const loadBtn = document.getElementById('archiveReviewLoad');
            const loadingEl = document.getElementById('archiveReviewLoading');

            infoEl.innerText = 'Loading archive range...';
            errorEl.style.display = 'none';
            loadBtn.disabled = true;
            loadingEl.style.display = 'flex';

            google.script.run
              .withSuccessHandler((bounds) => {
                archiveBounds = bounds || null;
                loadingEl.style.display = 'none';
                applyArchiveBounds();
              })
              .withFailureHandler((error) => {
                loadingEl.style.display = 'none';
                loadBtn.disabled = true;
                infoEl.innerText = 'Unable to load archive range.';
                errorEl.innerText = error.message || 'Failed to load archive data.';
                errorEl.style.display = 'block';
                setArchiveActionButtonLabel();
              })
              .getArchiveReviewBounds();
          }

          function applyArchiveBounds() {
            const infoEl = document.getElementById('archiveReviewInfo');
            const errorEl = document.getElementById('archiveReviewError');
            const loadBtn = document.getElementById('archiveReviewLoad');
            const startInput = document.getElementById('archiveStartDate');
            const endInput = document.getElementById('archiveEndDate');

            if (!archiveBounds || !archiveBounds.hasEntries) {
              infoEl.innerText = archiveBounds && archiveBounds.cutoffStr
                ? 'No archived entries available before ' + archiveBounds.cutoffStr + '.'
                : 'No archived entries available.';
              startInput.value = '';
              endInput.value = '';
              startInput.min = '';
              startInput.max = '';
              endInput.min = '';
              endInput.max = '';
              loadBtn.disabled = true;
              errorEl.style.display = 'none';
              hideArchiveRangePanel();
              return;
            }

            infoEl.innerText = 'Entries available before ' + archiveBounds.cutoffStr + '.';
            startInput.min = archiveBounds.minDateISO;
            startInput.max = archiveBounds.maxDateISO;
            endInput.min = archiveBounds.minDateISO;
            endInput.max = archiveBounds.maxDateISO;
            startInput.value = archiveBounds.minDateISO;
            endInput.value = archiveBounds.maxDateISO;
            loadBtn.disabled = false;
            errorEl.style.display = 'none';
            hideArchiveRangePanel();
          }

          function loadArchivedEntries() {
            const startInput = document.getElementById('archiveStartDate');
            const endInput = document.getElementById('archiveEndDate');
            const infoEl = document.getElementById('archiveReviewInfo');
            const errorEl = document.getElementById('archiveReviewError');
            const loadingEl = document.getElementById('archiveReviewLoading');
            const bodyEl = document.getElementById('archiveReviewBody');
            const loadBtn = document.getElementById('archiveReviewLoad');

            errorEl.style.display = 'none';

            if (!startInput.value || !endInput.value) {
              errorEl.innerText = 'Please select both start and end dates.';
              errorEl.style.display = 'block';
              return;
            }

            if (endInput.value < startInput.value) {
              errorEl.innerText = 'End date must be on or after start date.';
              errorEl.style.display = 'block';
              return;
            }

            loadingEl.style.display = 'flex';
            loadBtn.disabled = true;
            bodyEl.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Loading...</td></tr>';

            google.script.run
              .withSuccessHandler((result) => {
                loadingEl.style.display = 'none';
                loadBtn.disabled = false;
                if (!result || !result.success) {
                  errorEl.innerText = (result && result.message) ? result.message : 'Unable to load archived entries.';
                  errorEl.style.display = 'block';
                  bodyEl.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No entries loaded.</td></tr>';
                  return;
                }
                renderArchivedEntries(result.entries || []);
                infoEl.innerText = 'Showing ' + (result.entries || []).length + ' archived entr' + ((result.entries || []).length === 1 ? 'y' : 'ies') + ' from ' + startInput.value + ' to ' + endInput.value + '.';
                hideArchiveRangePanel();
              })
              .withFailureHandler((error) => {
                loadingEl.style.display = 'none';
                loadBtn.disabled = false;
                errorEl.innerText = error.message || 'Unable to load archived entries.';
                errorEl.style.display = 'block';
                bodyEl.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No entries loaded.</td></tr>';
              })
              .getArchivedEntriesForUser(startInput.value, endInput.value);
          }

          function renderArchivedEntries(entries) {
            const bodyEl = document.getElementById('archiveReviewBody');
            const displayEntries = Array.isArray(entries) ? entries.slice() : [];

            if (displayEntries.length === 0) {
              bodyEl.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No archived entries in this range.</td></tr>';
              return;
            }

            const dayTotalsByKey = {};
            const dayToneByKey = {};
            displayEntries.forEach((entry) => {
              const daySource = entry.clockIn || entry.clockOut;
              const dayKey = getAdminDayKey(daySource);
              if (!dayKey) return;
              const entryType = normalizeEntryTypeClient(entry.entryType);
              dayToneByKey[dayKey] = mergeDayTone(dayToneByKey[dayKey], entryType);
              if (entryType !== 'worked') return;
              const hours = Number(entry.hours || 0);
              dayTotalsByKey[dayKey] = (dayTotalsByKey[dayKey] || 0) + (isNaN(hours) ? 0 : hours);
            });

            let lastDayKey = '';

            const rows = displayEntries.map((entry) => {
              const clockInStr = formatDisplayTime(entry.clockIn) || '--:--';
              const clockOutStr = formatDisplayTime(entry.clockOut) || '--:--';
              const daySource = entry.clockIn || entry.clockOut;
              const dayKey = getAdminDayKey(daySource);
              const hoursStr = getHoursString(entry.hours);
              const noteLines = splitAdminNotes(entry.notes || '');
              const verifiedOn = isVerifiedValue(entry.verified);
              const typeMeta = getEntryTypeMeta(entry.entryType);
              const verifiedIcon = '<button type="button" class="admin-verify-toggle static ' + (verifiedOn ? 'is-on' : '') + '" title="' + (verifiedOn ? 'Verified' : 'Unverified') + '" tabindex="-1">' + (verifiedOn ? '&#10003;' : '&#9675;') + '</button>';
              const notesHtml = noteLines.length > 0
                ? noteLines.map((line) => '<div class="admin-note-line">' + escapeHtml(line) + '</div>').join('')
                : '<div class="admin-note-line admin-note-line-empty">No notes</div>';
              const rowClasses = [];
              if (typeMeta.rowClass) rowClasses.push(typeMeta.rowClass);

              let dayHeaderHtml = '';
              if (dayKey && dayKey !== lastDayKey) {
                const dayTone = dayToneByKey[dayKey] || 'worked';
                const dayLabel = formatAdminDayLabel(daySource, getHoursString(dayTotalsByKey[dayKey] || 0), dayTone);
                const dayToneClass = getDayToneClass(dayTone);
                dayHeaderHtml = '<tr class="admin-day-row recent-day-row ' + dayToneClass + '"><td colspan="4"><div class="admin-day-meta"><div class="admin-day-left"><div class="admin-day-label">' + escapeHtml(dayLabel) + '</div></div></div></td></tr>';
                lastDayKey = dayKey;
              }

              return dayHeaderHtml + '<tr' + (rowClasses.length ? ' class="' + rowClasses.join(' ') + '"' : '') + '>' +
                '<td data-label="Time"><div class="recent-time-stack"><div class="admin-in-cell">' + getEntryTypeChipOrSpacerHtml(entry.entryType) + verifiedIcon + '<button type="button" class="admin-time-pill admin-time-in static" tabindex="-1"><span class="admin-time-label">In</span><span class="admin-time-value">' + escapeHtml(clockInStr) + '</span></button></div><div class="recent-time-out-row"><span class="recent-verify-spacer" aria-hidden="true"></span><button type="button" class="admin-time-pill admin-time-out static" tabindex="-1"><span class="admin-time-label">Out</span><span class="admin-time-value">' + escapeHtml(clockOutStr) + '</span></button></div></div></td>' +
                '<td data-label="Hours" class="admin-hours-cell"><span class="admin-hours-pill"><span class="admin-hours-pill-value">' + hoursStr + '</span><span class="admin-hours-pill-unit">Hrs</span></span></td>' +
                '<td data-label="Notes"><div class="admin-note-list">' + notesHtml + '</div></td>' +
                '<td data-label="Archived">' + escapeHtml(entry.archivedDate || '--') + '</td>' +
                '</tr>';
            });

            bodyEl.innerHTML = rows.join('');
          }

          function findOverlapEntry(clockInDate, clockOutDate) {
            if (!recentEntries || recentEntries.length === 0) return null;
            const newStart = clockInDate.getTime();
            const newEnd = clockOutDate.getTime();

            for (const entry of recentEntries) {
              if (!entry || !entry.clockIn) continue;
              const existingStartDate = new Date(entry.clockIn);
              if (isNaN(existingStartDate.getTime())) continue;
              const existingEndDate = entry.clockOut ? new Date(entry.clockOut) : new Date();
              if (isNaN(existingEndDate.getTime())) continue;

              const existingStart = existingStartDate.getTime();
              const existingEnd = existingEndDate.getTime();

              if (newStart < existingEnd && newEnd > existingStart) {
                return { entry, existingStartDate, existingEndDate };
              }
            }

            return null;
          }

          function getOpenEntryStart() {
            if (!recentEntries || recentEntries.length === 0) return null;
            let earliest = null;
            for (const entry of recentEntries) {
              if (!entry || !entry.clockIn || entry.clockOut) continue;
              const openStart = new Date(entry.clockIn);
              if (!isNaN(openStart.getTime())) {
                if (!earliest || openStart < earliest) {
                  earliest = openStart;
                }
              }
            }
            return earliest;
          }

          function submitManualEntry(event) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
            }
            const clockInVal = document.getElementById('manualClockIn').value;
            const clockOutVal = document.getElementById('manualClockOut').value;
            const notesVal = document.getElementById('manualNotes').value;
            const errorEl = document.getElementById('manualError');
            const submitBtn = document.getElementById('manualSubmit');
            const startedAt = Date.now();
            const targetEmail = String(adminManualEntryTargetEmail || '').trim().toLowerCase();
            const isAdminEmployeeEntry = !!targetEmail;
            const selectedEntryType = getManualEntryType();
            let rollbackEntries = null;
            let rollbackBaseline = null;
            let rollbackDraft = null;
            let optimisticTempRowIndex = null;

            errorEl.style.display = 'none';
            submitBtn.disabled = true;

            // Guard against mobile/trackpad ghost click that can hit submit immediately after opening.
            if (manualEntryModalOpenedAtMs > 0 && (Date.now() - manualEntryModalOpenedAtMs) < 300) {
              submitBtn.disabled = false;
              return;
            }

            if (!clockInVal || !clockOutVal) {
              errorEl.innerText = 'Both start and end times are required.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            const clockInDate = new Date(clockInVal);
            const clockOutDate = new Date(clockOutVal);
            if (isNaN(clockInDate.getTime()) || isNaN(clockOutDate.getTime())) {
              errorEl.innerText = 'Please enter valid dates and times.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            if (clockOutDate <= clockInDate) {
              errorEl.innerText = 'Clock out must be after clock in.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            const now = new Date();
            if (clockInDate > now || clockOutDate > now) {
              errorEl.innerText = 'Manual entries cannot be in the future.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            const openEntryStart = isAdminEmployeeEntry
              ? getOpenEntryStartForEmployee(targetEmail)
              : getOpenEntryStart();
            if (openEntryStart && (clockInDate >= openEntryStart || clockOutDate >= openEntryStart)) {
              const openStartStr = formatDisplayDate(openEntryStart);
              errorEl.innerText = isAdminEmployeeEntry
                ? 'Cannot add manual entry: selected employee has an open clock-in at ' + openStartStr + '.'
                : 'Manual entries cannot be at or after the current open clock-in time: ' + openStartStr + '.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            // Enforce max 14-hour span per entry
            const diffMs = clockOutDate.getTime() - clockInDate.getTime();
            if (diffMs > MANUAL_ENTRY_MAX_SPAN_MS) {
              const cappedEnd = new Date(clockInDate.getTime() + MANUAL_ENTRY_MAX_SPAN_MS);
              document.getElementById('manualClockOut').value = formatForInput(cappedEnd);
              refreshManualDateTimePickers(true);
              errorEl.innerText = 'Entries are limited to 14 hours. End time was adjusted to 14 hours after start. Add a note explaining the extended shift, then submit again.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            // Note: Date range validation is handled server-side and by HTML5 picker constraints
            // No need for redundant client-side validation here

            const overlap = isAdminEmployeeEntry
              ? findOverlapEntryForEmployee(targetEmail, clockInDate, clockOutDate)
              : findOverlapEntry(clockInDate, clockOutDate);
            if (overlap) {
              const conflict = overlap.entry || overlap;
              const conflictIn = formatDisplayDate(conflict.clockIn);
              const conflictOut = conflict.clockOut ? formatDisplayDate(conflict.clockOut) : 'Open (no clock out yet)';
              const conflictHours = getHoursString(conflict.hours);
              const conflictNotes = conflict.notes ? conflict.notes : 'None';
              errorEl.innerText = 'This entry overlaps with an existing entry.' + '\\n' + 'Clock In: ' + conflictIn + ' | Clock Out: ' + conflictOut + ' | Hours: ' + conflictHours + ' | Notes: ' + conflictNotes;
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            // Validate that notes are not empty or whitespace-only
            if (!notesVal.trim()) {
              errorEl.innerText = 'Note is required. Please explain why this time entry is being added.';
              errorEl.style.display = 'block';
              submitBtn.disabled = false;
              return;
            }

            document.getElementById('loading').style.display = 'block';
            document.getElementById('message').style.display = 'none';
            document.getElementById('error').style.display = 'none';

            if (isAdminEmployeeEntry) {
              rollbackEntries = Object.assign({}, adminEntriesByRow);
              rollbackBaseline = Object.assign({}, adminBaselineByRow);
              rollbackDraft = Object.assign({}, adminDraftByRow);

              optimisticTempRowIndex = adminTempRowSeed;
              adminTempRowSeed -= 1;

              const optimisticClockIn = clockInDate.toISOString();
              const optimisticClockOut = clockOutDate.toISOString();
              const optimisticNotes = String(notesVal || '').trim();
              const optimisticHours = getAdminHoursForDisplay(optimisticClockIn, optimisticClockOut, 0);
              const optimisticDayKey = getAdminDayKey(optimisticClockIn);
              const optimisticUserKey = String(targetEmail || '').trim().toLowerCase();

              adminEntriesByRow[optimisticTempRowIndex] = {
                rowIndex: optimisticTempRowIndex,
                email: targetEmail,
                rawClockIn: optimisticClockIn,
                rawClockOut: optimisticClockOut,
                modifiedClockIn: null,
                modifiedClockOut: null,
                hours: optimisticHours,
                verified: false,
                notes: optimisticNotes,
                entryType: selectedEntryType,
                deleted: false,
                _pendingActionLabel: 'Saving...'
              };
              adminBaselineByRow[optimisticTempRowIndex] = {
                modifiedClockInISO: '',
                modifiedClockOutISO: '',
                notes: optimisticNotes,
                entryType: selectedEntryType,
                deleted: false,
                pendingNewNoteText: ''
              };
              adminDraftByRow[optimisticTempRowIndex] = {
                modifiedClockInISO: '',
                modifiedClockOutISO: '',
                notes: optimisticNotes,
                entryType: selectedEntryType,
                deleted: false,
                pendingNewNoteText: ''
              };

              if (optimisticUserKey) {
                adminCollapsedUsers[optimisticUserKey] = false;
              }
              if (optimisticUserKey && optimisticDayKey) {
                adminCollapsedDays[optimisticUserKey + '|' + optimisticDayKey] = false;
              }

              hideManualEntryForm();
              renderAdminEntries();
            }

            const saveRunner = google.script.run
              .withSuccessHandler((result) => {
                document.getElementById('loading').style.display = 'none';
                submitBtn.disabled = false;
                debugClientLog('submitManualEntry.success', {
                  success: !!(result && result.success),
                  isClockedIn: !!(result && result.isClockedIn),
                  targetEmail: isAdminEmployeeEntry ? targetEmail : currentUserEmail,
                  durationMs: Date.now() - startedAt
                });
                if (result.success) {
                   if (!isAdminEmployeeEntry) {
                     hideManualEntryForm();
                     setStatusText(result.status);
                     const ct = document.getElementById('clockToggle');
                     if (ct) ct.disabled = false;
                   } else if (result.splitOccurred === true || !result.entry || !result.entry.rowIndex) {
                    // Midnight split may create multiple rows server-side, so perform one sync refresh.
                    loadAdminEntries();
                  } else {
                    const committed = result.entry;
                    if (optimisticTempRowIndex !== null && Object.prototype.hasOwnProperty.call(adminEntriesByRow, optimisticTempRowIndex)) {
                      delete adminEntriesByRow[optimisticTempRowIndex];
                      delete adminBaselineByRow[optimisticTempRowIndex];
                      delete adminDraftByRow[optimisticTempRowIndex];
                    }
                    adminEntriesByRow[committed.rowIndex] = committed;
                    adminBaselineByRow[committed.rowIndex] = {
                      modifiedClockInISO: committed.modifiedClockIn || '',
                      modifiedClockOutISO: committed.modifiedClockOut || '',
                      notes: committed.notes || '',
                      deleted: committed.deleted === true,
                      pendingNewNoteText: ''
                    };
                    adminDraftByRow[committed.rowIndex] = {
                      modifiedClockInISO: committed.modifiedClockIn || '',
                      modifiedClockOutISO: committed.modifiedClockOut || '',
                      notes: committed.notes || '',
                      deleted: committed.deleted === true,
                      pendingNewNoteText: ''
                    };
                    renderAdminEntries();
                  }
                  document.getElementById('message').innerText = result.message;
                  document.getElementById('message').style.display = 'block';
                  setTimeout(() => {
                    document.getElementById('message').style.display = 'none';
                  }, 3000);

                  if (!isAdminEmployeeEntry) {
                    refreshRecentEntries();
                  }
                } else {
                  if (isAdminEmployeeEntry && rollbackEntries && rollbackBaseline && rollbackDraft) {
                    adminEntriesByRow = rollbackEntries;
                    adminBaselineByRow = rollbackBaseline;
                    adminDraftByRow = rollbackDraft;
                    renderAdminEntries();
                  }
                  errorEl.innerText = result.message;
                  errorEl.style.display = 'block';
                }
              })
              .withFailureHandler((err) => {
                document.getElementById('loading').style.display = 'none';
                submitBtn.disabled = false;
                if (isAdminEmployeeEntry && rollbackEntries && rollbackBaseline && rollbackDraft) {
                  adminEntriesByRow = rollbackEntries;
                  adminBaselineByRow = rollbackBaseline;
                  adminDraftByRow = rollbackDraft;
                  renderAdminEntries();
                }
                debugClientError('submitManualEntry.failure', {
                  message: (err && err.message) ? err.message : 'Unknown error',
                  durationMs: Date.now() - startedAt
                });
                errorEl.innerText = err.message || 'Unable to save missed time.';
                errorEl.style.display = 'block';
              });

            if (isAdminEmployeeEntry) {
              saveRunner.submitManualEntryFromMenu(targetEmail, clockInVal, clockOutVal, notesVal, selectedEntryType);
            } else {
              saveRunner.submitManualTimeEntry(clockInVal, clockOutVal, notesVal, selectedEntryType);
            }
          }
        </script>
      </body>
    </html>
  `;
    Logger.log('createMobileHtml: generated mobile HTML');
    debugLog('createMobileHtml complete', {
        email: email,
        entriesCount: Array.isArray(entries) ? entries.length : 0,
        isClockedIn: !!(statusObj && statusObj.isClockedIn),
        scriptVersion: scriptVersion || 'unknown',
        durationMs: Date.now() - startMs
    });
    return html;
}
