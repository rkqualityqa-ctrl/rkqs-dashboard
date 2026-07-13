/*
--------------------------------------------------
Module Name : Report Engine
File Name   : reports.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Generate printable / exportable management reports from
              AppState.kpis (never reads Excel directly).
Dependencies: state.js, kpi.js, helpers.js
--------------------------------------------------
*/

const ReportsEngine = (function () {

    const REPORT_TYPES = [
        { key: "daily", label: "Daily Report" },
        { key: "plant", label: "Plant Report" },
        { key: "customer", label: "Customer Report" },
        { key: "part", label: "Part Report" },
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

    function render(activeKey = "daily") {
        const rows = FilterEngine.getFilteredData();
        const kpis = KpiEngine.recalculateAll(rows);
        const body = document.getElementById("reportBody");

        const builders = {
            daily: () => reportTable(["Date", "Defect %", "FPY"], kpis.trend.map(t => [t.label, Helpers.formatPercent(t.defectPercent), Helpers.formatPercent(100 - t.defectPercent)])),
            plant: () => reportTable(["Plant", "Production", "Inspection", "Defect Qty", "Defect %", "FPY"], kpis.byPlant.map(p => [p.name, Helpers.formatNumber(p.productionQty), Helpers.formatNumber(p.inspectionQty), Helpers.formatNumber(p.defectQty), Helpers.formatPercent(p.defectPercent), Helpers.formatPercent(p.fpy)])),
            customer: () => reportTable(["Customer", "Production", "Defect Qty", "Defect %"], kpis.byCustomer.map(c => [c.name, Helpers.formatNumber(c.productionQty), Helpers.formatNumber(c.defectQty), Helpers.formatPercent(c.defectPercent)])),
            part: () => reportTable(["Part No", "Production", "Defect Qty", "Defect %", "FPY"], kpis.byPart.map(p => [p.name, Helpers.formatNumber(p.productionQty), Helpers.formatNumber(p.defectQty), Helpers.formatPercent(p.defectPercent), Helpers.formatPercent(p.fpy)])),
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
