# Self-Hosted (By Us) — Database Provisioning Checklist

Use this checklist when **we** (not the customer) host the PostgreSQL instance
that a PharmaX deployment connects to — e.g. a managed cloud database or a VM
we operate. Backups and uptime are **our responsibility** in this model.

This checklist produces exactly one artifact the app cares about: a
`dbconfig.json` file (see [Where PharmaX reads config from](#where-pharmax-reads-config-from)
below). Everything else here is standard PostgreSQL operations —
`Backend/app/config.js` does not know or care whether the database it's
talking to is self-hosted or customer-hosted; only the *contents* of
`dbconfig.json` differ between the two guides.

## 1. Provision the server

- [ ] Create a VM or managed PostgreSQL instance running **PostgreSQL 18**
      (matches the version PharmaX is developed/tested against).
- [ ] Place it in a private network / VPC where possible; only expose the
      Postgres port (default `5432`) to the application's egress IP(s), not
      the public internet at large.
- [ ] Enable automated OS/security patching on the VM (skip if using a fully
      managed database service — the provider handles this).

## 2. Create the database

```sql
CREATE DATABASE pharmax_prod;
```

Use a customer- or tenant-specific database name if this instance will ever
host more than one customer's data. Do not reuse a database across unrelated
customers.

## 3. Create a least-privilege application role

**Never** have the app connect as a Postgres superuser. Create a dedicated
role scoped to only what the app needs:

```sql
CREATE ROLE pharmax_app WITH LOGIN PASSWORD '<strong-random-password>';

GRANT CONNECT ON DATABASE pharmax_prod TO pharmax_app;

\c pharmax_prod

GRANT USAGE ON SCHEMA public TO pharmax_app;

-- Row-level access on all application tables (SELECT/INSERT/UPDATE/DELETE only —
-- no CREATE/DROP/ALTER, no ownership).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pharmax_app;

-- Sequences back the UUID/serial defaults used by several tables' primary keys —
-- the app role needs USAGE (to call nextval/currval) but not ownership.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pharmax_app;

-- Make sure tables/sequences created by FUTURE migrations also get these
-- grants automatically (run this as the same role that will apply migrations).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pharmax_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pharmax_app;
```

- [ ] The `pharmax_app` role has **no** `CREATEDB`, `CREATEROLE`, or
      `SUPERUSER` attributes.
- [ ] Schema migrations (below) are applied by a *separate*, more privileged
      role (e.g. `postgres` or a dedicated `pharmax_migrator` role) — never by
      the app's runtime role.

## 4. Require SSL/TLS

- [ ] Set `ssl = on` in `postgresql.conf` (or use the managed provider's
      equivalent setting — most enable this by default).
- [ ] In `pg_hba.conf`, require `hostssl` (not plain `host`) for the
      `pharmax_app` role's connection entries, so a plaintext connection
      attempt is rejected outright:
      ```
      hostssl  pharmax_prod  pharmax_app  <app-egress-ip>/32  scram-sha-256
      ```
- [ ] Confirm the server's TLS certificate is valid (a managed provider's
      default cert is fine; for a self-managed VM, use a real CA-issued cert
      or document the CA so `rejectUnauthorized` can stay `true`).

## 5. Apply the schema and migrations, in order

```powershell
psql "host=<host> port=5432 dbname=pharmax_prod user=pharmax_migrator sslmode=require" -f database/pharmax_schema.sql
psql "host=<host> port=5432 dbname=pharmax_prod user=pharmax_migrator sslmode=require" -f database/migrations/v3.0.1_race_condition_hardening.sql
psql "host=<host> port=5432 dbname=pharmax_prod user=pharmax_migrator sslmode=require" -f database/migrations/v3.1.0_financial_correctness.sql
```

- [ ] Always run `database/pharmax_schema.sql` first, then every file under
      `database/migrations/` **in version order** (see
      `database/migrations/README.md` for the up-to-date list — new
      migrations get appended there as they're added).
- [ ] Confirm no `SAFETY CHECK` block in a migration aborted partway (they
      `RAISE EXCEPTION` on corrupt data — read the psql output).

## 6. Write `dbconfig.json`

This is the one file `Backend/app/config.js` actually reads. Its location is
per-OS (see [Where PharmaX reads config from](#where-pharmax-reads-config-from)).
For a self-hosted-by-us deployment, `ssl: true` is required:

```json
{
  "host": "<db-host-or-ip>",
  "port": 5432,
  "database": "pharmax_prod",
  "user": "pharmax_app",
  "password": "<pharmax_app's password>",
  "ssl": true
}
```

- [ ] If the server uses a self-signed or private-CA certificate,
      `ssl` can instead be an object: `{ "rejectUnauthorized": false }` —
      but prefer a properly CA-signed cert so `ssl: true` (which validates
      the chain) can be used unmodified.

## 7. Backups (our responsibility in this model)

- [ ] Schedule nightly `pg_dump` (or the managed provider's automated
      snapshot feature) with a retention window agreed with the customer
      (e.g. 30 daily + 12 monthly).
      ```powershell
      pg_dump "host=<host> dbname=pharmax_prod user=pharmax_migrator sslmode=require" -Fc -f "pharmax_prod_$(Get-Date -Format yyyyMMdd).dump"
      ```
- [ ] Store backups off the same host/VM (separate storage account or bucket).
- [ ] Periodically test a restore into a scratch database — an untested
      backup is not a backup.
- [ ] Document the retention policy and restore SLA in the customer contract;
      this is explicitly **our** responsibility for self-hosted deployments
      (contrast with `CUSTOMER_HOSTED_SETUP.md`, where backups are the
      customer's responsibility).

## Where PharmaX reads config from

`Backend/app/config.js` resolves connection settings in this priority order:

1. `dbconfig.json` at the Electron `userData` path for the app, **if it
   exists and parses**. Per OS:
   - **Windows:** `%APPDATA%\<app name>\dbconfig.json`
   - **macOS:** `~/Library/Application Support/<app name>/dbconfig.json`
   - **Linux:** `~/.config/<app name>/dbconfig.json`
2. Environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
   `DB_PASSWORD`, `DB_SSL`) — loaded via `.env` in dev, best-effort under asar.
3. Hardcoded local-dev defaults (`127.0.0.1:5432`, database `Pharmax`, user
   `postgres`) — a safety net for development only, never appropriate in
   production.

**`<app name>` update:** `Frontend/package.json`'s `"name"`/`"productName"`
fields were renamed from the `"last one"` placeholder to `"pharmax"`. Electron
derives the `userData` folder name from this field, so the path is now
`%APPDATA%\pharmax\dbconfig.json` (or the equivalent on macOS/Linux). Any
`dbconfig.json` previously created under the old `%APPDATA%\last one\`
folder during pre-release dev/testing will **not** carry over automatically —
acceptable pre-release, but re-create/copy it under the new path if needed.

There is **no** `if (selfHosted)` branch anywhere in the code — this guide and
`CUSTOMER_HOSTED_SETUP.md` produce the exact same `dbconfig.json` shape; only
the field *values* differ.
