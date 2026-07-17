/*
--------------------------------------------------
Module Name : KPI Engine
File Name   : kpi.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Calculate all business KPIs from the FILTERED dataset only.
              Never reads Excel directly.
Dependencies: state.js, helpers.js
--------------------------------------------------
*/

const KpiEngine = (function () {

    // Core aggregate KPIs used by every dashboard's top KPI cards.
    // NOTE: Production/Inspection Qty are recorded per-row alongside a
    // defect line, so to avoid double counting when a part has multiple
    // defect rows, Production/Inspection Qty are summed over DISTINCT
    // (date, plant, partNo, line, shift) combinations, while Defect Qty
    // is summed over every row (each row = one defect instance, SRS 7.2).
    function calculateCoreKpis(rows) {
        const seen = new Set();
        let productionQty = 0, inspectionQty = 0;
        rows.forEach(r => {
            const sig = [r.date && r.date.getTime(), r.plant, r.partNo, r.line, r.shift].join("|");
            if (!seen.has(sig)) {
                seen.add(sig);
                productionQty += r.productionQty || 0;
                inspectionQty += r.inspectionQty || 0;
            }
        });

        const defectQty = rows.reduce((s, r) => s + (r.defectQty || 0), 0);
        const reworkQty = rows.filter(r => /rework/i.test(r.disposition || "")).reduce((s, r) => s + (r.defectQty || 0), 0);
        const scrapQty = rows.filter(r => /scrap|reject/i.test(r.disposition || "")).reduce((s, r) => s + (r.defectQty || 0), 0);

        const defectPercent = Helpers.safeDiv(defectQty, inspectionQty) * 100;
        const reworkPercent = Helpers.safeDiv(reworkQty, inspectionQty) * 100;
        const scrapPercent = Helpers.safeDiv(scrapQty, inspectionQty) * 100;
        const fpy = 100 - defectPercent;
        const inspectionCoverage = Helpers.safeDiv(inspectionQty, productionQty) * 100;

        return {
            productionQty, inspectionQty, defectQty, reworkQty, scrapQty,
            defectPercent, reworkPercent, scrapPercent, fpy, inspectionCoverage
        };
    }

    // Generic grouped KPI - groups filtered rows by `groupKey` and returns
    // an array of { name, productionQty, inspectionQty, defectQty, reworkQty,
    // scrapQty, defectPercent, fpy } sorted by defectQty desc.
    function groupBy(rows, groupKey) {
        const groups = {};
        rows.forEach(r => {
            const name = r[groupKey] || "Unspecified";
            groups[name] = groups[name] || [];
            groups[name].push(r);
        });
        return Object.entries(groups).map(([name, groupRows]) => {
            const k = calculateCoreKpis(groupRows);
            return { name, ...k };
        }).sort((a, b) => b.defectQty - a.defectQty);
    }

    // Top defects (Pareto) - by defect quantity, includes cumulative %
    function topDefects(rows, limit = 10) {
        const groups = {};
        let total = 0;
        rows.forEach(r => {
            const name = r.defectName || "Unspecified";
            groups[name] = (groups[name] || 0) + (r.defectQty || 0);
            total += r.defectQty || 0;
        });
        const sorted = Object.entries(groups).map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty).slice(0, limit);
        let cum = 0;
        sorted.forEach(d => {
            cum += d.qty;
            d.percent = Helpers.safeDiv(d.qty, total) * 100;
            d.cumulativePercent = Helpers.safeDiv(cum, total) * 100;
        });
        return sorted;
    }

    // Trend over time (defect % by day) for the trend line chart
    function defectTrend(rows) {
        const byDate = {};
        rows.forEach(r => {
            if (!r.date) return;
            const key = Helpers.formatDate(r.date, "DD-MMM-YYYY");
            byDate[key] = byDate[key] || { defectQty: 0, inspectionQty: 0, date: r.date };
            byDate[key].defectQty += r.defectQty || 0;
        });
        // inspection qty needs distinct counting per date too
        const seen = new Set();
        rows.forEach(r => {
            if (!r.date) return;
            const key = Helpers.formatDate(r.date, "DD-MMM-YYYY");
            const sig = key + "|" + r.plant + "|" + r.partNo + "|" + r.line + "|" + r.shift;
            if (!seen.has(sig)) {
                seen.add(sig);
                byDate[key].inspectionQty += r.inspectionQty || 0;
            }
        });
        return Object.entries(byDate).map(([label, v]) => ({
            label, date: v.date,
            defectPercent: Helpers.safeDiv(v.defectQty, v.inspectionQty) * 100
        })).sort((a, b) => a.date - b.date);
    }

    // Heat Map matrix - Plant (rows) x Date (columns, last N days present in
    // filtered data) showing defect % per cell. Used by the Heat Map page.
    function heatmapMatrix(rows, maxDays = 21) {
        const plants = Helpers.uniqueSorted(rows.map(r => r.plant));
        const dateKeys = Helpers.uniqueSorted(rows.filter(r => r.date).map(r => Helpers.formatDate(r.date, "DD-MMM-YYYY")));
        // keep only the most recent `maxDays` dates, in chronological order
        const sortedDates = rows.filter(r => r.date)
            .reduce((acc, r) => {
                const key = Helpers.formatDate(r.date, "DD-MMM-YYYY");
                if (!acc.map[key]) { acc.map[key] = r.date; acc.list.push({ key, date: r.date }); }
                return acc;
            }, { map: {}, list: [] }).list
            .sort((a, b) => a.date - b.date)
            .slice(-maxDays);

        const cellIndex = {};
        rows.forEach(r => {
            if (!r.date || !r.plant) return;
            const dKey = Helpers.formatDate(r.date, "DD-MMM-YYYY");
            const key = r.plant + "|" + dKey;
            cellIndex[key] = cellIndex[key] || { defectQty: 0, inspectionQty: 0, seen: new Set() };
            cellIndex[key].defectQty += r.defectQty || 0;
            const sig = [r.partNo, r.line, r.shift].join("|");
            if (!cellIndex[key].seen.has(sig)) {
                cellIndex[key].seen.add(sig);
                cellIndex[key].inspectionQty += r.inspectionQty || 0;
            }
        });

        const matrix = plants.map(plant => {
            const cells = sortedDates.map(({ key: dKey }) => {
                const cell = cellIndex[plant + "|" + dKey];
                if (!cell) return { date: dKey, defectPercent: null };
                return { date: dKey, defectPercent: Helpers.safeDiv(cell.defectQty, cell.inspectionQty) * 100 };
            });
            return { plant, cells };
        });

        return { plants, dates: sortedDates.map(d => d.key), matrix };
    }

    // Recent alerts (SRS "Recent Alerts" panel) - threshold breaches
    // Disposition breakdown (SRS Disposition field) - total defect qty
    // grouped by disposition value (Rework/Scrap/Accept/etc.), for the
    // Executive Dashboard's Pie Chart.
    function dispositionBreakdown(rows) {
        const groups = {};
        rows.forEach(r => {
            const key = r.disposition || "Unspecified";
            groups[key] = (groups[key] || 0) + (r.defectQty || 0);
        });
        return Object.entries(groups)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty);
    }

    // Plant x Disposition matrix - defect qty per plant, split by
    // disposition, for the Executive Dashboard's Stacked Bar Chart.
    function plantDispositionBreakdown(rows) {
        const plants = Helpers.uniqueSorted(rows.map(r => r.plant));
        const dispositions = Helpers.uniqueSorted(rows.map(r => r.disposition));
        const matrix = {};
        rows.forEach(r => {
            if (!r.plant || !r.disposition) return;
            matrix[r.plant] = matrix[r.plant] || {};
            matrix[r.plant][r.disposition] = (matrix[r.plant][r.disposition] || 0) + (r.defectQty || 0);
        });
        return {
            plants,
            dispositions,
            series: dispositions.map(d => ({
                disposition: d,
                data: plants.map(p => (matrix[p] && matrix[p][d]) || 0)
            }))
        };
    }

    function generateAlerts(rows) {
        const alerts = [];
        const th = AppConfig.DEFAULTS;

        const byPlant = groupBy(rows, "plant");
        byPlant.forEach(p => {
            if (p.defectPercent > th.defectThresholdPercent) {
                alerts.push({ type: "danger", title: `Defect % is high in ${p.name}`, detail: `Defect %: ${Helpers.formatPercent(p.defectPercent)} (Threshold: ${th.defectThresholdPercent}%)` });
            }
            if (p.fpy < th.fpyThresholdPercent) {
                alerts.push({ type: "warning", title: `Low FPY in ${p.name}`, detail: `FPY: ${Helpers.formatPercent(p.fpy)} (Threshold: ${th.fpyThresholdPercent}%)` });
            }
            if (p.inspectionCoverage < th.inspectionCoverageThreshold && p.inspectionCoverage > 0) {
                alerts.push({ type: "info", title: `Inspection coverage low in ${p.name}`, detail: `Coverage: ${Helpers.formatPercent(p.inspectionCoverage)}` });
            }
        });

        const topPart = groupBy(rows, "partNo")[0];
        if (topPart) {
            alerts.push({ type: "danger", title: `High defect in Part ${topPart.name}`, detail: `Defect Qty: ${Helpers.formatNumber(topPart.defectQty)} Pcs` });
        }
        return alerts.slice(0, 6);
    }

    // Full recalculation entry point - called after every filter change
    function recalculateAll(filteredRows) {
        const core = calculateCoreKpis(filteredRows);
        AppState.kpis = {
            core,
            byPlant: groupBy(filteredRows, "plant"),
            byDepartment: groupBy(filteredRows, "department"),
            byProcess: groupBy(filteredRows, "process"),
            byLine: groupBy(filteredRows, "line"),
            byCustomer: groupBy(filteredRows, "customer"),
            byPart: groupBy(filteredRows, "partNo"),
            byOperator: groupBy(filteredRows.filter(r => r.operator), "operator"),
            byInspector: groupBy(filteredRows.filter(r => r.inspector), "inspector"),
            topDefects: topDefects(filteredRows),
            trend: defectTrend(filteredRows),
            heatmap: heatmapMatrix(filteredRows),
            dispositionBreakdown: dispositionBreakdown(filteredRows),
            plantDispositionBreakdown: plantDispositionBreakdown(filteredRows),
            alerts: generateAlerts(filteredRows)
        };
        return AppState.kpis;
    }

    return { calculateCoreKpis, groupBy, topDefects, defectTrend, heatmapMatrix, dispositionBreakdown, plantDispositionBreakdown, generateAlerts, recalculateAll };
})();
