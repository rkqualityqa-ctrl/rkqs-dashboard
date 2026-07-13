/*
--------------------------------------------------
Module Name : Audit Logs
File Name   : auditlog.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Master-only, system-wide activity log - who did what and
              when, across the whole app (imports, exports, White Label
              packages, theme/branding changes, client management, edition
              switches). Distinct from File Management, which is a
              detailed log of Excel imports specifically; Audit Logs is
              the broader trail across every admin action.
              Persisted in this browser's local storage only (no
              server/database, per SRS 4.1/19.1) - entries are short
              action summaries, never quality/production data itself.
Dependencies: helpers.js, browser localStorage
--------------------------------------------------
*/

const AuditLog = (function () {

    const STORAGE_KEY = "rkqs_audit_log";
    const MAX_ENTRIES = 200;

    const CATEGORIES = ["Import", "Export", "White Label", "Theme", "Branding", "Client Management", "System"];

    function loadLog() {
        if (!Helpers.isLocalStorageAvailable()) return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("[RKQS][AuditLog] Failed to read log:", e);
            return [];
        }
    }

    function saveLog(entries) {
        if (!Helpers.isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
        } catch (e) {
            console.error("[RKQS][AuditLog] Failed to save log:", e);
        }
    }

    // Main entry point - every other module calls this to record an action.
    // category: one of CATEGORIES (any string is accepted defensively).
    // action: short verb phrase, e.g. "Excel imported", "PDF exported"
    // details: one-line human-readable specifics, e.g. file name, counts
    function log(category, action, details) {
        const entries = loadLog();
        entries.unshift({
            timestamp: new Date().toISOString(),
            category,
            action,
            details: details || "",
            user: (typeof AppConfig !== "undefined" && AppConfig.EDITION === "master") ? "Admin (Master)" : "User"
        });
        saveLog(entries);
    }

    function clearLog() {
        if (!Helpers.isLocalStorageAvailable()) return;
        localStorage.removeItem(STORAGE_KEY);
    }

    function template() {
        const entries = loadLog();
        return `
        <div class="card">
            <div class="card-head">
                <h3>Audit Logs</h3>
                <button class="btn btn-ghost" id="clearAuditBtn" ${entries.length ? "" : "disabled"}>Clear Log</button>
            </div>
            <p class="hint">
                A running record of admin actions in this browser - Excel imports, exports, White Label
                packages generated, theme/branding changes, client management, and Master/Client view
                switches. This is separate from File Management, which focuses specifically on Excel
                import details.
            </p>
            <div class="date-range-field" style="margin-bottom:14px;">
                <label>Filter by Category</label>
                <select id="auditCategoryFilter">
                    <option value="All">All Categories</option>
                    ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
                </select>
            </div>
            <div id="auditLogTableWrap">${entries.length ? auditTable(entries) : emptyState()}</div>
        </div>`;
    }

    function emptyState() {
        return `<div class="empty-state">No activity logged yet. Actions like Excel imports, exports, and settings changes will show up here.</div>`;
    }

    function auditTable(entries) {
        if (!entries.length) return emptyState();
        return `
        <table class="data-table">
            <thead><tr><th>When</th><th>Category</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
                ${entries.map(e => `
                    <tr>
                        <td style="white-space:nowrap;">${Helpers.formatDate(new Date(e.timestamp))}</td>
                        <td><span class="edition-badge" style="background:var(--color-accent-soft);color:var(--color-primary);">${Helpers.escapeHtml(e.category)}</span></td>
                        <td>${Helpers.escapeHtml(e.action)}</td>
                        <td>${Helpers.escapeHtml(e.details)}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
    }

    function bind() {
        const clearBtn = document.getElementById("clearAuditBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (confirm("Clear the entire audit log? This cannot be undone.")) {
                    clearLog();
                    showToast("Audit log cleared.", "info");
                    UI.renderPage("auditlogs");
                }
            });
        }

        const filterSelect = document.getElementById("auditCategoryFilter");
        if (filterSelect) {
            filterSelect.addEventListener("change", () => {
                const all = loadLog();
                const filtered = filterSelect.value === "All" ? all : all.filter(e => e.category === filterSelect.value);
                document.getElementById("auditLogTableWrap").innerHTML = filtered.length ? auditTable(filtered) : emptyState();
            });
        }
    }

    return { log, loadLog, clearLog, template, bind, CATEGORIES };
})();
