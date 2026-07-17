/*
--------------------------------------------------
Module Name : System Settings
File Name   : systemsettings.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Master-only page to configure the thresholds that drive
              alert generation (kpi.js generateAlerts) and large-dataset
              performance behavior (app.js), instead of them being fixed
              in config.js. Settings persist in this browser's local
              storage and are re-applied over AppConfig.DEFAULTS at every
              app bootstrap, before the first render.
Dependencies: state.js, config.js, helpers.js, browser localStorage
--------------------------------------------------
*/

const SystemSettings = (function () {

    const STORAGE_KEY = "rkqs_system_settings";

    // The hardcoded values in config.js are the factory defaults - kept
    // here too so "Reset to Defaults" doesn't need to guess at them.
    const FACTORY_DEFAULTS = {
        defectThresholdPercent: 8,
        fpyThresholdPercent: 90,
        inspectionCoverageThreshold: 90,
        largeDatasetRowThreshold: 3000
    };

    function loadSettings() {
        if (!Helpers.isLocalStorageAvailable()) return null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error("[RKQS][SystemSettings] Failed to read settings:", e);
            return null;
        }
    }

    function saveSettings(settings) {
        if (!Helpers.isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error("[RKQS][SystemSettings] Failed to save settings:", e);
        }
    }

    // Called once at app bootstrap (before first render) and again right
    // after Save/Reset, so AppConfig.DEFAULTS always reflects whatever was
    // last persisted in this browser.
    function applySettingsToConfig() {
        const saved = loadSettings();
        const effective = Object.assign({}, FACTORY_DEFAULTS, saved || {});
        AppConfig.DEFAULTS.defectThresholdPercent = effective.defectThresholdPercent;
        AppConfig.DEFAULTS.fpyThresholdPercent = effective.fpyThresholdPercent;
        AppConfig.DEFAULTS.inspectionCoverageThreshold = effective.inspectionCoverageThreshold;
        AppConfig.DEFAULTS.largeDatasetRowThreshold = effective.largeDatasetRowThreshold;
    }

    function template() {
        const d = AppConfig.DEFAULTS;
        return `
        <div class="card" style="max-width:640px">
            <div class="card-head"><h3>Alert Thresholds</h3></div>
            <p class="hint">These control when a plant/dashboard shows up in the "Recent Alerts" panel on the Executive Dashboard and entity dashboards.</p>
            <div class="branding-form">
                <label>Defect % Threshold — alert when Defect % exceeds this</label>
                <input type="number" id="ssDefectThreshold" min="0" max="100" step="0.1" value="${d.defectThresholdPercent}">

                <label>FPY % Threshold — alert when First Pass Yield falls below this</label>
                <input type="number" id="ssFpyThreshold" min="0" max="100" step="0.1" value="${d.fpyThresholdPercent}">

                <label>Inspection Coverage % Threshold — alert when coverage falls below this</label>
                <input type="number" id="ssCoverageThreshold" min="0" max="100" step="0.1" value="${d.inspectionCoverageThreshold}">

                <label>Large Dataset Row Threshold — above this many rows, chart animations auto-disable for smoother filtering (SRS 18.2)</label>
                <input type="number" id="ssLargeDatasetThreshold" min="100" step="100" value="${d.largeDatasetRowThreshold}">

                <div style="display:flex; gap:10px; margin-top:14px;">
                    <button class="btn btn-primary" id="ssSaveBtn">Save Settings</button>
                    <button class="btn btn-ghost" id="ssResetBtn">Reset to Defaults</button>
                </div>
                <div id="ssStatus" class="hint"></div>
            </div>
        </div>`;
    }

    function bind() {
        document.getElementById("ssSaveBtn").addEventListener("click", () => {
            const settings = readFormValues();
            const validationError = validate(settings);
            if (validationError) {
                showToast(validationError, "error");
                return;
            }
            saveSettings(settings);
            applySettingsToConfig();
            showToast("System settings saved. Alerts on dashboards will use these new thresholds right away.", "success");
            if (typeof AuditLog !== "undefined") {
                AuditLog.log("System", "Settings updated", `Defect% ${settings.defectThresholdPercent}, FPY% ${settings.fpyThresholdPercent}, Coverage% ${settings.inspectionCoverageThreshold}, Large dataset rows ${settings.largeDatasetRowThreshold}`);
            }
        });

        document.getElementById("ssResetBtn").addEventListener("click", () => {
            saveSettings(FACTORY_DEFAULTS);
            applySettingsToConfig();
            UI.renderPage("systemsettings");
            showToast("System settings reset to factory defaults.", "info");
            if (typeof AuditLog !== "undefined") {
                AuditLog.log("System", "Settings reset to defaults", "");
            }
        });
    }

    function readFormValues() {
        return {
            defectThresholdPercent: Number(document.getElementById("ssDefectThreshold").value),
            fpyThresholdPercent: Number(document.getElementById("ssFpyThreshold").value),
            inspectionCoverageThreshold: Number(document.getElementById("ssCoverageThreshold").value),
            largeDatasetRowThreshold: Number(document.getElementById("ssLargeDatasetThreshold").value)
        };
    }

    function validate(s) {
        const pctFields = [
            ["defectThresholdPercent", "Defect % Threshold"],
            ["fpyThresholdPercent", "FPY % Threshold"],
            ["inspectionCoverageThreshold", "Inspection Coverage % Threshold"]
        ];
        for (const [key, label] of pctFields) {
            if (isNaN(s[key]) || s[key] < 0 || s[key] > 100) {
                return `${label} must be a number between 0 and 100.`;
            }
        }
        if (isNaN(s.largeDatasetRowThreshold) || s.largeDatasetRowThreshold < 100) {
            return "Large Dataset Row Threshold must be at least 100.";
        }
        return null;
    }

    return { template, bind, applySettingsToConfig, loadSettings, FACTORY_DEFAULTS };
})();
