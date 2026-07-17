/*
--------------------------------------------------
Module Name : Validation Engine
File Name   : validation.js
Version     : 1.1
Author      : RK Quality Solutions
Purpose     : Validate uploaded Excel data before it enters AppState.
              No other module validates Excel data directly. Returns both
              human-readable warning strings (for the Import Preview modal)
              and structured row-level detail (for the Data Validation page).
Dependencies: config.js, helpers.js
--------------------------------------------------
*/

const ValidationEngine = (function () {

    // Validates file type before any parsing happens.
    function validateFileType(file) {
        const okExt = /\.(xlsx|xls|xlsm)$/i.test(file.name);
        if (!okExt) {
            return { valid: false, message: "Unsupported file type. Please upload a .xlsx, .xls or .xlsm file." };
        }
        if (file.size === 0) {
            return { valid: false, message: "The selected file is empty." };
        }
        return { valid: true };
    }

    // Validates the parsed result from ExcelEngine.readFile().
    // Returns:
    // {
    //   status: "success"|"warning"|"error",
    //   messages: [],               - blocking error messages (import rejected)
    //   warnings: [],                - human-readable warning strings (Import Preview modal)
    //   blankFieldRows: [{ excelRow, missingFields: [] }],  - row-level detail
    //   totalBlankFieldCount: N,
    //   spellingVariantClusters: [{ field, variants: [] }]  - structured detail
    // }
    function validateImport(result) {
        const messages = [];
        const warnings = [];

        if (!result.transactions || result.transactions.length === 0) {
            return {
                status: "error",
                messages: ["No transaction records were found below the detected header row."],
                warnings, blankFieldRows: [], totalBlankFieldCount: 0, spellingVariantClusters: []
            };
        }

        // Check mandatory field blanks per row - both the aggregate warning
        // string (for the import modal) and the row-level detail (for the
        // Data Validation page).
        const mandatoryKeys = AppConfig.REQUIRED_COLUMNS.filter(c => c.mandatory).map(c => c.key);
        const numericKeys = ["productionQty", "inspectionQty", "defectQty"];
        let totalBlankFieldCount = 0;
        const blankFieldRows = [];
        result.transactions.forEach((row) => {
            const missingFields = [];
            mandatoryKeys.forEach(key => {
                let isBlank;
                if (numericKeys.includes(key)) {
                    // These fields are coerced to 0 during Excel parsing, so
                    // a genuinely blank cell no longer looks blank here -
                    // excel.js records which ones were blank before that
                    // coercion happened, specifically for this check.
                    isBlank = (row.__rawBlankNumericFields || []).includes(key);
                } else {
                    const v = row[key];
                    isBlank = v === undefined || v === null || v === "" ||
                        (key === "date" && !(v instanceof Date));
                }
                if (isBlank) {
                    totalBlankFieldCount++;
                    missingFields.push(key);
                }
            });
            if (missingFields.length) {
                blankFieldRows.push({ excelRow: row.__excelRow || null, missingFields });
            }
        });
        if (totalBlankFieldCount > 0) {
            warnings.push(`${totalBlankFieldCount} mandatory field value(s) were blank or invalid across ${blankFieldRows.length} row(s). These rows are still imported but may affect KPI accuracy.`);
        }

        // Duplicate-header sanity check (two Excel columns mapped to same key)
        // handled upstream in excel.js by first-match wins, so we only warn on
        // potential near-duplicate master values (spelling variants), e.g.
        // "Hyundai" vs "hyundai" or trailing-space differences.
        const spellingVariantClusters = detectSpellingVariants(result.transactions);
        spellingVariantClusters.forEach(cluster => {
            warnings.push(`Possible spelling variation detected in "${cluster.field}": ${cluster.variants.join(" / ")}`);
        });

        const status = warnings.length > 0 ? "warning" : "success";
        return { status, messages, warnings, blankFieldRows, totalBlankFieldCount, spellingVariantClusters };
    }

    // SRS 20.4 - Data Quality Warnings: detect likely spelling variations
    // in Customer / Plant / Part Name / Defect Name masters (case-insensitive
    // collisions that are NOT identical strings). Returns structured clusters
    // rather than pre-formatted strings, so callers can render them either
    // way (Import Preview modal uses the string form built above; the Data
    // Validation page renders this structured form as a table).
    function detectSpellingVariants(transactions) {
        const clusters = [];
        const fields = ["customer", "plant", "partName", "defectName"];
        fields.forEach(field => {
            const seen = {};
            transactions.forEach(row => {
                const v = row[field];
                if (!v) return;
                const norm = String(v).toLowerCase().trim();
                seen[norm] = seen[norm] || new Set();
                seen[norm].add(v);
            });
            Object.values(seen).forEach(variantSet => {
                if (variantSet.size > 1) {
                    clusters.push({ field, variants: [...variantSet] });
                }
            });
        });
        return clusters;
    }

    return { validateFileType, validateImport, detectSpellingVariants };
})();
