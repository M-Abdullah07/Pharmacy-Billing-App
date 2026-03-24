# 💊 PharmaX Database Migrations Guide

This directory contains incremental SQL scripts to safely evolve the PharmaX production schema. These scripts are designed to be **non-destructive** and maintain data integrity during updates.

---

### 🛡️ Pre-Migration Checklist
1. **Backup your DB:** Always take a snapshot before running any hardening script.
   ```powershell
   pg_dump -U postgres -d pharmax_db > backup_pre_hardening.sql
   ```
2. **Close Active Sessions:** Ensure no other application instances are actively writing to the database during the migration.
3. **Data Integrity:** If a migration script contains a `SAFETY CHECK` (using `DO $$`), it will stop automatically if it detects corrupt data (e.g., negative stock).

---

### 🚀 How to Run Migration Scripts (Windows)

#### Option 1: Via psql (Command Line)
Open PowerShell or CMD and run:
```powershell
psql -U postgres -d pharmax_db -f "database/migrations/v[VERSION]_description.sql"
```
*(Replace `postgres` and `pharmax_db` with your local credentials.)*

#### Option 2: Via pgAdmin 4 (GUI)
1. Right-click the **pharmax_db** and open the **Query Tool**.
2. Click the **Open File** icon (📁) and select the `.sql` script.
3. Press **F5** (Execute).

#### Option 3: Via DBeaver
1. Use `SQL Editor` -> `Execute SQL Script`.
2. Browse to the file in this directory and click **Start**.

---

### 📜 Migration History
- **v3.0.1_race_condition_hardening.sql** (2026-03-24):
  - Added `CHECK` constraints on `batches` for atomic stock protection.
  - Implemented `PERFORM ... FOR UPDATE` for pessimistic credit locking.
  - Initialized `sale_invoice_num_seq` for gapless-ready invoicing.
  - Added **Status Finality** guards to prevent confirmed-to-draft reversals.
