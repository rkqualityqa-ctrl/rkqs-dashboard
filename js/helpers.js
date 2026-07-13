/*
--------------------------------------------------
Module Name : Helpers
File Name   : helpers.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Generic, stateless utility functions shared by all modules
Dependencies: none
--------------------------------------------------
*/

const Helpers = {

    // Excel serial date OR string date -> JS Date (handles both, since
    // client Excel files may store dates as text like "01.07.2026" or
    // as native Excel date serials)
    toDate(value) {
        if (value instanceof Date) return value;
        if (typeof value === "number") {
            // Excel serial date (days since 1899-12-30)
            return new Date(Math.round((value - 25569) * 86400 * 1000));
        }
        if (typeof value === "string") {
            const s = value.trim();
            // dd.mm.yyyy or dd-mm-yyyy or dd/mm/yyyy
            let m = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})$/);
            if (m) {
                let [, d, mo, y] = m;
                if (y.length === 2) y = "20" + y;
                return new Date(Number(y), Number(mo) - 1, Number(d));
            }
            const d2 = new Date(s);
            if (!isNaN(d2)) return d2;
        }
        return null;
    },

    formatDate(date, fmt = AppConfig.DEFAULTS.dateFormat) {
        if (!date) return "";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dd = String(date.getDate()).padStart(2, "0");
        const mmm = months[date.getMonth()];
        const yyyy = date.getFullYear();
        if (fmt === "DD-MMM-YYYY") return `${dd}-${mmm}-${yyyy}`;
        return date.toLocaleDateString();
    },

    formatNumber(n) {
        if (n === null || n === undefined || isNaN(n)) return "0";
        return Number(n).toLocaleString("en-IN");
    },

    formatPercent(n, decimals = 2) {
        if (n === null || n === undefined || isNaN(n)) return "0.00%";
        return Number(n).toFixed(decimals) + "%";
    },

    safeDiv(numerator, denominator) {
        if (!denominator || denominator === 0) return 0;
        return numerator / denominator;
    },

    uniqueSorted(arr) {
        return [...new Set(arr.filter(v => v !== undefined && v !== null && v !== ""))].sort();
    },

    // normalizes header text for column matching: lower case, strip
    // punctuation/spaces, e.g. "Production Qty." -> "productionqty"
    normalizeHeader(h) {
        return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    debounce(fn, wait = 200) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    },

    escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    todayStamp() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    },

    // Shared local-storage availability check (private/incognito modes or
    // locked-down browsers can throw on access) - used by any module that
    // persists lightweight metadata client-side (File Management, Client
    // Management), never the actual quality data itself (SRS 19.2).
    isLocalStorageAvailable() {
        try {
            const testKey = "__rkqs_test__";
            localStorage.setItem(testKey, "1");
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    },

    // ---------------------------------------------------------
    // Quick date-range presets (SRS Section 11 - Time filters).
    // Returns { from: Date|null, to: Date|null } for a given preset key.
    // "all" returns nulls (no bound).
    // ---------------------------------------------------------
    computeQuickDateRange(preset, referenceDate) {
        const ref = referenceDate || new Date();
        const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        switch (preset) {
            case "today": {
                return { from: startOfDay(ref), to: endOfDay(ref) };
            }
            case "thisWeek": {
                const day = ref.getDay(); // 0=Sun
                const diffToMonday = (day === 0 ? -6 : 1) - day;
                const monday = new Date(ref); monday.setDate(ref.getDate() + diffToMonday);
                const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
                return { from: startOfDay(monday), to: endOfDay(sunday) };
            }
            case "thisMonth": {
                const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
                const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
                return { from, to };
            }
            case "thisQuarter": {
                const q = Math.floor(ref.getMonth() / 3);
                const from = new Date(ref.getFullYear(), q * 3, 1);
                const to = new Date(ref.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
                return { from, to };
            }
            case "thisYear": {
                const from = new Date(ref.getFullYear(), 0, 1);
                const to = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
                return { from, to };
            }
            case "last30": {
                const to = endOfDay(ref);
                const from = startOfDay(new Date(ref.getTime() - 29 * 86400000));
                return { from, to };
            }
            case "all":
            default:
                return { from: null, to: null };
        }
    }
};
