/*
--------------------------------------------------
Module Name : Application Bootstrap & Router
File Name   : app.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Startup sequence, routing, Excel upload wiring, import
              preview modal, date range + refresh button handling.
Dependencies: all other modules
--------------------------------------------------
*/

const Router = (function () {
    function go(route) {
        UI.renderPage(route);
    }
    return { go };
})();

document.addEventListener("DOMContentLoaded", () => {
    console.log("[RKQS] Bootstrap starting...");

    // 0. Global safety net - ANY uncaught error or rejected promise anywhere
    //    in the app must surface to the user, never fail silently.
    window.addEventListener("error", (e) => {
        console.error("[RKQS] Uncaught error:", e.error || e.message);
        showToast("Something went wrong: " + (e.message || "unknown error") + " (see browser console for details)", "error");
    });
    window.addEventListener("unhandledrejection", (e) => {
        console.error("[RKQS] Unhandled promise rejection:", e.reason);
        showToast("Something went wrong during import: " + (e.reason && e.reason.message ? e.reason.message : e.reason), "error");
    });

    // 1. Load config (already loaded via <script> order) -----------------
    SystemSettings.applySettingsToConfig();
    document.getElementById("appVersionLabel").textContent = `Version: ${AppConfig.APP_VERSION}`;
    applyEditionClass();

    // 2. Wire global controls FIRST - so upload works even if a later
    //    rendering step below has a problem. ---------------------------
    document.getElementById("excelFileInput").addEventListener("change", handleFileSelected);
    document.getElementById("refreshBtn").addEventListener("click", () => UI.renderPage(AppState.activeRoute));
    document.getElementById("sidebarToggle").addEventListener("click", () => {
        const shell = document.getElementById("appShell");
        if (window.matchMedia("(max-width: 860px)").matches) {
            shell.classList.toggle("mobile-nav-open");
        } else {
            shell.classList.toggle("sidebar-collapsed");
        }
    });
    document.getElementById("mobileNavBackdrop").addEventListener("click", () => {
        document.getElementById("appShell").classList.remove("mobile-nav-open");
    });
    document.getElementById("editionToggle").addEventListener("change", (e) => {
        AppConfig.EDITION = e.target.checked ? "client" : "master";
        applyEditionClass();
        UI.renderChrome();
        UI.renderPage(AppState.activeRoute);
        AuditLog.log("System", "View switched", `Switched to ${AppConfig.EDITION === "client" ? "Client" : "Master"} View`);
    });
    document.getElementById("closeImportModal").addEventListener("click", hideImportModal);

    // 2b. Drag-and-drop support anywhere on the page. Also prevents the
    //     browser's default "open/download the file" behavior if a file is
    //     dropped outside the upload button, which would otherwise look
    //     like "nothing happened" on the dashboard.
    ["dragover", "drop"].forEach(evt => {
        window.addEventListener(evt, (e) => e.preventDefault());
    });
    document.getElementById("dashboardContent").addEventListener("drop", (e) => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
            console.log("[RKQS] File dropped:", file.name);
            DataStore.importExcelFile(file);
        }
    });

    // 3. Event subscriptions -------------------------------------------------
    AppEvents.on("import:started", (p) => { console.log("[RKQS] Import started:", p); showToast("Importing Excel file...", "info"); showLoadingOverlay("Importing Excel file..."); });
    AppEvents.on("import:error", (payload) => {
        console.error("[RKQS] Import error:", payload.message);
        hideLoadingOverlay();
        hideImportModal();
        showToast(payload.message, "error");
        FileManagement.logFailedImport(payload.fileName, payload.message);
        AuditLog.log("Import", "Excel import failed", `${payload.fileName || "unknown file"} — ${payload.message}`);
    });
    AppEvents.on("data:imported", (meta) => {
        console.log("[RKQS] Data imported:", meta);
        applyLargeDatasetOptimizations(meta.totalRecords);
        hideLoadingOverlay();
        FileManagement.logSuccessfulImport(meta);
        AuditLog.log("Import", "Excel imported", `${meta.fileName} — ${Helpers.formatNumber(meta.totalRecords)} records, status: ${meta.status}`);
        UI.renderFilterPanel();
        UI.renderPage("executive");
        showImportPreview(meta);
        updateNotificationBadge();
    });
    AppEvents.on("filters:changed", () => UI.renderPage(AppState.activeRoute));

    // 4. Initialize UI chrome ---------------------------------------------
    ThemeManager.init();
    UI.renderChrome();
    UI.renderFilterPanel();
    UI.renderPage(AppState.activeRoute);
    updateNotificationBadge();

    console.log("[RKQS] Bootstrap complete. Ready for Excel upload.");
    showToast("Dashboard ready. Click 'Upload Excel' to load your data.", "info");
});

function applyEditionClass() {
    document.body.classList.toggle("edition-client", AppConfig.EDITION === "client");
    document.body.classList.toggle("edition-master", AppConfig.EDITION === "master");
    const toggle = document.getElementById("editionToggle");
    if (toggle) toggle.checked = AppConfig.EDITION === "client";
}

async function handleFileSelected(e) {
    console.log("[RKQS] File input changed. Files selected:", e.target.files.length);
    const file = e.target.files[0];
    if (!file) {
        console.warn("[RKQS] No file present in input event.");
        return;
    }
    console.log("[RKQS] Selected file:", file.name, file.size, "bytes");
    try {
        const result = await DataStore.importExcelFile(file);
        console.log("[RKQS] Import result:", result);
    } catch (err) {
        console.error("[RKQS] Import threw an exception:", err);
        showToast("Import failed: " + (err && err.message ? err.message : "unknown error"), "error");
    } finally {
        e.target.value = ""; // allow re-selecting the same file later
    }
}

function showImportPreview(meta) {
    const modal = document.getElementById("importModal");
    const m = AppState.masters;
    document.getElementById("importModalBody").innerHTML = `
        <div class="import-row"><span>Header Row Detected</span><strong>Row ${meta.headerRowIndex + 1}</strong></div>
        <div class="import-row"><span>Total Records Imported</span><strong>${Helpers.formatNumber(meta.totalRecords)}</strong></div>
        <div class="import-row"><span>Plants Found</span><strong>${m.plant.length}</strong></div>
        <div class="import-row"><span>Departments Found</span><strong>${m.department.length}</strong></div>
        <div class="import-row"><span>Processes Found</span><strong>${m.process.length}</strong></div>
        <div class="import-row"><span>Production Lines Found</span><strong>${m.line.length}</strong></div>
        <div class="import-row"><span>Customers Found</span><strong>${m.customer.length}</strong></div>
        <div class="import-row"><span>Parts Found</span><strong>${m.partNo.length}</strong></div>
        <div class="import-row"><span>Defects Found</span><strong>${m.defectName.length}</strong></div>
        <div class="import-row"><span>Import Status</span><strong class="status-${meta.status}">${meta.status.toUpperCase()}</strong></div>
        ${meta.warnings.length ? `<div class="import-warnings"><strong>Warnings:</strong><ul>${meta.warnings.map(w => `<li>${Helpers.escapeHtml(w)}</li>`).join("")}</ul></div>` : ""}
    `;
    modal.classList.add("open");
    showToast(`Import ${meta.status === "success" ? "successful" : meta.status}: ${meta.totalRecords} records`, meta.status === "error" ? "error" : "success");
}

function hideImportModal() {
    document.getElementById("importModal").classList.remove("open");
}

function updateNotificationBadge() {
    const badge = document.getElementById("notifBadge");
    const count = (AppState.kpis.alerts || []).length;
    badge.textContent = count;
    badge.style.display = count ? "flex" : "none";
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showLoadingOverlay(text) {
    const overlay = document.getElementById("loadingOverlay");
    document.getElementById("loadingOverlayText").textContent = text || "Working...";
    overlay.classList.add("open");
}

function hideLoadingOverlay() {
    document.getElementById("loadingOverlay").classList.remove("open");
}

// SRS 18.1/18.2 - Performance & Large File Handling.
// For large datasets, chart re-animation on every filter change becomes
// visibly sluggish, so animation is auto-disabled above this threshold.
// The dashboard itself stays fully responsive either way since every
// ranking table is already capped to its top N rows (see ui.js).
// Configurable via System Settings (Master only) - see systemsettings.js.

function applyLargeDatasetOptimizations(totalRecords) {
    if (totalRecords > AppConfig.DEFAULTS.largeDatasetRowThreshold) {
        AppConfig.DEFAULTS.chartAnimationMs = 0;
        console.log(`[RKQS] Large dataset detected (${totalRecords} records) - chart animation disabled for smoother filtering.`);
    } else {
        AppConfig.DEFAULTS.chartAnimationMs = 600;
    }
}
