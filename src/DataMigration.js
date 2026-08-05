/**
 * One-time data migration from old schema (v1.x) to new database-only schema (v2.0).
 * Idempotent: safe to run multiple times. Reports already-migrated state on rerun.
 * Run from Payroll Tools → 🔧 Run Data Migration immediately after deploying v2.0 code.
 */
function runDataMigration() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    const currentVersion = getSetting(MIGRATION_VERSION_KEY, '');
    const v2Issues = getMigrationV2Issues(ss);
    if (currentVersion === MIGRATION_VERSION) {
        if (v2Issues.length === 0) {
            ui.alert('ℹ️ Already Migrated', 'Migration ' + MIGRATION_VERSION + ' has already been applied.', ui.ButtonSet.OK);
            return;
        }
        const repairConfirm = ui.alert('🔧 Migration Repair Needed', 'Migration ' + MIGRATION_VERSION + ' is stamped, but some items are incomplete:\n• ' + v2Issues.join('\n• ') + '\n\nRun migration repair now?', ui.ButtonSet.YES_NO);
        if (repairConfirm !== ui.Button.YES)
            return;
    }
    const confirm = ui.alert('🔧 Run Data Migration ' + MIGRATION_VERSION, 'This will:\n• Clear formatting and data validations from DataEntry/Archive/AdminUsers\n• Delete the legacy Clock In Date column from DataEntry and Archive\n• Rewrite column headers to the new schema with Entry Type\n• Backfill legacy rows to Worked\n• Keep only Hours formulas (no visual styling reapplied)\n• Add Permissions column to AdminUsers\n• Delete PayrollPreview sheet if present\n• Remove legacy installable onEdit triggers\n• Remove stale transient script properties\n\nProceed?', ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES)
        return;
    const log = [];
    try {
        // DataEntry
        const dataEntry = ss.getSheetByName('DataEntry');
        if (dataEntry) {
            const lastRow = dataEntry.getLastRow();
            const lastCol = dataEntry.getLastColumn();
            if (lastRow > 0 && lastCol > 0) {
                const rng = dataEntry.getRange(1, 1, lastRow, lastCol);
                rng.clearFormat();
                rng.clearDataValidations();
            }
            normalizeDataEntryColumnsForMigration(dataEntry, log);
            dataEntry.setFrozenRows(1);
            const dataLastRow = dataEntry.getLastRow();
            if (dataLastRow > 1) {
                const typeValues = dataEntry.getRange(2, dataCol('ENTRY_TYPE'), dataLastRow - 1, 1).getValues();
                const normalizedTypes = typeValues.map(row => [normalizeEntryType(row[0])]);
                dataEntry.getRange(2, dataCol('ENTRY_TYPE'), dataLastRow - 1, 1).setValues(normalizedTypes);
                const entryIdValues = dataEntry.getRange(2, dataCol('ENTRY_ID'), dataLastRow - 1, 1).getValues();
                const nextEntryIds = entryIdValues.map(row => {
                    const existing = String(row[0] || '').trim();
                    return [existing || generateEntryId()];
                });
                dataEntry.getRange(2, dataCol('ENTRY_ID'), dataLastRow - 1, 1).setValues(nextEntryIds);
                const hoursFormulas = [];
                for (let r = 2; r <= dataLastRow; r++) {
                    hoursFormulas.push([`=IF(IF(H${r}<>"",H${r},C${r})<>"",(IF(H${r}<>"",H${r},C${r})-IF(G${r}<>"",G${r},B${r}))*24,"")`]);
                }
                dataEntry.getRange(2, 4, dataLastRow - 1, 1).setFormulas(hoursFormulas);
            }
            log.push('DataEntry: cleared formatting/validations, updated headers, backfilled Entry IDs, reapplied Hours formula');
        }
        else {
            log.push('DataEntry: sheet not found');
        }
        // Archive
        const archive = ss.getSheetByName('Archive');
        if (archive) {
            const lastRow = archive.getLastRow();
            const lastCol = archive.getLastColumn();
            if (lastRow > 0 && lastCol > 0) {
                const rng = archive.getRange(1, 1, lastRow, lastCol);
                rng.clearFormat();
                rng.clearDataValidations();
            }
            const headerRow = lastRow > 0 ? archive.getRange(1, 1, 1, archive.getLastColumn()).getValues()[0] : [];
            const col2Header = String(headerRow[1] || '').toLowerCase();
            if (col2Header.includes('clock in date')) {
                archive.deleteColumn(2);
                log.push('Archive: deleted legacy Clock In Date column');
            }
            normalizeArchiveColumnsForMigration(archive, log);
            archive.getRange(1, 1, 1, ARCHIVE_HEADERS.length).setValues([ARCHIVE_HEADERS]);
            archive.setFrozenRows(1);
            const archLastRow = archive.getLastRow();
            if (archLastRow > 1) {
                const typeValues = archive.getRange(2, archiveCol('ENTRY_TYPE'), archLastRow - 1, 1).getValues();
                const normalizedTypes = typeValues.map(row => [normalizeEntryType(row[0])]);
                archive.getRange(2, archiveCol('ENTRY_TYPE'), archLastRow - 1, 1).setValues(normalizedTypes);
                const hoursFormulas = [];
                for (let r = 2; r <= archLastRow; r++) {
                    hoursFormulas.push([`=IF(IF(H${r}<>"",H${r},C${r})<>"",(IF(H${r}<>"",H${r},C${r})-IF(G${r}<>"",G${r},B${r}))*24,"")`]);
                }
                archive.getRange(2, 4, archLastRow - 1, 1).setFormulas(hoursFormulas);
            }
            log.push('Archive: cleared formatting/validations, updated headers');
        }
        else {
            log.push('Archive: sheet not found');
        }
        // AdminUsers
        const adminSheet = ss.getSheetByName('AdminUsers');
        if (adminSheet) {
            const adminLastRow = adminSheet.getLastRow();
            const adminLastCol = adminSheet.getLastColumn();
            if (adminLastRow > 0 && adminLastCol > 0) {
                const rng = adminSheet.getRange(1, 1, adminLastRow, adminLastCol);
                rng.clearFormat();
                rng.clearDataValidations();
            }
            if (adminSheet.getLastColumn() < 2) {
                adminSheet.insertColumnAfter(1);
            }
            adminSheet.getRange(1, 1, 1, 2).setValues([['Email', 'Permissions']]);
            adminSheet.getRange(1, 2).setNote(ADMIN_PERMISSIONS_HEADER_NOTE);
            const lastRow = adminSheet.getLastRow();
            if (lastRow > 1) {
                const adminData = adminSheet.getRange(2, 1, lastRow - 1, 2).getValues();
                const updates = adminData.map(row => {
                    const perms = String(row[1] || '').trim();
                    return [row[0], perms || ADMIN_DEFAULT_PERMISSIONS];
                });
                adminSheet.getRange(2, 1, lastRow - 1, 2).setValues(updates);
            }
            log.push('AdminUsers: cleared formatting/validations, added Permissions column, backfilled defaults');
        }
        else {
            log.push('AdminUsers: sheet not found');
        }
        // PayrollPreview
        const preview = ss.getSheetByName('PayrollPreview');
        if (preview) {
            ss.deleteSheet(preview);
            log.push('PayrollPreview: sheet deleted');
        }
        else {
            log.push('PayrollPreview: not present');
        }
        // Remove installable onEdit triggers (best-effort; may require extra ScriptApp scope).
        try {
            const triggers = ScriptApp.getUserTriggers(ss);
            let removedTriggers = 0;
            triggers.forEach(trigger => {
                if (trigger.getHandlerFunction() === 'onEditHandler' || trigger.getHandlerFunction() === 'onEdit') {
                    ScriptApp.deleteTrigger(trigger);
                    removedTriggers++;
                }
            });
            log.push(removedTriggers > 0
                ? 'Triggers: removed ' + removedTriggers + ' legacy onEdit trigger(s)'
                : 'Triggers: no legacy onEdit triggers found');
        }
        catch (triggerError) {
            log.push('Triggers: skipped cleanup (insufficient ScriptApp permissions)');
            Logger.log('runDataMigration: trigger cleanup skipped: %s', triggerError.toString());
        }
        // Remove stale transient properties from legacy flows.
        const props = PropertiesService.getScriptProperties();
        const transientKeys = ['editedRows', 'cachedPreviewRows'];
        transientKeys.forEach(key => props.deleteProperty(key));
        log.push('Script properties: removed transient keys ' + transientKeys.join(', '));
        setSetting(MIGRATION_VERSION_KEY, MIGRATION_VERSION);
        log.push('Migration version stamped: ' + MIGRATION_VERSION);
        SpreadsheetApp.flush();
        Logger.log('runDataMigration: complete. log=%s', log.join('; '));
        ui.alert('Migration Complete', 'Migration ' + MIGRATION_VERSION + ' applied.\n\n' + log.join('\n'), ui.ButtonSet.OK);
    }
    catch (e) {
        Logger.log('runDataMigration: error=%s', e.toString());
        ui.alert('Migration Error', 'Migration failed: ' + e.toString() + '\n\nPartial log:\n' + log.join('\n'), ui.ButtonSet.OK);
    }
}