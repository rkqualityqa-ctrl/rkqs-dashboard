/*
--------------------------------------------------
Module Name : Client Management
File Name   : clientmanagement.js
Version     : 1.0
Author      : RK Quality Solutions
Purpose     : Master-only directory of client companies RKQS serves.
              Lets the admin add/edit/delete client profiles (name,
              industry, contact, logo, brand colors, notes) and jump
              straight into the White Label Generator pre-filled with a
              saved client's details, instead of re-typing everything
              per package. Client profiles are metadata only, persisted
              in this browser's local storage (no server/database, per
              SRS 4.1/19.1) - they do not contain any quality/production
              data, only client identity/branding info you enter yourself.
Dependencies: state.js, helpers.js, whitelabel.js, browser localStorage
--------------------------------------------------
*/

const ClientManagement = (function () {

    const STORAGE_KEY = "rkqs_clients";
    let editingClientId = null; // null = "add new" mode, otherwise editing existing

    const INDUSTRY_OPTIONS = [
        "Plating Plant", "Press Shop", "Machining", "Welding", "Assembly",
        "Fabrication", "Forging", "Foundry", "Powder Coating", "Plastic Molding",
        "Sheet Metal Manufacturing", "General Manufacturing", "Other"
    ];

    function loadClients() {
        if (!Helpers.isLocalStorageAvailable()) return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("[RKQS][ClientManagement] Failed to read clients:", e);
            return [];
        }
    }

    function saveClients(clients) {
        if (!Helpers.isLocalStorageAvailable()) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
        } catch (e) {
            console.error("[RKQS][ClientManagement] Failed to save clients:", e);
            showToast("Could not save client - your browser's storage may be full.", "error");
        }
    }

    function getClient(id) {
        return loadClients().find(c => c.id === id) || null;
    }

    function upsertClient(data) {
        const clients = loadClients();
        if (data.id) {
            const idx = clients.findIndex(c => c.id === data.id);
            if (idx > -1) clients[idx] = Object.assign({}, clients[idx], data);
        } else {
            data.id = "client_" + Date.now() + "_" + Math.round(Math.random() * 1000);
            data.createdAt = new Date().toISOString();
            data.lastPackageGeneratedAt = null;
            clients.unshift(data);
        }
        saveClients(clients);
        return data;
    }

    function deleteClient(id) {
        const clients = loadClients().filter(c => c.id !== id);
        saveClients(clients);
    }

    // Called by whitelabel.js right after a package is successfully generated.
    function recordPackageGenerated(id) {
        if (!id) return;
        const clients = loadClients();
        const idx = clients.findIndex(c => c.id === id);
        if (idx > -1) {
            clients[idx].lastPackageGeneratedAt = new Date().toISOString();
            saveClients(clients);
        }
    }

    // Called by whitelabel.js when a locked package is generated, and by
    // this module's own "Generate Unlock Code" action - keeps the client's
    // license key and current validity date in sync so a future unlock
    // code can be generated for them without needing anything back from
    // the client (the license key never changes once minted for them).
    function updateLicenseInfo(id, licenseKey, expiryDate) {
        if (!id) return;
        const clients = loadClients();
        const idx = clients.findIndex(c => c.id === id);
        if (idx > -1) {
            clients[idx].licenseKey = licenseKey;
            clients[idx].currentExpiryDate = expiryDate;
            saveClients(clients);
        }
    }

    function template() {
        const clients = loadClients();
        const editing = editingClientId ? getClient(editingClientId) : null;

        return `
        <div class="grid-2">
            <div class="card">
                <div class="card-head"><h3>${editing ? "Edit Client" : "Add New Client"}</h3></div>
                <div class="branding-form" id="clientForm">
                    <label>Client / Company Name *</label>
                    <input type="text" id="cmName" value="${editing ? Helpers.escapeHtml(editing.name) : ""}" placeholder="e.g. Shivani Locks Private Limited">

                    <label>Industry</label>
                    <select id="cmIndustry" style="padding:9px 10px;border:1px solid var(--color-border);border-radius:var(--radius-sm);font-size:13px;background:var(--color-surface-alt);color:var(--color-text-primary);">
                        ${INDUSTRY_OPTIONS.map(opt => `<option value="${opt}" ${editing && editing.industry === opt ? "selected" : ""}>${opt}</option>`).join("")}
                    </select>

                    <label>Contact Person</label>
                    <input type="text" id="cmContact" value="${editing ? Helpers.escapeHtml(editing.contactPerson || "") : ""}" placeholder="e.g. Rakesh Singh">

                    <label>Contact Email</label>
                    <input type="text" id="cmEmail" value="${editing ? Helpers.escapeHtml(editing.contactEmail || "") : ""}" placeholder="e.g. contact@client.com">

                    <label>Contact Phone</label>
                    <input type="text" id="cmPhone" value="${editing ? Helpers.escapeHtml(editing.contactPhone || "") : ""}" placeholder="e.g. +91 98765 43210">

                    <label>Client Logo</label>
                    <input type="file" id="cmLogo" accept="image/*">
                    <div class="logo-preview" id="cmLogoPreview">${editing && editing.logo ? `<img src="${editing.logo}" alt="logo preview">` : ""}</div>

                    <label>Primary Color</label>
                    <input type="color" id="cmPrimaryColor" value="${editing ? editing.primaryColor : "#0B2E4E"}">

                    <label>Accent Color</label>
                    <input type="color" id="cmAccentColor" value="${editing ? editing.accentColor : "#1E9E8C"}">

                    <label>Notes</label>
                    <input type="text" id="cmNotes" value="${editing ? Helpers.escapeHtml(editing.notes || "") : ""}" placeholder="Any internal notes about this client">

                    <div style="display:flex; gap:10px; margin-top:14px;">
                        <button class="btn btn-primary" id="cmSaveBtn">${editing ? "Save Changes" : "Add Client"}</button>
                        ${editing ? `<button class="btn btn-ghost" id="cmCancelBtn">Cancel</button>` : ""}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-head"><h3>Client Directory (${clients.length})</h3></div>
                ${clients.length ? clientTable(clients) : `<div class="empty-state">No clients added yet. Use the form to add your first client.</div>`}
                <p class="hint">Client profiles are saved in this browser only, so they carry over across sessions on this computer, but won't sync to another device.</p>
            </div>
        </div>`;
    }

    function clientTable(clients) {
        return `
        <table class="data-table">
            <thead><tr><th>Client</th><th>Industry</th><th>Contact</th><th>Last Package</th><th>Validity Lock</th><th>Actions</th></tr></thead>
            <tbody>
                ${clients.map(c => `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                ${c.logo ? `<img src="${c.logo}" style="width:26px;height:26px;object-fit:contain;border-radius:5px;background:#fff;border:1px solid var(--color-border);">` : `<span style="width:26px;height:26px;border-radius:5px;background:${c.primaryColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${Helpers.escapeHtml((c.name || "?").charAt(0).toUpperCase())}</span>`}
                                <span>${Helpers.escapeHtml(c.name)}</span>
                            </div>
                        </td>
                        <td>${Helpers.escapeHtml(c.industry || "—")}</td>
                        <td>${Helpers.escapeHtml(c.contactPerson || "—")}</td>
                        <td>${c.lastPackageGeneratedAt ? Helpers.formatDate(new Date(c.lastPackageGeneratedAt)) : "Never generated"}</td>
                        <td>${licenseStatusHtml(c)}</td>
                        <td style="white-space:nowrap;">
                            <button class="btn btn-ghost" data-action="use" data-id="${c.id}" style="padding:5px 10px;font-size:11.5px;">Use in White Label</button>
                            ${c.licenseKey ? `<button class="btn btn-ghost" data-action="unlock" data-id="${c.id}" style="padding:5px 10px;font-size:11.5px;">Generate Unlock Code</button>` : ""}
                            <button class="btn btn-ghost" data-action="edit" data-id="${c.id}" style="padding:5px 10px;font-size:11.5px;">Edit</button>
                            <button class="btn btn-ghost" data-action="delete" data-id="${c.id}" style="padding:5px 10px;font-size:11.5px;color:var(--color-danger);">Delete</button>
                        </td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
    }

    function licenseStatusHtml(c) {
        if (!c.licenseKey) return `<span class="hint" style="margin:0;">Not locked</span>`;
        const expiry = c.currentExpiryDate ? new Date(c.currentExpiryDate) : null;
        const expired = expiry && expiry < new Date(new Date().toDateString());
        const color = expired ? "var(--color-danger)" : "var(--color-success)";
        const label = expired ? "Expired" : "Active";
        return `<strong style="color:${color};">${label}</strong><br><span class="hint" style="margin:0;">until ${expiry ? Helpers.formatDate(expiry) : "—"}</span>`;
    }

    let pendingLogoDataUrl = null;

    function bind() {
        pendingLogoDataUrl = editingClientId ? (getClient(editingClientId) || {}).logo || null : null;

        const logoInput = document.getElementById("cmLogo");
        if (logoInput) {
            logoInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    pendingLogoDataUrl = ev.target.result;
                    document.getElementById("cmLogoPreview").innerHTML = `<img src="${pendingLogoDataUrl}" alt="logo preview">`;
                };
                reader.readAsDataURL(file);
            });
        }

        document.getElementById("cmSaveBtn").addEventListener("click", () => {
            const name = document.getElementById("cmName").value.trim();
            if (!name) {
                showToast("Client name is required.", "error");
                return;
            }
            const data = {
                id: editingClientId || undefined,
                name,
                industry: document.getElementById("cmIndustry").value,
                contactPerson: document.getElementById("cmContact").value.trim(),
                contactEmail: document.getElementById("cmEmail").value.trim(),
                contactPhone: document.getElementById("cmPhone").value.trim(),
                logo: pendingLogoDataUrl,
                primaryColor: document.getElementById("cmPrimaryColor").value,
                accentColor: document.getElementById("cmAccentColor").value,
                notes: document.getElementById("cmNotes").value.trim()
            };
            upsertClient(data);
            showToast(`Client "${name}" ${editingClientId ? "updated" : "added"}.`, "success");
            AuditLog.log("Client Management", editingClientId ? "Client updated" : "Client added", name);
            editingClientId = null;
            UI.renderPage("clientmanagement");
        });

        const cancelBtn = document.getElementById("cmCancelBtn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                editingClientId = null;
                UI.renderPage("clientmanagement");
            });
        }

        document.querySelectorAll("[data-action]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                if (action === "edit") {
                    editingClientId = id;
                    UI.renderPage("clientmanagement");
                } else if (action === "delete") {
                    const client = getClient(id);
                    if (confirm(`Delete client "${client ? client.name : ""}"? This only removes it from Client Management - it does not affect any previously generated packages.`)) {
                        deleteClient(id);
                        showToast("Client deleted.", "info");
                        AuditLog.log("Client Management", "Client deleted", client ? client.name : id);
                        UI.renderPage("clientmanagement");
                    }
                } else if (action === "use") {
                    const client = getClient(id);
                    if (client) {
                        WhiteLabelEngine.prefillFromClient(client);
                        Router.go("whitelabel");
                    }
                } else if (action === "unlock") {
                    const client = getClient(id);
                    if (!client || !client.licenseKey) {
                        showToast("This client has no license key yet - generate a locked package for them first via White Label Generator.", "error");
                        return;
                    }
                    const suggested = suggestedNextValidityDate(client.currentExpiryDate);
                    const newDate = prompt(`Enter the new validity date for "${client.name}" (YYYY-MM-DD):`, suggested);
                    if (!newDate) return;
                    const trimmed = newDate.trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                        showToast("Please enter the date in YYYY-MM-DD format.", "error");
                        return;
                    }
                    const code = LicenseEngine.generateUnlockCode(client.licenseKey, trimmed);
                    updateLicenseInfo(id, client.licenseKey, trimmed);
                    AuditLog.log("Client Management", "Unlock code generated", `${client.name} - new validity ${trimmed}`);
                    prompt(`Unlock code for "${client.name}" (select the text below, copy it, and share it with the client):`, code);
                    UI.renderPage("clientmanagement");
                }
            });
        });
    }

    // Suggests 30 days from today, or 30 days from the client's current
    // expiry if that's later than today (so renewing early doesn't shorten
    // an already-active validity period).
    function suggestedNextValidityDate(currentExpiryDate) {
        const today = new Date();
        const base = currentExpiryDate && new Date(currentExpiryDate) > today ? new Date(currentExpiryDate) : today;
        base.setDate(base.getDate() + 30);
        return base.toISOString().slice(0, 10);
    }

    return { template, bind, loadClients, getClient, upsertClient, deleteClient, recordPackageGenerated, updateLicenseInfo };
})();
