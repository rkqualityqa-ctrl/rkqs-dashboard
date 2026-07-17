/*
--------------------------------------------------
Module Name : Theme Manager
File Name   : thememanager.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Lets the Master Administrator pick a color preset and
              toggle light/dark mode. Applies changes live via CSS
              custom properties - no page reload required.
Dependencies: state.js, config.js, helpers.js
--------------------------------------------------
*/

const ThemeManager = (function () {

    function currentPresetKey() {
        const theme = getActiveTheme();
        const match = AppConfig.THEME_PRESETS.find(p => p.primary === theme.primary && p.accent === theme.accent);
        return match ? match.key : "custom";
    }

    function template() {
        const activeKey = currentPresetKey();
        const mode = AppConfig.UI_MODE;
        return `
        <div class="grid-2">
            <div class="card">
                <div class="card-head"><h3>Color Presets</h3></div>
                <p class="hint">Applies instantly to sidebar, buttons, charts and KPI accents across both Master and Client dashboards' active edition.</p>
                <div class="theme-preset-grid">
                    ${AppConfig.THEME_PRESETS.map(p => `
                        <div class="theme-preset-card ${activeKey === p.key ? "active" : ""}" data-preset="${p.key}">
                            <div class="theme-preset-swatch">
                                <span style="background:${p.primary}"></span>
                                <span style="background:${p.primaryLight}"></span>
                                <span style="background:${p.accent}"></span>
                            </div>
                            <div class="theme-preset-name">${p.name}</div>
                        </div>`).join("")}
                </div>

                <div class="mode-toggle-row">
                    <strong>Display Mode</strong>
                    <label class="edition-switch">Light
                        <span class="switch"><input type="checkbox" id="darkModeToggle" ${mode === "dark" ? "checked" : ""}><span class="switch-slider"></span></span>
                    Dark</label>
                </div>
                <p class="hint">Dark mode changes dashboard background and text contrast only - sidebar color stays consistent with your brand.</p>
            </div>

            <div class="card">
                <div class="card-head"><h3>Live Preview</h3></div>
                <div class="preview-card" id="themePreviewCard">
                    <div class="preview-header" style="background:${getActiveTheme().primary}">
                        <img src="${getActiveBranding().logo}" class="preview-logo">
                        <span>${Helpers.escapeHtml(getActiveBranding().companyName)}</span>
                    </div>
                    <div class="preview-body">
                        <span style="display:inline-block;padding:6px 14px;border-radius:20px;background:${getActiveTheme().accentSoft};color:${getActiveTheme().primary};font-weight:700;font-size:12px;">Sample KPI Badge</span>
                    </div>
                </div>
                <p class="hint">Editing for: <strong>${AppConfig.EDITION === "master" ? "Master Dashboard" : "Client Dashboard"}</strong> (toggle "Client View" in the header to switch which edition you are theming).</p>
            </div>
        </div>`;
    }

    function bind() {
        document.querySelectorAll(".theme-preset-card").forEach(card => {
            card.addEventListener("click", () => applyPreset(card.dataset.preset));
        });
        const darkToggle = document.getElementById("darkModeToggle");
        if (darkToggle) {
            darkToggle.addEventListener("change", (e) => {
                AppConfig.UI_MODE = e.target.checked ? "dark" : "light";
                applyMode();
            });
        }
    }

    function applyPreset(key) {
        const preset = AppConfig.THEME_PRESETS.find(p => p.key === key);
        if (!preset) return;
        const theme = AppConfig.THEME[AppConfig.EDITION];
        theme.primary = preset.primary;
        theme.primaryLight = preset.primaryLight;
        theme.accent = preset.accent;
        theme.accentSoft = preset.accentSoft;

        AppConfig.CHART_PALETTE[0] = preset.primary;
        AppConfig.CHART_PALETTE[2] = preset.accent;

        applyCssVariables();
        UI.renderChrome();
        UI.renderPage(AppState.activeRoute);
        showToast(`Theme updated to "${preset.name}".`, "success");
        AuditLog.log("Theme", "Color preset applied", `${preset.name} (${AppConfig.EDITION} edition)`);
    }

    function applyMode() {
        document.body.classList.toggle("dark-mode", AppConfig.UI_MODE === "dark");
        // Charts read their colors from AppConfig.UI_MODE at render time only,
        // so the current page (and any canvases on it) must be rebuilt for
        // the new mode to take effect immediately, without a page refresh.
        UI.renderPage(AppState.activeRoute);
        showToast(`Switched to ${AppConfig.UI_MODE} mode.`, "info");
        AuditLog.log("Theme", "Display mode changed", `Switched to ${AppConfig.UI_MODE} mode`);
    }

    // Pushes the current AppConfig.THEME[edition] values onto :root CSS
    // custom properties, so every component (CSS-driven and Chart.js,
    // which reads getActiveTheme() directly) stays in sync.
    function applyCssVariables() {
        const t = getActiveTheme();
        const root = document.documentElement;
        root.style.setProperty("--color-primary", t.primary);
        root.style.setProperty("--color-primary-light", t.primaryLight);
        root.style.setProperty("--color-accent", t.accent);
        root.style.setProperty("--color-accent-soft", t.accentSoft);
    }

    // Called once at bootstrap to make sure CSS vars match config.js
    // defaults (in case they were customized before app.js loads).
    function init() {
        applyCssVariables();
        document.body.classList.toggle("dark-mode", AppConfig.UI_MODE === "dark");
    }

    return { template, bind, applyPreset, applyMode, applyCssVariables, init };
})();
