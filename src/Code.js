// Compiled using timecard-gas-project 2.2.2-push.74 (TypeScript 4.9.5)
/**
* Consolidated TimeCard System - Single Sheet Architecture
* All employees use one central sheet with filtered views
*/
// ==================== INITIALIZATION ====================
/**
 * Create menu when spreadsheet opens
 */
function onOpen() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const dataEntry = ss.getSheetByName('DataEntry');
        ensureDataEntrySchema(dataEntry);
    }
    catch (e) {
        Logger.log('onOpen: schema check skipped: %s', e.toString());
    }
    const ui = SpreadsheetApp.getUi();
    const debugEnabled = isDebugEnabled();
    const menu = ui.createMenu('Payroll Tools')
        .addItem('🔧 Run Data Migration', 'runDataMigration')
        .addItem('📋 Initialize Sheets', 'initializeSheets')
        .addItem('🗓️ Set Current Pay Period', 'openSetCurrentPayPeriodDialog')
    if (debugEnabled) {
        menu.addItem('🧪 Reset Test Environment', 'openResetTestEnvironmentDialog');
    }
    menu.addItem(debugEnabled ? '🐛 Disable Debug Logging' : '🐛 Enable Debug Logging', 'toggleDebugLogging')
        .addToUi();
    Logger.log('onOpen: menu initialized (debug=%s)', debugEnabled ? 'enabled' : 'disabled');
    debugLog('onOpen menu created', { debugEnabled: debugEnabled, spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId() });
}
const ADMIN_PERMISSIONS_HEADER_NOTE = [
    'Comma-separated permissions for this admin user:',
    'admin: legacy label only (no automatic override)',
    'payroll: generate payroll preview data',
    'export: export payroll reports',
    'verify: mark entries verified/unverified',
    'edit: edit employee time entries'
].join('\n');
const ENTRY_TYPE_WORKED = 'worked';
const ENTRY_TYPE_VACATION = 'vacation';
const ENTRY_TYPE_SICK = 'sick';
const ENTRY_TYPE_VALUES = new Set([ENTRY_TYPE_WORKED, ENTRY_TYPE_VACATION, ENTRY_TYPE_SICK]);
const DATA_ENTRY_HEADERS = ['Email', 'Raw Clock In', 'Raw Clock Out', 'Hours', 'Verified', 'Notes', 'Clock In Modified', 'Clock Out Modified', 'Deleted', 'Entry Type', 'Entry ID'];
const ARCHIVE_HEADERS = ['Email', 'Raw Clock In', 'Raw Clock Out', 'Hours', 'Verified', 'Notes', 'Clock In Modified', 'Clock Out Modified', 'Deleted', 'Entry Type', 'Entry ID', 'Archived Date'];
function toDateOrNull(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return null;
}
function getMigrationV2Issues(ss) {
    const issues = [];
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        issues.push('DataEntry sheet missing');
    }
    else {
        if (dataEntry.getLastColumn() !== DATA_ENTRY_HEADERS.length) {
            issues.push('DataEntry column count mismatch');
        }
        else {
            const headerRow = dataEntry.getRange(1, 1, 1, DATA_ENTRY_HEADERS.length).getValues()[0];
            const dataHeadersMismatch = headerRow.some((headerValue, idx) => normalizeHeaderKey(headerValue) !== normalizeHeaderKey(DATA_ENTRY_HEADERS[idx]));
            if (dataHeadersMismatch) {
                issues.push('DataEntry headers do not match expected schema');
            }
            if (dataEntry.getLastRow() > 1) {
                const rows = dataEntry.getRange(2, 1, dataEntry.getLastRow() - 1, DATA_ENTRY_HEADERS.length).getValues();
                let missingTypes = 0;
                for (let i = 0; i < rows.length; i++) {
                    const rawType = String(rows[i][DATA_COLUMNS.ENTRY_TYPE] || '').trim().toLowerCase();
                    if (!ENTRY_TYPE_VALUES.has(rawType)) {
                        missingTypes++;
                    }
                }
                if (missingTypes > 0) {
                    issues.push('DataEntry entry-type values missing on ' + missingTypes + ' row(s)');
                }
            }
        }
    }
    const archive = ss.getSheetByName('Archive');
    if (!archive) {
        issues.push('Archive sheet missing');
    }
    else {
        if (archive.getLastColumn() !== ARCHIVE_HEADERS.length) {
            issues.push('Archive column count mismatch');
        }
        else {
            const rows = archive.getLastRow() - 1;
            if (rows > 0) {
                const headerRow = archive.getRange(1, 1, 1, ARCHIVE_HEADERS.length).getValues()[0];
                const targetIndex = ARCHIVE_COLUMNS.ARCHIVED_DATE;
                let sourceIndex = -1;
                for (let i = 0; i < headerRow.length; i++) {
                    if (String(headerRow[i] || '').toLowerCase().includes('archived date')) {
                        sourceIndex = i;
                        break;
                    }
                }
                if (sourceIndex > -1 && sourceIndex !== targetIndex) {
                    const values = archive.getRange(2, 1, rows, ARCHIVE_HEADERS.length).getValues();
                    let misalignedRows = 0;
                    for (let i = 0; i < values.length; i++) {
                        const sourceDate = toDateOrNull(values[i][sourceIndex]);
                        const targetDate = toDateOrNull(values[i][targetIndex]);
                        if (sourceDate && !targetDate) {
                            misalignedRows++;
                        }
                    }
                    if (misalignedRows > 0) {
                        issues.push('Archive archived-date values appear misaligned on ' + misalignedRows + ' row(s)');
                    }
                }
                const typeIndex = ARCHIVE_COLUMNS.ENTRY_TYPE;
                let missingTypes = 0;
                for (let i = 0; i < rows; i++) {
                    const typeValue = String(archive.getRange(i + 2, typeIndex + 1).getValue() || '').trim().toLowerCase();
                    if (!ENTRY_TYPE_VALUES.has(typeValue)) {
                        missingTypes++;
                    }
                }
                if (missingTypes > 0) {
                    issues.push('Archive entry-type values missing on ' + missingTypes + ' row(s)');
                }
            }
        }
    }
    const admin = ss.getSheetByName('AdminUsers');
    if (!admin) {
        issues.push('AdminUsers sheet missing');
    }
    else {
        if (admin.getLastColumn() < 2) {
            issues.push('AdminUsers missing Permissions column');
        }
    }
    if (ss.getSheetByName('PayrollPreview')) {
        issues.push('PayrollPreview sheet still exists');
    }
    return issues;
}
function enforceExactColumnCount(sheet, targetCount, label, log) {
    const current = sheet.getLastColumn();
    if (current < targetCount) {
        const missing = targetCount - current;
        if (current < 1) {
            sheet.insertColumns(1, missing);
        }
        else {
            sheet.insertColumnsAfter(current, missing);
        }
        log.push(label + ': added ' + missing + ' column(s)');
        return;
    }
    if (current > targetCount) {
        const extra = current - targetCount;
        sheet.deleteColumns(targetCount + 1, extra);
        log.push(label + ': removed ' + extra + ' extra column(s)');
    }
}
function normalizeHeaderKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
function ensureDataEntrySchema(dataEntry) {
    if (!dataEntry) {
        return;
    }
    const requiredColumns = DATA_ENTRY_HEADERS.length;
    const currentColumns = dataEntry.getLastColumn();
    if (currentColumns < requiredColumns) {
        enforceExactColumnCount(dataEntry, requiredColumns, 'DataEntry', []);
    }
    const headerValues = dataEntry.getRange(1, 1, 1, requiredColumns).getValues()[0];
    const headersMismatch = headerValues.some((headerValue, idx) => normalizeHeaderKey(headerValue) !== normalizeHeaderKey(DATA_ENTRY_HEADERS[idx]));
    if (headersMismatch) {
        dataEntry.getRange(1, 1, 1, requiredColumns).setValues([DATA_ENTRY_HEADERS]);
    }
}
function findBestSourceIndexByHeader(sourceHeaderKeys, targetAliases, usedSourceIndexes) {
    for (let i = 0; i < sourceHeaderKeys.length; i++) {
        if (usedSourceIndexes.has(i)) {
            continue;
        }
        if (targetAliases.indexOf(sourceHeaderKeys[i]) >= 0) {
            return i;
        }
    }
    return -1;
}
function normalizeDataEntryColumnsForMigration(dataEntry, log) {
    const targetCount = DATA_ENTRY_HEADERS.length;
    const lastRow = dataEntry.getLastRow();
    const lastCol = dataEntry.getLastColumn();
    if (lastCol < 1) {
        enforceExactColumnCount(dataEntry, targetCount, 'DataEntry', log);
        dataEntry.getRange(1, 1, 1, targetCount).setValues([DATA_ENTRY_HEADERS]);
        return;
    }
    const sourceHeaders = dataEntry.getRange(1, 1, 1, lastCol).getValues()[0];
    const sourceHeaderKeys = sourceHeaders.map(normalizeHeaderKey);
    const targetAliasByHeader = {
        'Email': ['email'],
        'Raw Clock In': ['rawclockin', 'clockin'],
        'Raw Clock Out': ['rawclockout', 'clockout'],
        'Hours': ['hours', 'hour'],
        'Verified': ['verified'],
        'Notes': ['notes', 'note'],
        'Clock In Modified': ['clockinmodified', 'modifiedclockin', 'clockinedited', 'editedclockin'],
        'Clock Out Modified': ['clockoutmodified', 'modifiedclockout', 'clockoutedited', 'editedclockout'],
        'Deleted': ['deleted', 'isdeleted'],
        'Entry Type': ['entrytype', 'type'],
        'Entry ID': ['entryid', 'id', 'uuid']
    };
    const usedSourceIndexes = new Set();
    const sourceIndexByTarget = DATA_ENTRY_HEADERS.map(header => {
        const aliases = targetAliasByHeader[header] || [normalizeHeaderKey(header)];
        const sourceIndex = findBestSourceIndexByHeader(sourceHeaderKeys, aliases, usedSourceIndexes);
        if (sourceIndex >= 0) {
            usedSourceIndexes.add(sourceIndex);
        }
        return sourceIndex;
    });
    const legacyClockInDateIndex = sourceHeaderKeys.findIndex(key => key === 'clockindate' || key === 'legacyclockindate');
    if (legacyClockInDateIndex >= 0) {
        log.push('DataEntry: detected legacy Clock In Date column at ' + colToLetter(legacyClockInDateIndex));
    }
    const dataRows = Math.max(lastRow - 1, 0);
    let remappedRows = [];
    if (dataRows > 0) {
        const sourceRows = dataEntry.getRange(2, 1, dataRows, lastCol).getValues();
        remappedRows = sourceRows.map(sourceRow => {
            const nextRow = new Array(targetCount).fill('');
            for (let targetIndex = 0; targetIndex < targetCount; targetIndex++) {
                const sourceIndex = sourceIndexByTarget[targetIndex];
                if (sourceIndex >= 0 && sourceIndex < sourceRow.length) {
                    nextRow[targetIndex] = sourceRow[sourceIndex];
                }
            }
            return nextRow;
        });
    }
    dataEntry.clearContents();
    enforceExactColumnCount(dataEntry, targetCount, 'DataEntry', log);
    dataEntry.getRange(1, 1, 1, targetCount).setValues([DATA_ENTRY_HEADERS]);
    if (remappedRows.length > 0) {
        dataEntry.getRange(2, 1, remappedRows.length, targetCount).setValues(remappedRows);
    }
    const mappedPairs = sourceIndexByTarget
        .map((sourceIndex, targetIndex) => sourceIndex >= 0
        ? (DATA_ENTRY_HEADERS[targetIndex] + '←' + colToLetter(sourceIndex))
        : null)
        .filter(Boolean);
    log.push('DataEntry: mapped columns by header (' + mappedPairs.join(', ') + ')');
}
function normalizeArchiveColumnsForMigration(archive, log) {
    const targetCount = ARCHIVE_HEADERS.length;
    const current = archive.getLastColumn();
    if (current < targetCount) {
        const headerRow = archive.getLastRow() > 0
            ? archive.getRange(1, 1, 1, current).getValues()[0]
            : [];
        let archivedDateCol = -1;
        for (let i = 0; i < headerRow.length; i++) {
            if (String(headerRow[i] || '').toLowerCase().includes('archived date')) {
                archivedDateCol = i + 1;
                break;
            }
        }
        if (archivedDateCol > 0) {
            const missing = targetCount - current;
            archive.insertColumnsBefore(archivedDateCol, missing);
            log.push('Archive: inserted ' + missing + ' column(s) before Archived Date to preserve data alignment');
        }
    }
    enforceExactColumnCount(archive, targetCount, 'Archive', log);
    const rows = archive.getLastRow() - 1;
    if (rows > 0 && archive.getLastColumn() >= targetCount) {
        const liveHeaderRow = archive.getRange(1, 1, 1, targetCount).getValues()[0];
        const targetIndex = ARCHIVE_COLUMNS.ARCHIVED_DATE;
        const entryIdTargetIndex = ARCHIVE_COLUMNS.ENTRY_ID;
        let sourceIndex = -1;
        for (let i = 0; i < liveHeaderRow.length; i++) {
            if (String(liveHeaderRow[i] || '').toLowerCase().includes('archived date')) {
                sourceIndex = i;
                break;
            }
        }
        if (sourceIndex < 0 || sourceIndex === targetIndex) {
            return;
        }
        const values = archive.getRange(2, 1, rows, targetCount).getValues();
        const sourceColumnValues = values.map(row => [row[sourceIndex]]);
        const targetColumnValues = values.map(row => [row[targetIndex]]);
        let movedRows = 0;
        for (let i = 0; i < values.length; i++) {
            const sourceDate = toDateOrNull(sourceColumnValues[i][0]);
            const targetDate = toDateOrNull(targetColumnValues[i][0]);
            if (sourceDate && !targetDate) {
                targetColumnValues[i][0] = sourceColumnValues[i][0];
                sourceColumnValues[i][0] = '';
                movedRows++;
            }
        }
        if (movedRows > 0) {
            archive.getRange(2, targetIndex + 1, rows, 1).setValues(targetColumnValues);
            archive.getRange(2, sourceIndex + 1, rows, 1).setValues(sourceColumnValues);
            log.push('Archive: moved archived-date values from column ' + colToLetter(sourceIndex) + ' to column ' + colToLetter(targetIndex) + ' for ' + movedRows + ' row(s)');
        }
    }
}
/**
 * Initialize all required sheets with proper structure
 */
function initializeSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    try {
        // Create or get DataEntry sheet
        let dataEntry = ss.getSheetByName('DataEntry');
        if (!dataEntry) {
            dataEntry = ss.insertSheet('DataEntry');
            dataEntry.getRange(1, 1, 1, DATA_ENTRY_HEADERS.length).setValues([DATA_ENTRY_HEADERS]);
            dataEntry.getRange(1, 1, 1, DATA_ENTRY_HEADERS.length)
                .setFontWeight('bold')
                .setBackground('#4285f4')
                .setFontColor('#ffffff');
            dataEntry.setFrozenRows(1);
            dataEntry.setColumnWidth(1, 240);
            dataEntry.setColumnWidth(2, 100);
            dataEntry.setColumnWidth(3, 100);
            dataEntry.setColumnWidth(4, 70);
            dataEntry.setColumnWidth(5, 60);
            dataEntry.setColumnWidth(6, 200);
            dataEntry.setColumnWidth(7, 100);
            dataEntry.setColumnWidth(8, 100);
            dataEntry.setColumnWidth(9, 60);
            dataEntry.setColumnWidth(10, 90);
        }
        else if (dataEntry.getLastColumn() < DATA_ENTRY_HEADERS.length) {
            enforceExactColumnCount(dataEntry, DATA_ENTRY_HEADERS.length, 'DataEntry', []);
            dataEntry.getRange(1, 1, 1, DATA_ENTRY_HEADERS.length).setValues([DATA_ENTRY_HEADERS]);
            dataEntry.getRange(1, 1, 1, DATA_ENTRY_HEADERS.length)
                .setFontWeight('bold')
                .setBackground('#4285f4')
                .setFontColor('#ffffff');
            dataEntry.setFrozenRows(1);
            dataEntry.setColumnWidth(10, 90);
        }
        // Create or get AdminUsers sheet
        let adminUsers = ss.getSheetByName('AdminUsers');
        if (!adminUsers) {
            adminUsers = ss.insertSheet('AdminUsers');
            adminUsers.getRange(1, 1, 1, 2).setValues([['Email', 'Permissions']]);
            adminUsers.getRange(1, 2).setNote(ADMIN_PERMISSIONS_HEADER_NOTE);
            adminUsers.getRange(1, 1, 1, 2)
                .setFontWeight('bold')
                .setBackground('#434343')
                .setFontColor('#ffffff');
            adminUsers.setFrozenRows(1);
            adminUsers.setColumnWidth(1, 260);
            adminUsers.setColumnWidth(2, 300);
        }
        // Create or get Archive sheet
        let archive = ss.getSheetByName('Archive');
        if (!archive) {
            archive = ss.insertSheet('Archive');
            archive.getRange(1, 1, 1, ARCHIVE_HEADERS.length).setValues([ARCHIVE_HEADERS]);
            archive.getRange(1, 1, 1, ARCHIVE_HEADERS.length)
                .setFontWeight('bold')
                .setBackground('#f4b400')
                .setFontColor('#ffffff');
            archive.setFrozenRows(1);
            archive.setColumnWidths(1, ARCHIVE_COL_COUNT, 150);
        }
        else if (archive.getLastColumn() < ARCHIVE_HEADERS.length) {
            enforceExactColumnCount(archive, ARCHIVE_HEADERS.length, 'Archive', []);
            archive.getRange(1, 1, 1, ARCHIVE_HEADERS.length).setValues([ARCHIVE_HEADERS]);
            archive.getRange(1, 1, 1, ARCHIVE_HEADERS.length)
                .setFontWeight('bold')
                .setBackground('#f4b400')
                .setFontColor('#ffffff');
            archive.setFrozenRows(1);
        }
        ensureScheduleSheet_(ss);
        // Initialize AWS config with current employees (all disabled by default)
        if (dataEntry) {
            buildAndCacheAWSConfig(dataEntry);
        }
        ui.alert('✅ Success', 'All sheets initialized successfully!', ui.ButtonSet.OK);
    }
    catch (e) {
        ui.alert('❌ Error', `Failed to initialize: ${e.message}`, ui.ButtonSet.OK);
        Logger.log('initializeSheets: error=%s', e.message);
    }
}
function ensureScheduleSheet_(ss) {
    const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    let schedule = spreadsheet.getSheetByName(SCHEDULE_SHEET_NAME);
    if (!schedule) {
        schedule = spreadsheet.insertSheet(SCHEDULE_SHEET_NAME);
        schedule.getRange(1, 1, 1, SCHEDULE_SETTINGS_HEADERS.length).setValues([SCHEDULE_SETTINGS_HEADERS]);
        schedule.getRange(1, 1, 1, SCHEDULE_SETTINGS_HEADERS.length)
            .setFontWeight('bold')
            .setBackground('#0f766e')
            .setFontColor('#ffffff');
        schedule.setFrozenRows(1);
        schedule.setColumnWidth(1, 240);
        schedule.setColumnWidth(2, 560);
        schedule.setColumnWidth(3, 180);
        schedule.setColumnWidth(4, 280);
        return schedule;
    }
    if (schedule.getMaxColumns() < SCHEDULE_SETTINGS_HEADERS.length) {
        schedule.insertColumnsAfter(schedule.getMaxColumns(), SCHEDULE_SETTINGS_HEADERS.length - schedule.getMaxColumns());
    }
    const headerValues = schedule.getRange(1, 1, 1, SCHEDULE_SETTINGS_HEADERS.length).getValues()[0];
    let mismatch = false;
    for (let i = 0; i < SCHEDULE_SETTINGS_HEADERS.length; i++) {
        if (String(headerValues[i] || '') !== SCHEDULE_SETTINGS_HEADERS[i]) {
            mismatch = true;
            break;
        }
    }
    if (mismatch) {
        schedule.getRange(1, 1, 1, SCHEDULE_SETTINGS_HEADERS.length).setValues([SCHEDULE_SETTINGS_HEADERS]);
    }
    schedule.setFrozenRows(1);
    return schedule;
}
function findScheduleSettingRowByKey_(sheet, key) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1)
        return -1;
    const keyValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keyValues.length; i++) {
        if (String(keyValues[i][0] || '') === key) {
            return i + 2;
        }
    }
    return -1;
}
function readScheduleSetting_(key, fallback = '') {
    const sheet = ensureScheduleSheet_();
    const row = findScheduleSettingRowByKey_(sheet, key);
    if (row < 0)
        return fallback;
    const value = sheet.getRange(row, 2).getValue();
    if (value === null || value === undefined || value === '')
        return fallback;
    return String(value);
}
function writeScheduleSetting_(key, value) {
    const sheet = ensureScheduleSheet_();
    const actorEmail = String(Session.getActiveUser().getEmail() || 'unknown').trim().toLowerCase() || 'unknown';
    const updatedAtIso = new Date().toISOString();
    const normalizedValue = value === null || value === undefined ? '' : String(value);
    const row = findScheduleSettingRowByKey_(sheet, key);
    if (row < 0) {
        sheet.appendRow([key, normalizedValue, updatedAtIso, actorEmail]);
        return;
    }
    sheet.getRange(row, 1, 1, 4).setValues([[key, normalizedValue, updatedAtIso, actorEmail]]);
}
function parseScheduleJsonValue_(raw, fallbackValue) {
    if (!raw)
        return fallbackValue;
    try {
        return JSON.parse(String(raw));
    }
    catch (e) {
        return fallbackValue;
    }
}

// ==================== COLUMN MAPPING ====================
// DataEntry sheet column mapping (zero-based indices for data arrays)
const DATA_COLUMNS = {
    EMAIL: 0,
    CLOCK_IN: 1,
    CLOCK_OUT: 2,
    HOURS: 3,
    VERIFIED: 4,
    NOTES: 5,
    CLOCK_IN_MODIFIED: 6,
    CLOCK_OUT_MODIFIED: 7,
    DELETED: 8,
    ENTRY_TYPE: 9,
    ENTRY_ID: 10
};
const DATA_COL_COUNT = Object.keys(DATA_COLUMNS).length;
// Archive sheet column mapping (DataEntry parity + Archived Date)
const ARCHIVE_COLUMNS = {
    EMAIL: 0,
    CLOCK_IN: 1,
    CLOCK_OUT: 2,
    HOURS: 3,
    VERIFIED: 4,
    NOTES: 5,
    CLOCK_IN_MODIFIED: 6,
    CLOCK_OUT_MODIFIED: 7,
    DELETED: 8,
    ENTRY_TYPE: 9,
    ENTRY_ID: 10,
    ARCHIVED_DATE: 11
};
const ARCHIVE_COL_COUNT = Object.keys(ARCHIVE_COLUMNS).length;
// Helper function to convert zero-based column index to letter (A, B, C, etc.)
function colToLetter(index) {
    if (typeof index !== 'number' || index < 0 || !isFinite(index)) {
        debugLog('colToLetter invalid index', { index: index });
    }
    return String.fromCharCode(65 + index);
}
// Column helper utilities to keep column arithmetic centralized
function dataCol(key) {
    if (!Object.prototype.hasOwnProperty.call(DATA_COLUMNS, key)) {
        debugLog('dataCol invalid key', { key: key });
    }
    return DATA_COLUMNS[key] + 1; // 1-based for Range APIs
}
function dataColLetter(key) {
    if (!Object.prototype.hasOwnProperty.call(DATA_COLUMNS, key)) {
        debugLog('dataColLetter invalid key', { key: key });
    }
    return colToLetter(DATA_COLUMNS[key]);
}
function archiveCol(key) {
    if (!Object.prototype.hasOwnProperty.call(ARCHIVE_COLUMNS, key)) {
        debugLog('archiveCol invalid key', { key: key });
    }
    return ARCHIVE_COLUMNS[key] + 1;
}
function normalizeEntryType(entryType) {
    const value = String(entryType || '').trim().toLowerCase();
    return ENTRY_TYPE_VALUES.has(value) ? value : ENTRY_TYPE_WORKED;
}
function generateEntryId() {
    return Utilities.getUuid();
}
function getRowEntryId(rowData) {
    if (!rowData || rowData.length <= DATA_COLUMNS.ENTRY_ID) {
        return '';
    }
    return String(rowData[DATA_COLUMNS.ENTRY_ID] || '').trim();
}
function getRowEntryType(rowData) {
    if (!rowData || rowData.length <= DATA_COLUMNS.ENTRY_TYPE) {
        return ENTRY_TYPE_WORKED;
    }
    return normalizeEntryType(rowData[DATA_COLUMNS.ENTRY_TYPE]);
}
function getArchiveRowEntryType(rowData) {
    if (!rowData || rowData.length <= ARCHIVE_COLUMNS.ENTRY_TYPE) {
        return ENTRY_TYPE_WORKED;
    }
    return normalizeEntryType(rowData[ARCHIVE_COLUMNS.ENTRY_TYPE]);
}
function dataBodyRange(sheet) {
    const rows = Math.max(sheet.getLastRow() - 1, 0);
    debugLog('dataBodyRange computed', { sheet: sheet.getName(), rows: rows });
    return rows > 0 ? sheet.getRange(2, 1, rows, DATA_COL_COUNT) : null;
}
function sortDataEntry(sheet) {
    const startMs = Date.now();
    const range = dataBodyRange(sheet);
    if (!range) {
        debugLog('sortDataEntry skipped: no data rows', { sheet: sheet.getName() });
        return;
    }
    range.sort([
        { column: dataCol('EMAIL'), ascending: true },
        { column: dataCol('CLOCK_IN'), ascending: true }
    ]);
    const rowCount = Math.max(sheet.getLastRow() - 1, 0);
    Logger.log('sortDataEntry: sorted %s row(s)', rowCount);
    debugLog('sortDataEntry complete', { rowCount: rowCount, durationMs: Date.now() - startMs });
}
function isDeletedDataRow(rowData) {
    if (!rowData || rowData.length <= DATA_COLUMNS.DELETED)
        return false;
    return rowData[DATA_COLUMNS.DELETED] === true;
}
function isSheetBooleanTrue(value) {
    if (value === true)
        return true;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1';
    }
    return value === 1;
}
function getRowRawClockIn(rowData) {
    const value = rowData ? rowData[DATA_COLUMNS.CLOCK_IN] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getRowRawClockOut(rowData) {
    const value = rowData ? rowData[DATA_COLUMNS.CLOCK_OUT] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getRowModifiedClockIn(rowData) {
    const value = rowData && rowData.length > DATA_COLUMNS.CLOCK_IN_MODIFIED ? rowData[DATA_COLUMNS.CLOCK_IN_MODIFIED] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getRowModifiedClockOut(rowData) {
    const value = rowData && rowData.length > DATA_COLUMNS.CLOCK_OUT_MODIFIED ? rowData[DATA_COLUMNS.CLOCK_OUT_MODIFIED] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getEffectiveClockInFromRow(rowData) {
    return getRowModifiedClockIn(rowData) || getRowRawClockIn(rowData);
}
function getEffectiveClockOutFromRow(rowData) {
    return getRowModifiedClockOut(rowData) || getRowRawClockOut(rowData);
}
function getArchiveRowRawClockIn(rowData) {
    const value = rowData ? rowData[ARCHIVE_COLUMNS.CLOCK_IN] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getArchiveRowRawClockOut(rowData) {
    const value = rowData ? rowData[ARCHIVE_COLUMNS.CLOCK_OUT] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getArchiveRowModifiedClockIn(rowData) {
    const value = rowData && rowData.length > ARCHIVE_COLUMNS.CLOCK_IN_MODIFIED ? rowData[ARCHIVE_COLUMNS.CLOCK_IN_MODIFIED] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getArchiveRowModifiedClockOut(rowData) {
    const value = rowData && rowData.length > ARCHIVE_COLUMNS.CLOCK_OUT_MODIFIED ? rowData[ARCHIVE_COLUMNS.CLOCK_OUT_MODIFIED] : null;
    return value instanceof Date && !isNaN(value.getTime()) ? value : null;
}
function getEffectiveClockInFromArchiveRow(rowData) {
    return getArchiveRowModifiedClockIn(rowData) || getArchiveRowRawClockIn(rowData);
}
function getEffectiveClockOutFromArchiveRow(rowData) {
    return getArchiveRowModifiedClockOut(rowData) || getArchiveRowRawClockOut(rowData);
}
function buildDataEntryRow(email, rawClockIn, rawClockOut, notes, verified, entryType = ENTRY_TYPE_WORKED) {
    const row = new Array(DATA_COL_COUNT).fill('');
    row[DATA_COLUMNS.EMAIL] = email || '';
    row[DATA_COLUMNS.CLOCK_IN] = rawClockIn || '';
    row[DATA_COLUMNS.CLOCK_OUT] = rawClockOut || '';
    row[DATA_COLUMNS.HOURS] = '';
    row[DATA_COLUMNS.VERIFIED] = verified === true;
    row[DATA_COLUMNS.NOTES] = notes || '';
    row[DATA_COLUMNS.CLOCK_IN_MODIFIED] = '';
    row[DATA_COLUMNS.CLOCK_OUT_MODIFIED] = '';
    row[DATA_COLUMNS.DELETED] = false;
    row[DATA_COLUMNS.ENTRY_TYPE] = normalizeEntryType(entryType);
    row[DATA_COLUMNS.ENTRY_ID] = generateEntryId();
    return row;
}
function getAdminEmailSet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const adminSheet = ss.getSheetByName('AdminUsers');
    const admins = new Set();
    if (!adminSheet || adminSheet.getLastRow() <= 1)
        return admins;
    const values = adminSheet.getRange(2, 1, adminSheet.getLastRow() - 1, 1).getValues();
    values.forEach(row => {
        const email = String(row[0] || '').trim().toLowerCase();
        if (email)
            admins.add(email);
    });
    return admins;
}
/**
 * Get permissions set for a user from AdminUsers sheet.
 * Col A = Email, Col B = Permissions (comma-separated).
 * Backward compat: rows with no Permissions col get ADMIN_DEFAULT_PERMISSIONS.
 */
function getUserPermissions(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const adminSheet = ss.getSheetByName('AdminUsers');
    if (!adminSheet || adminSheet.getLastRow() <= 1)
        return new Set();
    const lastRow = adminSheet.getLastRow();
    const colCount = Math.max(adminSheet.getLastColumn(), 2);
    const values = adminSheet.getRange(2, 1, lastRow - 1, colCount).getValues();
    for (let i = 0; i < values.length; i++) {
        const rowEmail = String(values[i][0] || '').trim().toLowerCase();
        if (rowEmail === normalizedEmail) {
            const permsStr = String(values[i][1] || '').trim();
            if (!permsStr) {
                return new Set(ADMIN_DEFAULT_PERMISSIONS.split(',').map(p => p.trim()));
            }
            return new Set(permsStr.split(',').map(p => p.trim()).filter(p => p.length > 0));
        }
    }
    return new Set();
}
/**
 * Check if the current user has a specific permission.
 * @param {string} permission - e.g. 'admin', 'payroll', 'export', 'verify', 'edit'
 */
function hasPermission(permission) {
    const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!email)
        return false;
    return getUserPermissions(email).has(permission);
}
function hasAnyPermission(permissionList) {
    const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!email)
        return false;
    const perms = getUserPermissions(email);
    return permissionList.some(p => perms.has(p));
}
function canAccessAdminView() {
    return hasAnyPermission(['payroll', 'export', 'verify', 'edit']);
}
function getCurrentUserPermissionFlags() {
    const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!email) {
        return {
            canAccessAdminView: false,
            canEdit: false,
            canVerify: false,
            canPayroll: false,
            canExport: false
        };
    }
    const perms = getUserPermissions(email);
    const canEdit = perms.has('edit');
    const canVerify = perms.has('verify');
    const canPayroll = perms.has('payroll');
    const canExport = perms.has('export');
    return {
        canAccessAdminView: canEdit || canVerify || canPayroll || canExport,
        canEdit: canEdit,
        canVerify: canVerify,
        canPayroll: canPayroll,
        canExport: canExport
    };
}
function isCurrentUserAdmin() {
    const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!email)
        return false;
    return getUserPermissions(email).has('admin');
}
// ==================== CONSTANTS ====================
const MAX_DIFF_HOURS = 14; // Auto clock-out after this many hours
const ACTIVE_PAY_PERIOD_START_KEY = 'activePayPeriodStartDate';
const ACTIVE_PAY_PERIOD_END_KEY = 'activePayPeriodEndDate';
const EMPLOYEE_EMAIL_CACHE_KEY = 'employeeEmailList';
const EMPLOYEE_EMAIL_CACHE_UPDATED_AT_KEY = 'employeeEmailListUpdatedAt';
const SCRIPT_VERSION = '2.2.2-push.74';
const ADMIN_DEFAULT_PERMISSIONS = 'admin,payroll,export,verify,edit';
const MIGRATION_VERSION_KEY = 'migrationVersion';
const MIGRATION_VERSION = 'v2.1';
// AWS Alternative Work Week configuration
const AWS_CONFIG_KEY = 'aws_employees_config';
const AWS_CONFIG_UPDATED_AT_KEY = 'aws_employees_config_timestamp';
const AWS_DAILY_THRESHOLD = 10; // 10 hours before daily OT kicks in for AWS
const SCHEDULE_SHEET_NAME = 'Schedule';
const SCHEDULE_SETTINGS_HEADERS = ['Key', 'Value', 'Updated At', 'Updated By'];
const SCHEDULE_STATE_KEY = 'schedule_state_json';
const SCHEDULE_STATE_SCHEMA_VERSION = 1;
/**
 * @typedef {Object} AWSConfigEntry
 * @property {boolean} enabled
 * @property {string} effectiveDate
 */
/**
 * @typedef {Object<string, AWSConfigEntry>} AWSConfigMap
 */
const DEBUG_PAYROLL_CALCULATIONS = true;
const DEBUG_LOG_PREFIX = '[AWS-DEBUG] ';
function getScriptVersion() {
    return SCRIPT_VERSION;
}
/**
 * Log debug messages for payroll calculations
 * @param {string} message - The message to log
 * @param {object} data - Optional data object to log alongside message
 */
function debugLog(message, data = null) {
    if (!isDebugEnabled())
        return; // Check runtime setting
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
    const logMessage = `${DEBUG_LOG_PREFIX}${timestamp} - ${message}`;
    if (data) {
        Logger.log(`${logMessage} | ${JSON.stringify(data)}`);
    }
    else {
        Logger.log(logMessage);
    }
}
// ==================== WEB APP FOR EMPLOYEES ====================
/**
 * Web app entry point - mobile-first responsive interface
 */
function doGet(e) {
    const userEmail = Session.getActiveUser().getEmail();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!userEmail || !emailRegex.test(userEmail)) {
        return HtmlService.createHtmlOutput(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">⚠️ Authentication Required</h2>
          <p>Please sign in with a valid Google account.</p>
        </body>
      </html>
    `).setTitle('TimeCard System');
    }
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const dataEntry = ss.getSheetByName('DataEntry');
        if (!dataEntry) {
            throw new Error('DataEntry sheet not found. Please run Initialize Sheets from Payroll Tools menu.');
        }
        ensureDataEntrySchema(dataEntry);
        const statusObj = getCurrentStatus(userEmail, dataEntry);
        const allowedRange = getAllowedDateRange();
        const activePayPeriod = getActivePayPeriod();
        const entries = getEmployeeEntries(userEmail, dataEntry, null, null);
        const allowedRangeForClient = {
            minDateISO: allowedRange.minDateISO,
            maxDateISO: allowedRange.maxDateISO,
            minDateStr: allowedRange.minDateStr,
            maxDateStr: allowedRange.maxDateStr
        };
        const permissionFlags = getCurrentUserPermissionFlags();
        const schedulePreviewResult = getCurrentUserSchedulePreview();
        const preloadedSchedulePreview = schedulePreviewResult && schedulePreviewResult.preview ? schedulePreviewResult.preview : null;
        return HtmlService.createHtmlOutput(createMobileHtml(userEmail, statusObj, entries, ss.getId(), activePayPeriod.startDateStr, activePayPeriod.endDateStr, allowedRangeForClient, getScriptVersion(), permissionFlags, preloadedSchedulePreview))
            .setTitle('TimeCard System')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    catch (e) {
        Logger.log('doGet: error=%s', e.message);
        return HtmlService.createHtmlOutput(`
      <html>
        <body>
          <h2>Error</h2>
          <p>${e.message}</p>
          <p>Please contact your administrator.</p>
        </body>
      </html>
    `).setTitle('TimeCard System');
    }
}
/**
 * Get current clock status for employee
 */
function getCurrentStatus(email, dataEntry) {
    const now = new Date();
    const timeZone = Session.getScriptTimeZone();
    // Find latest entry for this employee using timestamp-based lookup
    const latestEntry = findLatestEmployeeEntry(email, dataEntry);
    if (!latestEntry) {
        Logger.log('getCurrentStatus: no entries for user');
        debugLog('getCurrentStatus no latest entry', { email: email });
        return { status: 'No time log entries found.', isClockedIn: false };
    }
    const { clockIn, clockOut } = latestEntry;
    // Check if clocked in (no clock-out)
    if (!clockOut || clockOut === '') {
        const diffMs = now.getTime() - clockIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        // Auto clock-out if over max hours
        if (diffHours >= MAX_DIFF_HOURS) {
            const autoClockOut = new Date(clockIn.getTime() + (MAX_DIFF_HOURS * 60 * 60 * 1000));
            const existingNotes = latestEntry.notes || '';
            processClockOut(email, dataEntry, autoClockOut, existingNotes, latestEntry.entryId, clockIn, true);
            Logger.log('getCurrentStatus: auto-clocked-out stale entry');
            debugLog('getCurrentStatus auto-close triggered', { email: email, rowIndex: latestEntry.rowIndex, diffHours: diffHours });
            return {
                status: `You were auto-clocked out after ${MAX_DIFF_HOURS} hours. Contact your manager.`,
                isClockedIn: false
            };
        }
        const clockInStr = Utilities.formatDate(clockIn, timeZone, "h:mm a 'on' MM/dd/yyyy");
        Logger.log('getCurrentStatus: user is clocked in');
        debugLog('getCurrentStatus clocked in', { email: email, rowIndex: latestEntry.rowIndex, diffHours: diffHours });
        return {
            status: `You are currently clocked in since ${clockInStr}.`,
            isClockedIn: true
        };
    }
    // Has clock-out
    if (clockOut instanceof Date && !isNaN(clockOut.getTime())) {
        const clockOutStr = Utilities.formatDate(clockOut, timeZone, "h:mm a 'on' MM/dd/yyyy");
        Logger.log('getCurrentStatus: user is clocked out');
        debugLog('getCurrentStatus clocked out', { email: email, rowIndex: latestEntry.rowIndex, clockOut: clockOutStr });
        return {
            status: `You are currently clocked out (last at ${clockOutStr}).`,
            isClockedIn: false
        };
    }
    Logger.log('getCurrentStatus: invalid clock status fallback');
    debugLog('getCurrentStatus invalid status fallback', { email: email, rowIndex: latestEntry.rowIndex });
    return { status: 'No valid clock status found.', isClockedIn: false };
}
/**
 * Get entries for employee (defaults to the last 30 days when no custom range is provided)
 */
function getEmployeeEntries(email, sheet, customMinDate = null, customMaxDate = null) {
    const startMs = Date.now();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return [];
    }
    const data = sheet.getRange(2, 1, lastRow - 1, DATA_COL_COUNT).getValues();
    // Use custom date range if provided, otherwise default to last 30 days
    let cutoffMin, cutoffMax;
    if (customMinDate) {
        cutoffMin = customMinDate;
    }
    else {
        cutoffMin = new Date();
        cutoffMin.setDate(cutoffMin.getDate() - 30);
        cutoffMin.setHours(0, 0, 0, 0);
    }
    if (customMaxDate) {
        cutoffMax = customMaxDate;
    }
    else {
        cutoffMax = new Date();
        cutoffMax.setHours(23, 59, 59, 999);
    }
    const twoWeekEntries = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i][DATA_COLUMNS.EMAIL] === email && !isDeletedDataRow(data[i])) {
            const clockIn = getEffectiveClockInFromRow(data[i]);
            const clockOut = getEffectiveClockOutFromRow(data[i]);
            const rawClockIn = getRowRawClockIn(data[i]);
            const rawClockOut = getRowRawClockOut(data[i]);
            const modifiedClockIn = getRowModifiedClockIn(data[i]);
            const modifiedClockOut = getRowModifiedClockOut(data[i]);
            if (clockIn instanceof Date && !isNaN(clockIn.getTime()) && clockIn >= cutoffMin && clockIn <= cutoffMax) {
                twoWeekEntries.push({
                    rowIndex: i + 2,
                    entryId: getRowEntryId(data[i]) || null,
                    email: data[i][DATA_COLUMNS.EMAIL],
                    clockIn: clockIn,
                    clockOut: clockOut || null,
                    rawClockIn: rawClockIn,
                    rawClockOut: rawClockOut,
                    modifiedClockIn: modifiedClockIn,
                    modifiedClockOut: modifiedClockOut,
                    hours: data[i][DATA_COLUMNS.HOURS],
                    verified: isSheetBooleanTrue(data[i][DATA_COLUMNS.VERIFIED]),
                    notes: data[i][DATA_COLUMNS.NOTES],
                    entryType: getRowEntryType(data[i])
                });
            }
        }
    }
    // Sort by timestamp ascending (chronological order, oldest first)
    twoWeekEntries.sort((a, b) => a.clockIn.getTime() - b.clockIn.getTime());
    // Transform to match expected format for HTML display
    const mappedEntries = twoWeekEntries.map(entry => ({
        rowIndex: entry.rowIndex,
        entryId: entry.entryId || null,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        rawClockIn: entry.rawClockIn,
        rawClockOut: entry.rawClockOut,
        modifiedClockIn: entry.modifiedClockIn,
        modifiedClockOut: entry.modifiedClockOut,
        hours: entry.hours,
        verified: entry.verified,
        notes: entry.notes,
        entryType: entry.entryType,
        deleted: false
    }));
    Logger.log('getEmployeeEntries: returned %s entries', mappedEntries.length);
    debugLog('getEmployeeEntries complete', {
        email: email,
        scannedRows: data.length,
        returned: mappedEntries.length,
        minDate: Utilities.formatDate(cutoffMin, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        maxDate: Utilities.formatDate(cutoffMax, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        durationMs: Date.now() - startMs
    });
    return mappedEntries;
}
/**
 * Handle clock in/out/save note actions
 *
 * Performance Note: Each operation calls SpreadsheetApp.flush() at the end to ensure changes
 * are committed. This is acceptable for single user actions. For batch operations (e.g., admin
 * processing multiple employees), consider batching multiple operations before the final flush.
 */
function submitClockAction(action, notes, entryId) {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
        throw new Error('Unable to identify user. Please sign in.');
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        throw new Error('DataEntry sheet not found. Please contact administrator.');
    }
    const now = new Date();
    const actionEntryId = String(entryId || '').trim();
    const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const data = dataEntry.getDataRange().getValues();
    Logger.log('submitClockAction: action=%s', action);
    debugLog('submitClockAction received', { action: action, hasNotes: !!notes, notesLength: notes ? String(notes).length : 0 });
    if (action === 'Clock In') {
        // Check for duplicate clock-in
        for (let i = data.length - 1; i >= 1; i--) {
            if (data[i][DATA_COLUMNS.EMAIL] === userEmail && !isDeletedDataRow(data[i])) {
                const dateValue = getEffectiveClockInFromRow(data[i]);
                const existingClockOut = getEffectiveClockOutFromRow(data[i]);
                if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
                    const dateStr = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'MM/dd/yyyy');
                    if (dateStr === todayStr && (!existingClockOut || !(existingClockOut instanceof Date))) {
                        return {
                            success: true,
                            message: 'Already clocked in for today',
                            status: getCurrentStatus(userEmail, dataEntry).status,
                            isClockedIn: true
                        };
                    }
                }
            }
        }
        // Insert clock-in without reordering existing rows.
        const newRow = appendDataEntryRow(dataEntry, buildDataEntryRow(userEmail, now, '', notes || '', false, ENTRY_TYPE_WORKED));
        const createdRowData = dataEntry.getRange(newRow, 1, 1, DATA_COL_COUNT).getValues()[0];
        debugLog('entryId.create.success', {
            source: 'submitClockAction.ClockIn',
            rowIndex: newRow,
            entryId: getRowEntryId(createdRowData) || null,
            email: userEmail
        });
        SpreadsheetApp.flush();
        addEmailToEmployeeCache(userEmail);
        Logger.log('submitClockAction: clock-in completed (row=%s)', newRow);
        return {
            success: true,
            message: '✅ Clocked in successfully',
            status: getCurrentStatus(userEmail, dataEntry).status,
            isClockedIn: true
        };
    }
    else if (action === 'Clock Out') {
        if (!actionEntryId) {
            return {
                success: false,
                errorCode: 'ENTRY_ID_REQUIRED',
                message: 'Clock-out requires a valid entry identifier. Refresh and try again.',
                status: getCurrentStatus(userEmail, dataEntry).status,
                isClockedIn: true
            };
        }
        const target = resolveEntryRowByIdWithRetry(dataEntry, actionEntryId, null, 3, 'submitClockAction.ClockOut');
        if (!isFinite(target.rowNum)) {
            return {
                success: false,
                errorCode: target.errorCode || 'ENTRY_NOT_FOUND',
                message: target.error || 'Entry not found. Refresh and try again.',
                status: getCurrentStatus(userEmail, dataEntry).status,
                isClockedIn: true
            };
        }
        const rowData = dataEntry.getRange(target.rowNum, 1, 1, DATA_COL_COUNT).getValues()[0];
        const rowEmail = String(rowData[DATA_COLUMNS.EMAIL] || '').trim().toLowerCase();
        if (rowEmail !== String(userEmail || '').trim().toLowerCase()) {
            return {
                success: false,
                errorCode: 'ENTRY_OWNERSHIP_MISMATCH',
                message: 'Clock-out entry ownership mismatch. Refresh and try again.',
                status: getCurrentStatus(userEmail, dataEntry).status,
                isClockedIn: true
            };
        }
        const clockInDateTime = getEffectiveClockInFromRow(rowData);
        const existingClockOut = getEffectiveClockOutFromRow(rowData);
        if (!(clockInDateTime instanceof Date) || isNaN(clockInDateTime.getTime()) || (existingClockOut instanceof Date && !isNaN(existingClockOut.getTime()))) {
            return {
                success: false,
                errorCode: 'ENTRY_NOT_OPEN',
                message: 'Selected entry is not open for clock-out.',
                status: getCurrentStatus(userEmail, dataEntry).status,
                isClockedIn: false
            };
        }
        const originalNotes = rowData[DATA_COLUMNS.NOTES] || '';
        // Check if clock-out should be capped at MAX_DIFF_HOURS
        const maxClockOut = new Date(clockInDateTime.getTime() + (MAX_DIFF_HOURS * 60 * 60 * 1000));
        const clockOutDateTime = now < maxClockOut ? now : maxClockOut;
        const newNotes = notes ? (originalNotes ? originalNotes + '; ' + notes : notes) : originalNotes;
        processClockOut(userEmail, dataEntry, clockOutDateTime, newNotes, actionEntryId, clockInDateTime, false);
        return {
            success: true,
            message: '✅ Clocked out successfully',
            status: getCurrentStatus(userEmail, dataEntry).status,
            isClockedIn: false
        };
    }
    return {
        success: false,
        message: 'Invalid action',
        status: getCurrentStatus(userEmail, dataEntry).status,
        isClockedIn: false
    };
}
/**
 * Consolidated validation for manual time entry (used by both web app and menu)
 * @param clockInDate Clock-in as Date object
 * @param clockOutDate Clock-out as Date object
 * @returns Object { valid: bool, error: string or empty }
 */
function validateManualTimeEntry(clockInDate, clockOutDate) {
    if (isNaN(clockInDate.getTime()) || isNaN(clockOutDate.getTime())) {
        Logger.log('validateManualTimeEntry: invalid input datetime');
        debugLog('validateManualTimeEntry failed invalid date input');
        return { valid: false, error: 'Invalid date or time provided.' };
    }
    if (clockOutDate <= clockInDate) {
        Logger.log('validateManualTimeEntry: clockOut not after clockIn');
        debugLog('validateManualTimeEntry failed ordering', { clockIn: clockInDate.toISOString(), clockOut: clockOutDate.toISOString() });
        return { valid: false, error: 'Clock out must be after clock in.' };
    }
    // Enforce max 14-hour span per entry server-side
    const diffMs = clockOutDate.getTime() - clockInDate.getTime();
    const maxMs = 14 * 60 * 60 * 1000;
    if (diffMs > maxMs) {
        Logger.log('validateManualTimeEntry: exceeds max duration');
        debugLog('validateManualTimeEntry failed max span', { diffHours: diffMs / (1000 * 60 * 60) });
        return { valid: false, error: 'Entries are limited to 14 hours. Please adjust the times or split into multiple entries with a note explaining the extended shift.' };
    }
    // Validate dates are within allowed range (day after last pay period end through today)
    const allowedRange = getAllowedDateRange();
    if (clockInDate < allowedRange.minDate || clockInDate > allowedRange.maxDate) {
        Logger.log('validateManualTimeEntry: clockIn outside allowed range');
        debugLog('validateManualTimeEntry failed clockIn range', {
            clockIn: clockInDate.toISOString(),
            minDate: allowedRange.minDateISO,
            maxDate: allowedRange.maxDateISO
        });
        return {
            valid: false,
            error: `Clock in date must be between ${allowedRange.minDateStr} and ${allowedRange.maxDateStr}.`
        };
    }
    if (clockOutDate < allowedRange.minDate || clockOutDate > allowedRange.maxDate) {
        Logger.log('validateManualTimeEntry: clockOut outside allowed range');
        debugLog('validateManualTimeEntry failed clockOut range', {
            clockOut: clockOutDate.toISOString(),
            minDate: allowedRange.minDateISO,
            maxDate: allowedRange.maxDateISO
        });
        return {
            valid: false,
            error: `Clock out date must be between ${allowedRange.minDateStr} and ${allowedRange.maxDateStr}.`
        };
    }
    debugLog('validateManualTimeEntry passed', {
        diffHours: diffMs / (1000 * 60 * 60),
        minDate: allowedRange.minDateISO,
        maxDate: allowedRange.maxDateISO
    });
    return { valid: true, error: '' };
}
/**
 * Add a manual/missed time entry for the current user
 */
function submitManualTimeEntry(clockInISO, clockOutISO, notes, entryType = ENTRY_TYPE_WORKED) {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
        throw new Error('Unable to identify user. Please sign in.');
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        throw new Error('DataEntry sheet not found. Please contact administrator.');
    }
    const clockInDate = new Date(clockInISO);
    const clockOutDate = new Date(clockOutISO);
    const currentStatus = getCurrentStatus(userEmail, dataEntry);
    // Use consolidated validation helper
    const validation = validateManualTimeEntry(clockInDate, clockOutDate);
    if (!validation.valid) {
        return {
            success: false,
            message: validation.error,
            status: currentStatus.status,
            isClockedIn: currentStatus.isClockedIn
        };
    }
    const finalNotes = buildManualEntryNotes(notes, userEmail);
    const normalizedEntryType = normalizeEntryType(entryType);
    Logger.log('submitManualTimeEntry: manual entry requested');
    debugLog('submitManualTimeEntry payload', { clockInISO: clockInISO, clockOutISO: clockOutISO, hasNotes: !!notes, notesLength: notes ? String(notes).length : 0 });
    const newRow = appendDataEntryRow(dataEntry, buildDataEntryRow(userEmail, clockInDate, '', finalNotes, false, normalizedEntryType));
    const createdManualRowData = dataEntry.getRange(newRow, 1, 1, DATA_COL_COUNT).getValues()[0];
    const createdManualEntryId = getRowEntryId(createdManualRowData);
    debugLog('entryId.create.success', {
        source: 'submitManualTimeEntry',
        rowIndex: newRow,
        entryId: createdManualEntryId || null,
        email: userEmail
    });
    SpreadsheetApp.flush();
    addEmailToEmployeeCache(userEmail);
    processClockOut(userEmail, dataEntry, clockOutDate, finalNotes, createdManualEntryId, clockInDate, false);
    const latestStatus = getCurrentStatus(userEmail, dataEntry);
    return {
        success: true,
        message: '✅ Missed time added successfully',
        status: latestStatus.status,
        isClockedIn: latestStatus.isClockedIn
    };
}
/**
 * Process clock-out with midnight rollover handling
 * @param email Employee email
 * @param dataEntry Reference to DataEntry sheet
 * @param clockOutDateTime Clock-out datetime
 * @param notes Notes to save (auto-message will be appended if isAutoClockOut is true)
 * @param entryId Entry ID of the clock-in entry
 * @param clockInDateTime Clock-in datetime
 * @param isAutoClockOut Whether this is an automatic 14-hour clock-out (default: false)
 */
function processClockOut(email, dataEntry, clockOutDateTime, notes, entryId, clockInDateTime, isAutoClockOut = false) {
    const target = resolveEntryRowByIdWithRetry(dataEntry, entryId, null, 3, 'processClockOut');
    if (!isFinite(target.rowNum)) {
        Logger.log('processClockOut: entry resolution failed (%s)', target.error || 'unknown');
        return;
    }
    const rowIndex = target.rowNum;
    const existingRowData = dataEntry.getRange(rowIndex, 1, 1, DATA_COL_COUNT).getValues()[0];
    const rowEmail = String(existingRowData[DATA_COLUMNS.EMAIL] || '').trim().toLowerCase();
    if (rowEmail !== String(email || '').trim().toLowerCase()) {
        Logger.log('processClockOut: entry ownership mismatch (row=%s)', rowIndex);
        return;
    }
    const resolvedClockIn = getEffectiveClockInFromRow(existingRowData);
    if (resolvedClockIn instanceof Date && !isNaN(resolvedClockIn.getTime())) {
        clockInDateTime = resolvedClockIn;
    }
    if (!clockInDateTime)
        return;
    // Validate dates before formatting
    if (!(clockInDateTime instanceof Date) || isNaN(clockInDateTime.getTime())) {
        Logger.log('Invalid clockInDateTime in processClockOut');
        return;
    }
    if (!(clockOutDateTime instanceof Date) || isNaN(clockOutDateTime.getTime())) {
        Logger.log('Invalid clockOutDateTime in processClockOut');
        return;
    }
    // Construct final notes: append auto-message if this is an automatic clock-out
    let finalNotes = notes;
    if (isAutoClockOut) {
        const autoMessage = `Auto clock-out after ${MAX_DIFF_HOURS} hours. Contact manager to fix.`;
        finalNotes = notes ? notes + '; ' + autoMessage : autoMessage;
    }
    const clockInDateStr = Utilities.formatDate(clockInDateTime, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const clockOutDateStr = Utilities.formatDate(clockOutDateTime, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const isMidnightRollover = clockInDateStr !== clockOutDateStr;
    const existingRawClockOut = getRowRawClockOut(existingRowData);
    const existingEntryType = getRowEntryType(existingRowData);
    if (!isMidnightRollover) {
        // Simple clock-out: never overwrite raw column once it has a value
        if (!existingRawClockOut) {
            dataEntry.getRange(rowIndex, dataCol('CLOCK_OUT')).setValue(clockOutDateTime);
        }
        else {
            dataEntry.getRange(rowIndex, dataCol('CLOCK_OUT_MODIFIED')).setValue(clockOutDateTime);
        }
        dataEntry.getRange(rowIndex, dataCol('NOTES')).setValue(finalNotes);
        setRowFormatAndFormula(dataEntry, rowIndex);
        SpreadsheetApp.flush();
        Logger.log('processClockOut: clock-out completed (row=%s)', rowIndex);
    }
    else {
        // Split at midnight
        const rolloverNote = 'Entry crossed midnight and was auto-split.';
        const combinedNotes = finalNotes
            ? (finalNotes.indexOf(rolloverNote) >= 0 ? finalNotes : finalNotes + '; ' + rolloverNote)
            : rolloverNote;
        const firstDayEnd = new Date(clockInDateTime);
        firstDayEnd.setHours(23, 59, 59, 0);
        // Update first day entry - preserve raw immutability
        if (!existingRawClockOut) {
            dataEntry.getRange(rowIndex, dataCol('CLOCK_OUT')).setValue(firstDayEnd);
        }
        else {
            dataEntry.getRange(rowIndex, dataCol('CLOCK_OUT_MODIFIED')).setValue(firstDayEnd);
        }
        dataEntry.getRange(rowIndex, dataCol('NOTES')).setValue(combinedNotes);
        setRowFormatAndFormula(dataEntry, rowIndex);
        SpreadsheetApp.flush();
        Logger.log('processClockOut: midnight split first segment saved (row=%s)', rowIndex);
        // Add second day entry if needed without reordering existing rows.
        if (clockOutDateTime > firstDayEnd) {
            const startOfNextDay = new Date(clockInDateTime);
            startOfNextDay.setDate(startOfNextDay.getDate() + 1);
            startOfNextDay.setHours(0, 0, 0, 0);
            const newRow = appendDataEntryRow(dataEntry, buildDataEntryRow(email, startOfNextDay, clockOutDateTime, combinedNotes, false, existingEntryType));
            const createdSplitRowData = dataEntry.getRange(newRow, 1, 1, DATA_COL_COUNT).getValues()[0];
            debugLog('entryId.create.success', {
                source: 'processClockOut.midnightSplitSecondDay',
                rowIndex: newRow,
                entryId: getRowEntryId(createdSplitRowData) || null,
                email: email
            });
            SpreadsheetApp.flush();
            Logger.log('processClockOut: midnight split second segment saved (row=%s)', newRow);
        }
    }
}
/**
 * Refresh current status (for web app button)
 */
function refreshCurrentStatus() {
    const userEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    Logger.log('refreshCurrentStatus: requested');
    if (!dataEntry) {
        throw new Error('DataEntry sheet not found.');
    }
    const statusObj = getCurrentStatus(userEmail, dataEntry);
    debugLog('refreshCurrentStatus complete', { isClockedIn: statusObj.isClockedIn, statusLength: String(statusObj.status || '').length });
    return { status: statusObj.status, isClockedIn: statusObj.isClockedIn };
}
/**
 * Get recent entries HTML for updating the table
 */
function getRecentEntriesHtml() {
    const startMs = Date.now();
    const userEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        throw new Error('DataEntry sheet not found.');
    }
    ensureScheduleEmployeeRosterLoaded_(userEmail);
    const entries = getEmployeeEntries(userEmail, dataEntry, null, null);
    let entriesHtml = '';
    if (entries.length === 0) {
        entriesHtml = '<tr><td colspan="5" style="text-align: center; color: #999;">No entries yet</td></tr>';
    }
    else {
        entries.forEach(entry => {
            const clockInStr = entry.clockIn ? Utilities.formatDate(new Date(entry.clockIn), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm') : '';
            const clockOutStr = entry.clockOut ? Utilities.formatDate(new Date(entry.clockOut), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm') : '';
            const actionHtml = entry.entryId ? `<button onclick="editEntryNote('${entry.entryId}')">Edit Note</button>` : '';
            entriesHtml += `
        <tr>
          <td>${clockInStr}</td>
          <td>${clockOutStr}</td>
          <td>${entry.hours ? entry.hours.toFixed(2) : '0.00'}</td>
          <td>${entry.notes || ''}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
        });
    }
    Logger.log('getRecentEntriesHtml: rendered %s row(s)', entries.length);
    debugLog('getRecentEntriesHtml complete', { entriesCount: entries.length, durationMs: Date.now() - startMs });
    return entriesHtml;
}
/**
 * Get recent entries as JSON for client-side validation
 */
function getRecentEntriesJson() {
    const startMs = Date.now();
    const userEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        throw new Error('DataEntry sheet not found.');
    }
    ensureScheduleEmployeeRosterLoaded_(userEmail);
    const entries = getEmployeeEntries(userEmail, dataEntry, null, null);
    const serializedEntries = entries.map(entry => {
        const clockInDate = entry.clockIn ? new Date(entry.clockIn) : null;
        const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
        const rawClockInDate = entry.rawClockIn ? new Date(entry.rawClockIn) : null;
        const rawClockOutDate = entry.rawClockOut ? new Date(entry.rawClockOut) : null;
        const modifiedClockInDate = entry.modifiedClockIn ? new Date(entry.modifiedClockIn) : null;
        const modifiedClockOutDate = entry.modifiedClockOut ? new Date(entry.modifiedClockOut) : null;
        return {
            rowIndex: entry.rowIndex,
            entryId: entry.entryId || null,
            clockIn: clockInDate && !isNaN(clockInDate.getTime()) ? clockInDate.toISOString() : null,
            clockOut: clockOutDate && !isNaN(clockOutDate.getTime()) ? clockOutDate.toISOString() : null,
            rawClockIn: rawClockInDate && !isNaN(rawClockInDate.getTime()) ? rawClockInDate.toISOString() : null,
            rawClockOut: rawClockOutDate && !isNaN(rawClockOutDate.getTime()) ? rawClockOutDate.toISOString() : null,
            modifiedClockIn: modifiedClockInDate && !isNaN(modifiedClockInDate.getTime()) ? modifiedClockInDate.toISOString() : null,
            modifiedClockOut: modifiedClockOutDate && !isNaN(modifiedClockOutDate.getTime()) ? modifiedClockOutDate.toISOString() : null,
            hours: entry.hours ? Number(entry.hours) : 0,
            verified: isSheetBooleanTrue(entry.verified),
            notes: entry.notes || '',
            entryType: entry.entryType || ENTRY_TYPE_WORKED,
            deleted: !!entry.deleted
        };
    });
    Logger.log('getRecentEntriesJson: returned %s entry/entries', serializedEntries.length);
    debugLog('getRecentEntriesJson complete', { entriesCount: serializedEntries.length, durationMs: Date.now() - startMs });
    return serializedEntries;
}

function getScheduleDayNames_() {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
}

function parseScheduleTimeBlockHour_(timeBlock) {
    const value = String(timeBlock || '').trim();
    const match = value.match(/^(\d{1,2}):\d{2}$/);
    if (!match) {
        return null;
    }
    const hour = Number(match[1]);
    if (!isFinite(hour) || hour < 0 || hour > 23) {
        return null;
    }
    return hour;
}

function formatScheduleHourLabel_(hour24) {
    const normalized = Number(hour24);
    if (!isFinite(normalized)) {
        return '';
    }
    const wrapped = ((normalized % 24) + 24) % 24;
    const suffix = wrapped >= 12 ? 'PM' : 'AM';
    const twelveHour = wrapped % 12 === 0 ? 12 : wrapped % 12;
    return String(twelveHour) + ':00 ' + suffix;
}

function buildScheduleSegmentsFromDay_(dayRecord) {
    const shifts = dayRecord && Array.isArray(dayRecord.shifts) ? dayRecord.shifts : [];
    const hourStatus = new Map();
    for (let i = 0; i < shifts.length; i++) {
        const shift = shifts[i] || {};
        const status = String(shift.status || '').trim().toUpperCase();
        if (status !== 'O' && status !== 'B' && status !== 'L') {
            continue;
        }
        const hour = parseScheduleTimeBlockHour_(shift.timeBlock);
        if (hour === null) {
            continue;
        }
        // Latest shift assignment for an hour wins if duplicates exist.
        hourStatus.set(hour, status);
    }
    const sortedHours = Array.from(hourStatus.keys()).sort((a, b) => a - b);
    const statusLabelMap = { O: 'On Duty', B: 'Backup', L: 'Lunch' };
    const segments = [];

    let runStartHour = null;
    let runEndHour = null;
    let runStatus = '';

    for (let i = 0; i < sortedHours.length; i++) {
        const hour = sortedHours[i];
        const status = hourStatus.get(hour) || '';
        const startsNewRun = runStartHour === null
            || status !== runStatus
            || hour !== (runEndHour + 1);

        if (startsNewRun) {
            if (runStartHour !== null && runStatus) {
                const endHourExclusive = runEndHour + 1;
                segments.push({
                    status: runStatus,
                    label: statusLabelMap[runStatus] || runStatus,
                    startHour: runStartHour,
                    endHourExclusive: endHourExclusive,
                    rangeText: formatScheduleHourLabel_(runStartHour) + '-' + formatScheduleHourLabel_(endHourExclusive)
                });
            }
            runStartHour = hour;
            runEndHour = hour;
            runStatus = status;
            continue;
        }

        runEndHour = hour;
    }

    if (runStartHour !== null && runStatus) {
        const endHourExclusive = runEndHour + 1;
        segments.push({
            status: runStatus,
            label: statusLabelMap[runStatus] || runStatus,
            startHour: runStartHour,
            endHourExclusive: endHourExclusive,
            rangeText: formatScheduleHourLabel_(runStartHour) + '-' + formatScheduleHourLabel_(endHourExclusive)
        });
    }

    return segments;
}

function buildEmployeeScheduleDaySummary_(dayRecord) {
    const dayName = String(dayRecord && dayRecord.dayName ? dayRecord.dayName : '').trim();
    const segments = buildScheduleSegmentsFromDay_(dayRecord);
    const hasSchedule = segments.length > 0;
    const summaryText = hasSchedule
        ? segments.map(segment => segment.rangeText + ' ' + segment.label).join(' | ')
        : 'Not scheduled';
    return {
        dayName: dayName,
        hasSchedule: hasSchedule,
        summaryText: summaryText,
        segments: segments
    };
}

function buildDefaultEmployeeSchedulePreview_() {
    const dayNames = getScheduleDayNames_();
    const week = dayNames.map(dayName => ({
        dayName: dayName,
        hasSchedule: false,
        summaryText: 'Not scheduled',
        segments: []
    }));
    return {
        week: week,
        today: week[0],
        tomorrow: week[1],
        updatedAt: ''
    };
}

function buildEmployeeSchedulePreviewFromRecord_(employeeRecord, updatedAt) {
    const dayNames = getScheduleDayNames_();
    const normalizedDays = normalizeScheduleDays_(employeeRecord && employeeRecord.days ? employeeRecord.days : []);
    const week = normalizedDays.map(day => buildEmployeeScheduleDaySummary_(day));
    const tz = Session.getScriptTimeZone();
    const isoDayValue = Number(Utilities.formatDate(new Date(), tz, 'u'));
    const isoDay = isFinite(isoDayValue) && isoDayValue >= 1 && isoDayValue <= 7 ? isoDayValue : 1;
    const todayIndex = isoDay - 1;
    const tomorrowIndex = (todayIndex + 1) % 7;
    const today = Object.assign({}, week[todayIndex] || buildEmployeeScheduleDaySummary_({ dayName: dayNames[todayIndex], shifts: [] }));
    const tomorrow = Object.assign({}, week[tomorrowIndex] || buildEmployeeScheduleDaySummary_({ dayName: dayNames[tomorrowIndex], shifts: [] }));
    if (!today.hasSchedule) {
        today.summaryText = 'Not scheduled today';
    }
    if (!tomorrow.hasSchedule) {
        tomorrow.summaryText = 'Not scheduled tomorrow';
    }
    return {
        week: week,
        today: today,
        tomorrow: tomorrow,
        updatedAt: String(updatedAt || '')
    };
}

function getCurrentUserSchedulePreview() {
    const startMs = Date.now();
    const userEmail = Session.getActiveUser().getEmail();
    const normalizedEmail = normalizeScheduleEmail_(userEmail);
    Logger.log('getCurrentUserSchedulePreview: requested');
    if (!normalizedEmail) {
        const fallbackPreview = buildDefaultEmployeeSchedulePreview_();
        fallbackPreview.today.summaryText = 'Not scheduled today';
        fallbackPreview.tomorrow.summaryText = 'Not scheduled tomorrow';
        debugLog('getCurrentUserSchedulePreview missing user email', { durationMs: Date.now() - startMs });
        return { success: false, message: 'Unable to identify user.', preview: fallbackPreview };
    }
    try {
        const state = ensureScheduleEmployeeRosterLoaded_(normalizedEmail);
        const employee = (state.Employee_data || []).find(record => normalizeScheduleEmail_(record.EmployeeEmail || record.EmployeeName) === normalizedEmail);
        const preview = buildEmployeeSchedulePreviewFromRecord_(employee || null, state.updatedAt);
        debugLog('getCurrentUserSchedulePreview complete', {
            email: normalizedEmail,
            hasEmployeeRecord: !!employee,
            todayHasSchedule: !!(preview.today && preview.today.hasSchedule),
            tomorrowHasSchedule: !!(preview.tomorrow && preview.tomorrow.hasSchedule),
            durationMs: Date.now() - startMs
        });
        return { success: true, preview: preview };
    }
    catch (e) {
        Logger.log('getCurrentUserSchedulePreview: error=%s', e.toString());
        const fallbackPreview = buildDefaultEmployeeSchedulePreview_();
        fallbackPreview.today.summaryText = 'Not scheduled today';
        fallbackPreview.tomorrow.summaryText = 'Not scheduled tomorrow';
        return { success: false, message: e.toString(), preview: fallbackPreview };
    }
}
// DEPRECATED (commented out intentionally for rollback safety):
// Manual Add Time UIs now receive preloaded allowed-range data from initial HTML render,
// so this RPC endpoint is no longer used in active flows.
//
// /**
//  * Get allowed date range for manual entries (client-side use)
//  * Returns ISO date strings and formatted strings for display
//  */
// function getAllowedDateRangeForClient() {
//   const range = getAllowedDateRange();
//   Logger.log('getAllowedDateRangeForClient: range served');
//   debugLog('getAllowedDateRangeForClient complete', { minDateISO: range.minDateISO, maxDateISO: range.maxDateISO });
//   return {
//     minDateISO: range.minDateISO,
//     maxDateISO: range.maxDateISO,
//     minDateStr: range.minDateStr,
//     maxDateStr: range.maxDateStr
//   };
// }
/**
 * Get archive review date bounds for the current user.
 * Dates are limited to entries before the current pay period start date.
 */
function getArchiveReviewBounds() {
    const email = Session.getActiveUser().getEmail();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const tz = Session.getScriptTimeZone();
    const startMs = Date.now();
    if (!normalizedEmail) {
        Logger.log('getArchiveReviewBounds: missing active user email');
        return {
            hasEntries: false,
            minDateISO: '',
            maxDateISO: '',
            minDateStr: '',
            maxDateStr: '',
            cutoffStr: ''
        };
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const archive = ss.getSheetByName('Archive');
    if (!archive) {
        Logger.log('getArchiveReviewBounds: archive sheet missing');
        return {
            hasEntries: false,
            minDateISO: '',
            maxDateISO: '',
            minDateStr: '',
            maxDateStr: '',
            cutoffStr: ''
        };
    }
    const allowedRange = getAllowedDateRange();
    const cutoff = new Date(allowedRange.minDate);
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(23, 59, 59, 999);
    const data = archive.getDataRange().getValues();
    let minDate = null;
    let maxDate = null;
    for (let i = 1; i < data.length; i++) {
        const rowEmail = String(data[i][ARCHIVE_COLUMNS.EMAIL] || '').trim().toLowerCase();
        if (rowEmail !== normalizedEmail)
            continue;
        const clockIn = getEffectiveClockInFromArchiveRow(data[i]);
        if (!(clockIn instanceof Date) || isNaN(clockIn.getTime()))
            continue;
        if (clockIn > cutoff)
            continue;
        if (!minDate || clockIn < minDate)
            minDate = clockIn;
        if (!maxDate || clockIn > maxDate)
            maxDate = clockIn;
    }
    const cutoffStr = Utilities.formatDate(cutoff, tz, 'MM/dd/yyyy');
    if (!minDate || !maxDate) {
        Logger.log('getArchiveReviewBounds: no eligible archive entries');
        debugLog('getArchiveReviewBounds no results', { cutoff: cutoffStr, durationMs: Date.now() - startMs });
        return {
            hasEntries: false,
            minDateISO: '',
            maxDateISO: '',
            minDateStr: '',
            maxDateStr: '',
            cutoffStr: cutoffStr
        };
    }
    Logger.log('getArchiveReviewBounds: bounds available');
    debugLog('getArchiveReviewBounds success', {
        cutoff: cutoffStr,
        minDate: Utilities.formatDate(minDate, tz, 'yyyy-MM-dd'),
        maxDate: Utilities.formatDate(maxDate, tz, 'yyyy-MM-dd'),
        durationMs: Date.now() - startMs
    });
    return {
        hasEntries: true,
        minDateISO: Utilities.formatDate(minDate, tz, 'yyyy-MM-dd'),
        maxDateISO: Utilities.formatDate(maxDate, tz, 'yyyy-MM-dd'),
        minDateStr: Utilities.formatDate(minDate, tz, 'MM/dd/yyyy'),
        maxDateStr: Utilities.formatDate(maxDate, tz, 'MM/dd/yyyy'),
        cutoffStr: cutoffStr
    };
}
/**
 * Fetch archived entries for the current user within a date range.
 * Dates must be before the current pay period start date.
 */
function getArchivedEntriesForUser(startDateISO, endDateISO) {
    const email = Session.getActiveUser().getEmail();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const tz = Session.getScriptTimeZone();
    const startMs = Date.now();
    if (!normalizedEmail) {
        Logger.log('getArchivedEntriesForUser: missing active user email');
        return { success: false, message: 'Unable to identify user.', entries: [] };
    }
    if (!startDateISO || !endDateISO) {
        Logger.log('getArchivedEntriesForUser: missing date input');
        return { success: false, message: 'Start and end dates are required.', entries: [] };
    }
    const startParts = String(startDateISO).split('-');
    const endParts = String(endDateISO).split('-');
    if (startParts.length !== 3 || endParts.length !== 3) {
        Logger.log('getArchivedEntriesForUser: invalid date format');
        return { success: false, message: 'Invalid date format.', entries: [] };
    }
    const startDate = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
    const endDate = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        Logger.log('getArchivedEntriesForUser: invalid parsed date values');
        return { success: false, message: 'Invalid date values provided.', entries: [] };
    }
    if (endDate < startDate) {
        Logger.log('getArchivedEntriesForUser: end date before start date');
        return { success: false, message: 'End date must be on or after start date.', entries: [] };
    }
    const allowedRange = getAllowedDateRange();
    const cutoff = new Date(allowedRange.minDate);
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(23, 59, 59, 999);
    if (endDate > cutoff) {
        const cutoffStr = Utilities.formatDate(cutoff, tz, 'MM/dd/yyyy');
        Logger.log('getArchivedEntriesForUser: end date exceeds cutoff');
        return { success: false, message: 'Dates must be on or before ' + cutoffStr + '.', entries: [] };
    }
    if (startDate > cutoff) {
        const cutoffStr = Utilities.formatDate(cutoff, tz, 'MM/dd/yyyy');
        Logger.log('getArchivedEntriesForUser: start date exceeds cutoff');
        return { success: false, message: 'Start date must be on or before ' + cutoffStr + '.', entries: [] };
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const archive = ss.getSheetByName('Archive');
    if (!archive) {
        Logger.log('getArchivedEntriesForUser: archive sheet missing');
        return { success: false, message: 'Archive sheet not found.', entries: [] };
    }
    const data = archive.getDataRange().getValues();
    const results = [];
    for (let i = 1; i < data.length; i++) {
        const rowEmail = String(data[i][ARCHIVE_COLUMNS.EMAIL] || '').trim().toLowerCase();
        if (rowEmail !== normalizedEmail)
            continue;
        const clockIn = getEffectiveClockInFromArchiveRow(data[i]);
        if (!(clockIn instanceof Date) || isNaN(clockIn.getTime()))
            continue;
        if (clockIn < startDate || clockIn > endDate)
            continue;
        const clockOut = getEffectiveClockOutFromArchiveRow(data[i]);
        const hoursValue = data[i][ARCHIVE_COLUMNS.HOURS];
        const notesValue = data[i][ARCHIVE_COLUMNS.NOTES];
        const verifiedValue = data[i][ARCHIVE_COLUMNS.VERIFIED];
        const entryIdValue = data[i][ARCHIVE_COLUMNS.ENTRY_ID];
        const archivedDateValue = data[i][ARCHIVE_COLUMNS.ARCHIVED_DATE];
        results.push({
            sortKey: clockIn.getTime(),
            clockIn: clockIn.toISOString(),
            clockOut: (clockOut instanceof Date && !isNaN(clockOut.getTime()))
                ? clockOut.toISOString()
                : '',
            hours: typeof hoursValue === 'number' ? hoursValue : Number(hoursValue) || 0,
            verified: isSheetBooleanTrue(verifiedValue),
            notes: notesValue || '',
            entryType: getArchiveRowEntryType(data[i]),
            entryId: String(entryIdValue || '').trim(),
            archivedDate: (archivedDateValue instanceof Date && !isNaN(archivedDateValue.getTime()))
                ? Utilities.formatDate(archivedDateValue, tz, 'MM/dd/yyyy')
                : ''
        });
    }
    results.sort((a, b) => b.sortKey - a.sortKey);
    const entries = results.map(item => ({
        clockIn: item.clockIn,
        clockOut: item.clockOut,
        hours: item.hours,
        verified: item.verified,
        notes: item.notes,
        entryType: item.entryType,
        entryId: item.entryId,
        archivedDate: item.archivedDate
    }));
    Logger.log('getArchivedEntriesForUser: success with %s row(s)', entries.length);
    debugLog('getArchivedEntriesForUser complete', {
        entriesCount: entries.length,
        startDateISO: startDateISO,
        endDateISO: endDateISO,
        durationMs: Date.now() - startMs
    });
    return { success: true, message: '', entries: entries };
}
/**
 * Get employee entries within allowed range for overlap checking (manager dialog use)
 * @param email Employee email
 * @returns Array of entry objects with ISO date strings
 */
function getEmployeeEntriesInRange(email) {
    const startMs = Date.now();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        throw new Error('DataEntry sheet not found.');
    }
    const allowedRange = getAllowedDateRange();
    const entries = getEmployeeEntries(email, dataEntry, allowedRange.minDate, allowedRange.maxDate);
    const transformedEntries = entries.map(entry => {
        const clockInDate = entry.clockIn ? new Date(entry.clockIn) : null;
        const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
        return {
            clockIn: clockInDate && !isNaN(clockInDate.getTime()) ? clockInDate.toISOString() : null,
            clockOut: clockOutDate && !isNaN(clockOutDate.getTime()) ? clockOutDate.toISOString() : null,
            hours: entry.hours ? Number(entry.hours) : 0,
            notes: entry.notes || ''
        };
    });
    Logger.log('getEmployeeEntriesInRange: returned %s entry/entries', transformedEntries.length);
    debugLog('getEmployeeEntriesInRange complete', {
        email: email,
        entriesCount: transformedEntries.length,
        minDate: allowedRange.minDateISO,
        maxDate: allowedRange.maxDateISO,
        durationMs: Date.now() - startMs
    });
    return transformedEntries;
}
/**
 * Format date/time for display
 */
function formatDateTime(date) {
    if (!date)
        return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        debugLog('formatDateTime invalid date input', { inputType: typeof date });
        return '';
    }
    return d.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
/**
 * Set hours formula, date formula, and formatting for a timecard row
 * @param sheet The sheet to update
 * @param rowIndex The row number (1-based)
 */
function setRowFormatAndFormula(sheet, rowIndex) {
    const startMs = Date.now();
    const clockOutRawCol = colToLetter(DATA_COLUMNS.CLOCK_OUT);
    const clockInRawCol = colToLetter(DATA_COLUMNS.CLOCK_IN);
    const clockOutModifiedCol = colToLetter(DATA_COLUMNS.CLOCK_OUT_MODIFIED);
    const clockInModifiedCol = colToLetter(DATA_COLUMNS.CLOCK_IN_MODIFIED);
    // Hours formula
    sheet.getRange(rowIndex, dataCol('HOURS')).setFormula(`=IF(IF(${clockOutModifiedCol}${rowIndex}<>"",${clockOutModifiedCol}${rowIndex},${clockOutRawCol}${rowIndex})<>"",(IF(${clockOutModifiedCol}${rowIndex}<>"",${clockOutModifiedCol}${rowIndex},${clockOutRawCol}${rowIndex})-IF(${clockInModifiedCol}${rowIndex}<>"",${clockInModifiedCol}${rowIndex},${clockInRawCol}${rowIndex}))*24,"")`); // Hours worked
    Logger.log('setRowFormatAndFormula: formatted row %s', rowIndex);
    debugLog('setRowFormatAndFormula complete', {
        rowIndex: rowIndex,
        hoursFormulaUsesModifiedFallback: true,
        durationMs: Date.now() - startMs
    });
}
function updateEntryNote(entryId, noteText, appendMode) {
    const userEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    if (!userEmail) {
        return { success: false, message: 'Unable to identify user.' };
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        return { success: false, message: 'DataEntry sheet not found.' };
    }
    const target = resolveEntryRowByIdWithRetry(dataEntry, entryId, null, 3, 'updateEntryNote');
    const rowNum = target.rowNum;
    if (!isFinite(rowNum)) {
        return {
            success: false,
            errorCode: target.errorCode || 'ENTRY_NOT_FOUND',
            message: target.error || 'Entry not found. Refresh and try again.'
        };
    }
    const rowData = dataEntry.getRange(rowNum, 1, 1, DATA_COL_COUNT).getValues()[0];
    const ownerEmail = String(rowData[DATA_COLUMNS.EMAIL] || '').trim().toLowerCase();
    const canEditAnyNotes = hasPermission('edit');
    if (!canEditAnyNotes && ownerEmail !== userEmail) {
        return { success: false, message: 'You can only edit your own notes.' };
    }
    if (isDeletedDataRow(rowData)) {
        return { success: false, message: 'Cannot edit notes on deleted entries.' };
    }
    const incomingNote = String(noteText || '').trim();
    const existingNote = String(rowData[DATA_COLUMNS.NOTES] || '').trim();
    let nextNote = incomingNote;
    if (appendMode === true) {
        if (!incomingNote) {
            return { success: false, message: 'Note text is required.' };
        }
        nextNote = existingNote ? existingNote + '; ' + incomingNote : incomingNote;
    }
    dataEntry.getRange(rowNum, dataCol('NOTES')).setValue(nextNote);
    SpreadsheetApp.flush();
    return { success: true, message: 'Note saved.' };
}
function buildDataEntryIdToRowMap(dataEntry) {
    const idToRowMap = {};
    const lastRow = dataEntry.getLastRow();
    const bodyRows = Math.max(lastRow - 1, 0);
    if (bodyRows === 0) {
        return idToRowMap;
    }
    const idValues = dataEntry.getRange(2, dataCol('ENTRY_ID'), bodyRows, 1).getValues();
    for (let i = 0; i < idValues.length; i++) {
        const entryId = String(idValues[i][0] || '').trim();
        if (entryId) {
            idToRowMap[entryId] = i + 2;
        }
    }
    return idToRowMap;
}
function resolveAdminTargetRow(dataEntry, requestedRowIndex, requestedEntryId, idToRowMap) {
    return resolveEntryRowByIdWithRetry(dataEntry, requestedEntryId, idToRowMap, 3, 'resolveAdminTargetRow');
}
function resolveEntryRowByIdWithRetry(dataEntry, requestedEntryId, idToRowMap, maxRetries, sourceTag) {
    const entryId = String(requestedEntryId || '').trim();
    if (!entryId) {
        debugLog('entryId.resolve.failure', {
            source: sourceTag || 'unknown',
            mode: 'entryId',
            reason: 'missing_entry_id'
        });
        return {
            rowNum: NaN,
            entryId: '',
            errorCode: 'ENTRY_ID_REQUIRED',
            error: 'Entry ID is required.'
        };
    }
    const retryLimit = Math.max(0, Number(maxRetries || 0));
    let activeMap = idToRowMap || buildDataEntryIdToRowMap(dataEntry);
    for (let attempt = 0; attempt <= retryLimit; attempt++) {
        const lastRow = dataEntry.getLastRow();
        const candidateFromMap = activeMap && Object.prototype.hasOwnProperty.call(activeMap, entryId)
            ? Number(activeMap[entryId])
            : NaN;
        if (!(isFinite(candidateFromMap) && candidateFromMap >= 2 && candidateFromMap <= lastRow)) {
            activeMap = buildDataEntryIdToRowMap(dataEntry);
            continue;
        }
        const currentRowEntryId = String(dataEntry.getRange(candidateFromMap, dataCol('ENTRY_ID')).getValue() || '').trim();
        if (currentRowEntryId === entryId) {
            debugLog('entryId.resolve.success', {
                source: sourceTag || 'unknown',
                mode: 'entryId',
                entryId: entryId,
                resolvedRow: candidateFromMap,
                attempts: attempt + 1
            });
            return { rowNum: candidateFromMap, entryId: entryId };
        }
        debugLog('entryId.resolve.retry', {
            source: sourceTag || 'unknown',
            entryId: entryId,
            mappedRow: candidateFromMap,
            mappedRowEntryId: currentRowEntryId || null,
            attempt: attempt + 1,
            retryLimit: retryLimit + 1
        });
        activeMap = buildDataEntryIdToRowMap(dataEntry);
    }
    debugLog('entryId.resolve.failure', {
        source: sourceTag || 'unknown',
        mode: 'entryId',
        entryId: entryId,
        reason: 'entry_id_not_found_after_retry',
        retryLimit: retryLimit + 1
    });
    return {
        rowNum: NaN,
        entryId: entryId,
        errorCode: 'ENTRY_NOT_FOUND',
        error: 'Entry not found. Refresh and try again.'
    };
}
function adminSetEntryVerified(rowIndex, verified, entryId) {
    const result = updateEntryVerifiedWithAudit(rowIndex, verified, entryId);
    const parsedRowIndex = Number(rowIndex);
    return Object.assign({
        rowIndex: isFinite(parsedRowIndex) ? parsedRowIndex : rowIndex,
        entryId: String(entryId || '').trim() || null
    }, result);
}
function adminSetEntryVerifiedBatch(actions) {
    if (!hasPermission('verify')) {
        return (Array.isArray(actions) ? actions : []).map(action => ({
            rowIndex: action && action.rowIndex,
            success: false,
            message: 'Verify permission required.'
        }));
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        return (Array.isArray(actions) ? actions : []).map(action => ({
            rowIndex: action && action.rowIndex,
            entryId: action && action.entryId,
            success: false,
            message: 'DataEntry sheet not found.'
        }));
    }
    ensureDataEntrySchema(dataEntry);
    const idToRowMap = buildDataEntryIdToRowMap(dataEntry);
    const items = Array.isArray(actions) ? actions : [];
    return items.map((action) => {
        const rowIndex = action && action.rowIndex;
        const entryId = action && action.entryId;
        const parsedRowIndex = Number(rowIndex);
        const result = updateEntryVerifiedWithAudit(rowIndex, action && action.verified, entryId, dataEntry, idToRowMap);
        return Object.assign({
            rowIndex: isFinite(parsedRowIndex) ? parsedRowIndex : rowIndex,
            entryId: String(entryId || '').trim() || null
        }, result);
    });
}
function updateEntryVerifiedWithAudit(rowIndex, verified, entryId, dataEntryOverride, idToRowMapOverride) {
    const startMs = Date.now();
    const requestedEntryId = String(entryId || '').trim();
    debugLog('entryId.verify.request', {
        rowIndex: rowIndex,
        entryId: requestedEntryId || null,
        requestedVerified: verified === true
    });
    if (!hasPermission('verify')) {
        debugLog('updateEntryVerifiedWithAudit.permission_denied', { rowIndex: rowIndex });
        return { success: false, message: 'Verify permission required.' };
    }
    const dataEntry = dataEntryOverride || SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DataEntry');
    if (!dataEntry) {
        debugLog('updateEntryVerifiedWithAudit.missing_sheet', { rowIndex: rowIndex });
        return { success: false, message: 'DataEntry sheet not found.' };
    }
    ensureDataEntrySchema(dataEntry);
    const idToRowMap = idToRowMapOverride || buildDataEntryIdToRowMap(dataEntry);
    const target = resolveAdminTargetRow(dataEntry, rowIndex, entryId, idToRowMap);
    const rowNum = target.rowNum;
    if (!isFinite(rowNum)) {
        debugLog('updateEntryVerifiedWithAudit.invalid_row', {
            rowIndex: rowIndex,
            entryId: requestedEntryId || null,
            parsedRowNum: rowNum,
            lastRow: dataEntry.getLastRow(),
            resolverError: target.error || null
        });
        debugLog('entryId.verify.failure', {
            rowIndex: rowIndex,
            entryId: requestedEntryId || null,
            reason: target.error || 'invalid_row'
        });
        return {
            success: false,
            errorCode: target.errorCode || 'ENTRY_NOT_FOUND',
            message: target.error || 'Invalid row.'
        };
    }
    const rowData = dataEntry.getRange(rowNum, 1, 1, DATA_COL_COUNT).getValues()[0];
    if (isDeletedDataRow(rowData)) {
        debugLog('updateEntryVerifiedWithAudit.deleted_row', { rowIndex: rowNum });
        return { success: false, message: 'Cannot verify a deleted row.' };
    }
    const effectiveClockIn = getEffectiveClockInFromRow(rowData);
    const allowedRange = getAllowedDateRange();
    if (!(effectiveClockIn instanceof Date) || isNaN(effectiveClockIn.getTime()) || effectiveClockIn < allowedRange.minDate || effectiveClockIn > allowedRange.maxDate) {
        debugLog('updateEntryVerifiedWithAudit.outside_active_period', {
            rowIndex: rowNum,
            effectiveClockInIso: (effectiveClockIn instanceof Date && !isNaN(effectiveClockIn.getTime())) ? effectiveClockIn.toISOString() : null,
            minDateIso: allowedRange.minDate ? allowedRange.minDate.toISOString() : null,
            maxDateIso: allowedRange.maxDate ? allowedRange.maxDate.toISOString() : null
        });
        return {
            success: false,
            message: `Verified state can only be changed for entries in active pay period (${allowedRange.minDateStr} to ${allowedRange.maxDateStr}).`
        };
    }
    const nextVerified = verified === true;
    let nextNotes = String(rowData[DATA_COLUMNS.NOTES] || '').trim();
    const actorLocalPart = String(Session.getActiveUser().getEmail() || '').trim().split('@')[0] || 'unknown';
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm MM/dd/yyyy');
    const verificationNote = nextVerified
        ? ('Verified by ' + actorLocalPart + ' at ' + timestamp)
        : ('Verify Rejected by ' + actorLocalPart + ' at ' + timestamp);
    nextNotes = nextNotes ? nextNotes + '; ' + verificationNote : verificationNote;
    dataEntry.getRange(rowNum, dataCol('VERIFIED')).setValue(nextVerified);
    dataEntry.getRange(rowNum, dataCol('NOTES')).setValue(nextNotes);
    SpreadsheetApp.flush();
    debugLog('updateEntryVerifiedWithAudit.success', {
        rowIndex: rowNum,
        entryId: getRowEntryId(rowData) || null,
        verified: nextVerified,
        durationMs: Date.now() - startMs
    });
    debugLog('entryId.verify.success', {
        rowIndex: rowNum,
        requestedEntryId: requestedEntryId || null,
        matchedEntryId: getRowEntryId(rowData) || null,
        usedEntryIdMatch: !!requestedEntryId
    });
    return {
        success: true,
        message: nextVerified ? 'Entry verified.' : 'Entry marked unverified.',
        verified: nextVerified,
        notes: nextNotes
    };
}
function getAllEntriesForAdminView(includeDeleted) {
    if (!canAccessAdminView()) {
        throw new Error('Admin access required.');
    }
    ensureScheduleEmployeeRosterLoaded_();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry || dataEntry.getLastRow() <= 1)
        return [];
    ensureDataEntrySchema(dataEntry);
    const includeDeletedRows = includeDeleted === true;
    const rows = dataEntry.getRange(2, 1, dataEntry.getLastRow() - 1, DATA_COL_COUNT).getValues();
    const tz = Session.getScriptTimeZone();
    const mapped = rows.map((row, idx) => ({
        effectiveClockInDateKey: getEffectiveClockInFromRow(row)
            ? Utilities.formatDate(getEffectiveClockInFromRow(row), tz, 'yyyy-MM-dd')
            : null,
        effectiveClockOutDateKey: getEffectiveClockOutFromRow(row)
            ? Utilities.formatDate(getEffectiveClockOutFromRow(row), tz, 'yyyy-MM-dd')
            : null,
        rowIndex: idx + 2,
        entryId: getRowEntryId(row),
        email: row[DATA_COLUMNS.EMAIL] || '',
        rawClockIn: getRowRawClockIn(row) ? getRowRawClockIn(row).toISOString() : null,
        rawClockOut: getRowRawClockOut(row) ? getRowRawClockOut(row).toISOString() : null,
        modifiedClockIn: getRowModifiedClockIn(row) ? getRowModifiedClockIn(row).toISOString() : null,
        modifiedClockOut: getRowModifiedClockOut(row) ? getRowModifiedClockOut(row).toISOString() : null,
        effectiveClockIn: getEffectiveClockInFromRow(row) ? getEffectiveClockInFromRow(row).toISOString() : null,
        effectiveClockOut: getEffectiveClockOutFromRow(row) ? getEffectiveClockOutFromRow(row).toISOString() : null,
        hours: Number(row[DATA_COLUMNS.HOURS] || 0),
        verified: isSheetBooleanTrue(row[DATA_COLUMNS.VERIFIED]),
        notes: row[DATA_COLUMNS.NOTES] || '',
        entryType: getRowEntryType(row),
        deleted: isDeletedDataRow(row)
    }));
    return includeDeletedRows ? mapped : mapped.filter(entry => !entry.deleted);
}
function adminValidateEntryConflicts(allDataRows, currentRowNum, email, proposedClockIn, proposedClockOut, proposedDeleted) {
    if (proposedDeleted) {
        return { valid: true };
    }
    if (!(proposedClockIn instanceof Date) || isNaN(proposedClockIn.getTime())) {
        return { valid: false, message: 'Clock-in is required and must be valid.' };
    }
    if (proposedClockOut instanceof Date && !isNaN(proposedClockOut.getTime()) && proposedClockOut <= proposedClockIn) {
        return { valid: false, message: 'Clock-out must be after clock-in.' };
    }
    for (let i = 1; i < allDataRows.length; i++) {
        const rowNum = i + 1;
        if (rowNum === currentRowNum)
            continue;
        const row = allDataRows[i];
        if (row[DATA_COLUMNS.EMAIL] !== email)
            continue;
        if (isDeletedDataRow(row))
            continue;
        const otherIn = getEffectiveClockInFromRow(row);
        const otherOut = getEffectiveClockOutFromRow(row);
        if (!(otherIn instanceof Date) || isNaN(otherIn.getTime()))
            continue;
        if (!(proposedClockOut instanceof Date) || isNaN(proposedClockOut.getTime())) {
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
function adminSaveEntryUpdate(rowIndex, update) {
    if (!hasPermission('edit')) {
        return { success: false, message: 'Edit permission required.' };
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        return { success: false, message: 'DataEntry sheet not found.' };
    }
    ensureDataEntrySchema(dataEntry);
    const payload = update || {};
    const requestedEntryId = String(payload.entryId || '').trim();
    debugLog('entryId.adminSave.request', {
        rowIndex: rowIndex,
        entryId: requestedEntryId || null,
        hasModifiedClockIn: Object.prototype.hasOwnProperty.call(payload, 'modifiedClockInISO'),
        hasModifiedClockOut: Object.prototype.hasOwnProperty.call(payload, 'modifiedClockOutISO'),
        deleted: payload.deleted === true
    });
    const target = resolveAdminTargetRow(dataEntry, rowIndex, payload.entryId, buildDataEntryIdToRowMap(dataEntry));
    const rowNum = target.rowNum;
    if (!isFinite(rowNum)) {
        debugLog('entryId.adminSave.failure', {
            rowIndex: rowIndex,
            entryId: requestedEntryId || null,
            reason: target.error || 'invalid_row'
        });
        return {
            success: false,
            errorCode: target.errorCode || 'ENTRY_NOT_FOUND',
            message: target.error || 'Invalid row.'
        };
    }
    const allDataRows = dataEntry.getDataRange().getValues();
    const currentRow = allDataRows[rowNum - 1];
    if (!currentRow) {
        debugLog('entryId.adminSave.failure', {
            rowIndex: rowIndex,
            entryId: requestedEntryId || null,
            resolvedRow: rowNum,
            reason: 'row_not_found'
        });
        return { success: false, message: 'Row not found.' };
    }
    const matchedEntryId = getRowEntryId(currentRow);
    debugLog('entryId.adminSave.match', {
        rowIndex: rowNum,
        requestedEntryId: requestedEntryId || null,
        matchedEntryId: matchedEntryId || null,
        usedEntryIdMatch: !!requestedEntryId
    });
    const email = currentRow[DATA_COLUMNS.EMAIL];
    const previouslyDeleted = isDeletedDataRow(currentRow);
    const nextDeleted = Object.prototype.hasOwnProperty.call(payload, 'deleted') ? payload.deleted === true : isDeletedDataRow(currentRow);
    const nextModifiedClockIn = Object.prototype.hasOwnProperty.call(payload, 'modifiedClockInISO')
        ? (payload.modifiedClockInISO ? new Date(payload.modifiedClockInISO) : '')
        : currentRow[DATA_COLUMNS.CLOCK_IN_MODIFIED];
    const nextModifiedClockOut = Object.prototype.hasOwnProperty.call(payload, 'modifiedClockOutISO')
        ? (payload.modifiedClockOutISO ? new Date(payload.modifiedClockOutISO) : '')
        : currentRow[DATA_COLUMNS.CLOCK_OUT_MODIFIED];
    const nextEntryType = Object.prototype.hasOwnProperty.call(payload, 'entryType')
        ? normalizeEntryType(payload.entryType)
        : getRowEntryType(currentRow);
    if (nextModifiedClockIn && (!(nextModifiedClockIn instanceof Date) || isNaN(nextModifiedClockIn.getTime()))) {
        return { success: false, message: 'Invalid modified clock-in value.' };
    }
    if (nextModifiedClockOut && (!(nextModifiedClockOut instanceof Date) || isNaN(nextModifiedClockOut.getTime()))) {
        return { success: false, message: 'Invalid modified clock-out value.' };
    }
    const proposedClockIn = nextModifiedClockIn || getRowRawClockIn(currentRow);
    const proposedClockOut = nextModifiedClockOut || getRowRawClockOut(currentRow);
    const allowedRange = getAllowedDateRange();
    if (!(proposedClockIn instanceof Date) || isNaN(proposedClockIn.getTime()) || proposedClockIn < allowedRange.minDate || proposedClockIn > allowedRange.maxDate) {
        return {
            success: false,
            message: `Time edits are locked outside active pay period (${allowedRange.minDateStr} to ${allowedRange.maxDateStr}).`
        };
    }
    if (proposedClockOut instanceof Date && !isNaN(proposedClockOut.getTime()) && (proposedClockOut < allowedRange.minDate || proposedClockOut > allowedRange.maxDate)) {
        return {
            success: false,
            message: `Time edits are locked outside active pay period (${allowedRange.minDateStr} to ${allowedRange.maxDateStr}).`
        };
    }
    const currentEffectiveClockIn = getEffectiveClockInFromRow(currentRow);
    const currentEffectiveClockOut = getEffectiveClockOutFromRow(currentRow);
    const timeEdited = (() => {
        const sameDate = (a, b) => {
            const aValid = a instanceof Date && !isNaN(a.getTime());
            const bValid = b instanceof Date && !isNaN(b.getTime());
            if (!aValid && !bValid)
                return true;
            if (!aValid || !bValid)
                return false;
            return a.getTime() === b.getTime();
        };
        return !sameDate(currentEffectiveClockIn, proposedClockIn) || !sameDate(currentEffectiveClockOut, proposedClockOut);
    })();
    const conflictCheck = adminValidateEntryConflicts(allDataRows, rowNum, email, proposedClockIn, proposedClockOut, nextDeleted);
    if (!conflictCheck.valid) {
        return { success: false, message: conflictCheck.message };
    }
    dataEntry.getRange(rowNum, dataCol('ENTRY_TYPE')).setValue(nextEntryType);
    let nextNotes = Object.prototype.hasOwnProperty.call(payload, 'notes')
        ? String(payload.notes || '').trim()
        : String(currentRow[DATA_COLUMNS.NOTES] || '').trim();
    const clientAppendedTimeEditNote = payload.clientAppendedTimeEditNote === true;
    if (nextDeleted && !previouslyDeleted) {
        const actorEmail = String(Session.getActiveUser().getEmail() || '').trim();
        const actorLocalPart = actorEmail ? actorEmail.split('@')[0] : 'unknown';
        const deletedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm MM/dd/yyyy');
        const deleteNote = `Deleted by ${actorLocalPart} at ${deletedAt}`;
        nextNotes = nextNotes ? `${nextNotes}; ${deleteNote}` : deleteNote;
    }
    else if (!nextDeleted && previouslyDeleted) {
        const actorEmail = String(Session.getActiveUser().getEmail() || '').trim();
        const actorLocalPart = actorEmail ? actorEmail.split('@')[0] : 'unknown';
        const restoredAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm MM/dd/yyyy');
        const restoreNote = `Restored by ${actorLocalPart} at ${restoredAt}`;
        nextNotes = nextNotes ? `${nextNotes}; ${restoreNote}` : restoreNote;
    }
    if (timeEdited && !nextDeleted && !clientAppendedTimeEditNote) {
        const actorEmail = String(Session.getActiveUser().getEmail() || '').trim();
        const actorLocalPart = actorEmail ? actorEmail.split('@')[0] : 'unknown';
        const editedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm MM/dd/yyyy');
        const editNote = `Time edited by ${actorLocalPart} at ${editedAt}`;
        nextNotes = nextNotes ? `${nextNotes}; ${editNote}` : editNote;
    }
    dataEntry.getRange(rowNum, dataCol('NOTES')).setValue(nextNotes);
    if (Object.prototype.hasOwnProperty.call(payload, 'deleted')) {
        dataEntry.getRange(rowNum, dataCol('DELETED')).setValue(payload.deleted === true);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'modifiedClockInISO')) {
        const v = payload.modifiedClockInISO ? new Date(payload.modifiedClockInISO) : '';
        dataEntry.getRange(rowNum, dataCol('CLOCK_IN_MODIFIED')).setValue(v || '');
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'modifiedClockOutISO')) {
        const v = payload.modifiedClockOutISO ? new Date(payload.modifiedClockOutISO) : '';
        dataEntry.getRange(rowNum, dataCol('CLOCK_OUT_MODIFIED')).setValue(v || '');
    }
    setRowFormatAndFormula(dataEntry, rowNum);
    SpreadsheetApp.flush();
    debugLog('entryId.adminSave.success', {
        rowIndex: rowNum,
        requestedEntryId: requestedEntryId || null,
        matchedEntryId: matchedEntryId || null
    });
    return { success: true, message: 'Entry updated.', entryType: nextEntryType };
}
/**
 * Batch format multiple rows with formulas and font settings
 * CRITICAL: Only use for rows that have been validated to have Clock In dates
 * Eliminates per-row function calls; uses batched API operations instead
 * Performance: 11 API calls for any batch size vs 8-10 per row with individual calls
 * Example: 150 rows = 1,200-1,500 calls (individual) vs 11 calls (batch) = 99%+ reduction
 * @param sheet The sheet to update
 * @param rowIndices Array of row numbers (1-based) to format
 * @returns Number of rows formatted
 */
/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number[]} rowIndices
 */
function batchFormatRows(sheet, rowIndices) {
    if (!rowIndices || rowIndices.length === 0)
        return 0;
    const startMs = Date.now();
    const uniqueRows = Array.from(new Set(rowIndices)).map(Number).sort((a, b) => a - b);
    uniqueRows.forEach(rowNum => setRowFormatAndFormula(sheet, rowNum));
    const formatted = uniqueRows.length;
    Logger.log('batchFormatRows: formatted %s row(s)', formatted);
    debugLog('batchFormatRows complete', {
        uniqueRows: uniqueRows.length,
        formattedRows: formatted,
        segmentCount: uniqueRows.length,
        durationMs: Date.now() - startMs
    });
    return formatted;
}
/**
 * Extract date-only string from a datetime for comparison purposes
 * Used to compare Clock In dates without time component
 * @param date Date object to format
 * @returns Date string in 'MM/dd/yyyy' format, or empty string if invalid
 */
function formatDateOnly(date) {
    if (!date)
        return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        debugLog('formatDateOnly invalid date input', { inputType: typeof date });
        return '';
    }
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`; // 'MM/dd/yyyy'
}
/**
 * Build a manual entry note prefix with actor and timestamp.
 * @param rawNotes Optional user-provided notes
 * @param actorEmail Email of the user creating the entry
 * @returns Prefixed note string
 */
function buildManualEntryNotes(rawNotes, actorEmail) {
    const tz = Session.getScriptTimeZone();
    const timestamp = Utilities.formatDate(new Date(), tz, 'HH:mm MM/dd/yyyy');
    const localPart = (actorEmail || '').split('@')[0] || 'unknown';
    const prefix = `Manual Entry by ${localPart} at ${timestamp}`;
    const cleaned = rawNotes && rawNotes.trim().length > 0 ? rawNotes.trim() : '';
    Logger.log('buildManualEntryNotes: manual note prefix generated');
    debugLog('buildManualEntryNotes complete', { hasRawNotes: !!cleaned, noteLength: cleaned.length });
    return cleaned ? `${prefix}; ${cleaned}` : prefix;
}
/**
 * Calculate background color for a row using data array (no API calls)
 * More efficient than reading from sheet
 * @param data Data array from getDataRange().getValues()
 * @param rowIndex The row number (1-based) to calculate color for
 * @returns Color hex code for the email group
 */
// ==================== EMAIL-FIRST CHRONOLOGICAL INSERTION ====================
/**
 * Find the correct row index to insert a new entry based on Email first, then Clock In timestamp
 * Uses email-first grouping to keep all employee entries together
 * @param sheet DataEntry sheet
 * @param email Employee email
 * @param clockInDateTime Clock in timestamp (Date object)
 * @returns Row index (1-based) where entry should be inserted
 */
function findChronologicalInsertPosition(sheet, email, clockInDateTime) {
    const data = sheet.getDataRange().getValues();
    debugLog(`[POSITION-START] email: ${email}, clockIn: ${clockInDateTime}, sheet rows: ${data.length}`);
    // Find the last row with this email, then search backward within that email group
    let lastEmailRow = -1;
    let firstEmailRow = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][DATA_COLUMNS.EMAIL] === email) {
            if (firstEmailRow === -1) {
                firstEmailRow = i;
            }
            lastEmailRow = i;
        }
    }
    debugLog(`[POSITION-EMAIL-SCAN] firstEmailRow: ${firstEmailRow}, lastEmailRow: ${lastEmailRow}`);
    // If no entries for this email exist, find alphabetical position
    if (lastEmailRow === -1) {
        debugLog(`[POSITION-NEW-EMAIL] Email not found, finding alphabetical position`);
        // Scan ALL rows to build a map of email groups
        const emailGroups = new Map(); // email -> { first: index, last: index }
        for (let i = 1; i < data.length; i++) {
            const rowEmail = data[i][DATA_COLUMNS.EMAIL];
            if (rowEmail) {
                if (!emailGroups.has(rowEmail)) {
                    emailGroups.set(rowEmail, { first: i, last: i });
                }
                else {
                    emailGroups.get(rowEmail).last = i;
                }
            }
        }
        // Get sorted list of unique emails (case-insensitive)
        const sortedEmails = Array.from(emailGroups.keys()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        debugLog(`[POSITION-SORTED-EMAILS] Existing emails in order: [${sortedEmails.join(', ')}]`);
        // Find where this email should be inserted alphabetically
        let insertAfterRow = 1; // Default: insert at top (row 2) if no emails or comes first
        for (const existingEmail of sortedEmails) {
            if (existingEmail.toLowerCase() < email.toLowerCase()) {
                // This email comes before us, update insertAfterRow to end of its group
                // Convert 0-based index to 1-based row number
                insertAfterRow = emailGroups.get(existingEmail).last + 1;
            }
            else {
                // This email comes after us or is equal, stop here
                break;
            }
        }
        const finalPosition = insertAfterRow + 1;
        debugLog(`[POSITION-NEW-EMAIL-RESULT] Insert position: ${finalPosition} (after row ${insertAfterRow})`);
        // Insert after the found position
        return finalPosition; // insertAfterRow is now 1-based row number, +1 to insert after
    }
    // Email group exists - find chronological position within the group
    debugLog(`[POSITION-CHRONOLOGICAL] Searching within email group (rows ${firstEmailRow + 1} to ${lastEmailRow + 1})`);
    for (let i = lastEmailRow; i >= firstEmailRow; i--) {
        const rowClockIn = data[i][DATA_COLUMNS.CLOCK_IN];
        // Valid Clock In found within this email's group
        if (rowClockIn instanceof Date && !isNaN(rowClockIn.getTime())) {
            if (clockInDateTime >= rowClockIn) {
                const position = i + 2;
                debugLog(`[POSITION-CHRONOLOGICAL-RESULT] Found position: ${position} (after row ${i + 1} with clockIn: ${rowClockIn})`);
                // Insert after this row (i is 0-based data index, i+1 is 1-based row, +1 to insert after)
                return position;
            }
        }
    }
    // New entry is oldest in this email group; insert at beginning of group
    // firstEmailRow is 0-based data index, +1 converts to 1-based row number (insertRows inserts before this row)
    const position = firstEmailRow + 1;
    debugLog(`[POSITION-OLDEST] Entry is oldest in group, inserting at beginning: ${position}`);
    return position;
}
/**
 * Check if downstream rows need recoloring after inserting into existing email group
 * Returns true if the next row has a different email (color boundary) that might be incorrectly colored
 * @param sheet DataEntry sheet
 * @param insertIndex The 1-based row number where the new row was inserted
 * @returns true if recoloring is needed, false otherwise
 */
/**
 * Insert a new timecard row at the chronologically correct position within email group.
 * @param sheet DataEntry sheet
 * @param clockInDateTime Clock in timestamp (Date)
 * @param values Array of values matching DATA_COLUMNS layout
 * @returns Row index (1-based) of inserted row
 */
function insertRowChronologically(sheet, clockInDateTime, values) {
    ensureDataEntrySchema(sheet);
    const email = values[0];
    debugLog('insertRowChronologically start', { email: email, clockIn: clockInDateTime });
    const insertIndex = findChronologicalInsertPosition(sheet, email, clockInDateTime);
    sheet.insertRows(insertIndex, 1);
    sheet.getRange(insertIndex, 1, 1, values.length).setValues([values]);
    setRowFormatAndFormula(sheet, insertIndex);
    SpreadsheetApp.flush();
    Logger.log('insertRowChronologically: inserted row at %s', insertIndex);
    debugLog('insertRowChronologically complete', { insertIndex: insertIndex, email: email });
    return insertIndex;
}
function appendDataEntryRow(sheet, values) {
    ensureDataEntrySchema(sheet);
    const insertIndex = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(insertIndex, 1, 1, values.length).setValues([values]);
    setRowFormatAndFormula(sheet, insertIndex);
    SpreadsheetApp.flush();
    return insertIndex;
}
// ==================== TIMESTAMP-BASED HELPER FUNCTIONS ====================
/**
 * Find the most recent entry for a specific employee by timestamp
 * @param email Employee email to search for
 * @param dataEntry Reference to DataEntry sheet
 * @returns Object with { rowIndex, email, clockIn, clockOut, hours, verified, notes } or null
 */
function findLatestEmployeeEntry(email, dataEntry) {
    const startMs = Date.now();
    const lastRow = dataEntry.getLastRow();
    if (lastRow <= 1) {
        return null;
    }
    const data = dataEntry.getRange(2, 1, lastRow - 1, DATA_COL_COUNT).getValues();
    let latestEntry = null;
    let maxTimestamp = -Infinity;
    for (let i = 0; i < data.length; i++) {
        if (data[i][DATA_COLUMNS.EMAIL] === email && !isDeletedDataRow(data[i])) {
            const clockIn = getEffectiveClockInFromRow(data[i]);
            const clockOut = getEffectiveClockOutFromRow(data[i]);
            if (clockIn instanceof Date && !isNaN(clockIn.getTime())) {
                const timestamp = clockIn.getTime();
                if (timestamp > maxTimestamp) {
                    maxTimestamp = timestamp;
                    latestEntry = {
                        rowIndex: i + 2,
                        entryId: getRowEntryId(data[i]) || null,
                        email: data[i][DATA_COLUMNS.EMAIL],
                        clockIn: clockIn,
                        clockOut: clockOut || null,
                        hours: data[i][DATA_COLUMNS.HOURS],
                        verified: isSheetBooleanTrue(data[i][DATA_COLUMNS.VERIFIED]),
                        notes: data[i][DATA_COLUMNS.NOTES]
                    };
                }
            }
        }
    }
    Logger.log('findLatestEmployeeEntry: %s', latestEntry ? 'found' : 'not found');
    debugLog('findLatestEmployeeEntry complete', {
        email: email,
        found: !!latestEntry,
        rowIndex: latestEntry ? latestEntry.rowIndex : null,
        timestamp: latestEntry && latestEntry.clockIn instanceof Date ? latestEntry.clockIn.getTime() : null,
        durationMs: Date.now() - startMs
    });
    return latestEntry;
}
/**
 * Find all open entries (no clock-out) across all employees, sorted by timestamp
 * @param dataEntry Reference to DataEntry sheet
 * @returns Array of objects { rowIndex, email, clockIn, clockOut, hours, verified, notes } sorted by timestamp ascending
 */
function findAllOpenEntries(dataEntry) {
    const startMs = Date.now();
    const data = dataEntry.getDataRange().getValues();
    const openEntries = [];
    for (let i = 1; i < data.length; i++) {
        const email = data[i][DATA_COLUMNS.EMAIL];
        const clockIn = getEffectiveClockInFromRow(data[i]);
        const clockOut = getEffectiveClockOutFromRow(data[i]);
        if (!isDeletedDataRow(data[i]) && email && clockIn instanceof Date && !isNaN(clockIn.getTime()) && (!clockOut || !(clockOut instanceof Date))) {
            openEntries.push({
                rowIndex: i + 1,
                entryId: getRowEntryId(data[i]) || null,
                email: email,
                clockIn: clockIn,
                clockOut: clockOut || null,
                hours: data[i][DATA_COLUMNS.HOURS],
                verified: isSheetBooleanTrue(data[i][DATA_COLUMNS.VERIFIED]),
                notes: data[i][DATA_COLUMNS.NOTES]
            });
        }
    }
    // Sort by email first, then timestamp ascending (oldest first)
    openEntries.sort((a, b) => {
        if (a.email !== b.email) {
            return a.email.localeCompare(b.email);
        }
        return a.clockIn.getTime() - b.clockIn.getTime();
    });
    Logger.log('findAllOpenEntries: found %s open entry/entries', openEntries.length);
    const perEmailCounts = openEntries.reduce((acc, entry) => {
        acc[entry.email] = (acc[entry.email] || 0) + 1;
        return acc;
    }, {});
    debugLog('findAllOpenEntries complete', { total: openEntries.length, perEmailCounts: perEmailCounts, durationMs: Date.now() - startMs });
    return openEntries;
}
/**
 * Find N most recent entries for a specific employee, sorted by timestamp descending
 * @param email Employee email to search for
 * @param count Number of entries to return (default 10)
 * @param dataEntry Reference to DataEntry sheet
 * @returns Array of objects { rowIndex, email, clockIn, clockOut, hours, verified, notes } sorted by timestamp descending (newest first)
 */
function findNMostRecentEntries(email, count, dataEntry) {
    const startMs = Date.now();
    const requestedCount = count || 10;
    const data = dataEntry.getDataRange().getValues();
    const entries = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][DATA_COLUMNS.EMAIL] === email && !isDeletedDataRow(data[i])) {
            const clockIn = getEffectiveClockInFromRow(data[i]);
            const clockOut = getEffectiveClockOutFromRow(data[i]);
            if (clockIn instanceof Date && !isNaN(clockIn.getTime())) {
                entries.push({
                    rowIndex: i + 1,
                    entryId: getRowEntryId(data[i]) || null,
                    email: data[i][DATA_COLUMNS.EMAIL],
                    clockIn: clockIn,
                    clockOut: clockOut || null,
                    hours: data[i][DATA_COLUMNS.HOURS],
                    verified: isSheetBooleanTrue(data[i][DATA_COLUMNS.VERIFIED]),
                    notes: data[i][DATA_COLUMNS.NOTES]
                });
            }
        }
    }
    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime());
    // Return only the requested count
    const selectedEntries = entries.slice(0, requestedCount);
    Logger.log('findNMostRecentEntries: requested=%s returned=%s', requestedCount, selectedEntries.length);
    debugLog('findNMostRecentEntries complete', {
        email: email,
        requested: requestedCount,
        returned: selectedEntries.length,
        newestTs: selectedEntries[0] ? selectedEntries[0].clockIn.getTime() : null,
        oldestTs: selectedEntries[selectedEntries.length - 1] ? selectedEntries[selectedEntries.length - 1].clockIn.getTime() : null,
        durationMs: Date.now() - startMs
    });
    return selectedEntries;
}
/**
 * Find unsplit midnight entries in a subset of rows
 * Detects rows where Clock In and Clock Out span different dates but are stored as single entry
 * @param dataEntry Reference to DataEntry sheet
 * @param rowNumbers Array of row numbers (1-based) to check
 * @returns Array of objects { rowIndex, email, clockIn, clockOut, notes } for unsplit entries
 */
function findUnsplitMidnightEntries(dataEntry, rowNumbers) {
    const startMs = Date.now();
    const data = dataEntry.getDataRange().getValues();
    const unsplitEntries = [];
    rowNumbers.forEach(rowNum => {
        if (rowNum > 1 && rowNum <= data.length) { // Skip header, validate row exists
            const dataIndex = rowNum - 1;
            if (isDeletedDataRow(data[dataIndex]))
                return;
            const clockIn = getEffectiveClockInFromRow(data[dataIndex]);
            const clockOut = getEffectiveClockOutFromRow(data[dataIndex]);
            // Both must be valid dates
            if (clockIn instanceof Date && !isNaN(clockIn.getTime()) &&
                clockOut instanceof Date && !isNaN(clockOut.getTime())) {
                // Check if they span different dates
                const clockInDateStr = Utilities.formatDate(clockIn, Session.getScriptTimeZone(), 'MM/dd/yyyy');
                const clockOutDateStr = Utilities.formatDate(clockOut, Session.getScriptTimeZone(), 'MM/dd/yyyy');
                if (clockInDateStr !== clockOutDateStr) {
                    unsplitEntries.push({
                        rowIndex: rowNum,
                        email: data[dataIndex][DATA_COLUMNS.EMAIL],
                        clockIn: clockIn,
                        clockOut: clockOut,
                        notes: data[dataIndex][DATA_COLUMNS.NOTES] || ''
                    });
                }
            }
        }
    });
    Logger.log('findUnsplitMidnightEntries: found %s unsplit entry/entries', unsplitEntries.length);
    debugLog('findUnsplitMidnightEntries complete', {
        inspectedRows: Array.isArray(rowNumbers) ? rowNumbers.length : 0,
        found: unsplitEntries.length,
        durationMs: Date.now() - startMs
    });
    return unsplitEntries;
}
// ==================== MANAGER FUNCTIONS ====================
/**
 * Get unique employee emails from DataEntry sheet
 * Used to populate dropdown in manager add entry dialog
 * @returns Array of unique emails sorted alphabetically (case-insensitive)
 */
/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dataEntry
 * @returns {string[]}
 */
function buildUniqueEmployeeEmailList(dataEntry) {
    const state = getStoredScheduleState_();
    const list = collectScheduleEmployeeEmailsFromState_(state, false);
    Logger.log('buildUniqueEmployeeEmailList: found %s unique employee email(s)', list.length);
    debugLog('buildUniqueEmployeeEmailList complete', { sourceRows: Array.isArray(state.Employee_data) ? state.Employee_data.length : 0, uniqueCount: list.length });
    return list;
}
function refreshEmployeeEmailCacheFromSheet(dataEntry) {
    const startMs = Date.now();
    const list = buildUniqueEmployeeEmailList(dataEntry);
    Logger.log('refreshEmployeeEmailCacheFromSheet: cached %s employee(s)', list.length);
    debugLog('refreshEmployeeEmailCacheFromSheet complete', { count: list.length, durationMs: Date.now() - startMs });
    return list;
}
function getCachedEmployeeEmails(forceRefresh = false) {
    const state = getStoredScheduleState_();
    const list = collectScheduleEmployeeEmailsFromState_(state, false);
    Logger.log('getCachedEmployeeEmails: derived %s employee(s) from schedule state', list.length);
    debugLog('getCachedEmployeeEmails derived from schedule state', { forceRefresh: forceRefresh, count: list.length });
    return list;
}
function addEmailToEmployeeCache(email) {
    if (!email || typeof email !== 'string') {
        debugLog('addEmailToEmployeeCache skipped invalid email input', { emailType: typeof email });
        return;
    }
    debugLog('addEmailToEmployeeCache is a no-op with unified schedule state', { email: String(email).toLowerCase() });
}
function getEmployeeEmailOptions(forceRefresh) {
    const list = getCachedEmployeeEmails(!!forceRefresh);
    Logger.log('getEmployeeEmailOptions: served %s employee option(s)', list.length);
    debugLog('getEmployeeEmailOptions complete', { forceRefresh: !!forceRefresh, count: list.length });
    return list;
}
// ==================== AWS ALTERNATIVE WORK WEEK ====================
/**
 * Get AWS config from Script Properties with TTL caching
 * Returns object: { email: { enabled: bool, effectiveDate: 'YYYY-MM-DD' }, ... }
 */
/**
 * @param {boolean} [forceRefresh=false]
 * @returns {AWSConfigMap}
 */
function getAWSConfig(forceRefresh = false) {
    const config = buildAWSConfigFromScheduleState_(getStoredScheduleState_());
    Logger.log('getAWSConfig: derived config for %s employee(s)', Object.keys(config).length);
    debugLog('getAWSConfig derived from schedule state', { forceRefresh: forceRefresh, employeeCount: Object.keys(config).length });
    return config;
}
/**
 * Sync AWS config with current employees in DataEntry
 * Auto-adds new employees with AWS disabled
 * Preserves existing AWS settings
 */
/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dataEntry
 * @returns {AWSConfigMap}
 */
function buildAndCacheAWSConfig(dataEntry) {
    const startMs = Date.now();
    const config = buildAWSConfigFromScheduleState_(getStoredScheduleState_());
    Logger.log('buildAndCacheAWSConfig: derived config for %s employee(s)', Object.keys(config).length);
    debugLog('buildAndCacheAWSConfig complete', {
        totalEmployees: Object.keys(config).length,
        addedEmployees: 0,
        preservedEntries: Object.keys(config).length,
        durationMs: Date.now() - startMs
    });
    return config;
}
/**
 * Update AWS status for a single employee
 * @param email Employee email
 * @param enabled Whether employee is in AWS
 * @param effectiveDate Date when AWS status takes effect (YYYY-MM-DD)
 */
function updateAWSEmployeeStatus(email, enabled, effectiveDate) {
    const normalizedEmail = normalizeScheduleEmail_(email);
    const state = getStoredScheduleState_();
    const previous = buildAWSConfigFromScheduleState_(state)[normalizedEmail] || null;
    const applyToList = (list) => list.map(employee => {
        const employeeEmail = normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName);
        if (employeeEmail !== normalizedEmail) {
            return employee;
        }
        const next = Object.assign({}, employee);
        next.workweek = enabled === true ? 'AWS' : 'CA';
        next.awsEffectiveDate = String(effectiveDate || '').trim();
        return next;
    });
    state.Employee_data = applyToList(state.Employee_data);
    state.deleted_employee_data = applyToList(state.deleted_employee_data);
    writeStoredScheduleState_(state);
    Logger.log('updateAWSEmployeeStatus: updated AWS status for employee');
    debugLog('updateAWSEmployeeStatus complete', {
        email: normalizedEmail,
        previousEnabled: previous ? previous.enabled : null,
        previousEffectiveDate: previous ? previous.effectiveDate : null,
        enabled: enabled,
        effectiveDate: effectiveDate
    });
}
/**
 * DEBUGGING: Enable/disable payroll calculation debug logs
 * Logs are printed to Apps Script Execution Log (visible via npm run open)
 */
function toggleDebugLogging() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    // Since we can't modify the constant directly at runtime, we use Script Properties as a toggle
    const props = PropertiesService.getScriptProperties();
    const debugKey = 'debug_payroll_enabled';
    const currentState = props.getProperty(debugKey) === 'true';
    const newState = !currentState;
    props.setProperty(debugKey, String(newState));
    Logger.log('toggleDebugLogging: %s', newState ? 'enabled' : 'disabled');
    debugLog('toggleDebugLogging changed', {
        actorEmail: Session.getActiveUser().getEmail() || 'unknown',
        previousState: currentState,
        newState: newState
    });
    ui.alert('Debug Logging ' + (newState ? 'ENABLED' : 'DISABLED'), 'Debug logs are now ' + (newState ? 'enabled' : 'disabled') + ' for:\n\n' +
        '• Payroll calculation (AWS/CA overtime)\n' +
        '• Row insertion & positioning\n' +
        '• Email group color formatting\n' +
        '• Visual merge formatting\n\n' +
        'To view logs:\n1. Run npm run open\n2. Click "Execution log" tab\n3. Perform actions (clock in/out, generate preview)', ui.ButtonSet.OK);
}
/**
 * Check if debug logging is enabled (via Script Properties toggle)
 * @returns true if debug logging is enabled
 */
function isDebugEnabled() {
    if (DEBUG_PAYROLL_CALCULATIONS)
        return true; // Hard-coded true always takes precedence
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('debug_payroll_enabled') === 'true';
}
/**
 * Check if employee is AWS-enabled on a specific date
 * @param email Employee email
 * @param checkDate Date to check (Date object or string YYYY-MM-DD)
 * @returns true if employee is AWS-enabled and effective date has passed
 */
function isEmployeeAWS(email, checkDate) {
    const config = getAWSConfig();
    if (!config[email]) {
        debugLog('isEmployeeAWS missing config for employee', { email: email });
        return false;
    }
    const emp = config[email];
    if (!emp.enabled) {
        debugLog('isEmployeeAWS disabled for employee', { email: email });
        return false;
    }
    // Check if effective date has passed
    if (emp.effectiveDate && checkDate) {
        let checkDateStr;
        if (checkDate instanceof Date) {
            checkDateStr = Utilities.formatDate(checkDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        else {
            checkDateStr = String(checkDate);
        }
        const isEffective = checkDateStr >= emp.effectiveDate;
        debugLog('isEmployeeAWS effective-date check', {
            email: email,
            checkDate: checkDateStr,
            effectiveDate: emp.effectiveDate,
            isEffective: isEffective
        });
        return isEffective;
    }
    debugLog('isEmployeeAWS enabled without effective date check', { email: email });
    return emp.enabled;
}
/**
 * Submit manual entry from manager menu dialog
 * @param email Employee email
 * @param clockInISO Clock-in datetime (ISO string)
 * @param clockOutISO Clock-out datetime (ISO string)
 * @param notes Optional notes
 * @param entryType Optional entry type (worked/vacation/sick)
 * @returns { success: bool, message: string }
 */
function submitManualEntryFromMenu(email, clockInISO, clockOutISO, notes, entryType = ENTRY_TYPE_WORKED) {
    try {
        if (!hasPermission('edit')) {
            return { success: false, message: 'Edit permission required.' };
        }
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const dataEntry = ss.getSheetByName('DataEntry');
        if (!dataEntry) {
            return { success: false, message: 'DataEntry sheet not found.' };
        }
        const clockInDate = new Date(clockInISO);
        const clockOutDate = new Date(clockOutISO);
        // Use consolidated validation helper
        const validation = validateManualTimeEntry(clockInDate, clockOutDate);
        if (!validation.valid) {
            return { success: false, message: validation.error };
        }
        const managerEmail = Session.getActiveUser().getEmail();
        const finalNotes = buildManualEntryNotes(notes, managerEmail);
        const normalizedEntryType = normalizeEntryType(entryType);
        const scriptTz = Session.getScriptTimeZone();
        const splitOccurred = Utilities.formatDate(clockInDate, scriptTz, 'yyyy-MM-dd') !==
            Utilities.formatDate(clockOutDate, scriptTz, 'yyyy-MM-dd');
        Logger.log('submitManualEntryFromMenu: manager manual entry requested');
        debugLog('submitManualEntryFromMenu payload', {
            managerEmail: managerEmail,
            employeeEmail: email,
            clockInISO: clockInISO,
            clockOutISO: clockOutISO,
            hasNotes: !!notes,
            notesLength: notes ? String(notes).length : 0
        });
        const newRow = appendDataEntryRow(dataEntry, buildDataEntryRow(email, clockInDate, '', finalNotes, false, normalizedEntryType));
        const insertedRowData = dataEntry.getRange(newRow, 1, 1, DATA_COL_COUNT).getValues()[0];
        const entryId = getRowEntryId(insertedRowData);
        debugLog('entryId.create.success', {
            source: 'submitManualEntryFromMenu',
            rowIndex: newRow,
            entryId: entryId || null,
            email: email
        });
        SpreadsheetApp.flush();
        addEmailToEmployeeCache(email);
        // Process clock-out with midnight rollover handling
        processClockOut(email, dataEntry, clockOutDate, finalNotes, entryId, clockInDate, false);
        // Log to execution log for audit trail
        Logger.log('submitManualEntryFromMenu: manual entry added successfully');
        debugLog('submitManualEntryFromMenu success', {
            employeeEmail: email,
            managerEmail: managerEmail,
            insertedRow: newRow,
            splitOccurred: splitOccurred
        });
        const optimisticEntry = splitOccurred
            ? null
            : {
                rowIndex: newRow,
                entryId: entryId,
                email: email,
                rawClockIn: clockInDate.toISOString(),
                rawClockOut: clockOutDate.toISOString(),
                modifiedClockIn: null,
                modifiedClockOut: null,
                hours: Math.max(0, (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60)),
                verified: false,
                notes: finalNotes,
                entryType: normalizedEntryType,
                deleted: false
            };
        return {
            success: true,
            message: '✅ Manual entry added successfully for ' + email,
            splitOccurred: splitOccurred,
            entry: optimisticEntry
        };
    }
    catch (e) {
        Logger.log('submitManualEntryFromMenu: error=%s', e.message);
        return { success: false, message: 'Error: ' + e.message };
    }
}
// ==================== SETTINGS MANAGEMENT ====================
/**
 * Get setting value from Script Properties
 */
function getSetting(key, defaultValue) {
    const properties = PropertiesService.getScriptProperties();
    const value = properties.getProperty(key);
    debugLog('getSetting lookup', { key: key, hit: value !== null });
    return value !== null ? value : defaultValue;
}
/**
 * Set setting value in Script Properties
 */
function setSetting(key, value) {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(key, String(value));
    Logger.log('setSetting: updated setting key');
    debugLog('setSetting complete', { key: key, valueType: typeof value, valueLength: String(value).length });
}
function parseSettingDateMMDDYYYY(dateStr) {
    if (!dateStr || typeof dateStr !== 'string')
        return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3)
        return null;
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isFinite(month) || !isFinite(day) || !isFinite(year))
        return null;
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    if (isNaN(parsed.getTime()))
        return null;
    if (parsed.getFullYear() !== year || (parsed.getMonth() + 1) !== month || parsed.getDate() !== day)
        return null;
    return parsed;
}
function formatSettingDateMMDDYYYY(date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
}
function formatISODateLocal(date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function addDaysAtStartOfDay(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);
    return next;
}
function setActivePayPeriod(startDate, endDate) {
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(0, 0, 0, 0);
    setSetting(ACTIVE_PAY_PERIOD_START_KEY, formatSettingDateMMDDYYYY(normalizedStart));
    setSetting(ACTIVE_PAY_PERIOD_END_KEY, formatSettingDateMMDDYYYY(normalizedEnd));
}
function syncActivePayPeriodHeaders(startDateStr, endDateStr) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Active pay period header is DataEntry-only; PayrollPreview headers are preview-owned.
    const notesHeader = 'Notes';
    const dataEntry = ss.getSheetByName('DataEntry');
    if (dataEntry) {
        dataEntry.getRange('G1').setValue(notesHeader);
    }
}
/**
 * Single source of truth for the active payroll period.
 * Prefers active keys, with migration fallback from legacy keys.
 */
function getActivePayPeriod() {
    const tz = Session.getScriptTimeZone();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const activeStartStr = getSetting(ACTIVE_PAY_PERIOD_START_KEY, '');
    const activeEndStr = getSetting(ACTIVE_PAY_PERIOD_END_KEY, '');
    let startDate = parseSettingDateMMDDYYYY(activeStartStr);
    let endDate = parseSettingDateMMDDYYYY(activeEndStr);
    let source = 'activeSettings';
    let shouldPersistActiveKeys = false;
    if (!startDate || !endDate) {
        const currentStart = parseSettingDateMMDDYYYY(getSetting('currentPreviewStartDate', ''));
        const currentEnd = parseSettingDateMMDDYYYY(getSetting('currentPreviewEndDate', ''));
        if (currentStart && currentEnd) {
            startDate = currentStart;
            endDate = currentEnd;
            source = 'currentPreviewSettings';
            shouldPersistActiveKeys = true;
        }
    }
    if (!startDate || !endDate) {
        const lastEnd = parseSettingDateMMDDYYYY(getSetting('lastPreviewEndDate', ''));
        if (lastEnd) {
            startDate = addDaysAtStartOfDay(lastEnd, 1);
            endDate = addDaysAtStartOfDay(startDate, 13);
            source = 'lastPreviewEndDate+1';
            shouldPersistActiveKeys = true;
        }
    }
    if (!startDate || !endDate) {
        startDate = addDaysAtStartOfDay(now, -13);
        endDate = now;
        source = 'fallback-14-days';
        shouldPersistActiveKeys = true;
    }
    if (endDate < startDate) {
        endDate = addDaysAtStartOfDay(startDate, 13);
        source = `${source}-repaired`;
        shouldPersistActiveKeys = true;
    }
    // Self-heal active source keys so all readers converge on one setting pair.
    if (shouldPersistActiveKeys || !activeStartStr || !activeEndStr) {
        setActivePayPeriod(startDate, endDate);
    }
    const minDate = new Date(startDate);
    minDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(now);
    maxDate.setHours(23, 59, 59, 999);
    return {
        startDate: startDate,
        endDate: endDate,
        startDateStr: formatSettingDateMMDDYYYY(startDate),
        endDateStr: formatSettingDateMMDDYYYY(endDate),
        startDateISO: formatISODateLocal(startDate),
        endDateISO: formatISODateLocal(endDate),
        minDate: minDate,
        maxDate: maxDate,
        minDateStr: Utilities.formatDate(minDate, tz, 'MM/dd/yyyy'),
        maxDateStr: Utilities.formatDate(maxDate, tz, 'MM/dd/yyyy'),
        minDateISO: Utilities.formatDate(minDate, tz, 'yyyy-MM-dd'),
        maxDateISO: Utilities.formatDate(maxDate, tz, 'yyyy-MM-dd'),
        source: source
    };
}
/**
 * Get the allowed date range for manual entries
 * Range: active pay period start through today (inclusive)
 * @returns Object with minDate and maxDate as Date objects, plus formatted strings
 */
function getAllowedDateRange() {
    const active = getActivePayPeriod();
    Logger.log('getAllowedDateRange: computed date range');
    debugLog('getAllowedDateRange complete', {
        source: active.source,
        minDateISO: active.minDateISO,
        maxDateISO: active.maxDateISO,
        activeStartDateISO: active.startDateISO,
        activeEndDateISO: active.endDateISO
    });
    return {
        minDate: active.minDate,
        maxDate: active.maxDate,
        minDateStr: active.minDateStr,
        maxDateStr: active.maxDateStr,
        minDateISO: active.minDateISO,
        maxDateISO: active.maxDateISO
    };
}
// ==================== AUTO-CLOCK-OUT HELPER ====================
/**
 * Auto-close all open entries that exceed 14 hours
 * @param dataEntry Reference to DataEntry sheet
 * @returns Number of entries auto-closed
 */
function autoCloseStaleEntries(dataEntry) {
    const startMs = Date.now();
    const openEntries = findAllOpenEntries(dataEntry);
    const now = new Date();
    let autoClosedCount = 0;
    const closedRows = [];
    openEntries.forEach(entry => {
        const diffMs = now.getTime() - entry.clockIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= MAX_DIFF_HOURS) {
            const autoClockOut = new Date(entry.clockIn.getTime() + (MAX_DIFF_HOURS * 60 * 60 * 1000));
            const existingNotes = entry.notes || '';
            processClockOut(entry.email, dataEntry, autoClockOut, existingNotes, entry.entryId, entry.clockIn, true);
            autoClosedCount++;
            closedRows.push(entry.rowIndex);
        }
    });
    Logger.log('autoCloseStaleEntries: auto-closed %s stale entries', autoClosedCount);
    debugLog('autoCloseStaleEntries complete', {
        openEntries: openEntries.length,
        autoClosedCount: autoClosedCount,
        affectedRows: closedRows,
        durationMs: Date.now() - startMs
    });
    return autoClosedCount;
}
// ==================== DATA VALIDATION ====================
/**
 * Validate all entries: fix edited rows, delete blanks, sort, auto-close stale, validate timestamps
 */
/**
 * @deprecated Use Admin View workflows in the web app.
 */
function validateDataEntry() {
    Logger.log('validateDataEntry: deprecated. Use Admin View in web app.');
    return { success: false, message: 'Deprecated. Use Admin View workflows in the web app.' };
}
// ==================== PAYROLL PROCESSING ====================
/**
 * Open HTML dialog to get start date for preview
 */
/**
 * @deprecated Use Admin View -> Generate Report in the web app.
 */
function openGeneratePreviewDialog() {
    Logger.log('openGeneratePreviewDialog: deprecated. Use Admin View -> Generate Report in the web app.');
    try {
        const ui = SpreadsheetApp.getUi();
        ui.alert('Deprecated', 'Generate Preview dialog is deprecated. Use Admin View -> Generate Report in the web app.', ui.ButtonSet.OK);
    }
    catch (e) {
        // web context: no UI
    }
}
/**
 * Fetch current AWS config for display in preview dialog
 */
function fetchAWSConfigForDialog() {
    if (!hasPermission('payroll')) {
        return {};
    }
    const config = getAWSConfig();
    Logger.log('fetchAWSConfigForDialog: returned %s employee config entries', Object.keys(config).length);
    debugLog('fetchAWSConfigForDialog complete', { employeeCount: Object.keys(config).length });
    return config;
}
function getScheduleToolDialogHtml() {
    if (!hasPermission('payroll') || !hasPermission('edit')) {
        return '<div style="font-family:Arial,sans-serif;padding:16px;color:#b91c1c;">Payroll and edit permissions are required.</div>';
    }
    return HtmlService.createHtmlOutputFromFile('ScheduleHTML').getContent();
}
function getStoredScheduleToolData_() {
    return getStoredScheduleState_();
}
function buildBlankScheduleDays_() {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayNames.map(dayName => ({ dayName: dayName, shifts: [] }));
}
function normalizeScheduleEmail_(value) {
    return String(value || '').trim().toLowerCase();
}
function normalizeScheduleDays_(days) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sourceByName = new Map();
    if (Array.isArray(days)) {
        for (let i = 0; i < days.length; i++) {
            const day = days[i];
            if (!day || typeof day !== 'object')
                continue;
            const dayName = String(day.dayName || '').trim();
            if (!dayName)
                continue;
            sourceByName.set(dayName, day);
        }
    }
    return dayNames.map(dayName => {
        const source = sourceByName.get(dayName);
        const shifts = source && Array.isArray(source.shifts) ? source.shifts : [];
        return {
            dayName: dayName,
            shifts: shifts.map(shift => ({
                timeBlock: String(shift && shift.timeBlock != null ? shift.timeBlock : ''),
                status: String(shift && shift.status != null ? shift.status : '')
            }))
        };
    });
}
function createBlankScheduleEmployeeRecord_(email) {
    const normalizedEmail = normalizeScheduleEmail_(email);
    return {
        EmployeeEmail: normalizedEmail,
        EmployeeName: normalizedEmail,
        location: '',
        workweek: 'CA',
        employeeType: 'Office',
        days: buildBlankScheduleDays_(),
        awsEffectiveDate: '',
        deletedAt: '',
        deletedBy: ''
    };
}
function normalizeScheduleEmployeeRecord_(employee, keepDeletedMeta = false) {
    const source = employee && typeof employee === 'object' ? employee : {};
    const normalizedEmail = normalizeScheduleEmail_(source.EmployeeEmail || source.employeeEmail || source.EmployeeName || source.employeeName);
    const normalized = Object.assign({}, source);
    normalized.EmployeeEmail = normalizedEmail;
    normalized.EmployeeName = normalizedEmail;
    normalized.location = source.location == null ? '' : String(source.location).trim();
    const workweek = String(source.workweek || 'CA').trim().toUpperCase();
    normalized.workweek = workweek === 'AWS' ? 'AWS' : 'CA';
    const employeeType = String(source.employeeType || source.EmployeeType || 'Office').trim().toLowerCase();
    normalized.employeeType = employeeType === 'driver' ? 'Driver' : 'Office';
    normalized.days = normalizeScheduleDays_(source.days);
    normalized.awsEffectiveDate = String(source.awsEffectiveDate || source.AWSEffectiveDate || '').trim();
    delete normalized.awsEnabled;
    delete normalized.AWSEnabled;
    if (keepDeletedMeta) {
        normalized.deletedAt = String(source.deletedAt || '').trim();
        normalized.deletedBy = String(source.deletedBy || '').trim();
    }
    else {
        delete normalized.deletedAt;
        delete normalized.deletedBy;
    }
    return normalized;
}
function normalizeScheduleState_(rawState) {
    const source = rawState && typeof rawState === 'object' ? rawState : {};
    const activeSource = Array.isArray(source.Employee_data)
        ? source.Employee_data
        : Array.isArray(source.employee_data)
            ? source.employee_data
            : Array.isArray(source.activeEmployees)
                ? source.activeEmployees
                : Array.isArray(source.schedule_data && source.schedule_data.employees)
                    ? source.schedule_data.employees
                    : Array.isArray(rawState)
                        ? rawState
                        : [];
    const deletedSource = Array.isArray(source.deleted_employee_data)
        ? source.deleted_employee_data
        : Array.isArray(source.deletedEmployees)
            ? source.deletedEmployees
            : Array.isArray(source.schedule_data && source.schedule_data.deleted_employee_data)
                ? source.schedule_data.deleted_employee_data
                : [];
    const activeMap = new Map();
    for (let i = 0; i < activeSource.length; i++) {
        const record = normalizeScheduleEmployeeRecord_(activeSource[i], false);
        if (record.EmployeeEmail) {
            activeMap.set(record.EmployeeEmail, record);
        }
    }
    const deletedMap = new Map();
    for (let i = 0; i < deletedSource.length; i++) {
        const record = normalizeScheduleEmployeeRecord_(deletedSource[i], true);
        if (record.EmployeeEmail && !activeMap.has(record.EmployeeEmail)) {
            deletedMap.set(record.EmployeeEmail, record);
        }
    }
    const updatedAt = String(source.updatedAt || source.lastUpdatedAt || new Date().toISOString()).trim();
    return {
        schemaVersion: Number(source.schemaVersion) || SCHEDULE_STATE_SCHEMA_VERSION,
        updatedAt: updatedAt,
        Employee_data: Array.from(activeMap.values()).sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail)),
        deleted_employee_data: Array.from(deletedMap.values()).sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail))
    };
}
function getStoredScheduleState_() {
    const raw = readScheduleSetting_(SCHEDULE_STATE_KEY, '');
    if (!raw) {
        return normalizeScheduleState_({});
    }
    return normalizeScheduleState_(parseScheduleJsonValue_(raw, {}));
}
function writeStoredScheduleState_(state) {
    const normalized = normalizeScheduleState_(state);
    normalized.updatedAt = new Date().toISOString();
    writeScheduleSetting_(SCHEDULE_STATE_KEY, JSON.stringify(normalized));
    return normalized;
}
function ensureScheduleEmployeeRosterLoaded_(employeeEmail = null) {
    const currentState = getStoredScheduleState_();
    const normalizedEmail = employeeEmail ? normalizeScheduleEmail_(employeeEmail) : '';
    const existingEmails = new Set(collectScheduleEmployeeEmailsFromState_(currentState, true));
    const persistedStateExists = !!readScheduleSetting_(SCHEDULE_STATE_KEY, '');
    const hasRosterEntries = Array.isArray(currentState.Employee_data) && currentState.Employee_data.length > 0;
    if (normalizedEmail) {
        const deletedMatch = currentState.deleted_employee_data.some(employee => normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName) === normalizedEmail);
        if (deletedMatch) {
            const restored = restoreDeletedScheduleEmployee_(currentState, normalizedEmail);
            return writeStoredScheduleState_(restored.state);
        }
        if (!existingEmails.has(normalizedEmail)) {
            const nextState = appendMissingScheduleEmployees_(currentState, [normalizedEmail]);
            return writeStoredScheduleState_(nextState.state);
        }
    }
    if (!persistedStateExists || !hasRosterEntries) {
        const checked = checkForNewUsers_(currentState);
        const savedState = writeStoredScheduleState_(checked.state);
        return savedState;
    }
    return currentState;
}
function collectScheduleEmployeeEmailsFromState_(state, includeDeleted = true) {
    const normalized = normalizeScheduleState_(state);
    const unique = new Set();
    normalized.Employee_data.forEach(employee => {
        const email = normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName);
        if (email) {
            unique.add(email);
        }
    });
    if (includeDeleted) {
        normalized.deleted_employee_data.forEach(employee => {
            const email = normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName);
            if (email) {
                unique.add(email);
            }
        });
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
}
function buildAWSConfigFromScheduleState_(state) {
    const normalized = normalizeScheduleState_(state);
    const config = {};
    const addEmployee = (employee) => {
        const email = normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName);
        if (!email)
            return;
        config[email] = {
            enabled: employee.workweek === 'AWS',
            effectiveDate: String(employee.awsEffectiveDate || employee.AWSEffectiveDate || '').trim()
        };
    };
    normalized.Employee_data.forEach(addEmployee);
    normalized.deleted_employee_data.forEach(addEmployee);
    return config;
}
function applyAWSConfigToScheduleState_(state, awsConfig) {
    const normalized = normalizeScheduleState_(state);
    const source = awsConfig && typeof awsConfig === 'object' ? awsConfig : {};
    const applyToList = (list) => list.map(employee => {
        const email = normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName);
        const next = Object.assign({}, employee);
        const nextAws = source[email];
        if (nextAws && typeof nextAws === 'object') {
            next.workweek = nextAws.enabled === true ? 'AWS' : 'CA';
            next.awsEffectiveDate = String(nextAws.effectiveDate || '').trim();
        }
        else {
            next.workweek = employee.workweek === 'AWS' ? 'AWS' : 'CA';
            next.awsEffectiveDate = String(employee.awsEffectiveDate || employee.AWSEffectiveDate || '').trim();
        }
        return next;
    });
    normalized.Employee_data = applyToList(normalized.Employee_data);
    normalized.deleted_employee_data = applyToList(normalized.deleted_employee_data);
    return normalized;
}
function restoreDeletedScheduleEmployee_(state, email) {
    const normalized = normalizeScheduleState_(state);
    const normalizedEmail = normalizeScheduleEmail_(email);
    if (!normalizedEmail) {
        return { state: normalized, restored: false, restoredEmail: '' };
    }
    const activeIndex = normalized.Employee_data.findIndex(employee => normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName) === normalizedEmail);
    if (activeIndex >= 0) {
        const deletedIndex = normalized.deleted_employee_data.findIndex(employee => normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName) === normalizedEmail);
        if (deletedIndex >= 0) {
            normalized.deleted_employee_data.splice(deletedIndex, 1);
        }
        return { state: normalized, restored: false, restoredEmail: normalizedEmail };
    }
    const deletedIndex = normalized.deleted_employee_data.findIndex(employee => normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName) === normalizedEmail);
    if (deletedIndex < 0) {
        return { state: normalized, restored: false, restoredEmail: normalizedEmail };
    }
    const [deletedEmployee] = normalized.deleted_employee_data.splice(deletedIndex, 1);
    normalized.Employee_data.push(normalizeScheduleEmployeeRecord_(deletedEmployee, false));
    normalized.Employee_data.sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail));
    normalized.deleted_employee_data.sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail));
    return { state: normalized, restored: true, restoredEmail: normalizedEmail };
}
function appendMissingScheduleEmployees_(state, sourceEmails) {
    const normalized = normalizeScheduleState_(state);
    const activeEmails = new Set(collectScheduleEmployeeEmailsFromState_(normalized, false));
    const deletedEmails = new Set(collectScheduleEmployeeEmailsFromState_(normalized, true));
    const existingEmails = new Set([...activeEmails, ...deletedEmails]);
    const addedEmails = [];
    Array.from(sourceEmails || []).sort((a, b) => a.localeCompare(b)).forEach(email => {
        const normalizedEmail = normalizeScheduleEmail_(email);
        if (!normalizedEmail) {
            return;
        }
        if (existingEmails.has(normalizedEmail) && !activeEmails.has(normalizedEmail)) {
            const restored = restoreDeletedScheduleEmployee_(normalized, normalizedEmail);
            if (restored.restored) {
                addedEmails.push(normalizedEmail);
            }
            return;
        }
        if (existingEmails.has(normalizedEmail)) {
            return;
        }
        normalized.Employee_data.push(createBlankScheduleEmployeeRecord_(normalizedEmail));
        existingEmails.add(normalizedEmail);
        activeEmails.add(normalizedEmail);
        addedEmails.push(normalizedEmail);
    });
    normalized.Employee_data.sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail));
    normalized.deleted_employee_data.sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail));
    return {
        state: normalized,
        addedEmails: addedEmails
    };
}
function collectUniqueEmailsFromSheet_(sheet, oneBasedColumn) {
    if (!sheet || oneBasedColumn < 1) {
        return [];
    }
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return [];
    }
    const values = sheet.getRange(2, oneBasedColumn, lastRow - 1, 1).getValues();
    const unique = new Set();
    for (let i = 0; i < values.length; i++) {
        const candidate = String(values[i][0] || '').trim().toLowerCase();
        if (candidate && candidate.indexOf('@') > 0) {
            unique.add(candidate);
        }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
}
function checkForNewUsers_(schedulePayload) {
    const state = normalizeScheduleState_(schedulePayload);
    const existingEmails = new Set(collectScheduleEmployeeEmailsFromState_(state, true));
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    const archive = ss.getSheetByName('Archive');
    const sourceEmails = new Set([
        ...collectUniqueEmailsFromSheet_(dataEntry, dataCol('EMAIL')),
        ...collectUniqueEmailsFromSheet_(archive, archiveCol('EMAIL'))
    ]);
    let addedCount = 0;
    const addedEmails = [];
    Array.from(sourceEmails).sort((a, b) => a.localeCompare(b)).forEach(email => {
        const normalizedEmail = normalizeScheduleEmail_(email);
        if (!normalizedEmail) {
            return;
        }
        const inDeletedList = state.deleted_employee_data.some(employee => normalizeScheduleEmail_(employee.EmployeeEmail || employee.EmployeeName) === normalizedEmail);
        if (inDeletedList) {
            const restored = restoreDeletedScheduleEmployee_(state, normalizedEmail);
            if (restored.restored) {
                addedEmails.push(normalizedEmail);
                addedCount++;
            }
            return;
        }
        if (existingEmails.has(normalizedEmail)) {
            return;
        }
        state.Employee_data.push(createBlankScheduleEmployeeRecord_(normalizedEmail));
        existingEmails.add(normalizedEmail);
        addedEmails.push(normalizedEmail);
        addedCount++;
    });
    state.Employee_data.sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail));
    state.deleted_employee_data.sort((a, b) => a.EmployeeEmail.localeCompare(b.EmployeeEmail));
    return { state: state, addedCount: addedCount, addedEmails: addedEmails };
}
function extractScheduleEmployeeEmails_(schedulePayload) {
    return collectScheduleEmployeeEmailsFromState_(schedulePayload, true);
}
function extractScheduleAWSConfig_(schedulePayload) {
    return buildAWSConfigFromScheduleState_(schedulePayload);
}
function fetchScheduleToolData() {
    if (!hasPermission('payroll') || !hasPermission('edit')) {
        return { success: false, message: 'Payroll and edit permissions are required.', state: getStoredScheduleState_() };
    }
    return { success: true, state: ensureScheduleEmployeeRosterLoaded_() };
}
function saveScheduleToolData(schedulePayload) {
    try {
        if (!hasPermission('payroll') || !hasPermission('edit')) {
            return { success: false, message: 'Payroll and edit permissions are required.' };
        }
        const savedState = writeStoredScheduleState_(schedulePayload);
        return { success: true, message: 'Schedule saved.', state: savedState };
    }
    catch (e) {
        Logger.log('saveScheduleToolData: error=%s', e.toString());
        return { success: false, message: e.toString() };
    }
}
function checkForNewEmployees() {
    try {
        if (!hasPermission('payroll') || !hasPermission('edit')) {
            return { success: false, message: 'Payroll and edit permissions are required.', addedCount: 0, addedEmails: [], state: getStoredScheduleState_() };
        }
        const checked = checkForNewUsers_(getStoredScheduleState_());
        if (checked.addedCount > 0) {
            const savedState = writeStoredScheduleState_(checked.state);
            const addedList = checked.addedEmails.join(', ');
            return {
                success: true,
                message: checked.addedCount === 1
                    ? ('Added 1 new employee: ' + addedList)
                    : ('Added ' + checked.addedCount + ' new employees: ' + addedList),
                addedCount: checked.addedCount,
                addedEmails: checked.addedEmails,
                state: savedState
            };
        }
        return { success: true, message: 'No new employees found.', addedCount: 0, addedEmails: [], state: checked.state };
    }
    catch (e) {
        Logger.log('checkForNewEmployees: error=%s', e.toString());
        return { success: false, message: e.toString(), addedCount: 0, addedEmails: [], state: getStoredScheduleState_() };
    }
}
/**
 * Persist AWS config from web UI without generating preview.
 */
function saveAWSConfigFromWeb(awsEnrolled) {
    try {
        if (!hasPermission('payroll')) {
            return { success: false, message: 'Payroll permission required.' };
        }
        if (!awsEnrolled || typeof awsEnrolled !== 'object') {
            return { success: false, message: 'Invalid AWS configuration payload.' };
        }
        const savedState = writeStoredScheduleState_(applyAWSConfigToScheduleState_(getStoredScheduleState_(), awsEnrolled));
        Logger.log('saveAWSConfigFromWeb: saved AWS config for %s employee(s)', Object.keys(awsEnrolled).length);
        debugLog('saveAWSConfigFromWeb complete', { employeeCount: Object.keys(awsEnrolled).length });
        return { success: true, message: 'AWS settings saved.', state: savedState };
    }
    catch (e) {
        Logger.log('saveAWSConfigFromWeb: error=%s', e.toString());
        return { success: false, message: e.toString() };
    }
}
/**
 * Server callback to submit preview generation with selected date and AWS enrollments
 */
function submitGeneratePreview(dateStr, awsEnrolled) {
    return { success: false, message: 'submitGeneratePreview is deprecated. Use Admin View report generation in the web app.' };
}
/**
 * Execute payroll preview generation with given start date
 */
/**
 * @deprecated Use Admin View report generation in the web app (buildAdminHtmlPreviewData + exportPayrollPreviewFromWeb).
 */
function executeGeneratePreview(startDate) {
    const startMs = Date.now();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let ui = null;
    try {
        ui = SpreadsheetApp.getUi();
    }
    catch (e) {
        ui = null;
    }
    const dataEntry = ss.getSheetByName('DataEntry');
    if (!dataEntry) {
        Logger.log('executeGeneratePreview: DataEntry sheet missing');
        return { success: false, message: 'DataEntry sheet not found.' };
    }
    // Auto-calculate end date as 2 weeks from start (14 days - 1)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13); // 13 days from start = 2 weeks total
    endDate.setHours(23, 59, 59, 999);
    // Store dates temporarily for preview generation (saved to settings on export)
    const startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const endDateStr = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    setSetting('currentPreviewStartDate', startDateStr);
    setSetting('currentPreviewEndDate', endDateStr);
    // Note: Pay period end date is updated only on successful payroll export
    // Collect filtered entries within date range
    const data = dataEntry.getDataRange().getValues();
    const filteredEntries = [];
    //check for invalid clock-in entries
    for (let i = 1; i < data.length; i++) {
        if (isDeletedDataRow(data[i]))
            continue;
        const clockInValue = getEffectiveClockInFromRow(data[i]);
        if (!clockInValue || !(clockInValue instanceof Date) || isNaN(clockInValue.getTime())) {
            continue; // Skip invalid clock-in entries
        }
        // If the clockin is within the specified date range, include it
        if (clockInValue >= startDate && clockInValue <= endDate) {
            // Get a valid Date object from the "Clock Out" column, or null if not present/invalid
            const clockOutValue = getEffectiveClockOutFromRow(data[i]);
            const clockOut = (clockOutValue instanceof Date && !isNaN(clockOutValue.getTime())) ? clockOutValue : null;
            filteredEntries.push({
                email: data[i][DATA_COLUMNS.EMAIL],
                clockIn: clockInValue,
                clockOut: clockOut,
                hours: data[i][DATA_COLUMNS.HOURS],
                verified: isSheetBooleanTrue(data[i][DATA_COLUMNS.VERIFIED]),
                notes: data[i][DATA_COLUMNS.NOTES]
            });
        }
    }
    //If no entries found, alert and exit
    if (filteredEntries.length === 0) {
        Logger.log('executeGeneratePreview: no entries found in selected date range');
        return { success: false, message: 'No entries found in the specified date range.' };
    }
    // Sort by email, then by clock in date
    filteredEntries.sort((a, b) => {
        if (a.email !== b.email) {
            return a.email.localeCompare(b.email);
        }
        return a.clockIn.getTime() - b.clockIn.getTime();
    });
    // Calculate payroll hours by employee email
    // 1. Build employeeMap[email][week][day] = totalHours
    const employeeMap = {};
    const summaryMap = {};
    filteredEntries.forEach(entry => {
        const email = entry.email;
        const normalizedType = normalizeEntryType(entry.entryType);
        if (!summaryMap[email]) {
            summaryMap[email] = { wk1: [0, 0, 0], wk2: [0, 0, 0], vacationHours: 0, holidayHours: 0, sickHours: 0, ruleSet: null };
        }
        if (normalizedType === ENTRY_TYPE_VACATION) {
            summaryMap[email].vacationHours += entry.hours || 0;
            return;
        }
        if (normalizedType === ENTRY_TYPE_SICK) {
            summaryMap[email].sickHours += entry.hours || 0;
            return;
        }
        const weekNum = getWeekNum(entry.clockIn, startDate); // 1 or 2
        const dayKey = Utilities.formatDate(entry.clockIn, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (!employeeMap[email])
            employeeMap[email] = {};
        if (!employeeMap[email][weekNum])
            employeeMap[email][weekNum] = {};
        if (!employeeMap[email][weekNum][dayKey])
            employeeMap[email][weekNum][dayKey] = 0;
        employeeMap[email][weekNum][dayKey] += entry.hours || 0;
    });
    // 2. For each employee/week, distribute daily hours (including 7th day rule), then apply weekly >40hr rule
    // 2026 Compliance: No pyramiding - hours already counted as OT/DT are not counted toward 40-hour weekly rule
    // NOTE: 7th Day Rule is CORRECTLY implemented per California Labor Law:
    //   - Week 1 (days 0-6 of pay period): 7th day rule triggers when consecutiveDays === 7 within Week 1
    //   - Week 2 (days 7-13 of pay period): 7th day rule triggers when consecutiveDays === 7 within Week 2
    //   - getWeekNum() properly separates the 14-day pay period into two independent 7-day workweeks
    //   - Each week's 7th day gets OT minimum (0-8h=OT, 8h+= 8h OT + DT remainder)
    Object.keys(employeeMap).forEach(email => {
        // Determine primary rule set for summary display (check first day or start date)
        const firstDayKey = Object.keys(employeeMap[email][1] || employeeMap[email][2] || {})[0];
        const checkDate = firstDayKey || startDate;
        const primaryRuleSet = isEmployeeAWS(email, checkDate) ? 'AWS' : 'CA Standard';
        summaryMap[email] = summaryMap[email] || { wk1: [0, 0, 0], wk2: [0, 0, 0], vacationHours: 0, holidayHours: 0, sickHours: 0, ruleSet: null }; // [RT, OT, DT], plus leave totals
        summaryMap[email].ruleSet = primaryRuleSet;
        debugLog(`Employee ${email} processing`, { policyType: primaryRuleSet === 'AWS' ? 'AWS (10h threshold)' : 'CA Standard (8h threshold)', note: 'Actual rules applied per-day based on effective date' });
        [1, 2].forEach(weekNum => {
            const week = employeeMap[email][weekNum] || {};
            const dayKeys = Object.keys(week).sort(); // Sort days chronologically within this week
            let weekRT = 0, weekOT = 0, weekDT = 0;
            let consecutiveDays = 0; // Resets for each week due to forEach loop scope
            debugLog(`Week ${weekNum} for ${email}`, { daysInWeek: dayKeys.length });
            // Apply daily rules (including 7th day rule) for each workday in the week
            dayKeys.forEach(dayKey => {
                const totalHours = week[dayKey];
                consecutiveDays++;
                let dayRT = 0, dayOT = 0, dayDT = 0;
                // Check AWS status for THIS SPECIFIC DAY (allows mid-period transitions)
                const isAWS = isEmployeeAWS(email, dayKey);
                // Determine daily threshold and whether to apply 7th day rule based on AWS status
                const dailyThreshold = isAWS ? AWS_DAILY_THRESHOLD : 8; // 10 hours for AWS, 8 hours for CA
                const suppressSeventhDay = isAWS; // Disable 7th day rule for AWS employees
                // Check if this is the 7th consecutive workday within this workweek (7th day rule only for CA)
                if (consecutiveDays === 7 && !suppressSeventhDay) {
                    // Day 7 rule (CA only): 0-8h = OT, 8h+ = 8h OT + (hours - 8) DT
                    if (totalHours <= 8) {
                        dayOT = totalHours;
                    }
                    else {
                        dayOT = 8;
                        dayDT = totalHours - 8;
                    }
                    debugLog(`${email} ${dayKey} (DAY 7 - CA RULE)`, { totalHours, dayRT, dayOT, dayDT });
                }
                else {
                    // Normal daily rules for days 1-6 (or all days if AWS and 7th day suppressed)
                    // AWS: 0-10h = RT, 10-12h = OT, 12h+ = DT
                    // CA: 0-8h = RT, 8-12h = OT, 12h+ = DT
                    if (totalHours <= dailyThreshold) {
                        dayRT = totalHours;
                    }
                    else if (totalHours <= 12) {
                        dayRT = dailyThreshold;
                        dayOT = totalHours - dailyThreshold;
                    }
                    else {
                        dayRT = dailyThreshold;
                        dayOT = 12 - dailyThreshold; // 2h for AWS (12-10), 4h for CA (12-8)
                        dayDT = totalHours - 12;
                    }
                    debugLog(`${email} ${dayKey} (Day ${consecutiveDays})`, { totalHours, dailyThreshold, policyType: isAWS ? 'AWS' : 'CA', dayRT, dayOT, dayDT });
                }
                weekRT += dayRT;
                weekOT += dayOT;
                weekDT += dayDT;
            });
            // Apply weekly >40hr rule: only RT counts toward 40-hour threshold
            // Daily OT/DT are never reclassified (no pyramiding)
            const excess = Math.max(0, weekRT - 40);
            if (excess > 0) {
                debugLog(`${email} Week ${weekNum} weekly >40h rule`, { weekRTBefore: weekRT, excess, reclassified2OT: excess });
                weekRT -= excess;
                weekOT += excess;
            }
            debugLog(`${email} Week ${weekNum} totals`, { weekRT, weekOT, weekDT });
            // Save to summary map
            if (weekNum === 1)
                summaryMap[email].wk1 = [weekRT, weekOT, weekDT];
            if (weekNum === 2)
                summaryMap[email].wk2 = [weekRT, weekOT, weekDT];
        });
    });
    const tz = Session.getScriptTimeZone();
    const startDateKey = Utilities.formatDate(startDate, tz, 'yyyy-MM-dd');
    const endDateKey = Utilities.formatDate(endDate, tz, 'yyyy-MM-dd');
    const previewRows = Object.keys(summaryMap).sort().map(email => {
        const wk1 = summaryMap[email].wk1;
        const wk2 = summaryMap[email].wk2;
        const totalRT = wk1[0] + wk2[0];
        const totalOT = wk1[1] + wk2[1];
        const totalDT = wk1[2] + wk2[2];
        const wk1Total = wk1[0] + wk1[1] + wk1[2];
        const wk2Total = wk2[0] + wk2[1] + wk2[2];
        const totalOverage = (wk1Total > 40 ? wk1Total - 40 : 0) + (wk2Total > 40 ? wk2Total - 40 : 0);
        debugLog('executeGeneratePreview row ' + email, {
            wk1RT: wk1[0], wk1OT: wk1[1], wk1DT: wk1[2],
            wk2RT: wk2[0], wk2OT: wk2[1], wk2DT: wk2[2],
            totalRT, totalOT, totalDT
        });
        return {
            email, wk1RT: wk1[0], wk1OT: wk1[1], wk1DT: wk1[2],
            wk2RT: wk2[0], wk2OT: wk2[1], wk2DT: wk2[2],
            vacationHours: summaryMap[email].vacationHours || 0,
            holidayHours: summaryMap[email].holidayHours || 0,
            sickHours: summaryMap[email].sickHours || 0,
            totalOverage,
            totalRT, totalOT, totalDT, notes: '', ruleSet: summaryMap[email].ruleSet
        };
    });
    // Cache preview rows in Script Properties for menu-based export
    PropertiesService.getScriptProperties().setProperty('cachedPreviewRows', JSON.stringify({
        startDateKey: startDateKey,
        endDateKey: endDateKey,
        rows: previewRows
    }));
    Logger.log('executeGeneratePreview: generated preview for %s employee(s), %s entries', Object.keys(employeeMap).length, filteredEntries.length);
    debugLog('executeGeneratePreview complete', {
        employees: Object.keys(employeeMap).length,
        entries: filteredEntries.length,
        startDate: startDateStr,
        endDate: endDateStr,
        durationMs: Date.now() - startMs
    });
    return {
        success: true,
        message: `Preview generated successfully with ${Object.keys(employeeMap).length} employees.`,
        rows: previewRows,
        startDateKey: startDateKey,
        endDateKey: endDateKey,
        startDateStr: startDateStr,
        endDateStr: endDateStr
    };
}
/**
 * Generate payroll preview for 2-week period.
 * HTML dialog implemented for better UX.
 */
/**
 * @deprecated Use Admin View -> Generate Report in the web app.
 */
function generatePreview() {
    Logger.log('generatePreview: deprecated. Use Admin View -> Generate Report in the web app.');
    return { success: false, message: 'Deprecated. Use Admin View -> Generate Report in the web app.' };
}
/**
 * Open dialog to manually set current pay period start date.
 * End date is auto-calculated as start date + 13 days.
 */
function openSetCurrentPayPeriodDialog() {
    const startMs = Date.now();
    const tz = Session.getScriptTimeZone();
    const activePeriod = getActivePayPeriod();
    const formatIsoLocal = date => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const defaultStartDate = new Date(activePeriod.startDate);
    const defaultEndDate = new Date(activePeriod.endDate);
    const source = activePeriod.source;
    const defaultStartIso = formatIsoLocal(defaultStartDate);
    const defaultEndIso = formatIsoLocal(defaultEndDate);
    const defaultStartDisplay = Utilities.formatDate(defaultStartDate, tz, 'MM/dd/yyyy');
    const defaultEndDisplay = Utilities.formatDate(defaultEndDate, tz, 'MM/dd/yyyy');
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
          .form-group { margin: 14px 0; }
          label { display: block; font-weight: bold; margin-bottom: 6px; }
          input { width: 100%; padding: 8px; box-sizing: border-box; font-size: 14px; }
          button { padding: 10px 20px; margin: 5px 5px 5px 0; cursor: pointer; font-size: 14px; }
          .primary { background: #1a73e8; color: white; border: none; border-radius: 4px; }
          .secondary { background: #e0e0e0; color: #333; border: none; border-radius: 4px; }
          .error { color: #d32f2f; margin-top: 10px; display: none; }
          .info { color: #666; font-size: 12px; margin-top: 5px; }
          .preview { background: #f8f9fa; border-left: 4px solid #1a73e8; padding: 10px; margin-top: 10px; }
          .preview-title { font-weight: bold; margin-bottom: 4px; }
          #submitBtn:disabled { background: #ccc; cursor: not-allowed; }
        </style>
      </head>
      <body>
        <form id="payPeriodForm">
          <div class="form-group">
            <label for="startDate">Pay Period Start Date *</label>
            <input type="date" id="startDate" value="${defaultStartIso}" required>
            <div class="info">Select the first day of the pay period. End date is automatically set to 14 days total.</div>
          </div>

          <div class="preview" id="periodPreview">
            <div class="preview-title">Current Selection</div>
            <div>Start: <strong id="startDisplay">${defaultStartDisplay}</strong></div>
            <div>End: <strong id="endDisplay">${defaultEndDisplay}</strong></div>
          </div>

          <div class="error" id="errorMsg"></div>

          <div>
            <button type="button" class="primary" id="submitBtn">Save Pay Period</button>
            <button type="button" class="secondary" onclick="google.script.host.close()">Cancel</button>
          </div>
        </form>

        <script>
          const startDateInput = document.getElementById('startDate');
          const startDisplay = document.getElementById('startDisplay');
          const endDisplay = document.getElementById('endDisplay');
          const errorMsg = document.getElementById('errorMsg');
          const submitBtn = document.getElementById('submitBtn');

          function parseLocalDate(isoDate) {
            const parts = String(isoDate || '').split('-');
            if (parts.length !== 3) return null;
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
            const date = new Date(y, m - 1, d);
            if (isNaN(date.getTime())) return null;
            if (date.getFullYear() !== y || (date.getMonth() + 1) !== m || date.getDate() !== d) return null;
            return date;
          }

          function formatDisplay(date) {
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const yyyy = date.getFullYear();
            return mm + '/' + dd + '/' + yyyy;
          }

          function calculateEndDate(startDate) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 13);
            return endDate;
          }

          function updatePreview() {
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';

            const startDate = parseLocalDate(startDateInput.value);
            if (!startDate) {
              startDisplay.textContent = 'Invalid date';
              endDisplay.textContent = 'Invalid date';
              submitBtn.disabled = true;
              return;
            }

            const endDate = calculateEndDate(startDate);
            startDisplay.textContent = formatDisplay(startDate);
            endDisplay.textContent = formatDisplay(endDate);
            submitBtn.disabled = false;
          }

          function submitPayPeriod() {
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';

            const startDateIso = startDateInput.value;
            const startDate = parseLocalDate(startDateIso);
            if (!startDate) {
              errorMsg.textContent = 'Please select a valid start date.';
              errorMsg.style.display = 'block';
              return;
            }

            const endDate = calculateEndDate(startDate);
            const startText = formatDisplay(startDate);
            const endText = formatDisplay(endDate);

            const confirmed = window.confirm(
              'This will update the official and preview pay period.\\n\\n' +
              'Start: ' + startText + '\\n' +
              'End: ' + endText + '\\n\\n' +
              'Manual entry date limits will change immediately. Continue?'
            );

            if (!confirmed) {
              return;
            }

            submitBtn.disabled = true;

            google.script.run
              .withSuccessHandler((result) => {
                if (result && result.success) {
                  google.script.host.close();
                } else {
                  errorMsg.textContent = (result && result.message) ? result.message : 'Unable to save pay period.';
                  errorMsg.style.display = 'block';
                  submitBtn.disabled = false;
                }
              })
              .withFailureHandler((error) => {
                errorMsg.textContent = 'Error: ' + error.message;
                errorMsg.style.display = 'block';
                submitBtn.disabled = false;
              })
              .submitSetCurrentPayPeriod(startDateIso);
          }

          submitBtn.addEventListener('click', submitPayPeriod);
          startDateInput.addEventListener('change', updatePreview);
          window.addEventListener('load', updatePreview);
        </script>
      </body>
    </html>
  `;
    const ui = SpreadsheetApp.getUi();
    ui.showModelessDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(360), 'Set Current Pay Period');
    Logger.log('openSetCurrentPayPeriodDialog: opened (source=%s)', source);
    debugLog('openSetCurrentPayPeriodDialog complete', {
        source: source,
        defaultStartISO: defaultStartIso,
        defaultEndISO: defaultEndIso,
        durationMs: Date.now() - startMs
    });
}
/**
 * Save manually selected current pay period.
 * Updates both official and preview period keys to keep workflows synchronized.
 * @param {string} startDateISO Start date in YYYY-MM-DD format
 */
function submitSetCurrentPayPeriod(startDateISO) {
    const startMs = Date.now();
    const tz = Session.getScriptTimeZone();
    try {
        const parts = String(startDateISO || '').split('-');
        if (parts.length !== 3) {
            Logger.log('submitSetCurrentPayPeriod: invalid date format input');
            return { success: false, message: 'Invalid start date format.' };
        }
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isFinite(y) || !isFinite(m) || !isFinite(d)) {
            Logger.log('submitSetCurrentPayPeriod: non-numeric date parts');
            return { success: false, message: 'Invalid start date value.' };
        }
        const startDate = new Date(y, m - 1, d);
        startDate.setHours(0, 0, 0, 0);
        if (isNaN(startDate.getTime()) || startDate.getFullYear() !== y || (startDate.getMonth() + 1) !== m || startDate.getDate() !== d) {
            Logger.log('submitSetCurrentPayPeriod: failed date parse');
            return { success: false, message: 'Invalid start date.' };
        }
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        endDate.setHours(23, 59, 59, 999);
        const startDateStr = Utilities.formatDate(startDate, tz, 'MM/dd/yyyy');
        const endDateStr = Utilities.formatDate(endDate, tz, 'MM/dd/yyyy');
        const actorEmail = Session.getActiveUser().getEmail() || 'unknown';
        const previousValues = {
            activePayPeriodStartDate: getSetting(ACTIVE_PAY_PERIOD_START_KEY, ''),
            activePayPeriodEndDate: getSetting(ACTIVE_PAY_PERIOD_END_KEY, ''),
            currentPreviewStartDate: getSetting('currentPreviewStartDate', ''),
            currentPreviewEndDate: getSetting('currentPreviewEndDate', '')
        };
        setActivePayPeriod(startDate, endDate);
        // Manual set updates active period only; do not mutate currentPreview* here.
        syncActivePayPeriodHeaders(startDateStr, endDateStr);
        Logger.log('submitSetCurrentPayPeriod: updated period to %s - %s', startDateStr, endDateStr);
        debugLog('submitSetCurrentPayPeriod complete', {
            actorEmail: actorEmail,
            previousValues: previousValues,
            newValues: {
                activePayPeriodStartDate: startDateStr,
                activePayPeriodEndDate: endDateStr
            },
            durationMs: Date.now() - startMs
        });
        return { success: true, message: `Pay period set to ${startDateStr} through ${endDateStr}.` };
    }
    catch (e) {
        Logger.log('submitSetCurrentPayPeriod: error=%s', e.message);
        return { success: false, message: `Error: ${e.message}` };
    }
}
/**
 * Determine which week an entry belongs to
 */
function getWeekNum(date, startDate) {
    const oneDay = 1000 * 60 * 60 * 24;
    const diff = (date.getTime() - startDate.getTime()) / oneDay;
    if (diff < 0) {
        debugLog('getWeekNum negative date diff', { diff: diff, dateTs: date.getTime(), startDateTs: startDate.getTime() });
    }
    return diff < 7 ? 1 : 2;
}
/**
 * Open dialog to select archive date
 */
/**
 * @deprecated Archiving is handled by web export flow (Admin View -> Export Report).
 */
function openArchiveDialog() {
    Logger.log('openArchiveDialog: deprecated. Archiving is handled by web export flow.');
    try {
        const ui = SpreadsheetApp.getUi();
        ui.alert('Deprecated', 'Archive dialog is deprecated. Archiving is handled by web export flow.', ui.ButtonSet.OK);
    }
    catch (e) {
        // web context
    }
}
/**
 * Internal core for archiving. Web-safe: never calls getUi or ui.alert.
 * Returns { success: boolean, message: string, archivedCount?: number }
 */
function _archiveOldEntriesCore(archiveDate) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataEntry = ss.getSheetByName('DataEntry');
    const archive = ss.getSheetByName('Archive');
    if (!dataEntry) {
        Logger.log('archiveOldEntries: DataEntry sheet missing');
        return { success: false, message: 'DataEntry sheet not found.' };
    }
    if (!archive) {
        Logger.log('archiveOldEntries: Archive sheet missing');
        return { success: false, message: 'Archive sheet not found.' };
    }
    if (dataEntry.getLastRow() <= 1) {
        return { success: true, message: 'No entries in DataEntry sheet to archive.', archivedCount: 0 };
    }
    const cutoffDate = archiveDate || (() => {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);
        defaultDate.setHours(23, 59, 59, 999);
        return defaultDate;
    })();
    Logger.log('archiveOldEntries: evaluating archive candidates');
    debugLog('archiveOldEntries cutoff', { cutoffDate: cutoffDate.toISOString() });
    const data = dataEntry.getDataRange().getValues();
    const toArchive = [];
    const rowsToClear = [];
    let invalidClockInCount = 0;
    for (let i = 1; i < data.length; i++) {
        const clockInValue = getEffectiveClockInFromRow(data[i]);
        if (!(clockInValue instanceof Date) || isNaN(clockInValue.getTime())) {
            invalidClockInCount++;
            debugLog('archiveOldEntries skipping invalid clock-in row', { row: i + 1 });
            continue;
        }
        if (clockInValue <= cutoffDate) {
            debugLog('archiveOldEntries mark row for archive', { row: i + 1, clockIn: clockInValue.toISOString() });
            const archiveRow = [
                data[i][DATA_COLUMNS.EMAIL],
                data[i][DATA_COLUMNS.CLOCK_IN],
                data[i][DATA_COLUMNS.CLOCK_OUT],
                data[i][DATA_COLUMNS.HOURS],
                data[i][DATA_COLUMNS.VERIFIED],
                data[i][DATA_COLUMNS.NOTES],
                data[i][DATA_COLUMNS.CLOCK_IN_MODIFIED],
                data[i][DATA_COLUMNS.CLOCK_OUT_MODIFIED],
                data[i][DATA_COLUMNS.DELETED],
                data[i][DATA_COLUMNS.ENTRY_TYPE],
                data[i][DATA_COLUMNS.ENTRY_ID]
            ];
            archiveRow.push(new Date());
            toArchive.push(archiveRow);
            rowsToClear.push(i + 1);
        }
    }
    if (toArchive.length === 0) {
        return { success: true, message: 'No entries on or before the selected date found.', archivedCount: 0 };
    }
    Logger.log('archiveOldEntries: archiving %s entries', toArchive.length);
    if (invalidClockInCount > 0) {
        debugLog('archiveOldEntries invalid rows encountered', { invalidClockInCount: invalidClockInCount });
    }
    const archiveLastRowBefore = archive.getLastRow();
    const startRow = archiveLastRowBefore + 1;
    archive.getRange(startRow, 1, toArchive.length, toArchive[0].length).setValues(toArchive);
    SpreadsheetApp.flush();
    const archiveLastRowAfter = archive.getLastRow();
    const verifyOk = (archiveLastRowAfter === archiveLastRowBefore + toArchive.length);
    if (!verifyOk) {
        debugLog('archive verify failed', { before: archiveLastRowBefore, after: archiveLastRowAfter, expected: archiveLastRowBefore + toArchive.length });
        Logger.log('archiveOldEntries: row count verification failed after append, skipping clear');
    }
    if (verifyOk && rowsToClear.length > 0) {
        rowsToClear.forEach(rowNum => {
            dataEntry.getRange(rowNum, 1, 1, DATA_COL_COUNT).setValues([new Array(DATA_COL_COUNT).fill('')]);
        });
    }
    SpreadsheetApp.flush();
    if (verifyOk) {
        sortDataEntry(dataEntry);
    }
    refreshEmployeeEmailCacheFromSheet(dataEntry);
    Logger.log('archiveOldEntries: archive complete (%s archived)', toArchive.length);
    return {
        success: true,
        message: `Archived ${toArchive.length} entries up to ${Utilities.formatDate(cutoffDate, Session.getScriptTimeZone(), 'MM/dd/yyyy')}.`,
        archivedCount: toArchive.length
    };
}
/**
 * Archive entries on or before specified date (or 30 days old if no date provided).
 * Menu-safe wrapper: shows alerts via getUi when available.
 * Web callers should prefer _archiveOldEntriesCore or accept result without alerts.
 * @param {Date} archiveDate - Optional date to archive up to.
 */
function archiveOldEntries(archiveDate) {
    const result = _archiveOldEntriesCore(archiveDate);
    try {
        const ui = SpreadsheetApp.getUi();
        if (result.success) {
            ui.alert('✅ Success', result.message || 'Archive complete.', ui.ButtonSet.OK);
        }
        else {
            ui.alert('❌ Error', result.message || 'Archive failed.', ui.ButtonSet.OK);
        }
    }
    catch (e) {
        // Web context (google.script.run) or no UI: result is logged inside core.
        Logger.log('archiveOldEntries (no-UI context): %s', result.message);
    }
    return result;
}
/**
 * Build HTML content for payroll PDF export.
 * Produces a table matching the PayrollPreview layout (15 columns).
 */
function buildPayrollPdfHtml(startDateStr, endDateStr, rows) {
    const fmtH = (v) => {
        const n = Number(v) || 0;
        return n === 0 ? '—' : n.toFixed(2);
    };
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rowsHtml = rows.map((row) => {
        return '<tr>' +
            '<td class="email">' + esc(row.email) + '</td>' +
            '<td style="background:#d9ead3;">' + fmtH(row.wk1RT) + '</td><td style="background:#d9ead3;">' + fmtH(row.wk1OT) + '</td><td style="background:#d9ead3;">' + fmtH(row.wk1DT) + '</td>' +
            '<td style="background:#d0e4f7;">' + fmtH(row.wk2RT) + '</td><td style="background:#d0e4f7;">' + fmtH(row.wk2OT) + '</td><td style="background:#d0e4f7;">' + fmtH(row.wk2DT) + '</td>' +
            '<td>' + fmtH(row.vacationHours) + '</td><td>' + fmtH(row.holidayHours) + '</td><td>' + fmtH(row.sickHours) + '</td><td>' + fmtH(row.totalOverage) + '</td>' +
            '<td style="background:#d9ead3;">' + fmtH(row.totalRT) + '</td><td style="background:#b6d7a8;">' + fmtH(row.totalOT) + '</td><td style="background:#93c47d;">' + fmtH(row.totalDT) + '</td>' +
            '<td class="notes">' + esc(row.notes || '') + '</td>' +
            '<td style="background:#e8e8e8;">' + esc(row.ruleSet || '') + '</td>' +
            '</tr>';
    }).join('');
    return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<style>' +
        '@page{ size: A4 landscape; margin: 10mm; }' +
        'html,body{margin:0;padding:0;}' +
        'body{font-family:Arial,sans-serif;font-size:8.5pt;margin:12px;box-sizing:border-box;}' +
        'h2{text-align:center;margin:0 0 6px;}' +
        '.period{text-align:center;margin-bottom:10px;color:#555;font-size:9.5pt;}' +
        'table{width:100%;border-collapse:collapse;font-size:8.5pt;table-layout:fixed;}' +
        'th,td{border:1px solid #bbb;padding:3px 4px;text-align:center;white-space:nowrap;vertical-align:middle;}' +
        'th{background:#e0e0e0;font-weight:bold;}' +
        'td.email{text-align:left;min-width:140px;width:16%;overflow:hidden;text-overflow:ellipsis;}' +
        'td.notes{text-align:left;min-width:90px;width:14%;white-space:normal;}' +
        '.wk1{background:#d9ead3;}' +
        '.wk2{background:#d0e4f7;}' +
        '.tot-rt{background:#d9ead3;}' +
        '.tot-ot{background:#b6d7a8;}' +
        '.tot-dt{background:#93c47d;}' +
        '.aws-col{background:#e8e8e8;}' +
        '</style>' +
        '</head><body>' +
        '<h2>Payroll Report</h2>' +
        '<div class="period">Pay Period: ' + esc(startDateStr) + ' to ' + esc(endDateStr) + '</div>' +
        '<table><thead><tr>' +
        '<th>Email</th>' +
        '<th style="background:#d9ead3;">Wk1 RT</th><th style="background:#d9ead3;">Wk1 OT</th><th style="background:#d9ead3;">Wk1 DT</th>' +
        '<th style="background:#d0e4f7;">Wk2 RT</th><th style="background:#d0e4f7;">Wk2 OT</th><th style="background:#d0e4f7;">Wk2 DT</th>' +
        '<th>Vac</th><th>Hol</th><th>Sick</th><th>Hrs&gt;40</th>' +
        '<th style="background:#d9ead3;">Tot RT</th><th style="background:#b6d7a8;">Tot OT</th><th style="background:#93c47d;">Tot DT</th>' +
        '<th>Notes</th><th class="aws-col">Rule</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
        '</body></html>';
}
/**
 * @deprecated Use Admin View -> Export Report in the web app.
 */
function exportPayrollHours() {
    Logger.log('exportPayrollHours: deprecated. Use Admin View -> Export Report in the web app.');
    return { success: false, message: 'Deprecated. Use Admin View -> Export Report in the web app.' };
}
/**
 * Web-safe export endpoint for admin HTML preview workflow.
 * Uses cached client preview rows when provided to avoid rerunning full preview generation.
 * Export fails fast when cached payload is unavailable.
 */
function exportPayrollPreviewFromWeb(startDateIso, awsEnrolled, options) {
    try {
        if (!hasPermission('export')) {
            return { success: false, message: 'Export permission required.' };
        }
        const dateParts = String(startDateIso || '').split('-');
        if (dateParts.length !== 3) {
            return { success: false, message: 'Invalid start date.' };
        }
        const startDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
        startDate.setHours(0, 0, 0, 0);
        if (isNaN(startDate.getTime())) {
            return { success: false, message: 'Invalid start date.' };
        }
        if (awsEnrolled && typeof awsEnrolled === 'object') {
            writeStoredScheduleState_(applyAWSConfigToScheduleState_(getStoredScheduleState_(), awsEnrolled));
        }
        const opts = options || {};
        const forceUnverified = opts.forceUnverified === true;
        const notesByEmail = (opts.notesByEmail && typeof opts.notesByEmail === 'object') ? opts.notesByEmail : null;
        const cachedPreview = (opts.cachedPreview && typeof opts.cachedPreview === 'object') ? opts.cachedPreview : null;
        const unverifiedSummary = (opts.unverifiedSummary && typeof opts.unverifiedSummary === 'object') ? opts.unverifiedSummary : null;
        if (!cachedPreview) {
            return {
                success: false,
                message: 'Cached preview data is missing. Click Generate Report again before exporting.'
            };
        }
        // Validate cached preview date range matches the requested start date
        const tz = Session.getScriptTimeZone();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        endDate.setHours(23, 59, 59, 999);
        const expectedStartKey = Utilities.formatDate(startDate, tz, 'yyyy-MM-dd');
        const expectedEndKey = Utilities.formatDate(endDate, tz, 'yyyy-MM-dd');
        const payloadStartKey = String(cachedPreview.startDateKey || expectedStartKey);
        const payloadEndKey = String(cachedPreview.endDateKey || expectedEndKey);
        if (payloadStartKey !== expectedStartKey || payloadEndKey !== expectedEndKey) {
            return { success: false, message: 'Cached preview date range no longer matches current start date. Generate preview again.' };
        }
        const startDateStr = Utilities.formatDate(startDate, tz, 'MM/dd/yyyy');
        const endDateStr = Utilities.formatDate(endDate, tz, 'MM/dd/yyyy');
        setSetting('currentPreviewStartDate', startDateStr);
        setSetting('currentPreviewEndDate', endDateStr);
        const cachedRows = Array.isArray(cachedPreview.rows) ? cachedPreview.rows : [];
        if (cachedRows.length === 0) {
            return { success: false, message: 'No cached preview rows found. Generate preview again.' };
        }
        return exportPayrollHoursForWeb(forceUnverified, notesByEmail, unverifiedSummary, cachedRows);
    }
    catch (e) {
        Logger.log('exportPayrollPreviewFromWeb: error=%s', e.toString());
        return { success: false, message: e.toString() };
    }
}
/**
 * Export payroll as HTML-blob PDF without Spreadsheet UI dependencies.
 * cachedRows: array of payroll summary row objects from buildAdminHtmlPreviewData or executeGeneratePreview.
 */
function exportPayrollHoursForWeb(forceUnverified, notesByEmail, unverifiedSummary, cachedRows) {
    let startDateStr = getSetting('currentPreviewStartDate', '');
    let endDateStr = getSetting('currentPreviewEndDate', '');
    if (!startDateStr || !endDateStr) {
        startDateStr = getSetting('lastPreviewStartDate', '');
        endDateStr = getSetting('lastPreviewEndDate', '');
    }
    if (!Array.isArray(cachedRows) || cachedRows.length === 0) {
        return { success: false, message: 'No preview data available. Generate preview again.' };
    }
    const hasClientUnverified = !!(unverifiedSummary && typeof unverifiedSummary === 'object' &&
        typeof unverifiedSummary.count === 'number' && Array.isArray(unverifiedSummary.sample));
    if (!hasClientUnverified) {
        return {
            success: false,
            message: 'Preview verification summary is missing. Click Generate Report again before exporting.'
        };
    }
    const unverifiedCount = Math.max(0, Number(unverifiedSummary.count) || 0);
    if (unverifiedCount > 0 && forceUnverified !== true) {
        return {
            success: false,
            requiresUnverifiedConfirmation: true,
            unverifiedCount: unverifiedCount,
            sample: unverifiedSummary.sample.slice(0, 5).map(v => String(v || '')),
            message: `Warning: ${unverifiedCount} unverified entries found in this pay period.`
        };
    }
    // Apply notes overrides in-memory before PDF generation
    const rows = cachedRows.map(row => {
        const email = String((row && row.email) || '');
        const finalNote = (notesByEmail && typeof notesByEmail === 'object' && Object.prototype.hasOwnProperty.call(notesByEmail, email))
            ? String(notesByEmail[email] || '')
            : String((row && row.notes) || '');
        return Object.assign({}, row, { notes: finalNote });
    });
    let workflowPhase = 'initialization';
    let driveUrl = '';
    try {
        workflowPhase = 'creating PDF export';
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const parentFile = DriveApp.getFileById(ss.getId());
        const parentFolders = parentFile.getParents();
        if (!parentFolders.hasNext()) {
            throw new Error('Parent spreadsheet has no folder.');
        }
        const parentFolder = parentFolders.next();
        const fileStartDateStr = startDateStr || 'Unknown';
        const fileEndDateStr = endDateStr || 'Unknown';
        const fileName = `Payroll Report ${fileStartDateStr} to ${fileEndDateStr}`;
        const htmlContent = buildPayrollPdfHtml(startDateStr, endDateStr, rows);
        const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', fileName + '.html')
            .getAs('application/pdf')
            .setName(fileName + '.pdf');
        const pdfFile = parentFolder.createFile(pdfBlob);
        driveUrl = pdfFile.getUrl();
        if (startDateStr && endDateStr) {
            setSetting('lastPreviewStartDate', startDateStr);
            setSetting('lastPreviewEndDate', endDateStr);
        }
        let nextStartDateStr = 'the next day';
        let nextEndDateStr = '';
        let nextStartDateObj = null;
        let nextEndDateObj = null;
        if (endDateStr) {
            const parts = endDateStr.split('/');
            if (parts.length === 3) {
                const endDateObj = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
                endDateObj.setDate(endDateObj.getDate() + 1);
                nextStartDateObj = new Date(endDateObj);
                nextStartDateStr = Utilities.formatDate(endDateObj, Session.getScriptTimeZone(), 'MM/dd/yyyy');
                nextEndDateObj = new Date(endDateObj);
                nextEndDateObj.setDate(nextEndDateObj.getDate() + 13);
                nextEndDateStr = Utilities.formatDate(nextEndDateObj, Session.getScriptTimeZone(), 'MM/dd/yyyy');
            }
        }
        workflowPhase = 'archiving exported entries';
        const archiveResult = updateExportArchivePreferenceAndMaybeArchive(endDateStr || '');
        if (archiveResult && archiveResult.success === false) {
            throw new Error(archiveResult.message || 'Archive operation failed.');
        }
        workflowPhase = 'advancing active pay period';
        if (nextStartDateObj && nextEndDateObj) {
            setActivePayPeriod(nextStartDateObj, nextEndDateObj);
            syncActivePayPeriodHeaders(nextStartDateStr, nextEndDateStr);
        }
        Logger.log('exportPayrollHoursForWeb: exported preview to PDF');
        return {
            success: true,
            message: 'Preview exported successfully.',
            driveUrl: driveUrl,
            startDateStr: startDateStr,
            endDateStr: endDateStr,
            nextStartDateStr: nextStartDateStr,
            nextEndDateStr: nextEndDateStr,
            archivedCount: (archiveResult && archiveResult.archivedCount) || 0,
            archiveMessage: (archiveResult && archiveResult.message) || ''
        };
    }
    catch (e) {
        const detail = (e && e.message) ? e.message : String(e || 'Unknown error');
        Logger.log('exportPayrollHoursForWeb: phase=%s error=%s', workflowPhase, detail);
        let message = `Export workflow failed during ${workflowPhase}: ${detail}`;
        if (driveUrl) {
            message += ` PDF may already exist: ${driveUrl}`;
        }
        return { success: false, message: message };
    }
}
/**
 * Persist archive preference and archive entries up to end date.
 */
function updateExportArchivePreferenceAndMaybeArchive(endDateStr) {
    setSetting('exportArchiveAfterClose', 'true');
    Logger.log('updateExportArchivePreferenceAndMaybeArchive: archive required for export workflow');
    if (!endDateStr) {
        debugLog('updateExportArchivePreferenceAndMaybeArchive missing end date', { endDateStr: endDateStr });
        return { success: false, archivedCount: 0, message: 'Missing pay period end date for archive.' };
    }
    const parts = String(endDateStr).split('/');
    if (parts.length !== 3) {
        debugLog('updateExportArchivePreferenceAndMaybeArchive invalid end date format', { endDateStr: endDateStr });
        return { success: false, archivedCount: 0, message: 'Invalid end date for archive.' };
    }
    const archiveDate = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    archiveDate.setHours(23, 59, 59, 999);
    debugLog('updateExportArchivePreferenceAndMaybeArchive archiving now', {
        parsedEndDateValid: !isNaN(archiveDate.getTime()),
        endDateStr: endDateStr
    });
    const arch = _archiveOldEntriesCore(archiveDate);
    debugLog('updateExportArchivePreferenceAndMaybeArchive archive result', {
        success: arch.success,
        count: arch.archivedCount || 0,
        message: arch.message
    });
    return arch;
}
// ==================== CREATE REPORT ====================
/**
 * Bootstrap data for the Create Report dialog.
 * Reads both DataEntry and Archive sheets once, normalizes records,
 * computes available min/max dates, and returns report type options.
 */
function getReportBootstrapData() {
    const startMs = Date.now();
    const tz = Session.getScriptTimeZone();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const records = [];
    const dataEntry = ss.getSheetByName('DataEntry');
    if (dataEntry && dataEntry.getLastRow() > 1) {
        const data = dataEntry.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (isDeletedDataRow(data[i]))
                continue;
            const clockIn = getEffectiveClockInFromRow(data[i]);
            if (!(clockIn instanceof Date) || isNaN(clockIn.getTime()))
                continue;
            const clockOut = getEffectiveClockOutFromRow(data[i]);
            const hours = data[i][DATA_COLUMNS.HOURS];
            records.push({
                email: data[i][DATA_COLUMNS.EMAIL] || '',
                clockIn: Utilities.formatDate(clockIn, tz, 'yyyy-MM-dd HH:mm'),
                clockOut: (clockOut instanceof Date && !isNaN(clockOut.getTime()))
                    ? Utilities.formatDate(clockOut, tz, 'yyyy-MM-dd HH:mm') : '',
                hours: typeof hours === 'number' ? Math.round(hours * 100) / 100 : (Number(hours) || 0),
                notes: data[i][DATA_COLUMNS.NOTES] || '',
                source: 'DataEntry'
            });
        }
    }
    const archive = ss.getSheetByName('Archive');
    if (archive && archive.getLastRow() > 1) {
        const data = archive.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            const clockIn = getEffectiveClockInFromArchiveRow(data[i]);
            if (!(clockIn instanceof Date) || isNaN(clockIn.getTime()))
                continue;
            const clockOut = getEffectiveClockOutFromArchiveRow(data[i]);
            const hours = data[i][ARCHIVE_COLUMNS.HOURS];
            records.push({
                email: data[i][ARCHIVE_COLUMNS.EMAIL] || '',
                clockIn: Utilities.formatDate(clockIn, tz, 'yyyy-MM-dd HH:mm'),
                clockOut: (clockOut instanceof Date && !isNaN(clockOut.getTime()))
                    ? Utilities.formatDate(clockOut, tz, 'yyyy-MM-dd HH:mm') : '',
                hours: typeof hours === 'number' ? Math.round(hours * 100) / 100 : (Number(hours) || 0),
                notes: data[i][ARCHIVE_COLUMNS.NOTES] || '',
                source: 'Archive'
            });
        }
    }
    let minDate = '';
    let maxDate = '';
    if (records.length > 0) {
        let earliest = records[0].clockIn;
        let latest = records[0].clockIn;
        for (let i = 1; i < records.length; i++) {
            if (records[i].clockIn < earliest)
                earliest = records[i].clockIn;
            if (records[i].clockIn > latest)
                latest = records[i].clockIn;
        }
        minDate = earliest.substring(0, 10);
        maxDate = latest.substring(0, 10);
    }
    Logger.log('getReportBootstrapData: loaded %s records', records.length);
    debugLog('getReportBootstrapData complete', {
        recordCount: records.length,
        minDate: minDate,
        maxDate: maxDate,
        durationMs: Date.now() - startMs
    });
    return {
        success: true,
        records: records,
        minDate: minDate,
        maxDate: maxDate,
        reportTypes: [
            { value: 'timeClockSummary', label: 'Time Clock Summary' },
            { value: 'dailyHoursSummary', label: 'Daily Hours Summary' },
            { value: 'attendanceOverview', label: 'Employee Attendance Overview' }
        ]
    };
}
/**
 * Given an array of records and a date range, return unique emails in that range.
 * Called from client-side with the cached record set.
 * @param records Array of record objects with clockIn (yyyy-MM-dd HH:mm) and email
 * @param startDateISO yyyy-MM-dd
 * @param endDateISO yyyy-MM-dd
 * @returns Array of unique email strings, sorted alphabetically
 */
function getReportEmployeesInRange(records, startDateISO, endDateISO) {
    const startMs = Date.now();
    const startStr = startDateISO + ' 00:00';
    const endStr = endDateISO + ' 23:59';
    const emails = new Set();
    for (let i = 0; i < records.length; i++) {
        const ci = records[i].clockIn;
        if (ci >= startStr && ci <= endStr) {
            if (records[i].email)
                emails.add(records[i].email);
        }
    }
    const result = Array.from(emails).sort(function (a, b) {
        return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
    });
    Logger.log('getReportEmployeesInRange: found %s employees', result.length);
    debugLog('getReportEmployeesInRange complete', {
        inputRecords: records.length,
        startDateISO: startDateISO,
        endDateISO: endDateISO,
        employeesFound: result.length,
        durationMs: Date.now() - startMs
    });
    return result;
}
/**
 * Run Time Clock Summary report for a given employee and date range.
 * @param records Array of normalized record objects (from bootstrap)
 * @param reportType string report type key
 * @param startDateISO yyyy-MM-dd
 * @param endDateISO yyyy-MM-dd
 * @param email Employee email
 * @returns Report result object
 */
function runReport(records, reportType, startDateISO, endDateISO, email) {
    const startMs = Date.now();
    const tz = Session.getScriptTimeZone();
    if (!records || records.length === 0) {
        return { success: false, message: 'No data loaded. Please refresh data.' };
    }
    if (!startDateISO || !endDateISO) {
        return { success: false, message: 'Start and end dates are required.' };
    }
    // Attendance Overview does not require a specific employee
    const isAttendance = reportType === 'attendanceOverview';
    if (!isAttendance && !email) {
        return { success: false, message: 'Please select an employee.' };
    }
    const startStr = startDateISO + ' 00:00';
    const endStr = endDateISO + ' 23:59';
    const generatedAt = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy HH:mm');
    // ---- Employee Attendance Overview ----
    if (isAttendance) {
        const awsConfig = getAWSConfig();
        const empMap = {};
        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            if (r.clockIn < startStr || r.clockIn > endStr)
                continue;
            if (!r.email)
                continue;
            if (!empMap[r.email]) {
                empMap[r.email] = { daysSet: {}, totalHours: 0, rtHours: 0, otHours: 0, longest: 0, longestDate: '', shortest: Infinity, shortestDate: '', entryCount: 0 };
            }
            const day = r.clockIn.substring(0, 10);
            if (!empMap[r.email].daysSet[day])
                empMap[r.email].daysSet[day] = 0;
            const h = r.hours || 0;
            empMap[r.email].daysSet[day] += h;
            empMap[r.email].totalHours += h;
            empMap[r.email].entryCount++;
        }
        // Derive longest/shortest + RT/OT from aggregated daily totals
        const empEmails = Object.keys(empMap);
        for (let i = 0; i < empEmails.length; i++) {
            const em = empEmails[i];
            const d = empMap[em];
            const awsEntry = awsConfig[em];
            const days = Object.keys(d.daysSet);
            for (let j = 0; j < days.length; j++) {
                const dayTotal = d.daysSet[days[j]];
                // Determine if employee was AWS on this day
                const isAWS = awsEntry && awsEntry.enabled && awsEntry.effectiveDate && days[j] >= awsEntry.effectiveDate;
                const dailyCap = isAWS ? 10 : 8;
                const dayRT = Math.min(dayTotal, dailyCap);
                const dayOT = Math.max(dayTotal - dailyCap, 0);
                d.rtHours += dayRT;
                d.otHours += dayOT;
                if (dayTotal > d.longest) {
                    d.longest = dayTotal;
                    d.longestDate = days[j];
                }
                if (dayTotal > 0 && dayTotal < d.shortest) {
                    d.shortest = dayTotal;
                    d.shortestDate = days[j];
                }
            }
        }
        const emailKeys = Object.keys(empMap).sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        if (emailKeys.length === 0) {
            return { success: false, message: 'No entries found in the selected date range.' };
        }
        // Calculate expected hours: inclusive day count / 7 * 40
        const startDt = new Date(startDateISO + 'T00:00:00');
        const endDt = new Date(endDateISO + 'T00:00:00');
        const inclusiveDays = Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1;
        const weeks = Math.round((inclusiveDays / 7) * 100) / 100;
        const expectedHours = Math.round((weeks * 40) * 100) / 100;
        const entries = emailKeys.map(function (em) {
            const d = empMap[em];
            const daysWorked = Object.keys(d.daysSet).length;
            const rt = Math.round(d.rtHours * 100) / 100;
            const ot = Math.round(d.otHours * 100) / 100;
            const attendancePct = expectedHours > 0 ? Math.round((rt / expectedHours) * 10000) / 100 : 0;
            return {
                employeeId: em.split('@')[0] || em,
                email: em,
                daysWorked: daysWorked,
                rtHours: rt,
                otHours: ot,
                totalHours: Math.round(d.totalHours * 100) / 100,
                attendancePct: attendancePct,
                avgDaily: daysWorked > 0 ? Math.round((d.totalHours / daysWorked) * 100) / 100 : 0,
                longest: Math.round(d.longest * 100) / 100,
                longestDate: d.longestDate ? d.longestDate.substring(5).replace('-', '/') : '',
                shortest: d.shortest === Infinity ? 0 : Math.round(d.shortest * 100) / 100,
                shortestDate: d.shortestDate ? d.shortestDate.substring(5).replace('-', '/') : ''
            };
        });
        let grandRT = 0;
        let grandOT = 0;
        entries.forEach(function (e) { grandRT += e.rtHours; grandOT += e.otHours; });
        Logger.log('runReport: attendance overview for %s employees', entries.length);
        debugLog('runReport attendanceOverview complete', {
            employeesCount: entries.length,
            grandRTHours: Math.round(grandRT * 100) / 100,
            grandOTHours: Math.round(grandOT * 100) / 100,
            durationMs: Date.now() - startMs
        });
        return {
            success: true,
            reportType: reportType,
            reportLabel: 'Employee Attendance Overview',
            employeeEmail: 'all',
            employeeId: 'All Employees',
            generatedAt: generatedAt,
            startDate: startDateISO,
            endDate: endDateISO,
            entries: entries,
            totalEntries: entries.length,
            totalHours: Math.round((grandRT + grandOT) * 100) / 100,
            totalRT: Math.round(grandRT * 100) / 100,
            totalOT: Math.round(grandOT * 100) / 100,
            expectedHours: expectedHours,
            weeks: weeks,
            earliestShift: '',
            latestShift: ''
        };
    }
    // ---- Filter records for single employee ----
    const filtered = [];
    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.email !== email)
            continue;
        if (r.clockIn < startStr || r.clockIn > endStr)
            continue;
        filtered.push(r);
    }
    filtered.sort(function (a, b) {
        return a.clockIn < b.clockIn ? -1 : a.clockIn > b.clockIn ? 1 : 0;
    });
    if (filtered.length === 0) {
        return { success: false, message: 'No entries found for ' + email + ' in the selected date range.' };
    }
    const localPart = email.split('@')[0] || email;
    // ---- Daily Hours Summary ----
    if (reportType === 'dailyHoursSummary') {
        const dayMap = {};
        for (let i = 0; i < filtered.length; i++) {
            const r = filtered[i];
            const day = r.clockIn.substring(0, 10);
            if (!dayMap[day]) {
                dayMap[day] = { totalHours: 0, count: 0, firstIn: r.clockIn, lastOut: '', allNotes: [] };
            }
            dayMap[day].totalHours += r.hours || 0;
            dayMap[day].count++;
            if (r.clockIn < dayMap[day].firstIn)
                dayMap[day].firstIn = r.clockIn;
            const co = r.clockOut || '';
            if (co > dayMap[day].lastOut)
                dayMap[day].lastOut = co;
            if (r.notes)
                dayMap[day].allNotes.push(r.notes);
        }
        const sortedDays = Object.keys(dayMap).sort();
        let totalHours = 0;
        const entries = sortedDays.map(function (day) {
            const d = dayMap[day];
            totalHours += d.totalHours;
            const dp = day.split('-');
            return {
                date: dp[1] + '/' + dp[2] + '/' + dp[0],
                totalHours: Math.round(d.totalHours * 100) / 100,
                entryCount: d.count,
                firstIn: d.firstIn.split(' ')[1] || '',
                lastOut: d.lastOut ? d.lastOut.split(' ')[1] || '' : '',
                overtime: d.totalHours > 8,
                notes: d.allNotes.join('; ')
            };
        });
        const earliest = entries[0].date + ' ' + entries[0].firstIn;
        const latestE = entries[entries.length - 1];
        const latest = latestE.date + ' ' + (latestE.lastOut || latestE.firstIn);
        Logger.log('runReport: daily summary %s days for %s', entries.length, email);
        debugLog('runReport dailyHoursSummary complete', {
            email: email,
            daysCount: entries.length,
            totalHours: Math.round(totalHours * 100) / 100,
            durationMs: Date.now() - startMs
        });
        return {
            success: true,
            reportType: reportType,
            reportLabel: 'Daily Hours Summary',
            employeeEmail: email,
            employeeId: localPart,
            generatedAt: generatedAt,
            startDate: startDateISO,
            endDate: endDateISO,
            entries: entries,
            totalEntries: entries.length,
            totalHours: Math.round(totalHours * 100) / 100,
            earliestShift: earliest,
            latestShift: latest
        };
    }
    // ---- Time Clock Summary (default) ----
    let totalHours = 0;
    const entries = filtered.map(function (r) {
        totalHours += r.hours || 0;
        const ciParts = r.clockIn.split(' ');
        const dateParts = ciParts[0].split('-');
        const dateDisplay = dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0];
        return {
            date: dateDisplay,
            dateKey: ciParts[0],
            clockIn: ciParts.length > 1 ? ciParts[1] : '',
            clockOut: r.clockOut ? r.clockOut.split(' ')[1] || '' : '',
            hours: r.hours ? r.hours.toFixed(2) : '',
            notes: r.notes || ''
        };
    });
    const earliestShift = entries[0].date + ' ' + entries[0].clockIn;
    const latestEntry = entries[entries.length - 1];
    const latestShift = latestEntry.date + ' ' + latestEntry.clockIn;
    Logger.log('runReport: %s entries for %s', entries.length, email);
    debugLog('runReport complete', {
        reportType: reportType,
        email: email,
        entriesCount: entries.length,
        totalHours: Math.round(totalHours * 100) / 100,
        durationMs: Date.now() - startMs
    });
    return {
        success: true,
        reportType: reportType,
        reportLabel: 'Time Clock Summary',
        employeeEmail: email,
        employeeId: localPart,
        generatedAt: generatedAt,
        startDate: startDateISO,
        endDate: endDateISO,
        entries: entries,
        totalEntries: entries.length,
        totalHours: Math.round(totalHours * 100) / 100,
        earliestShift: earliestShift,
        latestShift: latestShift
    };
}
/**
 * Export the report as a PDF and save to the same Drive folder as the spreadsheet.
 * @param htmlContent The rendered HTML string for the report
 * @param reportLabel Human-readable report name
 * @param employeeId Local part of employee email
 * @returns Object with success, message, and driveUrl
 */
function exportReportPdf(htmlContent, reportLabel, employeeId, startDate, endDate) {
    const startMs = Date.now();
    const tz = Session.getScriptTimeZone();
    if (!htmlContent) {
        return { success: false, message: 'No report content to export.' };
    }
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const parentFile = DriveApp.getFileById(ss.getId());
        const parentFolders = parentFile.getParents();
        if (!parentFolders.hasNext()) {
            return { success: false, message: 'Parent folder not found.' };
        }
        const parentFolder = parentFolders.next();
        const runDateStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
        const safeName = (reportLabel || 'Report').replace(/[^a-zA-Z0-9 _-]/g, '');
        const safeId = (employeeId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '');
        const safeStart = (startDate || '').replace(/[^0-9-]/g, '');
        const safeEnd = (endDate || '').replace(/[^0-9-]/g, '');
        const rangeStr = safeStart && safeEnd ? safeStart + '_to_' + safeEnd : '';
        const fileName = safeName + '_' + safeId + (rangeStr ? '_' + rangeStr : '') + '_' + runDateStr;
        const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', fileName + '.html')
            .getAs('application/pdf')
            .setName(fileName + '.pdf');
        const pdfFile = parentFolder.createFile(pdfBlob);
        const driveUrl = pdfFile.getUrl();
        Logger.log('exportReportPdf: saved %s', fileName);
        debugLog('exportReportPdf complete', {
            fileName: fileName + '.pdf',
            driveUrl: driveUrl,
            durationMs: Date.now() - startMs
        });
        return { success: true, message: 'Report saved as ' + fileName + '.pdf', driveUrl: driveUrl };
    }
    catch (e) {
        Logger.log('exportReportPdf: error=%s', e.message);
        return { success: false, message: 'PDF export failed: ' + e.message };
    }
}
/**
 * Returns HTML for the Create Report UI so the web app can render it in a modal frame.
 */
function getCreateReportDialogHtml() {
    const startMs = Date.now();
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 14px; margin: 0; font-size: 14px; }
          h3 { margin: 0 0 12px; }
          .form-group { margin: 10px 0; }
          label { display: block; font-weight: bold; margin-bottom: 4px; }
          select, input[type="date"] { width: 100%; padding: 8px; font-size: 14px; }
          button { padding: 10px 18px; margin: 4px 4px 0 0; cursor: pointer; font-size: 14px; border: none; border-radius: 4px; }
          .primary { background: #1a73e8; color: #fff; }
          .primary:disabled { background: #ccc; cursor: not-allowed; }
          .secondary { background: #e0e0e0; color: #333; }
          .danger { background: #d32f2f; color: white; }
          .mini { padding: 6px 10px; font-size: 12px; margin: 0 0 0 8px; }
          .error { color: #d32f2f; margin-top: 8px; display: none; }
          .info { color: #666; font-size: 12px; margin-top: 4px; }
          .success { color: #2e7d32; font-weight: bold; margin-top: 8px; display: none; }
          .success a { color: #1a73e8; }
          .loading { text-align: center; color: #999; padding: 20px 0; }
          .presets { margin: 6px 0; }
          .presets button { padding: 4px 10px; font-size: 11px; margin: 2px 4px 2px 0; background: #e8f0fe; color: #1a73e8; border-radius: 12px; }
          .presets button:hover { background: #d2e3fc; }
          .inline-row { display: flex; align-items: center; gap: 8px; }
          #selectionView, #reportView { display: none; }

          /* Summary strip */
          .summary-strip { background: #e8f0fe; padding: 10px 12px; border-radius: 6px; margin: 10px 0; font-size: 13px; display: flex; flex-wrap: wrap; gap: 16px; }
          .summary-strip .stat { display: flex; flex-direction: column; }
          .summary-strip .stat-label { color: #555; font-size: 11px; text-transform: uppercase; }
          .summary-strip .stat-value { font-weight: bold; color: #1a73e8; }

          /* Report table */
          .report-header { margin: 10px 0 4px; }
          .report-header h3 { margin: 0; }
          .report-header .sub { color: #666; font-size: 12px; }
          .report-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
          .report-table th { background: #1a73e8; color: #fff; padding: 8px 6px; text-align: left; font-size: 12px; }
          .report-table td { padding: 6px; border-bottom: 1px solid #e0e0e0; }
          .report-table .day-even td { background: #f5f5f5; }
          .report-table .day-odd td { background: #ffffff; }
          .report-table .ot-flag { color: #d32f2f; font-weight: bold; }
          .report-table .hours { text-align: right; font-family: 'Roboto Mono', monospace; }
          .report-table .time { font-family: 'Roboto Mono', monospace; font-weight: bold; }
          .report-table .notes { color: #555; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          .action-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
          .sticky-top { position: sticky; top: 0; background: #fff; z-index: 1; padding: 6px 0; border-bottom: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div id="loadingView" class="loading">Loading report data...</div>

        <!-- ===== SELECTION VIEW ===== -->
        <div id="selectionView">
          <h3>Create Report</h3>

          <div class="form-group">
            <label for="reportType">Report Type</label>
            <select id="reportType"></select>
          </div>

          <div class="form-group">
            <label>Date Range</label>
            <div class="presets" id="datePresets"></div>
            <div class="inline-row" style="margin-top:6px;">
              <input type="date" id="startDate" style="flex:1;">
              <span>to</span>
              <input type="date" id="endDate" style="flex:1;">
            </div>
            <div class="info" id="dateRangeInfo">Select date range for the report.</div>
            <div class="info" style="color:#999;">Start time fixed at 00:00, end time fixed at 23:59.</div>
          </div>

          <div class="form-group" id="employeeGroup">
            <label for="employee">Employee</label>
            <select id="employee">
              <option value="">Select date range first...</option>
            </select>
          </div>

          <div class="error" id="selError"></div>

          <div>
            <button class="primary" id="runBtn" onclick="handleRunReport()" disabled>Run Report</button>
            <button class="secondary mini" id="refreshBtn" onclick="handleRefreshData()">Refresh Data</button>
            <button class="secondary" onclick="google.script.host.close()">Close</button>
          </div>
        </div>

        <!-- ===== REPORT VIEW ===== -->
        <div id="reportView">
          <div class="sticky-top">
            <div class="action-row">
              <button class="primary" id="exportTopBtn" onclick="handleExportPdf()">Export PDF</button>
              <button class="secondary" onclick="handleNewReport()">Run New Report</button>
              <button class="secondary" onclick="google.script.host.close()">Close</button>
              <span class="success" id="exportTopMsg"></span>
            </div>
          </div>

          <div class="report-header">
            <h3 id="reportTitle"></h3>
            <div class="sub" id="reportSub"></div>
          </div>

          <div class="summary-strip" id="summaryStrip"></div>

          <div id="reportTableContainer"></div>

          <div class="action-row" style="margin-top: 12px;">
            <button class="primary" id="exportBottomBtn" onclick="handleExportPdf()">Export PDF</button>
            <button class="secondary" onclick="handleNewReport()">Run New Report</button>
            <span class="success" id="exportBottomMsg"></span>
          </div>
        </div>

        <script>
          var cachedRecords = [];
          var cachedMinDate = '';
          var cachedMaxDate = '';
          var lastReportResult = null;

          // ---- Initialization ----
          window.addEventListener('load', function() {
            loadBootstrapData();
          });

          function loadBootstrapData() {
            showView('loading');
            google.script.run
              .withSuccessHandler(function(data) {
                if (!data || !data.success) {
                  showSelectionError(data ? data.message : 'Failed to load data.');
                  showView('selection');
                  return;
                }
                cachedRecords = data.records || [];
                cachedMinDate = data.minDate || '';
                cachedMaxDate = data.maxDate || '';

                populateReportTypes(data.reportTypes || []);
                applyDateConstraints();
                buildDatePresets();
                updateEmployeeList();
                showView('selection');
              })
              .withFailureHandler(function(err) {
                showSelectionError('Failed to load data: ' + (err.message || err));
                showView('selection');
              })
              .getReportBootstrapData();
          }

          function handleRefreshData() {
            document.getElementById('refreshBtn').disabled = true;
            loadBootstrapData();
          }

          // ---- View management ----
          function showView(view) {
            document.getElementById('loadingView').style.display = view === 'loading' ? 'block' : 'none';
            document.getElementById('selectionView').style.display = view === 'selection' ? 'block' : 'none';
            document.getElementById('reportView').style.display = view === 'report' ? 'block' : 'none';
            if (view === 'selection') {
              document.getElementById('refreshBtn').disabled = false;
            }
          }

          // ---- Selection helpers ----
          function populateReportTypes(types) {
            var sel = document.getElementById('reportType');
            sel.innerHTML = '';
            types.forEach(function(t) {
              var opt = document.createElement('option');
              opt.value = t.value;
              opt.textContent = t.label;
              sel.appendChild(opt);
            });
            sel.addEventListener('change', handleReportTypeChange);
          }

          function handleReportTypeChange() {
            var rt = document.getElementById('reportType').value;
            var empGroup = document.getElementById('employeeGroup');
            if (rt === 'attendanceOverview') {
              empGroup.style.display = 'none';
              document.getElementById('employee').value = '__all__';
            } else {
              empGroup.style.display = 'block';
              if (document.getElementById('employee').value === '__all__') {
                document.getElementById('employee').value = '';
              }
            }
            validateRunBtn();
          }

          function applyDateConstraints() {
            var startInput = document.getElementById('startDate');
            var endInput = document.getElementById('endDate');
            startInput.min = cachedMinDate;
            startInput.max = cachedMaxDate;
            endInput.min = cachedMinDate;
            endInput.max = cachedMaxDate;
            startInput.value = cachedMinDate;
            endInput.value = cachedMaxDate;

            var info = document.getElementById('dateRangeInfo');
            if (cachedMinDate && cachedMaxDate) {
              info.textContent = 'Data available from ' + formatDateDisplay(cachedMinDate) + ' to ' + formatDateDisplay(cachedMaxDate) + '.';
              info.style.color = '#1a73e8';
            } else {
              info.textContent = 'No date data available.';
              info.style.color = '#d32f2f';
            }

            startInput.addEventListener('change', function() {
              updateEmployeeList();
              validateRunBtn();
            });
            endInput.addEventListener('change', function() {
              updateEmployeeList();
              validateRunBtn();
            });
          }

          function buildDatePresets() {
            var container = document.getElementById('datePresets');
            container.innerHTML = '';
            if (!cachedMaxDate) return;

            var maxParts = cachedMaxDate.split('-');
            var maxD = new Date(parseInt(maxParts[0]), parseInt(maxParts[1]) - 1, parseInt(maxParts[2]));

            var presets = [
              { label: 'Last 7 Days', days: 6 },
              { label: 'Last 14 Days', days: 13 },
              { label: 'Last 30 Days', days: 29 },
              { label: 'Month to Date', mtd: true },
              { label: 'All Data', all: true }
            ];

            presets.forEach(function(p) {
              var btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = p.label;
              btn.addEventListener('click', function() {
                var endVal = cachedMaxDate;
                var startVal;
                if (p.all) {
                  startVal = cachedMinDate;
                } else if (p.mtd) {
                  var mtdStart = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
                  startVal = toISO(mtdStart);
                } else {
                  var d = new Date(maxD);
                  d.setDate(d.getDate() - p.days);
                  startVal = toISO(d);
                }
                if (startVal < cachedMinDate) startVal = cachedMinDate;
                document.getElementById('startDate').value = startVal;
                document.getElementById('endDate').value = endVal;
                updateEmployeeList();
                validateRunBtn();
              });
              container.appendChild(btn);
            });
          }

          function updateEmployeeList() {
            var startVal = document.getElementById('startDate').value;
            var endVal = document.getElementById('endDate').value;
            var sel = document.getElementById('employee');
            var prevVal = sel.value;

            if (!startVal || !endVal || !cachedRecords.length) {
              sel.innerHTML = '<option value="">Select date range first...</option>';
              validateRunBtn();
              return;
            }

            var startStr = startVal + ' 00:00';
            var endStr = endVal + ' 23:59';
            var emailSet = {};
            for (var i = 0; i < cachedRecords.length; i++) {
              var ci = cachedRecords[i].clockIn;
              if (ci >= startStr && ci <= endStr && cachedRecords[i].email) {
                emailSet[cachedRecords[i].email] = true;
              }
            }

            var emails = Object.keys(emailSet).sort(function(a, b) {
              return a.toLowerCase().localeCompare(b.toLowerCase());
            });

            sel.innerHTML = '<option value="">Select employee (' + emails.length + ' available)...</option>';
            emails.forEach(function(e) {
              var opt = document.createElement('option');
              opt.value = e;
              opt.textContent = e;
              if (e === prevVal) opt.selected = true;
              sel.appendChild(opt);
            });

            sel.onchange = function() { validateRunBtn(); };
            validateRunBtn();
          }

          function validateRunBtn() {
            var rt = document.getElementById('reportType').value;
            var isAttendance = rt === 'attendanceOverview';
            var ok = document.getElementById('startDate').value &&
                     document.getElementById('endDate').value &&
                     rt &&
                     (isAttendance || document.getElementById('employee').value);
            document.getElementById('runBtn').disabled = !ok;
          }

          function showSelectionError(msg) {
            var el = document.getElementById('selError');
            el.textContent = msg;
            el.style.display = msg ? 'block' : 'none';
          }

          // ---- Run Report ----
          function handleRunReport() {
            showSelectionError('');
            var reportType = document.getElementById('reportType').value;
            var startDate = document.getElementById('startDate').value;
            var endDate = document.getElementById('endDate').value;
            var isAttendance = reportType === 'attendanceOverview';
            var email = isAttendance ? '__all__' : document.getElementById('employee').value;

            if (endDate < startDate) {
              showSelectionError('End date must be on or after start date.');
              return;
            }

            document.getElementById('runBtn').disabled = true;
            document.getElementById('runBtn').textContent = 'Running...';

            google.script.run
              .withSuccessHandler(function(result) {
                document.getElementById('runBtn').disabled = false;
                document.getElementById('runBtn').textContent = 'Run Report';
                if (!result || !result.success) {
                  showSelectionError(result ? result.message : 'Report generation failed.');
                  return;
                }
                lastReportResult = result;
                renderReport(result);
                showView('report');
              })
              .withFailureHandler(function(err) {
                document.getElementById('runBtn').disabled = false;
                document.getElementById('runBtn').textContent = 'Run Report';
                showSelectionError('Error: ' + (err.message || err));
              })
              .runReport(cachedRecords, reportType, startDate, endDate, email);
          }

          // ---- Render Report ----
          function renderReport(result) {
            document.getElementById('reportTitle').textContent = result.reportLabel + ' — ' + result.employeeId;
            document.getElementById('reportSub').textContent =
              'Period: ' + formatDateDisplay(result.startDate) + ' to ' + formatDateDisplay(result.endDate) +
              '  |  Generated: ' + result.generatedAt;

            var strip = document.getElementById('summaryStrip');
            var summaryHtml = statHtml('Total Entries', result.totalEntries) +
              statHtml('Total Hours', result.totalHours.toFixed(2));
            if (result.reportType === 'attendanceOverview') {
              summaryHtml += statHtml('Weeks', result.weeks) +
                statHtml('Expected RT', result.expectedHours.toFixed(2));
            }
            if (result.earliestShift) summaryHtml += statHtml('Earliest Shift', result.earliestShift);
            if (result.latestShift) summaryHtml += statHtml('Latest Shift', result.latestShift);
            strip.innerHTML = summaryHtml;

            var tableHtml = '';
            if (result.reportType === 'attendanceOverview') {
              tableHtml = renderAttendanceTable(result);
            } else if (result.reportType === 'dailyHoursSummary') {
              tableHtml = renderDailyHoursTable(result);
            } else {
              tableHtml = renderTimeClockTable(result);
            }

            document.getElementById('reportTableContainer').innerHTML = tableHtml;

            // Reset export messages
            document.getElementById('exportTopMsg').style.display = 'none';
            document.getElementById('exportBottomMsg').style.display = 'none';
            document.getElementById('exportTopBtn').disabled = false;
            document.getElementById('exportBottomBtn').disabled = false;
          }

          function renderTimeClockTable(result) {
            var html = '<table class="report-table"><thead><tr>' +
              '<th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Notes</th>' +
              '</tr></thead><tbody>';
            var prevDate = '';
            var dayIdx = 0;
            result.entries.forEach(function(e) {
              var dk = e.dateKey || e.date;
              if (dk !== prevDate) { dayIdx++; prevDate = dk; }
              var cls = dayIdx % 2 === 0 ? 'day-even' : 'day-odd';
              html += '<tr class="' + cls + '">' +
                '<td>' + esc(e.date) + '</td>' +
                '<td class="time">' + esc(e.clockIn) + '</td>' +
                '<td class="time">' + esc(e.clockOut) + '</td>' +
                '<td class="hours">' + esc(e.hours) + '</td>' +
                '<td class="notes" title="' + esc(e.notes) + '">' + esc(e.notes) + '</td></tr>';
            });
            html += '<tr style="font-weight:bold; background:#e8f0fe;">' +
              '<td colspan="3" style="text-align:right;">Total</td>' +
              '<td class="hours">' + result.totalHours.toFixed(2) + '</td><td></td></tr>';
            return html + '</tbody></table>';
          }

          function renderDailyHoursTable(result) {
            var html = '<table class="report-table"><thead><tr>' +
              '<th>Date</th><th>Total Hours</th><th>Entries</th><th>First In</th><th>Last Out</th><th>Notes</th>' +
              '</tr></thead><tbody>';
            result.entries.forEach(function(e, i) {
              var cls = i % 2 === 0 ? 'day-even' : 'day-odd';
              var otMark = e.overtime ? ' <span class="ot-flag">OT</span>' : '';
              html += '<tr class="' + cls + '">' +
                '<td>' + esc(e.date) + '</td>' +
                '<td class="hours">' + e.totalHours.toFixed(2) + otMark + '</td>' +
                '<td style="text-align:center;">' + e.entryCount + '</td>' +
                '<td class="time">' + esc(e.firstIn) + '</td>' +
                '<td class="time">' + esc(e.lastOut) + '</td>' +
                '<td class="notes" title="' + esc(e.notes) + '">' + esc(e.notes) + '</td></tr>';
            });
            html += '<tr style="font-weight:bold; background:#e8f0fe;">' +
              '<td style="text-align:right;">Total</td>' +
              '<td class="hours">' + result.totalHours.toFixed(2) + '</td>' +
              '<td colspan="4"></td></tr>';
            return html + '</tbody></table>';
          }

          function renderAttendanceTable(result) {
            var html = '<table class="report-table"><thead><tr>' +
              '<th>Employee</th><th>Days Worked</th><th>RT Hours</th><th>OT Hours</th><th>Attendance</th><th>Avg Daily</th><th>Longest Day</th><th>Shortest Day</th>' +
              '</tr></thead><tbody>';
            result.entries.forEach(function(e, i) {
              var cls = i % 2 === 0 ? 'day-even' : 'day-odd';
              var aColor = e.attendancePct >= 90 ? '#2e7d32' : e.attendancePct >= 80 ? '#f9a825' : '#d32f2f';
              html += '<tr class="' + cls + '">' +
                '<td>' + esc(e.employeeId) + '</td>' +
                '<td style="text-align:center;">' + e.daysWorked + '</td>' +
                '<td class="hours">' + e.rtHours.toFixed(2) + '</td>' +
                '<td class="hours">' + e.otHours.toFixed(2) + '</td>' +
                '<td class="hours" style="color:' + aColor + '; font-weight:bold;">' + e.attendancePct.toFixed(2) + '%</td>' +
                '<td class="hours">' + e.avgDaily.toFixed(2) + '</td>' +
                '<td class="hours">' + e.longest.toFixed(2) + (e.longestDate ? ' <span style="color:#666;font-size:0.85em;">(' + esc(e.longestDate) + ')</span>' : '') + '</td>' +
                '<td class="hours">' + e.shortest.toFixed(2) + (e.shortestDate ? ' <span style="color:#666;font-size:0.85em;">(' + esc(e.shortestDate) + ')</span>' : '') + '</td></tr>';
            });
            html += '<tr style="font-weight:bold; background:#e8f0fe;">' +
              '<td style="text-align:right;">Total</td>' +
              '<td></td><td class="hours">' + (result.totalRT || 0).toFixed(2) + '</td>' +
              '<td class="hours">' + (result.totalOT || 0).toFixed(2) + '</td>' +
              '<td colspan="4"></td></tr>';
            return html + '</tbody></table>';
          }

          // ---- Export PDF ----
          function handleExportPdf() {
            if (!lastReportResult) return;
            document.getElementById('exportTopBtn').disabled = true;
            document.getElementById('exportBottomBtn').disabled = true;
            document.getElementById('exportTopMsg').textContent = 'Exporting...';
            document.getElementById('exportTopMsg').style.display = 'inline';
            document.getElementById('exportTopMsg').style.color = '#666';
            document.getElementById('exportBottomMsg').textContent = 'Exporting...';
            document.getElementById('exportBottomMsg').style.display = 'inline';
            document.getElementById('exportBottomMsg').style.color = '#666';

            var pdfHtml = buildPdfHtml(lastReportResult);

            google.script.run
              .withSuccessHandler(function(res) {
                document.getElementById('exportTopBtn').disabled = false;
                document.getElementById('exportBottomBtn').disabled = false;
                if (res && res.success) {
                  var msg = res.message + ' <a href="' + res.driveUrl + '" target="_blank">Open in Drive</a>';
                  showExportSuccess(msg);
                } else {
                  showExportSuccess(res ? res.message : 'Export failed.', true);
                }
              })
              .withFailureHandler(function(err) {
                document.getElementById('exportTopBtn').disabled = false;
                document.getElementById('exportBottomBtn').disabled = false;
                showExportSuccess('Export error: ' + (err.message || err), true);
              })
              .exportReportPdf(pdfHtml, lastReportResult.reportLabel, lastReportResult.employeeId, lastReportResult.startDate, lastReportResult.endDate);
          }

          function showExportSuccess(htmlMsg, isError) {
            ['exportTopMsg', 'exportBottomMsg'].forEach(function(id) {
              var el = document.getElementById(id);
              el.innerHTML = htmlMsg;
              el.style.display = 'inline';
              el.style.color = isError ? '#d32f2f' : '#2e7d32';
            });
          }

          function buildPdfHtml(r) {
            var css = 'body{font-family:Arial,sans-serif;padding:20px;font-size:12px;}' +
              'h2{margin:0 0 4px;}' +
              '.sub{color:#666;font-size:11px;margin-bottom:12px;}' +
              '.summary{background:#e8f0fe;padding:8px 12px;border-radius:4px;margin-bottom:12px;font-size:11px;}' +
              '.summary b{color:#1a73e8;}' +
              'table{width:100%;border-collapse:collapse;font-size:11px;}' +
              'th{background:#1a73e8;color:#fff;padding:6px;text-align:left;}' +
              'td{padding:5px 6px;border-bottom:1px solid #ddd;}' +
              '.day-even td{background:#f5f5f5;}.day-odd td{background:#fff;}' +
              '.hours{text-align:right;font-family:monospace;}' +
              '.time{font-family:monospace;font-weight:bold;}' +
              '.total{font-weight:bold;background:#e8f0fe;}' +
              '.ot-flag{color:#d32f2f;font-weight:bold;}';

            var subHeaderHtml = '<div class="sub">' +
              'Period: ' + formatDateDisplay(r.startDate) + ' to ' + formatDateDisplay(r.endDate) +
              '  |  Generated: ' + esc(r.generatedAt) +
              '</div>';

            var header = '<h2>' + esc(r.reportLabel) + ' — ' + esc(r.employeeId) + '</h2>' +
              subHeaderHtml +
              '<div class="summary">Entries: <b>' + r.totalEntries + '</b> &nbsp; Total Hours: <b>' + r.totalHours.toFixed(2) + '</b>';
            if (r.reportType === 'attendanceOverview') {
              header += ' &nbsp; Weeks: <b>' + r.weeks + '</b> &nbsp; Expected RT: <b>' + r.expectedHours.toFixed(2) + '</b>';
            }
            if (r.earliestShift) header += ' &nbsp; Earliest: <b>' + esc(r.earliestShift) + '</b>';
            if (r.latestShift) header += ' &nbsp; Latest: <b>' + esc(r.latestShift) + '</b>';
            header += '</div>';

            var body = '';
            if (r.reportType === 'attendanceOverview') {
              body = '<table><thead><tr><th>Employee</th><th>Days Worked</th><th>RT Hours</th><th>OT Hours</th><th>Attendance</th><th>Avg Daily</th><th>Longest Day</th><th>Shortest Day</th></tr></thead><tbody>';
              r.entries.forEach(function(e, i) {
                var cls = i % 2 === 0 ? 'day-even' : 'day-odd';
                var aColor = e.attendancePct >= 90 ? '#2e7d32' : e.attendancePct >= 80 ? '#f9a825' : '#d32f2f';
                body += '<tr class="' + cls + '"><td>' + esc(e.employeeId) + '</td><td style="text-align:center;">' + e.daysWorked +
                  '</td><td class="hours">' + e.rtHours.toFixed(2) + '</td><td class="hours">' + e.otHours.toFixed(2) +
                  '</td><td class="hours" style="color:' + aColor + '; font-weight:bold;">' + e.attendancePct.toFixed(2) + '%</td><td class="hours">' + e.avgDaily.toFixed(2) +
                  '</td><td class="hours">' + e.longest.toFixed(2) + (e.longestDate ? ' <span style="color:#666;font-size:0.85em;">(' + esc(e.longestDate) + ')</span>' : '') + '</td><td class="hours">' + e.shortest.toFixed(2) + (e.shortestDate ? ' <span style="color:#666;font-size:0.85em;">(' + esc(e.shortestDate) + ')</span>' : '') + '</td></tr>';
              });
              body += '<tr class="total"><td style="text-align:right;">Total</td><td></td><td class="hours">' + (r.totalRT || 0).toFixed(2) + '</td><td class="hours">' + (r.totalOT || 0).toFixed(2) + '</td><td colspan="4"></td></tr></tbody></table>';
            } else if (r.reportType === 'dailyHoursSummary') {
              body = '<table><thead><tr><th>Date</th><th>Total Hours</th><th>Entries</th><th>First In</th><th>Last Out</th><th>Notes</th></tr></thead><tbody>';
              r.entries.forEach(function(e, i) {
                var cls = i % 2 === 0 ? 'day-even' : 'day-odd';
                var ot = e.overtime ? ' <span class="ot-flag">OT</span>' : '';
                body += '<tr class="' + cls + '"><td>' + esc(e.date) + '</td><td class="hours">' + e.totalHours.toFixed(2) + ot +
                  '</td><td style="text-align:center;">' + e.entryCount + '</td><td class="time">' + esc(e.firstIn) +
                  '</td><td class="time">' + esc(e.lastOut) + '</td><td>' + esc(e.notes) + '</td></tr>';
              });
              body += '<tr class="total"><td style="text-align:right;">Total</td><td class="hours">' + r.totalHours.toFixed(2) + '</td><td colspan="4"></td></tr></tbody></table>';
            } else {
              body = '<table><thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Notes</th></tr></thead><tbody>';
              var prevDate = ''; var dayIdx = 0;
              r.entries.forEach(function(e) {
                var dk = e.dateKey || e.date;
                if (dk !== prevDate) { dayIdx++; prevDate = dk; }
                var cls = dayIdx % 2 === 0 ? 'day-even' : 'day-odd';
                body += '<tr class="' + cls + '"><td>' + esc(e.date) + '</td><td class="time">' + esc(e.clockIn) +
                  '</td><td class="time">' + esc(e.clockOut) + '</td><td class="hours">' + esc(e.hours) +
                  '</td><td>' + esc(e.notes) + '</td></tr>';
              });
              body += '<tr class="total"><td colspan="3" style="text-align:right;">Total</td><td class="hours">' + r.totalHours.toFixed(2) + '</td><td></td></tr></tbody></table>';
            }

            return '<!DOCTYPE html><html><head><style>' + css + '</style></head><body>' + header + body + '</body></html>';
          }

          // ---- New Report ----
          function handleNewReport() {
            showView('selection');
          }

          // ---- Utilities ----
          function toISO(d) {
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          }
          function formatDateDisplay(isoStr) {
            if (!isoStr) return '';
            var p = isoStr.split('-');
            return p.length === 3 ? p[1] + '/' + p[2] + '/' + p[0] : isoStr;
          }
          function statHtml(label, value) {
            return '<div class="stat"><span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span></div>';
          }
          function esc(s) {
            if (!s && s !== 0) return '';
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          }
        </script>
      </body>
    </html>
  `;
    Logger.log('getCreateReportDialogHtml: generated report dialog html');
    debugLog('getCreateReportDialogHtml complete', { durationMs: Date.now() - startMs });
    return html;
}
