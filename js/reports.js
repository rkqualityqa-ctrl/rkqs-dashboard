/*
--------------------------------------------------
Module Name : Report Engine
File Name   : reports.js
Version     : 1.1
Author      : RK Quality Solutions
Purpose     : Generate printable / exportable management reports from
              AppState.kpis (never reads Excel directly).

              v1.1: completes SRS Section 15's required report list (was
              7 of 15 report types - Daily/Plant/Customer/Part/Defect/
              Pareto/Trend only). Added Weekly, Monthly, Yearly time
              rollups and Department/Process/Production Line/Operator/
              Inspector entity reports, matching the same 15 required by
              the SRS.
Dependencies: state.js, kpi.js, helpers.js
--------------------------------------------------
*/

const ReportsEngine = (function () {

    const REPORT_TYPES = [
        { key: "daily", label: "Daily Report" },
        { key: "weekly", label: "Weekly Report" },
        { key: "monthly", label: "Monthly Report" },
        { key: "yearly", label: "Yearly Report" },
        { key: "plant", label: "Plant Report" },
        { key: "department", label: "Department Report" },
        { key: "process", label: "Process Report" },
        { key: "line", label: "Production Line Report" },
        { key: "customer", label: "Customer Report" },
        { key: "part", label: "Part Report" },
        { key: "operator", label: "Operator Report" },
        { key: "inspector", label: "Inspector Report" },
        { key: "defect", label: "Defect Report" },
        { key: "pareto", label: "Pareto Report" },
        { key: "trend", label: "Trend Report" }
    ];

    function template() {
        return `
        <div class="card">
            <div class="card-head"><h3>Reports Center</h3></div>
            <div class="report-tabs">
                ${REPORT_TYPES.map((r, i) => `<button class="report-tab ${i === 0 ? "active" : ""}" data-report="${r.key}">${r.label}</button>`).join("")}
            </div>
            <div id="reportBody" class="report-body"></div>
            <div class="report-actions">
                <button class="btn btn-ghost" id="reportPrintBtn">Print</button>
                <button class="btn btn-primary" id="reportPdfBtn">Export PDF</button>
            </div>
        </div>`;
    }

    // ---------------------------------------------------------
    // Time-period rollups (Weekly/Monthly/Yearly) - aggregated directly
    // from the filtered transaction rows, not just averaged from the
    // daily trend, so Defect % per period is mathematically correct
    // (total defects / total inspected in that period, not an average
    // of daily percentages).
    // ---------------------------------------------------------
    function weekKeyOf(date) {
        const day = date.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(date); monday.setDate(date.getDate() + diffToMonday);
        return "Week of " + Helpers.formatDate(monday, "DD-MMM-YYYY");
    }
    function monthKeyOf(date) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[date.getMonth()] + "-" + date.getFullYear();
    }
    function yearKeyOf(date) {
        return String(date.getFullYear());
    }

    function aggregateByPeriod(rows, keyFn) {
        const map = {};
        rows.forEach(r => {
            if (!r.date) return;
            const key = keyFn(r.date);
            map[key] = map[key] || { productionQty: 0, inspectionQty: 0, defectQty: 0, seen: new Set(), sortDate: r.date };
            const bucket = map[key];
            bucket.defectQty += r.defectQty || 0;
            if (r.date < bucket.sortDate) bucket.sortDate = r.date;
            const sig = [r.plant, r.partNo, r.line, r.shift].join("|");
            if (!bucket.seen.has(sig)) {
                bucket.seen.add(sig);
                bucket.inspectionQty += r.inspectionQty || 0;
                bucket.productionQty += r.productionQty || 0;
            }
        });
        return Object.entries(map).map(([label, v]) => {
            const defectPercent = Helpers.safeDiv(v.defectQty, v.inspectionQty) * 100;
            return {
                label,
                productionQty: v.productionQty,
                inspectionQty: v.inspectionQty,
                defectQty: v.defectQty,
                defectPercent,
                fpy: 100 - defectPercent,
                sortDate: v.sortDate
            };
        }).sort((a, b) => a.sortDate - b.sortDate);
    }

    function periodTableRows(periods) {
        return periods.map(p => [
            p.label, Helpers.formatNumber(p.productionQty), Helpers.formatNumber(p.inspectionQty),
            Helpers.formatNumber(p.defectQty), Helpers.formatPercent(p.defectPercent), Helpers.formatPercent(p.fpy)
        ]);
    }

    function render(activeKey = "daily") {
        const rows = FilterEngine.getFilteredData();
        const kpis = KpiEngine.recalculateAll(rows);
        const body = document.getElementById("reportBody");

        const periodHeaders = ["Period", "Production", "Inspection", "Defect Qty", "Defect %", "FPY"];
        const entityHeaders = (label) => [label, "Production", "Inspection", "Defect Qty", "Defect %", "FPY"];
        const entityRows = (list) => list.map(x => [
            x.name, Helpers.formatNumber(x.productionQty), Helpers.formatNumber(x.inspectionQty),
            Helpers.formatNumber(x.defectQty), Helpers.formatPercent(x.defectPercent), Helpers.formatPercent(x.fpy)
        ]);

        const builders = {
            daily: () => reportTable(["Date", "Defect %", "FPY"], kpis.trend.map(t => [t.label, Helpers.formatPercent(t.defectPercent), Helpers.formatPercent(100 - t.defectPercent)])),
            weekly: () => reportTable(periodHeaders, periodTableRows(aggregateByPeriod(rows, weekKeyOf))),
            monthly: () => reportTable(periodHeaders, periodTableRows(aggregateByPeriod(rows, monthKeyOf))),
            yearly: () => reportTable(periodHeaders, periodTableRows(aggregateByPeriod(rows, yearKeyOf))),
            plant: () => reportTable(entityHeaders("Plant"), entityRows(kpis.byPlant)),
            department: () => reportTable(entityHeaders("Department"), entityRows(kpis.byDepartment)),
            process: () => reportTable(entityHeaders("Process"), entityRows(kpis.byProcess)),
            line: () => reportTable(entityHeaders("Production Line"), entityRows(kpis.byLine)),
            customer: () => reportTable(["Customer", "Production", "Defect Qty", "Defect %"], kpis.byCustomer.map(c => [c.name, Helpers.formatNumber(c.productionQty), Helpers.formatNumber(c.defectQty), Helpers.formatPercent(c.defectPercent)])),
            part: () => reportTable(["Part No", "Production", "Defect Qty", "Defect %", "FPY"], kpis.byPart.map(p => [p.name, Helpers.formatNumber(p.productionQty), Helpers.formatNumber(p.defectQty), Helpers.formatPercent(p.defectPercent), Helpers.formatPercent(p.fpy)])),
            operator: () => kpis.byOperator.length
                ? reportTable(entityHeaders("Operator"), entityRows(kpis.byOperator))
                : `<div class="empty-state">No Operator data available in the uploaded file.</div>`,
            inspector: () => kpis.byInspector.length
                ? reportTable(entityHeaders("Inspector"), entityRows(kpis.byInspector))
                : `<div class="empty-state">No Inspector data available in the uploaded file.</div>`,
            defect: () => reportTable(["Defect Name", "Qty", "%"], kpis.topDefects.map(d => [d.name, Helpers.formatNumber(d.qty), Helpers.formatPercent(d.percent)])),
            pareto: () => reportTable(["Defect Name", "Qty", "%", "Cumulative %"], kpis.topDefects.map(d => [d.name, Helpers.formatNumber(d.qty), Helpers.formatPercent(d.percent), Helpers.formatPercent(d.cumulativePercent)])),
            trend: () => reportTable(["Date", "Defect %"], kpis.trend.map(t => [t.label, Helpers.formatPercent(t.defectPercent)]))
        };

        body.innerHTML = (builders[activeKey] || builders.daily)();

        document.querySelectorAll(".report-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.report === activeKey);
            tab.onclick = () => render(tab.dataset.report);
        });

        document.getElementById("reportPrintBtn").onclick = () => window.print();
        document.getElementById("reportPdfBtn").onclick = () => ExportEngine.exportElementToPdf(document.querySelector(".report-body"), `RKQS_${activeKey}_report`);
    }

    function reportTable(headers, rows) {
        if (!rows.length) return `<div class="empty-state">No data available for this report.</div>`;
        return `<table class="data-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>`;
    }

    return { template, render, REPORT_TYPES };
})();
