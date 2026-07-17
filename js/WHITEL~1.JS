/*
--------------------------------------------------
Module Name : White Label Engine
File Name   : whitelabel.js
Version     : 1.2
Author      : RK Quality Solutions
Purpose     : Generate an independent, branded Client Dashboard package
              (ZIP) from the Master Dashboard - Master controls (branding
              engine, client generator, master settings) are stripped
              from the generated package per SRS Section 16 & 19.3.
              Can be pre-filled from a saved Client Management profile.
              v1.2 adds an optional Validity Lock (see license.js): the
              generated package can be locked behind an expiry date, with
              a per-client unlock code Client Management can generate once
              payment is confirmed.
Dependencies: state.js, config.js, license.js, JSZip, PACKAGE_SOURCE (package-source.js)
--------------------------------------------------
*/

const WhiteLabelEngine = (function () {

    let uploadedLogoDataUrl = null;
    let prefill = null; // set via prefillFromClient() from Client Management

    // Called by Client Management's "Use in White Label" button.
    function prefillFromClient(client) {
        prefill = {
            id: client.id,
            name: client.name,
            logo: client.logo || null,
            primary: client.primaryColor,
            accent: client.accentColor,
            licenseKey: client.licenseKey || null
        };
    }

    function clearPrefill() {
        prefill = null;
    }

    function defaultValidityDate() {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
    }

    function template() {
        const c = AppConfig.BRANDING.client;
        const t = AppConfig.THEME.client;
        const name = prefill ? prefill.name : c.companyName;
        const logo = prefill && prefill.logo ? prefill.logo : c.logo;
        const primary = prefill ? prefill.primary : t.primary;
        const accent = prefill ? prefill.accent : t.accent;

        return `
        <div class="grid-2">
            <div class="card">
                <div class="card-head"><h3>Client Package Generator</h3></div>
                ${prefill ? `<p class="hint">Pre-filled from Client Management: <strong>${Helpers.escapeHtml(prefill.name)}</strong>. <a href="#" id="wlClearPrefill" style="color:var(--color-info);">Start fresh instead</a></p>` : ""}
                <div class="branding-form">
                    <label>Client Company Name</label>
                    <input type="text" id="wlClientName" value="${Helpers.escapeHtml(name)}">

                    <label>Client Logo</label>
                    <input type="file" id="wlClientLogo" accept="image/*">
                    <div class="logo-preview" id="wlLogoPreview">${logo ? `<img src="${logo}" alt="logo preview">` : ""}</div>

                    <label>Primary Color</label>
                    <input type="color" id="wlPrimaryColor" value="${primary}">

                    <label>Accent Color</label>
                    <input type="color" id="wlAccentColor" value="${accent}">

                    <p class="hint">The generated package is a fully independent, offline dashboard folder. It will NOT include Branding Settings, Theme Manager, File Management, or the White Label Generator - the client cannot access RK Quality Solutions administration controls (SRS 19.3).</p>

                    <div style="margin-top:14px; padding-top:14px; border-top:1px dashed var(--color-border);">
                        <label style="display:flex; align-items:center; gap:8px; text-transform:none; font-size:13px;">
                            <input type="checkbox" id="wlLockEnabled" style="width:auto;"> Lock this package behind a validity date
                        </label>
                        <div id="wlLockFields" style="display:none; margin-top:10px;">
                            <label>Validity Expires On</label>
                            <input type="date" id="wlValidityDate" value="${defaultValidityDate()}">
                            <p class="hint">After this date, the client sees a locked screen instead of the dashboard, with a box to enter an unlock code. Once they pay, generate their code from <strong>Client Management</strong> - it only works on this specific client's package.</p>
                        </div>
                    </div>

                    <button class="btn btn-primary" id="wlGenerateBtn" style="margin-top:14px;">Generate Client Package (.zip)</button>
                    <div id="wlProgress" class="hint"></div>
                </div>
            </div>
            <div class="card">
                <div class="card-head"><h3>Live Preview</h3></div>
                <p class="hint">Toggle "Client View" in the header (top right) at any time to preview exactly what the client will see, using the colors and logo set here.</p>
                <div id="wlPreviewCard" class="preview-card">
                    <div class="preview-header" style="background:${primary}">
                        ${logo ? `<img src="${logo}" class="preview-logo">` : ""}
                        <span>${Helpers.escapeHtml(name)}</span>
                    </div>
                    <div class="preview-body">Client Dashboard · Client Edition</div>
                </div>
                ${!prefill ? `<p class="hint">Tip: add this client in <strong>Client Management</strong> first, so their branding is saved for next time instead of re-entering it here.</p>` : ""}
            </div>
        </div>`;
    }

    function bind() {
        // Start each bind from the prefilled client's logo (if any); a fresh
        // file selection below will override it, same as before.
        uploadedLogoDataUrl = prefill && prefill.logo ? prefill.logo : null;

        document.getElementById("wlClientLogo").addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedLogoDataUrl = ev.target.result;
                document.getElementById("wlLogoPreview").innerHTML = `<img src="${uploadedLogoDataUrl}" alt="logo preview">`;
            };
            reader.readAsDataURL(file);
        });

        document.getElementById("wlLockEnabled").addEventListener("change", (e) => {
            document.getElementById("wlLockFields").style.display = e.target.checked ? "block" : "none";
        });

        document.getElementById("wlGenerateBtn").addEventListener("click", generatePackage);

        const clearLink = document.getElementById("wlClearPrefill");
        if (clearLink) {
            clearLink.addEventListener("click", (e) => {
                e.preventDefault();
                clearPrefill();
                UI.renderPage("whitelabel");
            });
        }
    }

    async function generatePackage() {
        const progress = document.getElementById("wlProgress");
        const clientName = document.getElementById("wlClientName").value.trim() || "Client";
        const primary = document.getElementById("wlPrimaryColor").value;
        const accent = document.getElementById("wlAccentColor").value;
        const lockEnabled = document.getElementById("wlLockEnabled").checked;
        const validityDate = document.getElementById("wlValidityDate").value;

        if (typeof PACKAGE_SOURCE === "undefined") {
            progress.textContent = "Package source not available. Please generate from the Master Dashboard build.";
            return;
        }

        // Reuse the client's existing license key across re-generated
        // packages (so a previously-issued unlock code stays valid for
        // this client), or mint a new one the first time this client is
        // locked.
        let licenseKey = prefill && prefill.licenseKey ? prefill.licenseKey : null;
        if (lockEnabled && !licenseKey) {
            licenseKey = LicenseEngine.generateLicenseKey();
        }

        progress.textContent = "Building client package...";
        const zip = new JSZip();

        // Copy every source file into the zip, mirroring the folder structure
        Object.entries(PACKAGE_SOURCE.files).forEach(([path, content]) => {
            zip.file(path, content);
        });

        // Inject client-specific config.js (branding locked to "client", no
        // master-only sidebar items will render because AppConfig.EDITION
        // will be "client")
        const clientConfig = PACKAGE_SOURCE.buildClientConfig({
            companyName: clientName,
            primary, accent,
            licenseEnabled: lockEnabled,
            licenseKey: lockEnabled ? licenseKey : null,
            expiryDate: lockEnabled ? validityDate : null
        });
        zip.file("js/config.js", clientConfig);

        // Replace client logo if a new one was uploaded (or came from a
        // prefilled Client Management profile)
        if (uploadedLogoDataUrl) {
            const base64 = uploadedLogoDataUrl.split(",")[1];
            zip.file("assets/logos/client_logo.png", base64, { base64: true });
        }

        progress.textContent = "Compressing...";
        const blob = await zip.generateAsync({ type: "blob" });
        const safeName = clientName.replace(/[^a-z0-9]+/gi, "_");
        Helpers.downloadBlob(blob, `RKQS_${safeName}_ClientDashboard_${Helpers.todayStamp()}.zip`);
        progress.textContent = lockEnabled
            ? `Client package downloaded. Locked until ${validityDate} - generate an unlock code from Client Management once paid.`
            : "Client package downloaded successfully.";

        // If this package was generated from a saved Client Management
        // profile, record when it was last generated for that client, and
        // save the license key/lock settings so a later "Generate Unlock
        // Code" click in Client Management knows which key to use.
        if (prefill && prefill.id && typeof ClientManagement !== "undefined") {
            ClientManagement.recordPackageGenerated(prefill.id);
            if (lockEnabled) {
                ClientManagement.updateLicenseInfo(prefill.id, licenseKey, validityDate);
            }
        }
        AuditLog.log("White Label", "Client package generated", `${clientName}${prefill ? " (from Client Management)" : ""}${lockEnabled ? ` - locked until ${validityDate}` : ""}`);
    }

    return { template, bind, prefillFromClient, clearPrefill };
})();
