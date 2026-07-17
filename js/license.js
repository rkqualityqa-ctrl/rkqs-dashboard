/*
--------------------------------------------------
Module Name : License Engine
File Name   : license.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Lets a White Label client package be locked behind a
              validity date, and unlocked with a short code tied to that
              specific client's package (not reusable on a different
              client's package). There is no server - the code is a
              deterministic checksum of (that client's license key + the
              new expiry date), computed identically on the Master
              Dashboard (Client Management -> Generate Unlock Code) and
              inside the locked client package (the unlock screen).

              Honesty note (also in docs): this deters casual non-payment,
              it is not real DRM. Anyone willing to open browser dev tools
              and edit the client's config.js/localStorage could bypass it.
              There is no way to do real license enforcement without a
              server, which this offline-first app deliberately doesn't
              have (SRS 4.1/19.1).
Dependencies: config.js, helpers.js
--------------------------------------------------
*/

const LicenseEngine = (function () {

    const EPOCH = new Date(2025, 0, 1); // day-count baseline for compact date encoding

    function dateToDatePart(dateStrOrDate) {
        const d = (dateStrOrDate instanceof Date) ? dateStrOrDate : new Date(dateStrOrDate);
        const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000);
        return Math.max(0, days).toString(36).toUpperCase();
    }

    function datePartToDate(datePart) {
        const days = parseInt(datePart, 36);
        if (isNaN(days)) return null;
        return new Date(EPOCH.getTime() + days * 86400000);
    }

    // Simple deterministic string hash (not cryptographic - there is no
    // server to keep a real secret on, so this is a checksum/deterrent,
    // not a security boundary).
    function checksum(licenseKey, datePart) {
        const combined = String(licenseKey) + "|" + datePart;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
        }
        return Math.abs(hash).toString(36).toUpperCase().padStart(4, "0").slice(0, 4);
    }

    // Generates a random per-client license key (called once, at White
    // Label package generation time, and stored both in the generated
    // package's config.js AND in that client's Client Management record).
    function generateLicenseKey() {
        return "LK" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    // Called from Client Management (Master Dashboard) once payment is
    // confirmed - produces the code to hand to the client.
    function generateUnlockCode(licenseKey, newExpiryDate) {
        const datePart = dateToDatePart(newExpiryDate);
        const check = checksum(licenseKey, datePart);
        return `RKQS-${datePart}-${check}`;
    }

    // Called from inside the locked client package when the user submits a
    // code. Returns the new expiry Date if the code is valid for THIS
    // package's license key, or null if invalid/tampered/for another client.
    function verifyUnlockCode(licenseKey, code) {
        if (!code) return null;
        const cleaned = code.trim().toUpperCase().replace(/^RKQS-/, "");
        const parts = cleaned.split("-");
        if (parts.length !== 2) return null;
        const [datePart, check] = parts;
        if (!datePart || !check) return null;
        if (checksum(licenseKey, datePart) !== check) return null;
        return datePartToDate(datePart);
    }

    // ---------------------------------------------------------
    // Effective expiry = the later of (a) the expiry date baked into
    // config.js at package-generation time, and (b) any extension
    // unlocked locally via a valid code (stored in localStorage, keyed by
    // this package's license key so it doesn't collide with any other
    // client package a browser might also have open).
    // ---------------------------------------------------------
    function storageKey(licenseKey) {
        return `rkqs_license_override_${licenseKey}`;
    }

    function getEffectiveExpiry() {
        const lic = AppConfig.LICENSE;
        if (!lic || !lic.enabled) return null; // locking is off - always unlocked
        let effective = lic.expiryDate ? new Date(lic.expiryDate) : null;
        if (Helpers.isLocalStorageAvailable() && lic.licenseKey) {
            try {
                const override = localStorage.getItem(storageKey(lic.licenseKey));
                if (override) {
                    const overrideDate = new Date(override);
                    if (!effective || overrideDate > effective) effective = overrideDate;
                }
            } catch (e) { /* ignore - falls back to baked-in expiry */ }
        }
        return effective;
    }

    function isLocked() {
        const expiry = getEffectiveExpiry();
        if (!expiry) return false;
        const endOfExpiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate(), 23, 59, 59, 999);
        return new Date() > endOfExpiryDay;
    }

    // Attempts to unlock using a code the client entered. On success,
    // persists the new expiry locally and returns { success: true, newExpiry }.
    function attemptUnlock(code) {
        const lic = AppConfig.LICENSE;
        if (!lic || !lic.licenseKey) return { success: false, message: "This package has no license key configured." };
        const newExpiry = verifyUnlockCode(lic.licenseKey, code);
        if (!newExpiry) return { success: false, message: "Invalid unlock code. Please check it and try again." };
        if (Helpers.isLocalStorageAvailable()) {
            try {
                localStorage.setItem(storageKey(lic.licenseKey), newExpiry.toISOString());
            } catch (e) {
                return { success: false, message: "Could not save the unlock - your browser's storage may be full or unavailable." };
            }
        }
        return { success: true, newExpiry };
    }

    return {
        generateLicenseKey, generateUnlockCode, verifyUnlockCode,
        getEffectiveExpiry, isLocked, attemptUnlock,
        dateToDatePart, datePartToDate // exposed for testing
    };
})();
