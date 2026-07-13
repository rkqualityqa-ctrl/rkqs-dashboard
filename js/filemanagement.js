/*
--------------------------------------------------
Module Name : File Management
File Name   : filemanagement.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Keeps a persistent log of every Excel file imported (or
              attempted) in this browser, across sessions. This app has
              no database/server (SRS 4.1/19.1), so raw Excel data is
              never stored here - only lightweight metadata (file name,
              timestamp, record count, status). The actual quality data
              stays in-memory only for the current session (SRS 19.2);
              re-opening the dashboard later requires re-uploading the
              Excel file, same as always - this module only remembers
              WHAT was uploaded and WHEN, as an audit-friendly log.
Dependencies: state.js, helpers.js, browser localStorage
--------------------------------------------------
*/

const FileManagement = (function () {

    const STORAGE_KEY = "rkqs_file_import_history";
    const MAX_HISTORY_ENTRIES = 50;

    function loadHistory() {
        if (!Helpers.isLocalStorageAvailable()) return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("[RKQS][FileManagement] Failed to read history:", e);
            return [];
        }
    }

    function saveHistory(history) {
        if (!Helpers.isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ENTRIES)));
        } catch (e) {
            console.error("[RKQS][FileManagement] Failed to save history:", e);
        }
    }

    // Called from app.js on every successful import (data:imported event).
    function logSuccessfulImport(meta) {
        const history = loadHistory();
        history.unshift({
            fileName: meta.fileName,
            importedAt: meta.importedAt,
            totalRecords: meta.totalRecords,
            headerRowIndex: meta.headerRowIndex,
            status: meta.status,
            warningsCount: meta.warnings ? meta.warnings.length : 0,
            plants: AppState.masters.plant.length,
            customers: AppState.masters.customer.length,
            parts: AppState.masters.partNo.length
        });
        saveHistory(history);
    }

    // Called from app.js on every failed import attempt (import:error event).
    function logFailedImport(fileName, message) {
        const history = loadHistory();
        history.unshift({
            fileName: fileName || "(unknown file)",
            importedAt: new Date().toISOString(),
            totalRecords: 0,
            status: "failed",
            message
        });
        saveHistory(history);
    }

    function clearHistory() {
        if (!Helpers.isLocalStorageAvailable()) return;
        localStorage.removeItem(STORAGE_KEY);
    }

    function template() {
        const history = loadHistory();
        const storageOk = Helpers.isLocalStorageAvailable();

        return `
        <div class="card">
            <div class="card-head">
                <h3>File Management — Import History</h3>
                <button class="btn btn-ghost" id="clearHistoryBtn" ${history.length ? "" : "disabled"}>Clear History</button>
            </div>
            <p class="hint">
                This app has no database or server (fully offline, per design) - Excel data itself is
                never stored anywhere and only lives in this browser tab for the current session.
                This log only remembers <strong>what</strong> was imported and <strong>when</strong>,
                for your own reference and audit trail. It's saved in this browser only
                (${storageOk ? "your browser's local storage is available" : "local storage is unavailable in this browser/mode, so history won't persist after this tab closes"}).
            </p>
            ${history.length ? historyTable(history) : `<div class="empty-state">No import history yet. Once you upload an Excel file, it will show up here.</div>`}
        </div>

        <div class="card" style="margin-top:18px;">
            <div class="card-head"><h3>Current Session File</h3></div>
            ${currentFileInfo()}
        </div>`;
    }

    function historyTable(history) {
        return `
        <table class="data-table">
            <thead>
                <tr><th>File Name</th><th>Imported At</th><th>Records</th><th>Plants</th><th>Customers</th><th>Status</th><th>Warnings</th></tr>
            </thead>
            <tbody>
                ${history.map(h => `
                    <tr>
                        <td>${Helpers.escapeHtml(h.fileName)}</td>
                        <td>${Helpers.formatDate(new Date(h.importedAt))}</td>
                        <td>${h.status === "failed" ? "—" : Helpers.formatNumber(h.totalRecords)}</td>
                        <td>${h.status === "failed" ? "—" : (h.plants ?? "—")}</td>
                        <td>${h.status === "failed" ? "—" : (h.customers ?? "—")}</td>
                        <td><strong class="status-${h.status === "failed" ? "error" : h.status}">${h.status.toUpperCase()}</strong></td>
                        <td>${h.status === "failed" ? Helpers.escapeHtml(h.message || "") : (h.warningsCount || 0)}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
    }

    function currentFileInfo() {
        const meta = AppState.importMeta;
        if (!meta || !meta.fileName) {
            return `<div class="empty-state">No file loaded in this session yet.</div>`;
        }
        const rows = [
            ["File Name", Helpers.escapeHtml(meta.fileName)],
            ["Imported At", Helpers.formatDate(meta.importedAt)],
            ["Header Row Detected", `Row ${meta.headerRowIndex + 1}`],
            ["Total Records", Helpers.formatNumber(meta.totalRecords)],
            ["Status", `<strong class="status-${meta.status}">${meta.status.toUpperCase()}</strong>`],
            ["Warnings", meta.warnings.length]
        ];
        return rows.map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
    }

    function bind() {
        const btn = document.getElementById("clearHistoryBtn");
        if (btn) {
            btn.addEventListener("click", () => {
                clearHistory();
                showToast("Import history cleared.", "info");
                UI.renderPage("filemanagement");
            });
        }
    }

    return { template, bind, logSuccessfulImport, logFailedImport, clearHistory, loadHistory };
})();
