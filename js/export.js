/*
--------------------------------------------------
Module Name : Export Engine
File Name   : export.js
Version     : 1.2
Author      : RK Quality Solutions
Purpose     : Generate PDF / Excel / PNG exports from AppState data.
              Never accesses the original uploaded Excel file.

              BUGFIX (v1.2): "Export Dashboard as PDF" and "Export Charts
              as PNG" were capturing whatever is currently rendered inside
              #dashboardContent - but while the user is on the Export
              Center page itself, #dashboardContent holds the Export
              Center's own 3 cards, not an actual dashboard. That's why
              PDFs only contained the Export cards, and PNG export always
              reported "No charts are currently visible" (Export Center
              has none). Fix: the user now picks which dashboard to export
              from a dropdown; the engine temporarily renders that
              dashboard off-screen-equivalent (same #dashboardContent,
              briefly swapped), captures/exports it with its real KPIs,
              charts and tables, then restores the Export Center view.
Dependencies: state.js, helpers.js, ui.js, jsPDF, html2canvas, SheetJS
--------------------------------------------------
*/

const ExportEngine = (function () {

    // Every route that represents a real data dashboard (as opposed to a
    // utility/config page). Mirrors the routes defined in ui.js.
    const DASHBOARD_ROUTES = [
        { route: "executive", label: "Executive Dashboard" },
        { route: "plant", label: "Plant Dashboard" },
        { route: "department", label: "Department Dashboard" },
        { route: "process", label: "Process Dashboard" },
        { route: "line", label: "Production Line Dashboard" },
        { route: "customer", label: "Customer Dashboard" },
        { route: "part", label: "Part Dashboard" },
        { route: "operator", label: "Operator Dashboard" },
        { route: "inspector", label: "Inspector Dashboard" },
        { route: "defect", label: "Defect / Pareto Dashboard" },
        { route: "heatmap", label: "Heat Map" }
    ];

    function dashboardSelectHtml() {
        const current = AppState.lastDashboardRoute || "executive";
        return `
            <div class="filter-field" style="margin-bottom:16px; max-width:320px;">
                <label>Dashboard to Export</label>
                <select id="expDashboardSelect">
                    ${DASHBOARD_ROUTES.map(d => `<option value="${d.route}" ${d.route === current ? "selected" : ""}>${d.label}</option>`).join("")}
                </select>
            </div>`;
    }

    function template() {
        return `
        ${dashboardSelectHtml()}
        <div class="grid-3">
            <div class="card export-card">
                <div class="card-head"><h3>Export Dashboard as PDF</h3></div>
                <p>Exports the selected dashboard above (KPIs, charts, tables) as a multi-page A4 PDF, exactly as it looks on screen, including your logo and applied filters.</p>
                <button class="btn btn-primary" id="expPdfBtn">Export PDF</button>
            </div>
            <div class="card export-card">
                <div class="card-head"><h3>Export Data as Excel</h3></div>
                <p>Exports the filtered dataset, a KPI summary sheet, and ranking tables as a new .xlsx workbook. The original uploaded file is never modified.</p>
                <button class="btn btn-primary" id="expExcelBtn">Export Excel</button>
            </div>
            <div class="card export-card">
                <div class="card-head"><h3>Export Charts as PNG</h3></div>
                <p>Exports every chart on the selected dashboard above as individual high-resolution PNG images.</p>
                <button class="btn btn-primary" id="expPngBtn">Export Charts (PNG)</button>
            </div>
        </div>`;
    }

    function bind() {
        document.getElementById("expPdfBtn").onclick = () => exportDashboardToPdf();
        document.getElementById("expExcelBtn").onclick = () => exportDataToExcel();
        document.getElementById("expPngBtn").onclick = () => exportChartsAsPng();
    }

    function selectedDashboardRoute() {
        const sel = document.getElementById("expDashboardSelect");
        return (sel && sel.value) || AppState.lastDashboardRoute || "executive";
    }

    // Renders `targetRoute` into #dashboardContent (so it has real KPIs/
    // charts/tables to capture), waits for layout + chart paint to settle,
    // runs `captureFn`, then restores whatever route the user was actually
    // on. Used by both PDF and PNG export so neither one ever captures the
    // Export Center's own UI by mistake.
    async function withDashboardRendered(targetRoute, captureFn) {
        const originalRoute = AppState.activeRoute;
        const needsSwap = originalRoute !== targetRoute;

        if (needsSwap) {
            UI.renderPage(targetRoute);
            // Let the browser paint the freshly-rendered dashboard and let
            // Chart.js finish drawing onto its canvases before capturing.
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            await new Promise(r => setTimeout(r, 250));
        }

        try {
            return await captureFn();
        } finally {
            if (needsSwap) {
                UI.renderPage(originalRoute);
            }
        }
    }

    async function exportElementToPdf(el, filenameBase) {
        // The dashboard content sits inside .main-content, which scrolls
        // internally (overflow-y: auto) so the page can fit in the viewport.
        // html2canvas does not reliably capture content that's scrolled out
        // of view inside a clipped ancestor, so we temporarily lift that
        // clipping via a CSS class, capture, then restore it.
        document.body.classList.add("pdf-capture-mode");
        await new Promise(r => setTimeout(r, 60)); // let layout settle before capture

        let canvas;
        try {
            canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: "#ffffff",
                windowWidth: el.scrollWidth,
                windowHeight: el.scrollHeight,
                height: el.scrollHeight,
                useCORS: true
            });
        } finally {
            document.body.classList.remove("pdf-capture-mode");
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidthMm = pdf.internal.pageSize.getWidth();
        const pageHeightMm = pdf.internal.pageSize.getHeight();
        const pxPerMm = canvas.width / pageWidthMm;
        const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

        // The captured dashboard is almost always taller than one A4 page,
        // so slice it into page-height chunks and add each as its own PDF
        // page instead of squeezing (and clipping) everything onto page 1.
        let renderedPx = 0;
        let pageIndex = 0;
        while (renderedPx < canvas.height) {
            const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            sliceCanvas.getContext("2d").drawImage(
                canvas, 0, renderedPx, canvas.width, sliceHeightPx,
                0, 0, canvas.width, sliceHeightPx
            );
            const sliceImg = sliceCanvas.toDataURL("image/png");
            const sliceHeightMm = (sliceHeightPx * pageWidthMm) / canvas.width;

            if (pageIndex > 0) pdf.addPage();
            pdf.addImage(sliceImg, "PNG", 0, 0, pageWidthMm, sliceHeightMm);

            renderedPx += sliceHeightPx;
            pageIndex++;
        }

        pdf.save(`${filenameBase}_${Helpers.todayStamp()}.pdf`);
        console.log(`[RKQS] PDF exported: ${pageIndex} page(s), captured content ${canvas.width}x${canvas.height}px.`);
    }

    async function exportDashboardToPdf() {
        if (!AppState.transactions.length) {
            showToast("No data has been imported yet. Please upload an Excel file first.", "error");
            return;
        }
        const targetRoute = selectedDashboardRoute();
        showToast("Preparing PDF export...", "info");

        await withDashboardRendered(targetRoute, async () => {
            const target = document.getElementById("dashboardContent");
            await exportElementToPdf(target, `RKQS_${targetRoute}_dashboard`);
        });

        AuditLog.log("Export", "PDF exported", `Dashboard: ${targetRoute}`);
    }

    function exportDataToExcel() {
        const rows = FilterEngine.getFilteredData();
        const kpis = AppState.kpis;

        const wb = XLSX.utils.book_new();

        const dataSheet = rows.map(r => ({
            Date: r.date ? Helpers.formatDate(r.date) : "",
            Plant: r.plant, Department: r.department, Process: r.process, Line: r.line,
            Shift: r.shift, Customer: r.customer, "Part No": r.partNo, "Part Name": r.partName,
            Operator: r.operator, Inspector: r.inspector,
            "Production Qty": r.productionQty, "Inspection Qty": r.inspectionQty,
            "Defect Name": r.defectName, "Defect Qty": r.defectQty, Disposition: r.disposition
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataSheet), "Filtered Data");

        const summarySheet = [
            { KPI: "Production Qty", Value: kpis.core.productionQty },
            { KPI: "Inspection Qty", Value: kpis.core.inspectionQty },
            { KPI: "Defect Qty", Value: kpis.core.defectQty },
            { KPI: "Defect %", Value: Number(kpis.core.defectPercent.toFixed(2)) },
            { KPI: "FPY", Value: Number(kpis.core.fpy.toFixed(2)) },
            { KPI: "Rework %", Value: Number(kpis.core.reworkPercent.toFixed(2)) }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), "KPI Summary");

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis.byPlant.map(p => ({ Plant: p.name, "Defect Qty": p.defectQty, "Defect %": Number(p.defectPercent.toFixed(2)), FPY: Number(p.fpy.toFixed(2)) }))), "By Plant");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis.byPart.map(p => ({ "Part No": p.name, "Defect Qty": p.defectQty, "Defect %": Number(p.defectPercent.toFixed(2)) }))), "By Part");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis.topDefects.map(d => ({ "Defect Name": d.name, Qty: d.qty, "%": Number(d.percent.toFixed(2)) }))), "Top Defects");

        XLSX.writeFile(wb, `RKQS_Export_${Helpers.todayStamp()}.xlsx`);
        AuditLog.log("Export", "Excel exported", `${Helpers.formatNumber(rows.length)} filtered rows, 5 sheets`);
    }

    async function exportChartsAsPng() {
        if (!AppState.transactions.length) {
            showToast("No data has been imported yet. Please upload an Excel file first.", "error");
            return;
        }
        const targetRoute = selectedDashboardRoute();
        showToast("Preparing chart export...", "info");

        await withDashboardRendered(targetRoute, async () => {
            // Only export charts whose canvas is still actually in the
            // document - a defensive filter in case any stale entries
            // linger (see the destroy-on-navigate fix in ui.js).
            const entries = Object.entries(AppState.charts)
                .filter(([, chart]) => chart && chart.canvas && document.body.contains(chart.canvas));

            if (!entries.length) {
                showToast(`No charts were found on the "${targetRoute}" dashboard to export.`, "error");
                return;
            }

            entries.forEach(([id, chart], i) => {
                // Stagger downloads slightly - firing many downloads in the
                // same tick is what caused some browsers to silently drop
                // or corrupt a few of them (previously reported as 0-byte
                // files).
                setTimeout(() => {
                    try {
                        const dataUrl = chart.toBase64Image("image/png", 1.0);
                        const link = document.createElement("a");
                        link.download = `${targetRoute}_${id}_${Helpers.todayStamp()}.png`;
                        link.href = dataUrl;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } catch (err) {
                        console.error("[RKQS] Chart PNG export failed for", id, err);
                        showToast(`Could not export chart "${id}": ${err.message}`, "error");
                    }
                }, i * 200);
            });

            showToast(`Exporting ${entries.length} chart${entries.length > 1 ? "s" : ""} as PNG...`, "info");
            AuditLog.log("Export", "Charts exported (PNG)", `${entries.length} chart(s) from ${targetRoute}`);
        });
    }

    return { template, bind, exportElementToPdf, exportDashboardToPdf, exportDataToExcel, exportChartsAsPng };
})();
