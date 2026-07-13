/*
--------------------------------------------------
Module Name : Chart Engine
File Name   : charts.js
Version     : 1.1
Author      : RK Quality Solutions
Purpose     : Render all Chart.js visualizations from AppState.kpis only.
              Never reads Excel directly.
Dependencies: state.js, config.js, Chart.js
--------------------------------------------------
*/

const ChartEngine = (function () {

    function destroy(canvasId) {
        if (AppState.charts[canvasId]) {
            AppState.charts[canvasId].destroy();
            delete AppState.charts[canvasId];
        }
    }

    // Single source of truth for chart text/grid colors, driven by the
    // current Theme Manager mode (AppConfig.UI_MODE). Called fresh on every
    // chart render so a Light/Dark toggle always produces correct colors
    // the moment the dashboard re-renders (see thememanager.js applyMode).
    function chartColors() {
        const isDark = AppConfig.UI_MODE === "dark";
        return {
            text: isDark ? "#E7ECFB" : "#16213A",
            textSecondary: isDark ? "#93A0C2" : "#64708A",
            grid: isDark ? "#2A3350" : "#EEF1F6",
            tooltipBg: isDark ? "#232A42" : "#16213A"
        };
    }

    function baseOptions(extra = {}) {
        const c = chartColors();
        return Object.assign({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: AppConfig.DEFAULTS.chartAnimationMs },
            color: c.text,
            plugins: {
                legend: {
                    display: false,
                    labels: { color: c.text }
                },
                tooltip: {
                    backgroundColor: c.tooltipBg,
                    titleColor: "#ffffff",
                    bodyColor: "#ffffff",
                    padding: 10,
                    titleFont: { size: 12, weight: "600" },
                    bodyFont: { size: 12 }
                }
            }
        }, extra);
    }

    // Standard x/y scale block shared by bar/line charts, always themed.
    function themedScales(extra = {}) {
        const c = chartColors();
        return Object.assign({
            x: { grid: { display: false }, ticks: { color: c.text }, border: { color: c.grid } },
            y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.text }, border: { color: c.grid } }
        }, extra);
    }

    function barChart(canvasId, labels, data, opts = {}) {
        destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        AppState.charts[canvasId] = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: opts.label || "",
                    data,
                    backgroundColor: opts.color || getActiveTheme().primary,
                    borderRadius: 6,
                    maxBarThickness: 46
                }]
            },
            options: baseOptions({ scales: themedScales() })
        });
    }

    function lineChart(canvasId, labels, data, opts = {}) {
        destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const c = chartColors();
        AppState.charts[canvasId] = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: opts.label || "",
                    data,
                    borderColor: opts.color || getActiveTheme().primary,
                    backgroundColor: (opts.color || getActiveTheme().primary) + "22",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: opts.color || getActiveTheme().primary
                }]
            },
            options: baseOptions({
                scales: themedScales({
                    y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.text, callback: v => v + "%" }, border: { color: c.grid } }
                })
            })
        });
    }

    function doughnutChart(canvasId, labels, data, opts = {}) {
        destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        AppState.charts[canvasId] = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: AppConfig.CHART_PALETTE,
                    borderWidth: 2,
                    borderColor: AppConfig.UI_MODE === "dark" ? "#151B2E" : "#fff"
                }]
            },
            options: baseOptions({
                cutout: "68%",
                plugins: { legend: { display: false } }
            })
        });
    }

    function sparkline(canvasId, data, color) {
        destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        AppState.charts[canvasId] = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data, borderColor: color, borderWidth: 2, pointRadius: 0,
                    fill: true, backgroundColor: color + "1A", tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    function paretoChart(canvasId, topDefects) {
        destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const c = chartColors();
        AppState.charts[canvasId] = new Chart(ctx, {
            data: {
                labels: topDefects.map(d => d.name),
                datasets: [
                    {
                        type: "bar", label: "Defect Qty",
                        data: topDefects.map(d => d.qty),
                        backgroundColor: getActiveTheme().primary,
                        borderRadius: 6, order: 2, yAxisID: "y"
                    },
                    {
                        type: "line", label: "Cumulative %",
                        data: topDefects.map(d => d.cumulativePercent),
                        borderColor: getActiveTheme().accent,
                        backgroundColor: getActiveTheme().accent,
                        yAxisID: "y1", tension: 0.3, order: 1, pointRadius: 3
                    }
                ]
            },
            options: baseOptions({
                plugins: {
                    legend: { display: true, position: "bottom", labels: { color: c.text } }
                },
                scales: {
                    y: { type: "linear", position: "left", beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.text }, border: { color: c.grid } },
                    y1: { type: "linear", position: "right", min: 0, max: 100, grid: { display: false }, ticks: { color: c.text, callback: v => v + "%" }, border: { color: c.grid } },
                    x: { grid: { display: false }, ticks: { color: c.text }, border: { color: c.grid } }
                }
            })
        });
    }

    return { barChart, lineChart, doughnutChart, sparkline, paretoChart, destroy, chartColors };
})();
