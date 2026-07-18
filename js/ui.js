/*
--------------------------------------------------
Module Name : UI & Dashboard Renderer
File Name   : ui.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Renders sidebar, header, filter panel, KPI cards, tables,
              and dashboard pages. Performs NO business calculations -
              consumes only AppState.kpis / AppState.masters.
Dependencies: state.js, config.js, helpers.js, kpi.js, charts.js
--------------------------------------------------
*/

const UI = (function () {

    // ---------------------------------------------------------
    // Entity dashboards share one layout: KPI strip + bar chart +
    // trend + ranking table. This table drives that shared renderer.
    // ---------------------------------------------------------
    const ENTITY_PAGES = {
        plant:      { title: "Plant Dashboard",       kpiKey: "byPlant",      groupField: "plant",     nameLabel: "Plant" },
        department: { title: "Department Dashboard",  kpiKey: "byDepartment", groupField: "department",nameLabel: "Department" },
        process:    { title: "Process Dashboard",     kpiKey: "byProcess",    groupField: "process",   nameLabel: "Process" },
        line:       { title: "Production Line Dashboard", kpiKey: "byLine",   groupField: "line",      nameLabel: "Production Line" },
        customer:   { title: "Customer Dashboard",    kpiKey: "byCustomer",   groupField: "customer",  nameLabel: "Customer" },
        part:       { title: "Part Dashboard",         kpiKey: "byPart",       groupField: "partNo",    nameLabel: "Part No" },
        operator:   { title: "Operator Dashboard",     kpiKey: "byOperator",   groupField: "operator",  nameLabel: "Operator" },
        inspector:  { title: "Inspector Dashboard",     kpiKey: "byInspector",  groupField: "inspector", nameLabel: "Inspector" }
    };

    const SIDEBAR_ITEMS = [
        { route: "executive", label: "Executive Dashboard", icon: "home" },
        { route: "plant", label: "Plant Dashboard", icon: "building" },
        { route: "department", label: "Department Dashboard", icon: "grid" },
        { route: "process", label: "Process Dashboard", icon: "cpu" },
        { route: "line", label: "Production Line", icon: "flow" },
        { route: "customer", label: "Customer Dashboard", icon: "users" },
        { route: "part", label: "Part Dashboard", icon: "box" },
        { route: "operator", label: "Operator Dashboard", icon: "user" },
        { route: "inspector", label: "Inspector Dashboard", icon: "search" },
        { route: "defect", label: "Defect / Pareto", icon: "alert" },
        { route: "heatmap", label: "Heat Map", icon: "heatmap" },
        { route: "reports", label: "Reports Center", icon: "doc" },
        { route: "export", label: "Export Center", icon: "download" }
    ];

    const MASTER_ONLY_ITEMS = [
        { route: "filemanagement", label: "File Management", icon: "file" },
        { route: "datavalidation", label: "Data Validation", icon: "check" },
        { route: "clientmanagement", label: "Client Management", icon: "clients" },
        { route: "whitelabel", label: "White Label Generator", icon: "package" },
        { route: "thememanager", label: "Theme Manager", icon: "palette" },
        { route: "branding", label: "Branding & Settings", icon: "settings" },
        { route: "systemsettings", label: "System Settings", icon: "sliders" },
        { route: "auditlogs", label: "Audit Logs", icon: "audit" }
    ];

    const ICONS = {
        home: '<circle cx="12" cy="12" r="9"/>',
        building: '<rect x="4" y="3" width="16" height="18" rx="1"/><line x1="9" y1="7" x2="9" y2="7"/>',
        grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
        cpu: '<rect x="6" y="6" width="12" height="12" rx="1"/><line x1="12" y1="1" x2="12" y2="4"/>',
        flow: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h8a2 2 0 012 2v8"/>',
        users: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6"/><circle cx="17" cy="9" r="2.5"/>',
        box: '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
        search: '<circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/>',
        alert: '<path d="M12 2L2 20h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/>',
        doc: '<path d="M6 2h9l5 5v15H6z"/><line x1="9" y1="12" x2="16" y2="12"/>',
        download: '<path d="M12 3v12"/><path d="M6 11l6 6 6-6"/><path d="M4 21h16"/>',
        package: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
        heatmap: '<rect x="3" y="3" width="5" height="5"/><rect x="9.5" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="9.5" width="5" height="5"/><rect x="9.5" y="9.5" width="5" height="5"/><rect x="16" y="9.5" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="9.5" y="16" width="5" height="5"/><rect x="16" y="16" width="5" height="5"/>',
        palette: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="10" cy="14.5" r="1.3" fill="currentColor" stroke="none"/><path d="M12 21a9 9 0 010-18" fill="none"/>',
        file: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>',
        clients: '<rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="3" y1="12" x2="21" y2="12"/>',
        audit: '<path d="M9 2h6a1 1 0 011 1v2H8V3a1 1 0 011-1z"/><rect x="5" y="4" width="14" height="18" rx="1.5"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/><path d="M8.5 11l.7.7 1.3-1.4" stroke-width="1.4"/>',
        check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/>',
        sliders: '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"/>'
    };

    function icon(name, cls = "nav-icon") {
        return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.home}</svg>`;
    }

    // ---------------------------------------------------------
    // HEADER + SIDEBAR (chrome), rendered once, re-skinned on brand change
    // ---------------------------------------------------------
    function renderChrome() {
        const brand = getActiveBranding();
        const isMaster = AppConfig.EDITION === "master";

        document.getElementById("brandLogo").src = brand.logo;
        document.getElementById("brandName").textContent = brand.companyName;
        document.getElementById("brandTagline").textContent = brand.tagline || "";
        document.getElementById("footerBrand").textContent = `© ${new Date().getFullYear()} ${brand.companyName}. All Rights Reserved.`;
        document.getElementById("footerEdition").textContent = `${brand.dashboardLabel} · Version ${AppConfig.APP_VERSION}`;

        // The header's user chip is decorative (this app has no login
        // system), but showing "Super Administrator" on a client's own
        // dashboard was misleading - they aren't one. Reflect the actual
        // edition instead.
        const userNameEl = document.getElementById("userChipName");
        const userRoleEl = document.getElementById("userRoleLabel");
        const userAvatarEl = document.getElementById("userChipAvatar");
        if (userNameEl && userRoleEl && userAvatarEl) {
            if (isMaster) {
                userNameEl.textContent = "Admin";
                userRoleEl.textContent = "Super Administrator";
                userAvatarEl.textContent = "A";
            } else {
                userNameEl.textContent = "User";
                userRoleEl.textContent = "Quality Team";
                userAvatarEl.textContent = "U";
            }
        }

        const items = SIDEBAR_ITEMS.map(renderNavItem).join("");
        const masterItems = isMaster
            ? `<div class="nav-section-label">Master Controls</div>` + MASTER_ONLY_ITEMS.map(renderNavItem).join("")
            : "";
        document.getElementById("sidebarNav").innerHTML = items + masterItems;

        document.querySelectorAll(".nav-item").forEach(el => {
            el.addEventListener("click", () => {
                Router.go(el.dataset.route);
                if (window.matchMedia("(max-width: 860px)").matches) {
                    document.getElementById("appShell").classList.remove("mobile-nav-open");
                }
            });
        });
    }

    function renderNavItem(item) {
        const active = AppState.activeRoute === item.route ? "active" : "";
        return `<button class="nav-item ${active}" data-route="${item.route}">${icon(item.icon)}<span>${item.label}</span></button>`;
    }

    function highlightActiveNav() {
        document.querySelectorAll(".nav-item").forEach(el => {
            el.classList.toggle("active", el.dataset.route === AppState.activeRoute);
        });
        const currentTitle = document.getElementById("pageTitle");
        const all = [...SIDEBAR_ITEMS, ...MASTER_ONLY_ITEMS];
        const found = all.find(i => i.route === AppState.activeRoute);
        currentTitle.textContent = found ? found.label : "Dashboard";
    }

    // ---------------------------------------------------------
    // FILTER PANEL
    // ---------------------------------------------------------
    const DATE_PRESETS = [
        { key: "all", label: "All Time" },
        { key: "today", label: "Today" },
        { key: "thisWeek", label: "This Week" },
        { key: "thisMonth", label: "This Month" },
        { key: "thisQuarter", label: "This Quarter" },
        { key: "thisYear", label: "This Year" },
        { key: "last30", label: "Last 30 Days" },
        { key: "custom", label: "Custom Range" }
    ];

    function renderFilterPanel() {
        const m = AppState.masters;
        // Primary filters - always visible (most commonly used).
        const primaryFilterDefs = [
            ["plant", "Plant", m.plant], ["process", "Process", m.process],
            ["partNo", "Part", m.partNo], ["customer", "Customer", m.customer],
            ["shift", "Shift", m.shift]
        ];
        // Additional filters per SRS Section 11 (Organization/Production/
        // Quality groups) - tucked behind "More Filters" so the bar doesn't
        // turn into 11 dropdowns in a row by default, but still fully
        // available; FilterEngine and AppState.filters already support all
        // of these regardless of whether they're shown here.
        const moreFilterDefs = [
            ["department", "Department", m.department],
            ["line", "Production Line", m.line],
            ["operator", "Operator", m.operator],
            ["inspector", "Inspector", m.inspector],
            ["defectName", "Defect Name", m.defectName],
            ["disposition", "Disposition", m.disposition]
        ];
        const activeMoreCount = moreFilterDefs.filter(([key]) => AppState.filters[key] && AppState.filters[key] !== "All").length;

        const preset = AppState.filters.datePreset || "all";
        const fromVal = AppState.filters.dateFrom ? toDateInputValue(AppState.filters.dateFrom) : "";
        const toVal = AppState.filters.dateTo ? toDateInputValue(AppState.filters.dateTo) : "";

        const dateRangeHtml = `
            <div class="date-range-field">
                <label>Date Range</label>
                <div class="date-range-controls">
                    <select id="dateRangePreset">
                        ${DATE_PRESETS.map(p => `<option value="${p.key}" ${preset === p.key ? "selected" : ""}>${p.label}</option>`).join("")}
                    </select>
                    <div class="date-range-custom" id="dateRangeCustom" style="${preset === "custom" ? "" : "display:none"}">
                        <input type="date" id="dateRangeFrom" value="${fromVal}">
                        <span>to</span>
                        <input type="date" id="dateRangeTo" value="${toVal}">
                    </div>
                </div>
            </div>`;

        const filterFieldHtml = ([key, label, options]) => `
            <div class="filter-field">
                <label>${label}</label>
                <select data-filter="${key}">
                    <option value="All">All</option>
                    ${options.map(o => `<option value="${Helpers.escapeHtml(o)}" ${AppState.filters[key] === o ? "selected" : ""}>${Helpers.escapeHtml(o)}</option>`).join("")}
                </select>
            </div>`;

        const el = document.getElementById("filterPanel");
        el.innerHTML = dateRangeHtml
            + primaryFilterDefs.map(filterFieldHtml).join("")
            + `<button class="btn btn-ghost" id="moreFiltersBtn" type="button">More Filters${activeMoreCount ? ` (${activeMoreCount})` : ""} <span id="moreFiltersCaret">▾</span></button>`
            + `<button class="btn btn-ghost" id="clearFiltersBtn">Clear All</button>`
            + `<div class="more-filters-row" id="moreFiltersRow" style="display:none">${moreFilterDefs.map(filterFieldHtml).join("")}</div>`;

        el.querySelectorAll("select[data-filter]").forEach(sel => {
            sel.addEventListener("change", () => {
                FilterEngine.setFilter(sel.dataset.filter, sel.value);
            });
        });
        document.getElementById("clearFiltersBtn").addEventListener("click", () => FilterEngine.clearFilters());

        const moreBtn = document.getElementById("moreFiltersBtn");
        const moreRow = document.getElementById("moreFiltersRow");
        // Auto-expand if any "more" filter is already active (e.g. after a
        // page reload with filters restored), so the active choice is
        // visible rather than hidden behind a collapsed toggle.
        if (activeMoreCount > 0) {
            moreRow.style.display = "flex";
            moreBtn.classList.add("active");
        }
        moreBtn.addEventListener("click", () => {
            const isOpen = moreRow.style.display !== "none";
            moreRow.style.display = isOpen ? "none" : "flex";
            moreBtn.classList.toggle("active", !isOpen);
        });

        document.getElementById("dateRangePreset").addEventListener("change", (e) => {
            const val = e.target.value;
            document.getElementById("dateRangeCustom").style.display = val === "custom" ? "flex" : "none";
            if (val !== "custom") FilterEngine.setDateRangePreset(val);
        });
        document.getElementById("dateRangeFrom").addEventListener("change", applyCustomDateRange);
        document.getElementById("dateRangeTo").addEventListener("change", applyCustomDateRange);
    }

    function applyCustomDateRange() {
        const from = document.getElementById("dateRangeFrom").value;
        const to = document.getElementById("dateRangeTo").value;
        FilterEngine.setDateRangePreset("custom", from, to);
    }

    function toDateInputValue(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    // ---------------------------------------------------------
    // KPI CARD STRIP (shared across all dashboards)
    // ---------------------------------------------------------
    function kpiCardHtml(id, label, value, trendClass, iconSvg, sparkColor) {
        return `
        <div class="kpi-card">
            <div class="kpi-card-top">
                <div>
                    <div class="kpi-label">${label}</div>
                    <div class="kpi-value">${value}</div>
                </div>
                <div class="kpi-icon" style="background:${sparkColor}22;color:${sparkColor}">${iconSvg}</div>
            </div>
            <div class="kpi-spark"><canvas id="${id}"></canvas></div>
        </div>`;
    }

    function renderKpiStrip(containerId, core) {
        const t = getActiveTheme();
        const cards = [
            { id: "sparkProd", label: "Production Qty", value: Helpers.formatNumber(core.productionQty), color: t.info, icon: "building" },
            { id: "sparkInsp", label: "Inspection Qty", value: Helpers.formatNumber(core.inspectionQty), color: t.success, icon: "search" },
            { id: "sparkDefQty", label: "Defect Qty", value: Helpers.formatNumber(core.defectQty), color: t.danger, icon: "alert" },
            { id: "sparkDefPct", label: "Defect %", value: Helpers.formatPercent(core.defectPercent), color: "#E0A100", icon: "grid" },
            { id: "sparkFpy", label: "FPY", value: Helpers.formatPercent(core.fpy), color: "#7C4DFF", icon: "home" },
            { id: "sparkRework", label: "Rework %", value: Helpers.formatPercent(core.reworkPercent), color: "#00B8D9", icon: "flow" }
        ];
        document.getElementById(containerId).innerHTML = cards.map(c => kpiCardHtml(c.id, c.label, c.value, "", icon(c.icon, "kpi-icon-svg"), c.color)).join("");
        cards.forEach(c => {
            const trendData = AppState.kpis.trend && AppState.kpis.trend.length
                ? AppState.kpis.trend.map(t2 => t2.defectPercent)
                : [0, 0, 0, 0, 0];
            ChartEngine.sparkline(c.id, trendData, c.color);
        });
    }

    // ---------------------------------------------------------
    // TABLE renderer (generic ranking table)
    // ---------------------------------------------------------
    function rankingTable(rows, nameLabel) {
        if (!rows.length) return `<div class="empty-state">No data available for the current filters.</div>`;
        return `
        <table class="data-table">
            <thead><tr><th>#</th><th>${nameLabel}</th><th>Defect Qty</th><th>Defect %</th><th>FPY</th></tr></thead>
            <tbody>
                ${rows.slice(0, 10).map((r, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${Helpers.escapeHtml(r.name)}</td>
                        <td>${Helpers.formatNumber(r.defectQty)}</td>
                        <td>${Helpers.formatPercent(r.defectPercent)}</td>
                        <td>${Helpers.formatPercent(r.fpy)}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
    }

    function alertsPanel(alerts) {
        if (!alerts.length) return `<div class="empty-state">No active alerts. All KPIs within threshold.</div>`;
        const typeClass = { danger: "alert-danger", warning: "alert-warning", info: "alert-info" };
        return alerts.map(a => `
            <div class="alert-row ${typeClass[a.type]}">
                ${icon("alert", "alert-row-icon")}
                <div><div class="alert-title">${Helpers.escapeHtml(a.title)}</div><div class="alert-detail">${Helpers.escapeHtml(a.detail)}</div></div>
            </div>`).join("");
    }

    function dataSummaryPanel() {
        const m = AppState.masters;
        const meta = AppState.importMeta;
        const rows = [
            ["Total Records", Helpers.formatNumber(AppState.transactions.length)],
            ["Total Plants", m.plant.length],
            ["Total Customers", m.customer.length],
            ["Total Parts", m.partNo.length],
            ["Total Processes", m.process.length],
            ["Total Operators", m.operator.length],
            ["Total Inspectors", m.inspector.length],
            ["Last Data Import", meta.importedAt ? Helpers.formatDate(meta.importedAt) : "—"]
        ];
        return rows.map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
    }

    // ---------------------------------------------------------
    // MAIN PAGE RENDER DISPATCHER
    // ---------------------------------------------------------
    function renderPage(route) {
        AppState.activeRoute = route;

        // Remember the last actual DATA dashboard visited (not a utility
        // page like Export Center, File Management, Settings, etc.) - the
        // Export Engine needs this because Export Center's own content
        // occupies #dashboardContent while the user is on that page, so it
        // otherwise has no way to know which dashboard to export.
        const UTILITY_ROUTES = ["reports", "export", "whitelabel", "thememanager", "filemanagement", "datavalidation", "clientmanagement", "branding", "systemsettings", "auditlogs"];
        if (!UTILITY_ROUTES.includes(route)) {
            AppState.lastDashboardRoute = route;
        }

        highlightActiveNav();
        const main = document.getElementById("dashboardContent");

        // Destroy every chart left over from the previously rendered page.
        // Their canvases are about to be removed from the DOM (main.innerHTML
        // is reassigned below/in each branch) - without this, AppState.charts
        // keeps accumulating dangling Chart.js instances pointing at detached
        // canvases from every page visited in the session, which is exactly
        // what broke "Export Charts as PNG" (it tried to export all of them,
        // not just the ones currently on screen).
        Object.keys(AppState.charts).forEach(id => ChartEngine.destroy(id));

        // These routes are configuration/utility pages that don't depend on
        // any Excel data being loaded - a Master Administrator should be
        // able to open File Management, Theme Manager, White Label
        // Generator, or Branding & Settings even before the first upload.
        const DATA_INDEPENDENT_ROUTES = ["filemanagement", "datavalidation", "clientmanagement", "thememanager", "whitelabel", "branding", "systemsettings", "auditlogs"];

        // The "Active Filters" bar (Date Range/Plant/Process/.../More
        // Filters) only makes sense on pages whose content actually reads
        // AppState.filters - the data dashboards, Reports Center, and
        // Export Center (both build their output from the filtered
        // dataset). It has nothing to do with File Management, Data
        // Validation, Client Management, White Label Generator, Theme
        // Manager, Branding & Settings, System Settings, or Audit Logs, so
        // showing it there was just confusing clutter with no effect.
        const filterBarEl = document.querySelector(".filter-bar");
        if (filterBarEl) filterBarEl.style.display = DATA_INDEPENDENT_ROUTES.includes(route) ? "none" : "flex";

        if (!AppState.transactions.length && !DATA_INDEPENDENT_ROUTES.includes(route)) {
            main.innerHTML = emptyImportState();
            bindUploadButtons();
            return;
        }

        if (route === "executive") { main.innerHTML = executiveTemplate(); renderExecutive(); }
        else if (route === "defect") { main.innerHTML = defectTemplate(); renderDefect(); }
        else if (route === "heatmap") { main.innerHTML = heatmapTemplate(); renderHeatmap(); }
        else if (route === "reports") { main.innerHTML = ReportsEngine.template(); ReportsEngine.render(); }
        else if (route === "export") { main.innerHTML = ExportEngine.template(); ExportEngine.bind(); }
        else if (route === "whitelabel") { main.innerHTML = WhiteLabelEngine.template(); WhiteLabelEngine.bind(); }
        else if (route === "thememanager") { main.innerHTML = ThemeManager.template(); ThemeManager.bind(); }
        else if (route === "filemanagement") { main.innerHTML = FileManagement.template(); FileManagement.bind(); }
        else if (route === "datavalidation") { main.innerHTML = DataValidation.template(); DataValidation.bind(); }
        else if (route === "clientmanagement") { main.innerHTML = ClientManagement.template(); ClientManagement.bind(); }
        else if (route === "branding") { main.innerHTML = brandingTemplate(); bindBranding(); }
        else if (route === "systemsettings") { main.innerHTML = SystemSettings.template(); SystemSettings.bind(); }
        else if (route === "auditlogs") { main.innerHTML = AuditLog.template(); AuditLog.bind(); }
        else if (ENTITY_PAGES[route]) { main.innerHTML = entityTemplate(route); renderEntity(route); }
        else { main.innerHTML = executiveTemplate(); renderExecutive(); }

        bindUploadButtons();
    }

    function emptyImportState() {
        return `
        <div class="empty-import">
            ${icon("download", "empty-import-icon")}
            <h2>Upload an Excel file to get started</h2>
            <p>Upload your Daily Rejection / Rework Excel file to generate the dashboard automatically.</p>
            <button class="btn btn-primary" id="emptyUploadBtn">Upload Excel</button>
        </div>`;
    }

    function kpiRow(id) { return `<div class="kpi-strip" id="${id}"></div>`; }

    function executiveTemplate() {
        return `
        ${kpiRow("execKpiStrip")}
        <div class="grid-3">
            <div class="card"><div class="card-head"><h3>Defect Qty by Top 5 Defects</h3></div><div class="chart-box"><canvas id="execTopDefects"></canvas></div></div>
            <div class="card"><div class="card-head"><h3>Defect % Trend</h3></div><div class="chart-box"><canvas id="execTrend"></canvas></div></div>
            <div class="card"><div class="card-head"><h3>Defect Qty by Plant</h3></div><div class="chart-box"><canvas id="execByPlant"></canvas></div><div id="execPlantLegend" class="legend-list"></div></div>
        </div>
        <div class="grid-3">
            <div class="card"><div class="card-head"><h3>Top 10 Parts by Defect Qty</h3></div><div id="execPartTable"></div></div>
            <div class="card"><div class="card-head"><h3>Recent Alerts</h3></div><div id="execAlerts"></div></div>
            <div class="card"><div class="card-head"><h3>Data Summary</h3></div><div id="execSummary"></div></div>
        </div>
        <div class="grid-2">
            <div class="card"><div class="card-head"><h3>Disposition Breakdown</h3></div><div class="chart-box"><canvas id="execDispositionPie"></canvas></div></div>
            <div class="card"><div class="card-head"><h3>Plant-wise Disposition Breakdown</h3></div><div class="chart-box"><canvas id="execPlantDispositionStack"></canvas></div></div>
        </div>`;
    }

    function renderExecutive() {
        const rows = FilterEngine.getFilteredData();
        const kpis = KpiEngine.recalculateAll(rows);
        renderKpiStrip("execKpiStrip", kpis.core);

        const top5 = kpis.topDefects.slice(0, 5);
        ChartEngine.barChart("execTopDefects", top5.map(d => d.name), top5.map(d => d.qty), { color: getActiveTheme().primary });

        ChartEngine.lineChart("execTrend", kpis.trend.map(t => t.label), kpis.trend.map(t => Math.round(t.defectPercent * 100) / 100), { color: getActiveTheme().accent });

        const byPlant = kpis.byPlant;
        ChartEngine.doughnutChart("execByPlant", byPlant.map(p => p.name), byPlant.map(p => p.defectQty));
        const total = byPlant.reduce((s, p) => s + p.defectQty, 0) || 1;
        document.getElementById("execPlantLegend").innerHTML = byPlant.map((p, i) => `
            <div class="legend-item"><span class="legend-dot" style="background:${AppConfig.CHART_PALETTE[i % AppConfig.CHART_PALETTE.length]}"></span>
            <span>${Helpers.escapeHtml(p.name)}</span><strong>${Helpers.formatNumber(p.defectQty)} (${Helpers.formatPercent(Helpers.safeDiv(p.defectQty, total) * 100, 1)})</strong></div>`).join("");

        document.getElementById("execPartTable").innerHTML = rankingTable(kpis.byPart, "Part No");
        document.getElementById("execAlerts").innerHTML = alertsPanel(kpis.alerts);
        document.getElementById("execSummary").innerHTML = dataSummaryPanel();

        // Pie Chart - Disposition Breakdown (SRS Section 14 chart type)
        const disp = kpis.dispositionBreakdown;
        ChartEngine.pieChart("execDispositionPie", disp.map(d => d.name), disp.map(d => d.qty));

        // Stacked Bar Chart - Plant x Disposition (SRS Section 14 chart type)
        const pd = kpis.plantDispositionBreakdown;
        const stackColors = AppConfig.CHART_PALETTE;
        ChartEngine.stackedBarChart("execPlantDispositionStack", pd.plants,
            pd.series.map((s, i) => ({ label: s.disposition, data: s.data, color: stackColors[i % stackColors.length] })));
    }

    function entityTemplate(route) {
        const def = ENTITY_PAGES[route];
        return `
        ${kpiRow("entKpiStrip")}
        <div class="grid-2">
            <div class="card"><div class="card-head"><h3>${def.nameLabel}-wise Defect Qty</h3></div><div class="chart-box"><canvas id="entBar"></canvas></div></div>
            <div class="card"><div class="card-head"><h3>Defect % Trend</h3></div><div class="chart-box"><canvas id="entTrend"></canvas></div></div>
        </div>
        <div class="card"><div class="card-head"><h3>${def.title} - Ranking</h3></div><div id="entTable"></div></div>`;
    }

    function renderEntity(route) {
        const def = ENTITY_PAGES[route];
        const rows = FilterEngine.getFilteredData();
        const kpis = KpiEngine.recalculateAll(rows);
        renderKpiStrip("entKpiStrip", kpis.core);

        const grouped = kpis[def.kpiKey];
        if (!grouped.length) {
            document.getElementById("entTable").innerHTML = `<div class="empty-state">No Operator/Inspector data available in the uploaded file.</div>`;
            return;
        }
        // Horizontal Bar Chart (SRS Section 14 chart type) - reads better
        // than a vertical bar for the long labels these rankings often have
        // (customer names, part numbers, operator/inspector names).
        ChartEngine.horizontalBarChart("entBar", grouped.slice(0, 10).map(g => g.name), grouped.slice(0, 10).map(g => g.defectQty), { color: getActiveTheme().primary });
        ChartEngine.lineChart("entTrend", kpis.trend.map(t => t.label), kpis.trend.map(t => Math.round(t.defectPercent * 100) / 100), { color: getActiveTheme().accent });
        document.getElementById("entTable").innerHTML = rankingTable(grouped, def.nameLabel);
    }

    function defectTemplate() {
        return `
        ${kpiRow("defKpiStrip")}
        <div class="card"><div class="card-head"><h3>Pareto Analysis - Top Defects</h3></div><div class="chart-box chart-box-tall"><canvas id="defPareto"></canvas></div></div>
        <div class="card"><div class="card-head"><h3>Defect Ranking</h3></div><div id="defTable"></div></div>`;
    }

    function renderDefect() {
        const rows = FilterEngine.getFilteredData();
        const kpis = KpiEngine.recalculateAll(rows);
        renderKpiStrip("defKpiStrip", kpis.core);
        ChartEngine.paretoChart("defPareto", kpis.topDefects);
        document.getElementById("defTable").innerHTML = `
            <table class="data-table">
                <thead><tr><th>#</th><th>Defect Name</th><th>Qty</th><th>%</th><th>Cumulative %</th></tr></thead>
                <tbody>${kpis.topDefects.map((d, i) => `<tr><td>${i + 1}</td><td>${Helpers.escapeHtml(d.name)}</td><td>${Helpers.formatNumber(d.qty)}</td><td>${Helpers.formatPercent(d.percent)}</td><td>${Helpers.formatPercent(d.cumulativePercent)}</td></tr>`).join("")}</tbody>
            </table>`;
    }

    function heatmapTemplate() {
        return `
        ${kpiRow("hmKpiStrip")}
        <div class="card">
            <div class="card-head"><h3>Defect % Heat Map — Plant × Date (last 21 days in filtered data)</h3></div>
            <div id="heatmapBody"></div>
        </div>`;
    }

    function heatColor(pct) {
        if (pct === null || pct === undefined) return null;
        // green (low) -> amber -> red (high), clamped at 15% defect for full red
        const clamped = Math.max(0, Math.min(pct, 15));
        const ratio = clamped / 15;
        const hue = 140 - ratio * 140; // 140=green -> 0=red
        return `hsl(${hue}, 70%, 45%)`;
    }

    function renderHeatmap() {
        const rows = FilterEngine.getFilteredData();
        const kpis = KpiEngine.recalculateAll(rows);
        renderKpiStrip("hmKpiStrip", kpis.core);

        const { dates, matrix } = kpis.heatmap;
        const body = document.getElementById("heatmapBody");

        if (!matrix.length || !dates.length) {
            body.innerHTML = `<div class="empty-state">Not enough dated records in the current filter selection to build a heat map.</div>`;
            return;
        }

        const rowsHtml = matrix.map(row => `
            <tr>
                <td class="row-head">${Helpers.escapeHtml(row.plant)}</td>
                ${row.cells.map(c => {
                    if (c.defectPercent === null) return `<td><div class="heatmap-cell empty">—</div></td>`;
                    const color = heatColor(c.defectPercent);
                    return `<td><div class="heatmap-cell" style="background:${color}" title="${Helpers.escapeHtml(c.date)}: ${Helpers.formatPercent(c.defectPercent)}">${c.defectPercent.toFixed(1)}</div></td>`;
                }).join("")}
            </tr>`).join("");

        body.innerHTML = `
            <div class="heatmap-wrap">
                <table class="heatmap-table">
                    <thead><tr><th class="row-head">Plant</th>${dates.map(d => `<th>${d.replace(/-\d{4}$/, "").replace(/^0/, "")}</th>`).join("")}</tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            <div class="heatmap-legend">
                <span>Low Defect %</span>
                <div class="heatmap-legend-scale">
                    <span style="background:${heatColor(0)}"></span><span style="background:${heatColor(4)}"></span>
                    <span style="background:${heatColor(8)}"></span><span style="background:${heatColor(12)}"></span>
                    <span style="background:${heatColor(15)}"></span>
                </div>
                <span>High Defect %</span>
            </div>`;
    }

    function brandingTemplate() {
        const b = AppConfig.BRANDING.master;
        return `
        <div class="card" style="max-width:640px">
            <div class="card-head"><h3>Branding & Settings (Master Only)</h3></div>
            <div class="branding-form">
                <label>Company Name</label>
                <input type="text" id="brandNameInput" value="${Helpers.escapeHtml(b.companyName)}">
                <label>Tagline</label>
                <input type="text" id="brandTaglineInput" value="${Helpers.escapeHtml(b.tagline)}">
                <p class="hint">These settings control the Master Dashboard identity. Use White Label Generator to create client packages with independent branding.</p>
                <button class="btn btn-primary" id="saveBrandingBtn">Save Settings</button>
            </div>
        </div>`;
    }

    function bindBranding() {
        const btn = document.getElementById("saveBrandingBtn");
        if (!btn) return;
        btn.addEventListener("click", () => {
            const newName = document.getElementById("brandNameInput").value;
            const newTagline = document.getElementById("brandTaglineInput").value;
            AppConfig.BRANDING.master.companyName = newName;
            AppConfig.BRANDING.master.tagline = newTagline;
            renderChrome();
            alert("Branding updated.");
            AuditLog.log("Branding", "Master branding updated", `Company name: ${newName}`);
        });
    }

    function bindUploadButtons() {
        ["uploadBtn", "emptyUploadBtn"].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = () => document.getElementById("excelFileInput").click();
        });
    }

    return {
        renderChrome, renderFilterPanel, renderPage, renderKpiStrip, rankingTable,
        alertsPanel, dataSummaryPanel, icon, ENTITY_PAGES
    };
})();
