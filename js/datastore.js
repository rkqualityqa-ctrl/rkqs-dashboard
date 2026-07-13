/*
--------------------------------------------------
Module Name : Data Store (Import Orchestrator)
File Name   : datastore.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Orchestrates the Excel Import Pipeline:
              File -> ExcelEngine -> ValidationEngine -> AppState -> Events
              This is the ONLY module allowed to write transactions/masters
              into AppState.
Dependencies: state.js, excel.js, validation.js, helpers.js
--------------------------------------------------
*/

const DataStore = (function () {

    async function importExcelFile(file) {
        console.log("[RKQS][DataStore] importExcelFile called with:", file && file.name);
        const fileCheck = ValidationEngine.validateFileType(file);
        if (!fileCheck.valid) {
            console.warn("[RKQS][DataStore] File type check failed:", fileCheck.message);
            AppEvents.emit("import:error", { message: fileCheck.message, fileName: file.name });
            return { status: "error", message: fileCheck.message };
        }

        resetAppStateForNewImport();
        AppEvents.emit("import:started", { fileName: file.name });

        let parsed;
        try {
            parsed = await ExcelEngine.readFile(file);
            console.log("[RKQS][DataStore] Parsed rows:", parsed.transactions.length, "headerRowIndex:", parsed.headerRowIndex);
        } catch (err) {
            console.error("[RKQS][DataStore] ExcelEngine.readFile failed:", err);
            const msg = err.message === "HEADER_NOT_FOUND"
                ? "Could not find the required column headers in this file. Please check the column names against the required Excel format."
                : "This file could not be read. Please confirm it is a valid Excel file.";
            AppEvents.emit("import:error", { message: msg, fileName: file.name });
            return { status: "error", message: msg };
        }

        let validation;
        try {
            validation = ValidationEngine.validateImport(parsed);
        } catch (err) {
            console.error("[RKQS][DataStore] ValidationEngine.validateImport threw:", err);
            AppEvents.emit("import:error", { message: "Validation failed unexpectedly: " + err.message, fileName: file.name });
            return { status: "error", message: err.message };
        }

        if (validation.status === "error") {
            console.warn("[RKQS][DataStore] Validation returned error:", validation.messages);
            AppEvents.emit("import:error", { message: validation.messages.join(" "), fileName: file.name });
            return { status: "error", message: validation.messages.join(" ") };
        }

        // Commit to AppState (single source of truth)
        AppState.transactions = parsed.transactions;
        AppState.masters = ExcelEngine.generateMasters(parsed.transactions);
        AppState.lastValidation = validation;
        AppState.importMeta = {
            headerRowIndex: parsed.headerRowIndex,
            totalRecords: parsed.transactions.length,
            fileName: file.name,
            importedAt: new Date(),
            status: validation.status,
            warnings: validation.warnings
        };

        console.log("[RKQS][DataStore] Import committed to AppState:", AppState.importMeta);
        AppEvents.emit("data:imported", AppState.importMeta);
        return { status: validation.status, meta: AppState.importMeta };
    }

    return { importExcelFile };
})();
