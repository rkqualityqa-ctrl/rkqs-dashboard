# Deploying to GitHub Pages (Permanent Mobile Access, Free)

This publishes the dashboard at a permanent web address (e.g.
`https://yourname.github.io/rkqs-dashboard/`) that works on any phone,
tablet, or PC, anytime — no PC needs to stay switched on.

**Is this safe?** Yes. Only the empty app itself (HTML/CSS/JS, no data) is
published. Whoever uploads an Excel file — you or a client — that file and
all its data stays only in their own browser tab, exactly like it does
today (SRS 19.2). Nothing about a client's production/quality data is ever
sent to GitHub or anywhere else.

**One thing to know:** this app has no login/password system. Anyone who
has the exact link can open it and click around the Master Controls too
(Branding, White Label Generator, etc.) — they just won't see any of *your*
data, since nothing is stored centrally (each visitor's browser only ever
sees what they themselves upload). If you'd rather keep Master Controls
completely private, see **Option B** at the bottom — publish a locked
Client-edition build instead, and keep the Master build local on your PC
only (via `Start_Server.bat`, as before).

---

## Option A: Publish the full dashboard (Master + Client toggle)

### Step 1 — Create a free GitHub account
Go to [github.com](https://github.com) → Sign up (skip if you already have
one).

### Step 2 — Create a new repository
1. Click the **+** icon (top-right) → **New repository**.
2. Repository name: e.g. `rkqs-dashboard` (this becomes part of your URL).
3. Keep it **Public**.
4. Click **Create repository**.

### Step 3 — Upload the dashboard files
1. On the new repo's page, click **uploading an existing file**.
2. Open the `RKQS-Smart-Quality-Dashboard` folder on your PC, select
   **everything inside it** (index.html, css, js, assets, sample, docs,
   serve.py, Start_Server.bat/.command — all of it), and drag it into the
   GitHub upload box.
   > Upload the *contents* of the folder, not the folder itself — index.html
   > should end up directly in the repo, not inside a subfolder.
3. Scroll down, click **Commit changes**.

### Step 4 — Turn on GitHub Pages
1. In the repo, go to **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment" → Source: **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)** → **Save**.
4. Wait 1-2 minutes. Refresh the page — a green box will show your live
   URL, something like:
   `https://yourusername.github.io/rkqs-dashboard/`

### Step 5 — Use it
Open that URL on your phone (or share it with a client). It works exactly
like opening `index.html` on a PC — Upload Excel, all dashboards, Dark
Mode, everything.

### Updating it later
Whenever you improve the dashboard, repeat Step 3 (upload the changed
files again, or use GitHub Desktop / `git push` if you're comfortable with
that) — GitHub Pages automatically redeploys within a minute or two.

---

## Option B: Publish a locked Client-only build (Master stays private)

If you don't want Master Controls reachable by anyone with the link:

1. On your PC, open the dashboard → **White Label Generator** → fill in
   *your own* company name/logo/colors (not a specific client's) →
   **Generate Client Package (.zip)**.
2. Unzip that package — this is a Client-edition build with no Branding,
   White Label Generator, Client Management, System Settings, etc. in its
   sidebar.
3. Follow Steps 1-4 above, but upload *this unzipped Client package's
   contents* instead of the main folder.
4. Keep using the main Master build locally on your PC (double-click
   `index.html` or `Start_Server.bat`) for your own admin work.

This way, the public link only ever shows dashboard viewing/export
features — never the admin/config pages — regardless of who has the link.
