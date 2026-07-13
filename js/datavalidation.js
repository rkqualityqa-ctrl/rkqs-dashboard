/*
--------------------------------------------------
Module Name : Data Validation
File Name   : datavalidation.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Master-only page that surfaces the FULL validation result
              from the most recent Excel import - row-level blank/missing
              mandatory fields and spelling-variant clusters (SRS 20.4) -
              instead of only the brief summary shown in the Import Preview
              modal at upload time. Reads AppState.lastValidation only;
              never re-validates or touches Excel directly.
Dependencies: state.js, helpers.js, SheetJS (xlsx.min.js) for report export
--------------------------------------------------
*/

const DataValidation = (function () {

    const ROW_DISPLAY_CAP = 200;

    function template() {
        const v = AppState.lastValidation;

        if (!v) {
            return `
            <div class="card">
                <div class="card-head"><h3>Data Validation</h3></div>
                <div class="empty-state">No file has been validated in this session yet. Upload an Excel file to see a detailed data quality report here.</div>
            </div>`;
        }

        const rowsWithIssues = v.blankFieldRows.length;
        const totalRecords = AppState.transactions.length;
        const cleanPercent = totalRecords ? Helpers.formatPercent(((totalRecords - rowsWithIssues) / totalRecords) * 100, 1) : "0.00%";

        return `
        <div class="kpi-strip" style="grid-template-columns:repeat(4,1fr);">
            ${summaryCard("Total Records Imported", Helpers.formatNumber(totalRecords), getActiveTheme().info)}
            ${summaryCard("Rows With Issues", Helpers.formatNumber(rowsWithIssues), rowsWithIssues ? getActiveTheme().danger : getActiveTheme().success)}
            ${summaryCard("Blank Mandatory Fields", Helpers.formatNumber(v.totalBlankFieldCount), v.totalBlankFieldCount ? "#E0A100" : getActiveTheme().success)}
            ${summaryCard("Clean Row %", cleanPercent, getActiveTheme().success)}
        </div>

        <div class="card">
            <div class="card-head">
                <h3>Rows With Blank / Missing Mandatory Fields</h3>
                <button class="btn btn-ghost" id="dvExportBtn" ${rowsWithIssues || v.spellingVariantClusters.length ? "" : "disabled"}>Export Validation Report</button>
            </div>
            ${rowsWithIssues ? blankFieldTable(v.blankFieldRows) : `<div class="empty-state">No blank mandatory fields found. Every required column is filled in for all ${Helpers.formatNumber(totalRecords)} imported rows.</div>`}
        </div>

        <div class="card" style="margin-top:18px;">
            <div class="card-head"><h3>Possible Spelling Variations (SRS 20.4)</h3></div>
            <p class="hint">Same real-world value entered with different spelling/casing/spacing across rows (e.g. "Hyundai" vs "hyundai") will be counted as separate entries in filters and charts. Review and standardize these in the source Excel if needed - the dashboard does not modify your data automatically.</p>
            ${v.spellingVariantClusters.length ? spellingTable(v.spellingVariantClusters) : `<div class="empty-state">No likely spelling variations detected.</div>`}
        </div>`;
    }

    function summaryCard(label, value, color) {
        return `
        <div class="kpi-card">
            <div class="kpi-card-top">
                <div>
                    <div class="kpi-label">${label}</div>
                    <div class="kpi-value" style="color:${color}">${value}</div>
                </div>
            </div>
        </div>`;
    }

    function blankFieldTable(blankFieldRows) {
        const shown = blankFieldRows.slice(0, ROW_DISPLAY_CAP);
        const fieldLabelMap = {};
        AppConfig.REQUIRED_COLUMNS.forEach(c => fieldLabelMap[c.key] = c.label);

        return `
        <table class="data-table">
            <thead><tr><th>Excel Row #</th><th>Missing / Blank Fields</th></tr></thead>
            <tbody>
                ${shown.map(r => `
                    <tr>
                        <td>${r.excelRow ? "Row " + r.excelRow : "—"}</td>
                        <td>${r.missingFields.map(f => Helpers.escapeHtml(fieldLabelMap[f] || f)).join(", ")}</td>
                    </tr>`).join("")}
            </tbody>
        </table>
        ${blankFieldRows.length > ROW_DISPLAY_CAP ? `<p class="hint">Showing first ${ROW_DISPLAY_CAP} of ${blankFieldRows.length} rows with issues. Export the full report to see all of them.</p>` : ""}`;
    }

    function spellingTable(clusters) {
        const fieldLabelMap = {};
        AppConfig.REQUIRED_COLUMNS.forEach(c => fieldLabelMap[c.key] = c.label);
        return `
        <table class="data-table">
            <thead><tr><th>Field</th><th>Variants Found</th></tr></thead>
            <tbody>
                ${clusters.map(c => `
                    <tr>
                        <td>${Helpers.escapeHtml(fieldLabelMap[c.field] || c.field)}</td>
                        <td>${c.variants.map(v => `<span style="display:inline-block;background:var(--color-surface-alt);border:1px solid var(--color-border);border-radius:12px;padding:2px 10px;margin:2px 4px 2px 0;font-size:11.5px;">${Helpers.escapeHtml(v)}</span>`).join("")}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
    }

    function bind() {
        const btn = document.getElementById("dvExportBtn");
        if (btn) btn.addEventListener("click", exportValidationReport);
    }

    function exportValidationReport() {
        const v = AppState.lastValidation;
        if (!v) return;

        const fieldLabelMap = {};
        AppConfig.REQUIRED_COLUMNS.forEach(c => fieldLabelMap[c.key] = c.label);

        const wb = XLSX.utils.book_new();

        const blankSheet = v.blankFieldRows.map(r => ({
            "Excel Row #": r.excelRow || "",
            "Missing Fields": r.missingFields.map(f => fieldLabelMap[f] || f).join(", ")
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(blankSheet.length ? blankSheet : [{ "Excel Row #": "", "Missing Fields": "None found" }]), "Blank Fields");

        const spellingSheet = v.spellingVariantClusters.map(c => ({
            "Field": fieldLabelMap[c.field] || c.field,
            "Variants Found": c.variants.join(" / ")
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(spellingSheet.length ? spellingSheet : [{ "Field": "", "Variants Found": "None found" }]), "Spelling Variants");

        const summarySheet = [
            { Metric: "Total Records Imported", Value: AppState.transactions.length },
            { Metric: "Rows With Issues", Value: v.blankFieldRows.length },
            { Metric: "Total Blank Mandatory Fields", Value: v.totalBlankFieldCount },
            { Metric: "Spelling Variant Clusters", Value: v.spellingVariantClusters.length },
            { Metric: "File Name", Value: AppState.importMeta.fileName || "" },
            { Metric: "Imported At", Value: AppState.importMeta.importedAt ? Helpers.formatDate(AppState.importMeta.importedAt) : "" }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), "Summary");

        XLSX.writeFile(wb, `RKQS_DataValidation_Report_${Helpers.todayStamp()}.xlsx`);
        if (typeof AuditLog !== "undefined") {
            AuditLog.log("Import", "Validation report exported", `${v.blankFieldRows.length} row issue(s), ${v.spellingVariantClusters.length} spelling cluster(s)`);
        }
        if (typeof showToast === "function") showToast("Validation report exported.", "success");
    }

    return { template, bind };
})();
