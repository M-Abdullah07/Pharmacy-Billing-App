# 2. Sprint Backlog — Sprint 3

## 2a. Module for Sprint 3

**Module Name:** Operations Intelligence & Workstation Control

This module delivers:
- A live **Dashboard** with KPI stat cards, near-expiry batch alerts, activity feed, and analytics chart
- A **Backup & Data Export** module for full PostgreSQL database snapshots and CSV exports (Sales, Customers, Products)
- A **Settings / Control Panel** for managing Business Identity, System preferences, Invoicing rules, Printing hardware, Security, and Maintenance

---

## 2b. Sprint 3 Backlog Table

| Story ID | User Story | Priority | SP | Status |
|---|---|---|---|---|
| **US-301** | **Dashboard — Live KPI Panel** | **High** | **5** | **Done** |
| US-301a | As a distributor, I want to see Total Sales revenue (all confirmed invoices) on the dashboard so I can track performance at a glance | High | 2 | Done |
| US-301b | As a distributor, I want to see Total Profit (sale rate − purchase cost × qty) on the dashboard so I understand margins | High | 2 | Done |
| US-301c | As a distributor, I want to see the count of Out-of-Stock products on the dashboard so I know what to reorder immediately | High | 1 | Done |
| **US-302** | **Dashboard — Near-Expiry Batch Alert Panel (UC-205)** | **Critical** | **8** | **Done** |
| US-302a | As a distributor, I want the dashboard to show a count of Critical batches (expiring ≤ 30 days) with a red accent card so I can act immediately | Critical | 3 | Done |
| US-302b | As a distributor, I want the dashboard to show a count of Warning batches (31–60 days) with an amber accent card so I can plan proactively | Critical | 2 | Done |
| US-302c | As a distributor, I want the dashboard to show a count of Watch batches (61–90 days) with a yellow accent card for early awareness | High | 2 | Done |
| US-302d | As a distributor, I want to see an "All Clear" confirmation message when no batches are near expiry so I have peace of mind | Medium | 1 | Done |
| **US-303** | **Dashboard — Activity Feed & Analytics Chart** | **Medium** | **5** | **Done** |
| US-303a | As a distributor, I want to see a recent activity list (latest stock movements / sales) on the dashboard | Medium | 3 | Done |
| US-303b | As a distributor, I want an analytics chart on the dashboard to visualise sales trends over time | Medium | 2 | Done |
| **US-304** | **Backup & Export — Database Snapshot** | **High** | **5** | **Done** |
| US-304a | As an admin, I want to trigger a full PostgreSQL database backup from within the app and be shown the saved file path so I can confirm success | High | 3 | Done |
| US-304b | As an admin, I want the backup action to show an in-app toast on success or failure so I know the result without leaving the screen | Medium | 1 | Done |
| US-304c | As an admin, I want backup cancellation (e.g. closing the save dialog) to be handled gracefully with an "Operation cancelled" message | Low | 1 | Done |
| **US-305** | **Backup & Export — CSV Data Exports** | **High** | **6** | **Done** |
| US-305a | As an admin, I want to export the full Sales Ledger to a date-stamped CSV file so I can analyse revenue in Excel | High | 2 | Done |
| US-305b | As an admin, I want to export the Customer List to CSV so I can maintain an offline directory of accounts | Medium | 2 | Done |
| US-305c | As an admin, I want to export the Product Catalog to CSV so I can audit inventory and pricing offline | Medium | 2 | Done |
| **US-306** | **Settings — Business Identity** | **High** | **4** | **Done** |
| US-306a | As an admin, I want to set and save Pharmacy Name, Email, Phone, Drug Licence, STRN, NTN, and Address so they appear on generated invoices and reports | High | 3 | Done |
| US-306b | As an admin, I want settings to be persisted in `localStorage` so they survive app restarts without a database round-trip | Medium | 1 | Done |
| **US-307** | **Settings — System & Automation** | **High** | **5** | **Done** |
| US-307a | As an admin, I want to toggle Dark Mode on/off and have it apply immediately to the entire app so the UI matches the workstation environment | Medium | 2 | Done |
| US-307b | As an admin, I want to toggle Desktop Notifications (critical stock & expiry alerts) on/off | Medium | 1 | Done |
| US-307c | As an admin, I want to enable Automated Backup, set frequency (Daily / Weekly), and choose a destination directory so data is protected without manual intervention | High | 2 | Done |
| **US-308** | **Settings — Invoicing & Printing** | **Medium** | **4** | **Done** |
| US-308a | As an admin, I want to set the Invoice Number Prefix, Default Tax Rate, Currency symbol, and Footer Disclaimer so all bills are consistently formatted | Medium | 2 | Done |
| US-308b | As an admin, I want to choose between POS Thermal (80mm roll) and Standard Desktop (A4/A5) printing modes and enter the assigned device name | Medium | 2 | Done |
| **US-309** | **Settings — Security & Maintenance** | **Medium** | **3** | **Done** |
| US-309a | As an admin, I want to change my workstation password (PIN) from the Security tab | Medium | 2 | Done |
| US-309b | As an admin, I want a "Hard Factory Reset" option that wipes all local UI settings and reloads the app without affecting database records | Low | 1 | Done |

---

## Sprint 3 Summary

| Category | Stories | Story Points |
|---|---|---|
| Dashboard (KPI + Expiry + Charts) | US-301, US-302, US-303 | 18 |
| Backup & Export | US-304, US-305 | 11 |
| Settings | US-306, US-307, US-308, US-309 | 16 |
| **Total** | **9 parent stories / 26 sub-stories** | **45** |
