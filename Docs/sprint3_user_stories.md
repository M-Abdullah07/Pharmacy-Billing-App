# 3.3 Sprint 3 User Stories

---

## US-301 — Dashboard Live KPI Panel

### UC-301 — Dashboard Live KPI Panel

| Field | Detail |
|---|---|
| **Use Case ID** | UC-301 |
| **Use Case Name** | Dashboard Live KPI Panel |
| **Actor(s)** | Distributor, Admin |
| **Preconditions** | 1. User is authenticated and logged in. 2. At least one confirmed sale invoice exists in the system. 3. The `sale_invoices`, `sale_invoice_items`, `batches`, and `products` tables are accessible. |
| **Postconditions** | 1. The dashboard displays real-time Total Sales, Total Profit, and Out-of-Stock product count. 2. All figures are sourced from confirmed transactions only. |

**User Story**
As a distributor, I want to see live KPI figures for Total Sales, Total Profit, and Out-of-Stock products on the dashboard so that I can assess business performance at a glance without running manual reports.

**Sub User Stories**
- As a distributor, I want to see Total Sales revenue (sum of `net_receivable` from confirmed invoices) so I know how much has been billed.
- As a distributor, I want to see Total Profit (sale rate − purchase cost × quantity across all confirmed lines) so I understand margin performance.
- As a distributor, I want to see a count of active products that currently have zero available stock so I know what needs immediate restocking.

**Acceptance Criteria**
- Total Sales card displays the sum of `net_receivable` from `sale_invoices WHERE status = 'confirmed'`.
- Total Profit card displays the gross margin computed as `(sale_rate − purchase_cost_per_unit) × quantity` across all confirmed `sale_invoice_items`.
- Out-of-Stock card displays the count of active products whose total `quantity_available` across all active batches equals zero.
- All three cards load concurrently (parallel queries) and display a loading placeholder `—` until data resolves.
- Figures are formatted in PKR with locale-appropriate thousand separators.

**Alt Flow(s)**
- Alt Flow A — No sales yet: If no confirmed invoices exist, Total Sales and Total Profit display `Rs 0` and Out-of-Stock shows the full count of active products with no batches.

**Exceptions**
- E1 — `electronAPI` unavailable: If the Electron IPC bridge is not initialised, the panel renders a red error banner with the message `Dashboard error: electronAPI not available`.
- E2 — Database query failure: If any query throws, the error is caught and displayed in the error banner; other panels are unaffected.

---

## US-302 — Near-Expiry Batch Alert Panel

### UC-302 — Near-Expiry Batch Alert Panel

| Field | Detail |
|---|---|
| **Use Case ID** | UC-302 |
| **Use Case Name** | Near-Expiry Batch Alert Panel |
| **Actor(s)** | Distributor, Admin |
| **Preconditions** | 1. User is authenticated and logged in. 2. At least one active batch with a future expiry date and `quantity_available > 0` exists. |
| **Postconditions** | 1. The dashboard displays counts of Critical (≤ 30 days), Warning (31–60 days), and Watch (61–90 days) batches. 2. An "All Clear" state is shown when no batches fall within any threshold. |

**User Story**
As a distributor, I want to see near-expiry batch counts grouped by severity on the dashboard so that I can prioritise stock clearance and avoid regulatory violations from selling expired medicine.

**Sub User Stories**
- As a distributor, I want a Critical alert card (red) showing batches expiring within 30 days so I can act immediately.
- As a distributor, I want a Warning alert card (amber) showing batches expiring within 31–60 days so I can plan proactively.
- As a distributor, I want a Watch alert card (yellow) showing batches expiring within 61–90 days for early awareness.
- As a distributor, I want to see a green "No near-expiry alerts" confirmation when all batches are safe so I have peace of mind.

**Acceptance Criteria**
- The panel queries `batches WHERE is_active = TRUE AND quantity_available > 0` using configurable day thresholds (default: 30 / 60 / 90).
- Critical count uses the range `1–30 days`; Warning `31–60 days`; Watch `61–90 days`.
- Each alert card applies a coloured border and background accent only when `count > 0`; inactive cards render in neutral grey.
- When all three counts equal zero, the grid is hidden and replaced by a green "No near-expiry alerts at this time." banner with a shield-check icon.
- Thresholds are displayed in the panel header (e.g. `Thresholds: 30/60/90 days`) for transparency.
- Panel loads with a `—` placeholder and resolves asynchronously without blocking other dashboard sections.

**Alt Flow(s)**
- Alt Flow A — All clear: All counts are zero; the individual alert cards are hidden and replaced by the all-clear banner.
- Alt Flow B — Only some levels triggered: Cards for zero-count levels render in neutral style; only active levels show coloured accents and "Alert" badges.

**Exceptions**
- E1 — `electronAPI` unavailable: Panel renders a red inline error: `Unable to load expiry data. Contact administrator.`
- E2 — Query error: Caught in `try/catch`; error message displayed in the error state without crashing other panels.

---

## US-303 — Dashboard Activity Feed & Analytics Chart

### UC-303 — Dashboard Activity Feed & Analytics Chart

| Field | Detail |
|---|---|
| **Use Case ID** | UC-303 |
| **Use Case Name** | Dashboard Activity Feed & Analytics Chart |
| **Actor(s)** | Distributor, Admin |
| **Preconditions** | 1. User is authenticated. 2. Stock movements and/or sale invoice records exist in the database. |
| **Postconditions** | 1. The dashboard renders a chronological activity feed of recent transactions. 2. An analytics chart renders a visual sales trend. |

**User Story**
As a distributor, I want to see a recent activity list and a sales analytics chart on the dashboard so that I can review operational history and identify trends without navigating to separate report pages.

**Sub User Stories**
- As a distributor, I want to see a feed of recent stock movements and sales so I can quickly audit what happened on the workstation.
- As a distributor, I want a time-series chart of sales data so I can spot revenue trends at a glance.

**Acceptance Criteria**
- `ActivityList` component renders below the KPI and expiry panels.
- `AnalyticsChart` component renders alongside the activity list.
- Both components are independently data-fetched and do not block each other or the KPI panels.
- Dashboard layout uses a responsive flex column structure with consistent gap spacing.

**Alt Flow(s)**
- Alt Flow A — No activity yet: Components render empty states or placeholder messages when no data exists.

**Exceptions**
- E1 — Component-level fetch error: Each component handles its own error state independently.

---

## US-304 — Backup & Export — Database Snapshot

### UC-304 — Full Database Backup (Snapshot)

| Field | Detail |
|---|---|
| **Use Case ID** | UC-304 |
| **Use Case Name** | Full Database Backup (Snapshot) |
| **Actor(s)** | Admin |
| **Preconditions** | 1. Admin is authenticated and on the Backup & Export page. 2. The Electron backend has access to `backupDatabase` IPC handler. 3. The file system is accessible for writing. |
| **Postconditions** | 1. A full portable database backup file is created at the admin-selected path. 2. A success toast displays the saved file path. |

**User Story**
As an admin, I want to create a full backup of the PostgreSQL database from within the app and receive confirmation of the saved path so that I can protect all pharmacy data against hardware failure or data corruption.

**Sub User Stories**
- As an admin, I want to click a single "Create Backup" button to trigger a full system backup without needing command-line access.
- As an admin, I want a success toast showing the exact file path so I can verify where the backup was saved.
- As an admin, I want cancellation (e.g. closing the save dialog) to produce a clear "Operation cancelled" message rather than an error.

**Acceptance Criteria**
- Clicking "Create Backup" calls `window.electronAPI.backupDatabase()`.
- On success (`result.success === true`): a green toast displays `Database backed up successfully to: {path}`.
- On cancellation (`result.error === 'Backup cancelled'`): toast shows `Operation cancelled`.
- On other failure: toast shows `Backup failed: {error message}`.
- The button is disabled and shows "Generating..." while the operation is in progress.
- A loading state (`isLoading`) prevents concurrent backup requests.

**Alt Flow(s)**
- Alt Flow A — User cancels file dialog: The IPC handler returns `{ success: false, error: 'Backup cancelled' }`; the UI shows "Operation cancelled" without treating it as an error.

**Exceptions**
- E1 — File system permission denied: `backupDatabase` returns `{ success: false, error: '...' }`; toast displays the error message.
- E2 — IPC handler throws: Caught in the frontend `try/catch`; toast shows `Error creating backup: {message}`.

---

## US-305 — Backup & Export — CSV Data Exports

### UC-305 — CSV Data Exports

| Field | Detail |
|---|---|
| **Use Case ID** | UC-305 |
| **Use Case Name** | CSV Data Exports |
| **Actor(s)** | Admin |
| **Preconditions** | 1. Admin is authenticated and on the Backup & Export page. 2. `exportToCsv` IPC handler is registered in the Electron backend. |
| **Postconditions** | 1. A date-stamped CSV file is written to the admin-chosen directory. 2. A success toast confirms the export path. |

**User Story**
As an admin, I want to export Sales, Customer, and Product data as individual CSV files so that I can analyse business data in external tools like Excel or share it with accountants.

**Sub User Stories**
- As an admin, I want to export the full Sales Ledger to a date-stamped CSV (`sales-export-YYYY-MM-DD.csv`) for revenue analysis.
- As an admin, I want to export the Customer List to CSV (`customers-export-YYYY-MM-DD.csv`) for account management.
- As an admin, I want to export the Product Catalog to CSV (`products-export-YYYY-MM-DD.csv`) for inventory and pricing audits.

**Acceptance Criteria**
- Three export cards are displayed: Sales Ledger, Customer List, Product Catalog — each with a distinct icon and colour.
- Clicking "Export CSV" on any card calls `window.electronAPI.exportToCsv({ table, filename })` where filename is `{table}-export-{YYYY-MM-DD}.csv`.
- On success: green toast shows `{Label} exported successfully to: {path}`.
- On cancellation: toast shows `Operation cancelled`.
- On failure: toast shows `Export failed: {error}`.
- All three export buttons share the same `isLoading` lock — only one operation can run at a time.

**Alt Flow(s)**
- Alt Flow A — Admin cancels file dialog: Same graceful cancellation handling as US-304.

**Exceptions**
- E1 — Empty table: Export succeeds but produces a header-only CSV; no error is shown.
- E2 — IPC handler throws: Caught by `try/catch`; toast shows `Error exporting data: {message}`.

---

## US-306 — Settings — Business Identity

### UC-306 — Business Identity Configuration

| Field | Detail |
|---|---|
| **Use Case ID** | UC-306 |
| **Use Case Name** | Business Identity Configuration |
| **Actor(s)** | Admin |
| **Preconditions** | 1. Admin is authenticated and on the Settings page. 2. The Business tab is active. |
| **Postconditions** | 1. Updated business credentials are saved to `localStorage`. 2. Settings persist across app restarts. |

**User Story**
As an admin, I want to configure and save the pharmacy's business identity information so that it is consistently used across all generated invoices, bills, and system reports.

**Sub User Stories**
- As an admin, I want to set Pharmacy Name, Support Email, Contact Phone, Drug Licence, Physical Address, STRN, and NTN.
- As an admin, I want changes to persist in `localStorage` so they survive app restarts without requiring a database round-trip.

**Acceptance Criteria**
- The Business tab renders input fields for: `name`, `email`, `phone`, `drugLicense`, `address` (full width), `strn`, `ntn`.
- Clicking "Sync Configuration" calls `handleSave('Business')` which writes the full `settings` object to `localStorage` under the key `pharmax_app_settings`.
- On save: a success toast shows `Business configuration saved.`
- On app load: saved settings are read from `localStorage` and pre-populated into all fields.
- A loading spinner replaces the save button text for 600 ms to simulate async persistence.

**Alt Flow(s)**
- Alt Flow A — First launch (no saved settings): Default values are used (`'Pharmax Solutions'`, `'contact@pharmax.com'`, etc.).

**Exceptions**
- E1 — `localStorage` write fails: A red toast shows `Failed to sync settings.`

---

## US-307 — Settings — System & Automation

### UC-307 — System Workflow Configuration

| Field | Detail |
|---|---|
| **Use Case ID** | UC-307 |
| **Use Case Name** | System Workflow Configuration |
| **Actor(s)** | Admin |
| **Preconditions** | 1. Admin is authenticated and on the Settings page, System tab active. |
| **Postconditions** | 1. Dark mode, notification, and backup preferences are saved and applied. |

**User Story**
As an admin, I want to configure system-level preferences including appearance, alerts, and automated backup so that the workstation behaves according to the pharmacy's operational requirements.

**Sub User Stories**
- As an admin, I want to toggle Dark Mode and have it apply immediately to the entire interface.
- As an admin, I want to toggle Desktop Notifications to control whether critical stock and expiry alerts are pushed.
- As an admin, I want to enable Automated Backup, set its frequency (Daily / Weekly), and choose a destination directory.

**Acceptance Criteria**
- Dark Mode toggle immediately adds/removes the `dark` class on `document.documentElement` in addition to saving the preference.
- Notification Sound and Desktop Notifications toggles save their state to `localStorage`.
- When Auto Backup is toggled on, additional controls animate in: an Archive Frequency selector (Daily / Weekly) and a directory picker button.
- Clicking the folder icon invokes `window.electronAPI.selectDirectory()` and populates the path display.
- Auto Backup preference, frequency, and path are persisted in `localStorage`.

> **Note:** Auto Backup and Desktop Notifications preferences are stored and UI is complete. Background scheduler and actual notification push are deferred to a future sprint.

**Alt Flow(s)**
- Alt Flow A — Auto Backup disabled: The frequency and directory sub-controls are hidden via conditional render.

**Exceptions**
- E1 — Directory selection cancelled: `selectDirectory()` returns `null`; path field retains previous value unchanged.

---

## US-308 — Settings — Invoicing & Printing

### UC-308 — Invoicing & Hardware Configuration

| Field | Detail |
|---|---|
| **Use Case ID** | UC-308 |
| **Use Case Name** | Invoicing & Hardware Configuration |
| **Actor(s)** | Admin |
| **Preconditions** | 1. Admin is authenticated. 2. Invoicing or Printing tab is active in Settings. |
| **Postconditions** | 1. Invoice formatting rules and printer configuration are saved to `localStorage`. |

**User Story**
As an admin, I want to customise invoice numbering, tax, currency, footer text, and printer settings so that all bills generated by the system comply with the pharmacy's legal and operational standards.

**Sub User Stories**
- As an admin, I want to set an Invoice Number Prefix, Default Tax Rate (%), Currency symbol, and a Footer Disclaimer message that appears on every bill.
- As an admin, I want to choose between POS Thermal (80mm roll) and Standard Desktop (A4/A5) printing modes and register the assigned device name.

**Acceptance Criteria**
- Invoicing tab renders fields for: `prefix` (e.g. `INV-`), `defaultTax` (numeric), `currency` (e.g. `Rs`), `footerMsg` (textarea).
- Printing tab renders two selectable printer-type cards (Thermal / Standard) with visual active state (blue border, scaled icon).
- A device name input field is rendered below the printer type cards.
- All fields persist to `localStorage` on "Sync Configuration".
- Active printer type card shows a blue border, filled icon background, and a scale-110 transform; inactive cards are neutral.

**Alt Flow(s)**
- Alt Flow A — No printer name entered: Field accepts empty string; no validation is enforced at this stage.

**Exceptions**
- E1 — `localStorage` write fails: Red toast `Failed to sync settings.`

---

## US-309 — Settings — Security & Maintenance

### UC-309 — Security & Maintenance Controls

| Field | Detail |
|---|---|
| **Use Case ID** | UC-309 |
| **Use Case Name** | Security & Maintenance Controls |
| **Actor(s)** | Admin |
| **Preconditions** | 1. Admin is authenticated. 2. Security or Maintenance tab is active in Settings. |
| **Postconditions** | 1. (Factory Reset) All `localStorage` UI settings are wiped and the app reloads. Database records are unaffected. |

**User Story**
As an admin, I want access to security controls and a system maintenance reset so that I can protect workstation access and recover from misconfigured UI settings without affecting pharmacy data.

**Sub User Stories**
- As an admin, I want a "Modify PIN" action in the Security tab to update my workstation login password.
- As an admin, I want a "Hard Factory Reset" option in the Maintenance tab to wipe all local UI settings and reload to defaults.

**Acceptance Criteria**
- Security tab renders a "Workstation Password" card with a "Modify PIN" button.
- A "Multi-Role Licensing" card is rendered but visually disabled (greyscale, `cursor-not-allowed`, labelled "Enterprise Only").
- Maintenance tab renders a "Hard Factory Reset" card in a red danger zone with a confirmation dialog before execution.
- Confirming the factory reset calls `localStorage.removeItem('pharmax_app_settings')` and then `window.location.reload()`.
- Cancelling the confirmation dialog aborts the reset with no side effects.

> **Note (US-309a):** The "Modify PIN" button UI is implemented. The actual password-change form/modal is deferred to a future sprint.

**Alt Flow(s)**
- Alt Flow A — Admin cancels factory reset confirmation: `window.confirm()` returns `false`; no action is taken, settings are unchanged.

**Exceptions**
- E1 — `localStorage.removeItem` fails: Browser-level failure; app may not reload cleanly. No custom handling at this stage.
