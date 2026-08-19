const TEST_ENV_RESET_PASSWORD = 'Enzensperger';

function openResetTestEnvironmentDialog() {
    const ui = SpreadsheetApp.getUi();
    if (!isDebugEnabled()) {
        ui.alert('Debug Logging Required', 'Enable debug logging before running the test reset.', ui.ButtonSet.OK);
        return;
    }
    const csvVersion = String(typeof TEST_DATA_SHEET_CSV_VERSION === 'string' ? TEST_DATA_SHEET_CSV_VERSION : 'unknown');
    const csvSyncedAt = String(typeof TEST_DATA_SHEET_CSV_SYNCED_AT === 'string' ? TEST_DATA_SHEET_CSV_SYNCED_AT : 'unknown');
    const versionWarning = (typeof SCRIPT_VERSION === 'string' && SCRIPT_VERSION !== csvVersion)
        ? '\nWARNING: app version and CSV version do not match.'
        : '';
    const promptMessage =
        'Enter the password to load generated CSV test data.\n' +
        'CSV Version: ' + csvVersion + '\n' +
        'CSV Synced At: ' + csvSyncedAt +
        versionWarning;
    const response = ui.prompt('Reset Test Environment', promptMessage, ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) {
        Logger.log('openResetTestEnvironmentDialog: cancelled');
        return;
    }
    const result = resetTestEnvironmentFromWorksheet(response.getResponseText());
    ui.alert(result.success ? 'Test Environment Reset' : 'Reset Failed', result.message, ui.ButtonSet.OK);
}

function resetTestEnvironmentFromWorksheet(password) {
    const startMs = Date.now();
    const suppliedPassword = String(password || '');
    if (!isDebugEnabled()) {
        Logger.log('resetTestEnvironmentFromWorksheet: debug logging disabled');
        return { success: false, message: 'Debug logging must be enabled.' };
    }
    if (suppliedPassword !== TEST_ENV_RESET_PASSWORD) {
        Logger.log('resetTestEnvironmentFromWorksheet: invalid password');
        return { success: false, message: 'Invalid password.' };
    }
    if (typeof TEST_DATA_SHEET_CSV !== 'string' || !TEST_DATA_SHEET_CSV.trim()) {
        Logger.log('resetTestEnvironmentFromWorksheet: generated CSV source missing');
        return { success: false, message: 'Generated CSV test data is missing. Run npm run sync:testdata then deploy.' };
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        Logger.log('resetTestEnvironmentFromWorksheet: DataEntry missing');
        return { success: false, message: 'DataEntry sheet not found.' };
    }
    const archive = ss.getSheetByName('Archive');
    if (!archive) {
        Logger.log('resetTestEnvironmentFromWorksheet: Archive missing');
        return { success: false, message: 'Archive sheet not found.' };
    }
    const parsed = parseTestEnvironmentCsv_(TEST_DATA_SHEET_CSV);
    if (!parsed.success) {
        Logger.log('resetTestEnvironmentFromWorksheet: parse failed');
        return parsed;
    }
    resetDataEntrySheetForTest_(dataEntry);
    resetArchiveSheetForTest_(archive);
    resetScheduleSheetForTest_(ss);
    clearTestEnvironmentState_();
    const insertedRows = bulkLoadTestRows_(dataEntry, parsed.rows);
    SpreadsheetApp.flush();
    if (!(parsed.startDate instanceof Date) || isNaN(parsed.startDate.getTime()) ||
        !(parsed.endDate instanceof Date) || isNaN(parsed.endDate.getTime())) {
        Logger.log('resetTestEnvironmentFromWorksheet: parsed pay period dates invalid after load');
        return { success: false, message: 'Suggested pay period dates are invalid in generated CSV test data.' };
    }
    setActivePayPeriod(parsed.startDate, parsed.endDate);
    Logger.log('resetTestEnvironmentFromWorksheet: loaded %s row(s)', insertedRows);
    debugLog('resetTestEnvironmentFromWorksheet complete', {
        insertedRows: insertedRows,
        blockCount: parsed.blockCount,
        source: 'generated-csv',
        csvVersion: typeof TEST_DATA_SHEET_CSV_VERSION === 'string' ? TEST_DATA_SHEET_CSV_VERSION : 'unknown',
        csvSyncedAt: typeof TEST_DATA_SHEET_CSV_SYNCED_AT === 'string' ? TEST_DATA_SHEET_CSV_SYNCED_AT : 'unknown',
        startDate: parsed.startDateStr,
        endDate: parsed.endDateStr,
        durationMs: Date.now() - startMs
    });
    return {
        success: true,
        message: 'Test environment reset with ' + insertedRows + ' row(s) across ' + parsed.blockCount + ' test block(s).'
    };
}

function bulkLoadTestRows_(dataEntry, parsedRows) {
    if (!parsedRows || parsedRows.length === 0) {
        return 0;
    }

    const sortedRows = parsedRows.slice().sort((a, b) => {
        const emailA = String(a.email || '').toLowerCase();
        const emailB = String(b.email || '').toLowerCase();
        if (emailA < emailB)
            return -1;
        if (emailA > emailB)
            return 1;
        const timeA = a.rawClockIn instanceof Date ? a.rawClockIn.getTime() : 0;
        const timeB = b.rawClockIn instanceof Date ? b.rawClockIn.getTime() : 0;
        return timeA - timeB;
    });

    const values = sortedRows.map(row => {
        const next = buildDataEntryRow(row.email, row.rawClockIn, row.rawClockOut, row.notes, row.verified, row.entryType);
        next[DATA_COLUMNS.CLOCK_IN_MODIFIED] = row.modifiedClockIn || '';
        next[DATA_COLUMNS.CLOCK_OUT_MODIFIED] = row.modifiedClockOut || '';
        next[DATA_COLUMNS.DELETED] = !!row.deleted;
        return next;
    });

    dataEntry.getRange(2, 1, values.length, DATA_COL_COUNT).setValues(values);

    const formulas = [];
    for (let i = 0; i < values.length; i++) {
        const rowNum = i + 2;
        formulas.push([`=IF(IF(H${rowNum}<>"",H${rowNum},C${rowNum})<>"",(IF(H${rowNum}<>"",H${rowNum},C${rowNum})-IF(G${rowNum}<>"",G${rowNum},B${rowNum}))*24,"")`]);
    }
    dataEntry.getRange(2, dataCol('HOURS'), formulas.length, 1).setFormulas(formulas);

    return values.length;
}

function resetDataEntrySheetForTest_(sheet) {
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow > 0 && lastColumn > 0) {
        sheet.getRange(1, 1, lastRow, lastColumn).clear();
    }
    enforceExactColumnCount(sheet, DATA_ENTRY_HEADERS.length, 'DataEntry', []);
    sheet.getRange(1, 1, 1, DATA_ENTRY_HEADERS.length)
        .setValues([DATA_ENTRY_HEADERS])
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 240);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 70);
    sheet.setColumnWidth(5, 60);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 100);
    sheet.setColumnWidth(9, 60);
    sheet.setColumnWidth(10, 90);
}

function resetArchiveSheetForTest_(sheet) {
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow > 0 && lastColumn > 0) {
        sheet.getRange(1, 1, lastRow, lastColumn).clear();
    }
    enforceExactColumnCount(sheet, ARCHIVE_HEADERS.length, 'Archive', []);
    sheet.getRange(1, 1, 1, ARCHIVE_HEADERS.length)
        .setValues([ARCHIVE_HEADERS])
        .setFontWeight('bold')
        .setBackground('#f4b400')
        .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, ARCHIVE_COL_COUNT, 150);
}

function resetScheduleSheetForTest_(ss) {
    const schedule = ss.getSheetByName('Schedule');
    if (!schedule) {
        return;
    }
    schedule.clear();
    Logger.log('resetScheduleSheetForTest_: cleared Schedule sheet state');
    debugLog('resetScheduleSheetForTest complete', { cleared: true });
}

function clearTestEnvironmentState_() {
    const props = PropertiesService.getScriptProperties();
    const transientKeys = [
        'cachedPreviewRows',
        'currentPreviewStartDate',
        'currentPreviewEndDate',
        'lastPreviewStartDate',
        'lastPreviewEndDate',
        ACTIVE_PAY_PERIOD_START_KEY,
        ACTIVE_PAY_PERIOD_END_KEY,
        SCHEDULE_STATE_KEY,
        EMPLOYEE_EMAIL_CACHE_KEY,
        EMPLOYEE_EMAIL_CACHE_UPDATED_AT_KEY,
        AWS_CONFIG_KEY,
        AWS_CONFIG_UPDATED_AT_KEY
    ];
    transientKeys.forEach(key => props.deleteProperty(key));
    Logger.log('clearTestEnvironmentState_: cleared transient test state');
    debugLog('clearTestEnvironmentState complete', { keysCleared: transientKeys.length });
}

function parseTestEnvironmentCsv_(csvText) {
    const values = parseCsvRows_(csvText);
    if (!values || values.length === 0) {
        return { success: false, message: 'Generated CSV test data is empty.' };
    }
    let startDate = null;
    let endDate = null;
    const rows = [];
    let blockCount = 0;
    let currentBlock = null;
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        if (isBlankSheetRow_(row)) {
            continue;
        }
        const firstCell = String(row[0] || '').trim();
        const normalizedFirstCell = firstCell.toLowerCase();
        if (!startDate && normalizedFirstCell === 'suggested pay period start') {
            startDate = parseTestSheetDateOnly_(row[1]);
            endDate = parseTestSheetDateOnly_(row[3]);
            if (!startDate || !endDate) {
                return { success: false, message: 'Invalid suggested pay period row in generated CSV test data.' };
            }
            continue;
        }
        if (/^test\s+\d+/i.test(firstCell)) {
            if (currentBlock && currentBlock.awaitingHeader) {
                return { success: false, message: 'Missing header row after ' + currentBlock.title + '.' };
            }
            currentBlock = {
                title: firstCell,
                awaitingHeader: true
            };
            blockCount++;
            continue;
        }
        if (currentBlock && currentBlock.awaitingHeader) {
            if (!isTestDataHeaderRow_(row)) {
                return { success: false, message: 'Expected test data header row after ' + currentBlock.title + '.' };
            }
            currentBlock.awaitingHeader = false;
            continue;
        }
        if (currentBlock) {
            if (isTestDataHeaderRow_(row)) {
                continue;
            }
            const parsedRow = parseTestDataRow_(row);
            if (!parsedRow.success) {
                return parsedRow;
            }
            rows.push(parsedRow.row);
        }
    }
    if (currentBlock && currentBlock.awaitingHeader) {
        return { success: false, message: 'Missing header row after ' + currentBlock.title + '.' };
    }
    if (!startDate || !endDate) {
        return { success: false, message: 'Suggested pay period start/end not found in generated CSV test data.' };
    }
    if (rows.length === 0) {
        return { success: false, message: 'No test rows found in generated CSV test data.' };
    }
    if (endDate < startDate) {
        return { success: false, message: 'Suggested pay period end must be on or after the start date.' };
    }
    return {
        success: true,
        message: '',
        startDate: startDate,
        endDate: endDate,
        startDateStr: formatSettingDateMMDDYYYY(startDate),
        endDateStr: formatSettingDateMMDDYYYY(endDate),
        rows: rows,
        blockCount: blockCount
    };
}

function parseCsvRows_(csvText) {
    const normalized = String(csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') {
            rows.push([]);
            continue;
        }
        const parsed = Utilities.parseCsv(line);
        rows.push(parsed && parsed.length ? parsed[0] : []);
    }
    return rows;
}

function parseTestDataRow_(row) {
    const email = String(row[DATA_COLUMNS.EMAIL] || '').trim();
    const rawClockIn = parseTestSheetDateTime_(row[DATA_COLUMNS.CLOCK_IN]);
    const rawClockOut = parseTestSheetDateTime_(row[DATA_COLUMNS.CLOCK_OUT]);
    const notes = String(row[DATA_COLUMNS.NOTES] || '').trim();
    const modifiedClockIn = parseTestSheetDateTime_(row[DATA_COLUMNS.CLOCK_IN_MODIFIED]);
    const modifiedClockOut = parseTestSheetDateTime_(row[DATA_COLUMNS.CLOCK_OUT_MODIFIED]);
    const deleted = isSheetBooleanTrue(row[DATA_COLUMNS.DELETED]);
    const verified = isSheetBooleanTrue(row[DATA_COLUMNS.VERIFIED]);
    const entryType = normalizeEntryType(row[DATA_COLUMNS.ENTRY_TYPE]);
    if (!email) {
        return { success: false, message: 'Encountered a test data row without an email address.' };
    }
    if (!rawClockIn) {
        return { success: false, message: 'Encountered a test data row with an invalid raw clock-in value for ' + email + '.' };
    }
    if (String(row[DATA_COLUMNS.CLOCK_OUT] || '').trim() && !rawClockOut) {
        return { success: false, message: 'Encountered a test data row with an invalid raw clock-out value for ' + email + '.' };
    }
    if (String(row[DATA_COLUMNS.CLOCK_IN_MODIFIED] || '').trim() && !modifiedClockIn) {
        return { success: false, message: 'Encountered a test data row with an invalid clock-in modified value for ' + email + '.' };
    }
    if (String(row[DATA_COLUMNS.CLOCK_OUT_MODIFIED] || '').trim() && !modifiedClockOut) {
        return { success: false, message: 'Encountered a test data row with an invalid clock-out modified value for ' + email + '.' };
    }
    return {
        success: true,
        message: '',
        row: {
            email: email,
            rawClockIn: rawClockIn,
            rawClockOut: rawClockOut || '',
            notes: notes,
            modifiedClockIn: modifiedClockIn || '',
            modifiedClockOut: modifiedClockOut || '',
            deleted: deleted,
            verified: verified,
            entryType: entryType
        }
    };
}

function parseTestSheetDateTime_(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
    }
    if (typeof value === 'number' && isFinite(value)) {
        const numericDate = new Date(value);
        return isNaN(numericDate.getTime()) ? null : numericDate;
    }
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }
    const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?)?$/);
    if (localMatch) {
        const month = parseInt(localMatch[1], 10);
        const day = parseInt(localMatch[2], 10);
        const year = parseInt(localMatch[3], 10);
        let hour = parseInt(localMatch[4] || '0', 10);
        const minute = parseInt(localMatch[5] || '0', 10);
        const meridiem = String(localMatch[6] || '').toLowerCase();
        if (meridiem) {
            if (hour === 12) {
                hour = 0;
            }
            if (meridiem === 'pm') {
                hour += 12;
            }
        }
        const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsedFallback = new Date(text);
    return isNaN(parsedFallback.getTime()) ? null : parsedFallback;
}

function parseTestSheetDateOnly_(value) {
    const parsed = parseTestSheetDateTime_(value);
    if (!parsed) {
        return null;
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

function isBlankSheetRow_(row) {
    if (!row || row.length === 0) {
        return true;
    }
    for (let i = 0; i < row.length; i++) {
        if (String(row[i] || '').trim() !== '') {
            return false;
        }
    }
    return true;
}

function isTestDataHeaderRow_(row) {
    if (!row || row.length === 0) {
        return false;
    }

    // Backward compatibility: generated CSV may still use the legacy 10-column
    // header (without Entry ID) while runtime schema now includes Entry ID.
    const expectedHeaderLength = Math.min(DATA_ENTRY_HEADERS.length, 10);
    if (row.length < expectedHeaderLength) {
        return false;
    }

    for (let i = 0; i < expectedHeaderLength; i++) {
        if (normalizeHeaderKey(row[i]) !== normalizeHeaderKey(DATA_ENTRY_HEADERS[i])) {
            return false;
        }
    }
    return true;
}
