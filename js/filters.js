/*
--------------------------------------------------
Module Name : Filter Engine
File Name   : filters.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Filter the validated transaction dataset per AppState.filters
Dependencies: state.js, helpers.js
--------------------------------------------------
*/

const FilterEngine = (function () {

    function applyFilters(transactions, filters) {
        return transactions.filter(row => {
            if (filters.dateFrom && row.date && row.date < filters.dateFrom) return false;
            if (filters.dateTo && row.date && row.date > filters.dateTo) return false;

            const fieldChecks = [
                ["plant", "plant"], ["department", "department"], ["process", "process"],
                ["line", "line"], ["shift", "shift"], ["customer", "customer"],
                ["partNo", "partNo"], ["operator", "operator"], ["inspector", "inspector"],
                ["defectName", "defectName"], ["disposition", "disposition"]
            ];
            for (const [filterKey, rowKey] of fieldChecks) {
                const val = filters[filterKey];
                if (val && val !== "All" && row[rowKey] !== val) return false;
            }
            return true;
        });
    }

    // Returns the currently filtered dataset from AppState
    function getFilteredData() {
        return applyFilters(AppState.transactions, AppState.filters);
    }

    function setFilter(key, value) {
        AppState.filters[key] = value;
        AppEvents.emit("filters:changed", AppState.filters);
    }

    // Applies a quick date-range preset (SRS Section 11 Time filters).
    // preset = "all" | "today" | "thisWeek" | "thisMonth" | "thisQuarter" | "thisYear" | "last30" | "custom"
    function setDateRangePreset(preset, customFrom, customTo) {
        AppState.filters.datePreset = preset;
        if (preset === "custom") {
            AppState.filters.dateFrom = customFrom ? new Date(customFrom) : null;
            AppState.filters.dateTo = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : null;
        } else {
            const range = Helpers.computeQuickDateRange(preset);
            AppState.filters.dateFrom = range.from;
            AppState.filters.dateTo = range.to;
        }
        AppEvents.emit("filters:changed", AppState.filters);
    }

    function clearFilters() {
        Object.keys(AppState.filters).forEach(k => {
            if (k === "dateFrom" || k === "dateTo") AppState.filters[k] = null;
            else if (k === "datePreset") AppState.filters[k] = "all";
            else AppState.filters[k] = "All";
        });
        AppEvents.emit("filters:changed", AppState.filters);
    }

    return { applyFilters, getFilteredData, setFilter, setDateRangePreset, clearFilters };
})();
