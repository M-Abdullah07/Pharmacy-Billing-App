# Customer-Hosted Database — Setup Guide

Use this guide when the **customer** runs their own PostgreSQL instance
(typically on the same machine/LAN as the PharmaX app, or on infrastructure
they own and manage). This is the opposite hosting model from
`SELF_HOSTED_PROVISIONING.md` — everything after "which database do we point
at" is identical; only where Postgres lives and who's responsible for backups
changes.

> **Backups are the customer's responsibility in this model.** PharmaX (the
> vendor) does not have access to the customer's database server and cannot
> run or verify backups for them. This must be communicated clearly during
> onboarding — see [Backups](#backups-customers-responsibility) below.

## 1. Install PostgreSQL

- [ ] Install **PostgreSQL 16 or newer** (PharmaX is developed against
      Postgres 18, but 16+ is the practical minimum for compatibility with
      the schema's features — generated columns, `gen_random_uuid()`, etc.).
      Download from https://www.postgresql.org/download/ for the customer's
      OS.
- [ ] During Windows install, note the password set for the `postgres`
      superuser — needed for the next steps, but the app itself must **not**
      use this account (see step 3).
- [ ] Confirm the service is running:
      ```powershell
      Get-Service postgresql-x64-18   # or whatever the installed service is named
      ```

## 2. Create the database

```sql
CREATE DATABASE pharmax_db;
```

## 3. Create a least-privilege application role

Exactly the same principle as the self-hosted guide — the app should never
connect as the Postgres superuser:

```sql
CREATE ROLE pharmax_app WITH LOGIN PASSWORD '<strong-password>';

GRANT CONNECT ON DATABASE pharmax_db TO pharmax_app;

\c pharmax_db

GRANT USAGE ON SCHEMA public TO pharmax_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pharmax_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pharmax_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pharmax_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pharmax_app;
```

- [ ] `pharmax_app` has no `CREATEDB`/`CREATEROLE`/`SUPERUSER` attributes.
- [ ] Schema/migrations (below) are applied using the `postgres` superuser
      or a dedicated migrator role, not `pharmax_app`.

## 4. SSL is optional for a local/LAN install

Unlike the self-hosted-by-us guide, `ssl` is **not required** when Postgres
runs on the same machine as the app (`localhost`) or a trusted LAN — but it
is still supported and recommended if the database is on a separate machine
reachable over an untrusted network:

- **Same machine (`127.0.0.1`):** `ssl: false` is acceptable in
  `dbconfig.json`.
- **Separate machine on the customer's network:** enable SSL on the Postgres
  server (`ssl = on` in `postgresql.conf`, plus a cert) and set `ssl: true`
  in `dbconfig.json`, exactly as in the self-hosted guide.

## 5. Apply the schema and migrations, in order

```powershell
psql -U postgres -d pharmax_db -f "database/pharmax_schema.sql"
psql -U postgres -d pharmax_db -f "database/migrations/v3.0.1_race_condition_hardening.sql"
psql -U postgres -d pharmax_db -f "database/migrations/v3.1.0_financial_correctness.sql"
```

- [ ] Run `database/pharmax_schema.sql` first, then every file under
      `database/migrations/` **in version order** — see
      `database/migrations/README.md` for the current, up-to-date list and
      any migration-specific pre-checks.
- [ ] Watch for `SAFETY CHECK` blocks aborting the script (`RAISE EXCEPTION`)
      — this means the script detected data it refused to migrate blindly;
      do not re-run blindly, investigate first.

## 6. Write `dbconfig.json`

Local install, same machine as the app, no SSL:

```json
{
  "host": "127.0.0.1",
  "port": 5432,
  "database": "pharmax_db",
  "user": "pharmax_app",
  "password": "<pharmax_app's password>",
  "ssl": false
}
```

Separate machine on the customer's LAN, SSL enabled:

```json
{
  "host": "192.168.1.50",
  "port": 5432,
  "database": "pharmax_db",
  "user": "pharmax_app",
  "password": "<pharmax_app's password>",
  "ssl": true
}
```

### Where to put this file

`Backend/app/config.js` looks for `dbconfig.json` at the Electron `userData`
path for the installed app. Per OS:

- **Windows:** `%APPDATA%\<app name>\dbconfig.json`
- **macOS:** `~/Library/Application Support/<app name>/dbconfig.json`
- **Linux:** `~/.config/<app name>/dbconfig.json`

> **`<app name>` update:** `Frontend/package.json`'s `"name"`/`"productName"`
> were renamed from the `"last one"` placeholder to `"pharmax"`. The real
> path on Windows is now `%APPDATA%\pharmax\dbconfig.json`. Any
> `dbconfig.json` previously created under the old `%APPDATA%\last one\`
> folder during pre-release dev/testing will not carry over automatically —
> acceptable pre-release, since no production installs existed under the old name.

If `dbconfig.json` is missing or fails to parse, PharmaX falls back to
environment variables (`.env`, dev-only) and then hardcoded local defaults —
it will never crash on a missing/malformed config file, but it also won't
silently connect to the wrong database, since the defaults point at
`127.0.0.1`/`Pharmax`, which only matches an intentionally-named local dev
setup.

## Backups (customer's responsibility)

> **This is the single most important difference from the self-hosted-by-us
> model. Say this explicitly during onboarding, in writing.**

- [ ] The customer is responsible for scheduling, storing, and testing their
      own backups. PharmaX (the vendor) has no access to the customer's
      database server to do this on their behalf.
- [ ] Recommended minimum: a scheduled `pg_dump` via Windows Task Scheduler
      (or `cron` on Linux/macOS), e.g.:
      ```powershell
      pg_dump -U postgres -d pharmax_db -Fc -f "C:\PharmaXBackups\pharmax_$(Get-Date -Format yyyyMMdd).dump"
      ```
- [ ] Recommend the customer store backups on separate physical media/storage
      from the database server itself (external drive, network share, or
      cloud storage), and periodically test restoring one.
- [ ] Provide the customer the restore command as part of handoff:
      ```powershell
      pg_restore -U postgres -d pharmax_db_restore_test "C:\PharmaXBackups\pharmax_20260101.dump"
      ```

There is **no** `if (selfHosted)` branch anywhere in `config.js` or `db.js` —
this guide and `SELF_HOSTED_PROVISIONING.md` produce the exact same
`dbconfig.json` shape; only the field *values* (host, ssl) differ, and only
the *backup ownership* differs operationally.
