/*
--------------------------------------------------
Module Name : Data Store & State Management
File Name   : state.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Single source of truth for the entire application
Dependencies: none
--------------------------------------------------
*/

const AppState = {
    // raw imported rows (one row = one defect record, per SRS 7.2)
    transactions: [],

    // dynamic masters discovered from the uploaded Excel (SRS 8.2)
    masters: {
        plant: [], department: [], process: [], line: [], shift: [], customer: [],
        partNo: [], partName: [], operator: [], inspector: [], defectName: [], disposition: []
    },

    // currently active filter selections (Filter Engine writes here)
    filters: {
        dateFrom: null, dateTo: null, datePreset: "all",
        plant: "All", department: "All", process: "All", line: "All",
        shift: "All", customer: "All", partNo: "All", operator: "All",
        inspector: "All", defectName: "All", disposition: "All"
    },

    // computed KPI results (KPI Engine writes here)
    kpis: {},

    // full structured result from the last ValidationEngine.validateImport()
    // call - kept for the Data Validation page (Master only), separate from
    // importMeta.warnings which only holds the human-readable strings shown
    // in the Import Preview modal at upload time.
    lastValidation: null,

    // last chart instances, keyed by canvas id, so we can destroy/rebuild cleanly
    charts: {},

    // import meta info shown in the "Import Preview" panel (SRS 20.3)
    importMeta: {
        headerRowIndex: null,
        totalRecords: 0,
        fileName: null,
        importedAt: null,
        status: null,     // "success" | "warning" | "error"
        warnings: []
    },

    // app settings (Settings & Theme Engine, Module-13)
    settings: {
        edition: AppConfig.EDITION,
        theme: "light"
    },

    // currently active sidebar route, e.g. "executive", "plant", "customer"
    activeRoute: "executive",

    // the last DATA dashboard route visited (excludes utility pages like
    // Export Center, File Management, Settings, etc.) - the Export Engine
    // uses this to know which dashboard to export when the user triggers
    // an export from the Export Center page itself, since Export Center's
    // own content occupies #dashboardContent at that point.
    lastDashboardRoute: "executive"
};

// ---------------------------------------------------------
// Simple pub/sub so modules never poll each other directly.
// Excel Engine publishes "data:imported" -> KPI/Filter/Chart/
// Renderer modules subscribe and refresh themselves.
// ---------------------------------------------------------
const AppEvents = (function () {
    const listeners = {};
    return {
        on(event, cb) {
            (listeners[event] = listeners[event] || []).push(cb);
        },
        emit(event, payload) {
            (listeners[event] || []).forEach(cb => {
                try { cb(payload); } catch (e) {
                    console.error(`Listener error on ${event}:`, e);
                    if (typeof showToast === "function") {
                        showToast(`Something went wrong while handling "${event}": ${e.message}`, "error");
                    }
                }
            });
        }
    };
})();

// Reset transactional state (used before a fresh Excel import)
function resetAppStateForNewImport() {
    AppState.transactions = [];
    Object.keys(AppState.masters).forEach(k => AppState.masters[k] = []);
    AppState.kpis = {};
    AppState.lastValidation = null;
    AppState.importMeta = { headerRowIndex: null, totalRecords: 0, fileName: null, importedAt: null, status: null, warnings: [] };
}
