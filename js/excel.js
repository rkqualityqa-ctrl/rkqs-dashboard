/*
--------------------------------------------------
Module Name : Excel Engine
File Name   : excel.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Read uploaded Excel file, auto-detect header row, map
              columns, convert rows into transaction objects.
              This module NEVER calculates KPIs and NEVER touches the
              DOM - it only produces clean data for validation.js
Dependencies: state.js, config.js, helpers.js, SheetJS (xlsx.min.js)
--------------------------------------------------
*/

const ExcelEngine = (function () {

    // Map of normalized header text -> internal column key.
    // Multiple aliases are supported so client files with slightly
    // different header wording still import correctly.
    const HEADER_ALIASES = {
        date: "date",
        plant: "plant",
        department: "department",
        process: "process",
        productionline: "line",
        line: "line",
        shift: "shift",
        customer: "customer",
        partno: "partNo",
        partnumber: "partNo",
        partname: "partName",
        operator: "operator",
        inspector: "inspector",
        productionqty: "productionQty",
        inspectionqty: "inspectionQty",
        defectname: "defectName",
        defectqty: "defectQty",
        disposition: "disposition",
        remarksifany: "remarks",
        remarks: "remarks"
    };

    // Scan the first N rows of a sheet to find the row that contains
    // the mandatory column headers (SRS 7.3 - Dynamic Header Detection).
    // Returns { headerRowIndex, columnMap } or null if not found.
    function detectHeaderRow(rows, maxScanRows = 25) {
        const mandatoryKeys = AppConfig.REQUIRED_COLUMNS.filter(c => c.mandatory).map(c => c.key);

        for (let r = 0; r < Math.min(maxScanRows, rows.length); r++) {
            const row = rows[r] || [];
            const columnMap = {}; // colIndex -> internal key
            row.forEach((cell, colIndex) => {
                const norm = Helpers.normalizeHeader(cell);
                if (HEADER_ALIASES[norm]) {
                    columnMap[colIndex] = HEADER_ALIASES[norm];
                }
            });
            const foundKeys = new Set(Object.values(columnMap));
            const hasAllMandatory = mandatoryKeys.every(k => foundKeys.has(k));
            if (hasAllMandatory) {
                return { headerRowIndex: r, columnMap };
            }
        }
        return null;
    }

    // Convert raw sheet rows (array-of-arrays) into transaction objects
    // using the detected column map. Rows below the header, skipping
    // fully blank rows.
    function buildTransactions(rows, headerRowIndex, columnMap, sheetStartRow) {
        const transactions = [];
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.every(c => c === undefined || c === null || String(c).trim() === "")) continue;

            const record = {};
            Object.entries(columnMap).forEach(([colIndex, key]) => {
                record[key] = row[Number(colIndex)];
            });

            // Skip rows with no defect name AND no part no (likely stray/footer rows)
            if (!record.partNo && !record.defectName) continue;

            // Remember the actual Excel row number this record came from
            // (1-indexed), so validation.js and the Data Validation page can
            // point back to specific rows in the source file. Rows are
            // skipped above (blank/stray), so this can't be derived from
            // the transactions array index alone. sheetStartRow accounts for
            // SheetJS silently dropping leading rows that have NO cells
            // defined at all (not just visually blank) - without it, files
            // whose real content starts below row 1 would report the wrong
            // Excel row number here.
            record.__excelRow = (sheetStartRow || 0) + r + 1;

            // Numeric quantity fields get coerced to 0 below if blank, which
            // is correct for KPI math but would otherwise make a genuinely
            // blank cell indistinguishable from a legitimate "0" entry for
            // validation purposes. Record which ones were actually blank
            // BEFORE coercion so validation.js can still flag them.
            record.__rawBlankNumericFields = ["productionQty", "inspectionQty", "defectQty"]
                .filter(k => record[k] === undefined || record[k] === null || record[k] === "");

            record.date = Helpers.toDate(record.date);
            record.productionQty = Number(record.productionQty) || 0;
            record.inspectionQty = Number(record.inspectionQty) || 0;
            record.defectQty = Number(record.defectQty) || 0;

            ["plant", "department", "process", "line", "shift", "customer", "partNo",
                "partName", "operator", "inspector", "defectName", "disposition", "remarks"]
                .forEach(k => { if (record[k] !== undefined) record[k] = String(record[k]).trim(); });

            transactions.push(record);
        }
        return transactions;
    }

    // Reads the File object, returns a Promise resolving to
    // { transactions, headerRowIndex, sheetName, rawRowCount }
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array", cellDates: false });

                    // pick the first sheet that yields a valid header detection
                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
                        if (!rows.length) continue;

                        // SheetJS's array-of-arrays output starts at the sheet's
                        // actual used range, not always Excel row 1 - if the
                        // first few rows have zero cells defined (fully empty,
                        // not just blank-looking), sheet_to_json silently
                        // excludes them and rows[0] would otherwise be
                        // mis-attributed to Excel row 1. Reading the range
                        // keeps __excelRow accurate in that case.
                        const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { s: { r: 0 } };
                        const sheetStartRow = range.s.r;

                        const detected = detectHeaderRow(rows);
                        if (detected) {
                            const transactions = buildTransactions(rows, detected.headerRowIndex, detected.columnMap, sheetStartRow);
                            resolve({
                                transactions,
                                headerRowIndex: detected.headerRowIndex,
                                sheetName,
                                rawRowCount: rows.length
                            });
                            return;
                        }
                    }
                    reject(new Error("HEADER_NOT_FOUND"));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("FILE_READ_ERROR"));
            reader.readAsArrayBuffer(file);
        });
    }

    // Builds masters (unique dropdown values) from the transaction list (SRS 8.2)
    function generateMasters(transactions) {
        const pick = (key) => Helpers.uniqueSorted(transactions.map(t => t[key]));
        return {
            plant: pick("plant"),
            department: pick("department"),
            process: pick("process"),
            line: pick("line"),
            shift: pick("shift"),
            customer: pick("customer"),
            partNo: pick("partNo"),
            partName: pick("partName"),
            operator: pick("operator"),
            inspector: pick("inspector"),
            defectName: pick("defectName"),
            disposition: pick("disposition")
        };
    }

    return { readFile, generateMasters, detectHeaderRow, buildTransactions };
})();
