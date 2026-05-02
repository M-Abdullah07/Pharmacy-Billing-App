-- ============================================================
-- PharmaX — Final Production PostgreSQL Schema  (v3.0)
-- ============================================================
-- Platform    : PostgreSQL 15+
-- Application : PharmaX — Pharmaceutical Distribution Management
--               Desktop App (Electron + Node.js backend)
-- Audience    : Pakistani pharmaceutical wholesale distributors
-- Regulatory  : DRAP (Drug Regulatory Authority of Pakistan)
--               FBR (Federal Board of Revenue) — tax compliance
-- Currency    : PKR (Pakistani Rupee)
-- Encoding    : UTF-8 (supports Urdu product/party names)
--
-- IMMUTABILITY GUARANTEE
-- ─────────────────────
-- This schema is designed to be FINAL for all three iterations
-- and beyond. All tables cover:
--   Iteration 1 : Authentication, Master Data, Stock View
--   Iteration 2 : Purchase & Sales Invoicing, Ledgers, Returns
--   Iteration 3 : Payments, Expenses, Financials, Dashboard, Export
--   Beyond      : Audit, multi-user expansion, reporting
--
-- Any future feature is additive (new rows, new JSONB keys, new
-- enum values via ALTER TYPE) — no DROP, no column removal, no
-- breaking rename is ever needed.
--
-- NORMALIZATION SUMMARY
-- ─────────────────────
-- All tables satisfy BCNF unless explicitly noted otherwise.
-- Denormalization is present ONLY in two places, each justified:
--   1. batches.quantity_available — cached derived value,
--      maintained by trigger, for sub-millisecond stock queries.
--      Source of truth is stock_movements. (Performance trade-off)
--   2. invoice header totals (total_amount, tax_amount, etc.) —
--      denormalized for report speed and snapshot semantics;
--      line items remain the authoritative source.
--
-- DESIGN AXIOMS
-- ─────────────
-- 1. Append-only for financial/ledger tables (no UPDATE/DELETE)
-- 2. Soft-delete everywhere (is_active + deactivated_at)
-- 3. Every monetary column is NUMERIC(15,2) — never FLOAT/REAL
-- 4. Every timestamp is TIMESTAMPTZ — no naive timestamps
-- 5. All ENUMs are PostgreSQL native types for constraint + speed
-- 6. TEXT over VARCHAR — PostgreSQL stores them identically; TEXT
--    avoids arbitrary length limits
-- 7. GENERATED columns for derived values where possible
-- 8. Row-Level Security ready (user_id on financial rows)
-- 9. Full-text search via tsvector columns on searchable entities
-- 10. JSONB for flexible/sparse attributes (avoids future ALTER)
-- ============================================================

\c "Pharmax"
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram indexes for ILIKE search
CREATE EXTENSION IF NOT EXISTS "btree_gist";    -- GiST indexes for exclusion constraints
-- unaccent: optional, for Urdu-tolerant search (install if needed)
-- CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ============================================================
-- CUSTOM ENUM TYPES
-- ============================================================
-- Enums enforce domain constraints at the DB layer with zero
-- storage overhead vs TEXT + CHECK. New values added via:
--   ALTER TYPE type_name ADD VALUE 'new_val';
-- (non-breaking, no table rewrite required in PostgreSQL 9.1+)


DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drug_schedule') THEN
        CREATE TYPE drug_schedule AS ENUM ('OTC', 'G', 'H', 'H1', 'X');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
        CREATE TYPE customer_type AS ENUM ('retailer', 'wholesaler', 'hospital', 'clinic', 'government');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_entity') THEN
        CREATE TYPE contact_entity AS ENUM ('supplier', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
        CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment_in', 'adjustment_out', 'expiry_writeoff');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'confirmed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE payment_mode AS ENUM ('cash', 'bank_transfer', 'cheque', 'mobile_wallet');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_direction') THEN
        CREATE TYPE payment_direction AS ENUM ('received', 'paid');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
        CREATE TYPE expense_category AS ENUM ('transport', 'rent', 'utilities', 'salaries', 'marketing', 'maintenance', 'miscellaneous');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_reason') THEN
        CREATE TYPE return_reason AS ENUM ('near_expiry', 'damaged', 'excess_stock', 'wrong_product', 'quality_issue', 'customer_request', 'other');
    END IF;
END $$;


-- ============================================================
-- 1. USERS
-- ============================================================
-- 3NF / BCNF: All non-key attributes depend solely on user_id.
-- No partial or transitive dependencies.
CREATE TABLE IF NOT EXISTS users (
    user_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT            NOT NULL,
    password_hash   TEXT            NOT NULL,   -- bcrypt hash; never store plaintext
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    deactivated_at  TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    failed_attempts SMALLINT        NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,               -- Set after 5 consecutive failures
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT chk_users_deactivated CHECK (
        (is_active = TRUE  AND deactivated_at IS NULL) OR
        (is_active = FALSE AND deactivated_at IS NOT NULL)
    )
);

COMMENT ON TABLE  users                  IS 'System users. Single admin in Iteration 1; role expansion in later iterations.';
COMMENT ON COLUMN users.password_hash    IS 'bcrypt hash via bcryptjs. Plain-text MUST never be stored.';


-- ============================================================
-- 2. MANUFACTURERS
-- ============================================================
-- 3NF / BCNF: All attributes depend only on manufacturer_id.
-- country determines is_imported — not a separate column
-- (derived at query time: country != 'Pakistan' ⟹ imported).
CREATE TABLE IF NOT EXISTS manufacturers (
    manufacturer_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT        NOT NULL,
    drap_mfg_licence    TEXT,                  -- DRAP manufacturing licence number
    country             TEXT        NOT NULL DEFAULT 'Pakistan',
    contact_number      TEXT,
    email               TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    deactivated_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- FTS column: enables fast ILIKE-equivalent search
    search_vector       TSVECTOR GENERATED ALWAYS AS (
                            to_tsvector('english', coalesce(name, '') || ' ' ||
                                                   coalesce(drap_mfg_licence, ''))
                        ) STORED,

    CONSTRAINT uq_manufacturers_name UNIQUE (name),
    CONSTRAINT chk_manufacturers_deactivated CHECK (
        (is_active = TRUE  AND deactivated_at IS NULL) OR
        (is_active = FALSE AND deactivated_at IS NOT NULL)
    )
);

COMMENT ON TABLE  manufacturers               IS 'Medicine manufacturers. country != ''Pakistan'' implies imported product.';
COMMENT ON COLUMN manufacturers.drap_mfg_licence IS 'DRAP manufacturing authorisation number. Mandatory for compliant purchasing.';
COMMENT ON COLUMN manufacturers.search_vector IS 'Auto-maintained FTS vector. Never write directly.';


-- ============================================================
-- 3. CATEGORIES
-- ============================================================
-- 3NF / BCNF: Simple lookup table; no non-trivial functional
-- dependencies. description → name is not a FD (one-to-one
-- is fine here; no transitive dependency exists).
CREATE TABLE IF NOT EXISTS categories (
    category_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_categories_name UNIQUE (name)
);

COMMENT ON TABLE categories IS 'Controlled vocabulary for medicine categories. Pre-seeded; editable by admin.';

-- Seed data: standard Pakistan pharma distribution categories
INSERT INTO categories (name, description) VALUES
    ('Antibiotics',            'Antimicrobial agents for bacterial infections'),
    ('Analgesics',             'Pain relief and fever medications'),
    ('Antacids & GI',          'Gastrointestinal, antacid, and digestive medications'),
    ('Antihistamines',         'Allergy and antihistamine medications'),
    ('Antihypertensives',      'Blood pressure management medications'),
    ('Antidiabetics',          'Diabetes management medications'),
    ('Vitamins & Supplements', 'Nutritional supplements and vitamins'),
    ('Antifungals',            'Fungal infection treatments'),
    ('Antivirals',             'Viral infection treatments'),
    ('Respiratory',            'Asthma, bronchitis, and cough medications'),
    ('Dermatologicals',        'Skin preparations and topicals'),
    ('Ophthalmics',            'Eye drops and ophthalmic preparations'),
    ('Cardiovascular',         'Heart and circulatory system medications'),
    ('Psychiatrics & Neuro',   'CNS, psychiatric, and neurological medications'),
    ('Hormones',               'Hormonal and endocrine system medications'),
    ('Surgical Supplies',      'Dressings, sutures, and surgical consumables'),
    ('ORS & IV Fluids',        'Oral rehydration salts and intravenous fluids'),
    ('Veterinary',             'Veterinary pharmaceutical products'),
    ('Nutraceuticals',         'Functional foods and dietary products'),
    ('Uncategorised',          'Default category for unclassified products')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 4. PRODUCTS
-- ============================================================
-- BCNF ANALYSIS:
-- FDs: product_id → {all attributes}
--      name → product_id (candidate key — enforced by UNIQUE)
-- No non-trivial FDs where the determinant is not a superkey.
-- manufacturer_id, category_id are FKs (not transitive deps).
-- → Table is in BCNF. ✓
CREATE TABLE IF NOT EXISTS products (
    product_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT            NOT NULL,
    manufacturer_id         UUID            NOT NULL REFERENCES manufacturers(manufacturer_id)
                                            ON UPDATE CASCADE ON DELETE RESTRICT,
    category_id             UUID            REFERENCES categories(category_id)
                                            ON UPDATE CASCADE ON DELETE SET NULL,

    -- Physical form
    form                    TEXT,                       -- Tablet, Syrup, Injection, Capsule, Cream, Drops, etc.
    uom                     TEXT            NOT NULL DEFAULT 'Strip',
                                                        -- Unit of Measure: Strip, Bottle, Vial, Sachet, Piece
    quantity_in_uom         SMALLINT        NOT NULL DEFAULT 1
                                            CHECK (quantity_in_uom > 0),
                                                        -- e.g. 10 tablets per strip

    -- Regulatory (Pakistan-specific)
    hsn_code                TEXT,                       -- HSN/HS code for FBR tax invoicing (mandatory for GST bills)
    gst_rate                NUMERIC(5,2)    NOT NULL DEFAULT 0.00
                                            CHECK (gst_rate IN (0, 5, 12, 18, 28)),
                                                        -- FBR GST slabs: 0 / 5 / 12 / 18 / 28
    drug_schedule           drug_schedule   NOT NULL DEFAULT 'OTC',
    drap_registration_no    TEXT,                       -- Product-level DRAP registration number
    requires_prescription   BOOLEAN         NOT NULL DEFAULT FALSE,
                                                        -- Derived from schedule but stored for fast filter

    -- Generic formula (Pakistan-critical: doctors prescribe by generic name)
    -- e.g. 'Paracetamol 500mg', 'Amoxicillin 500mg + Clavulanic Acid 125mg'
    -- Enables cross-brand substitution search when a specific brand is out of stock.
    -- Also feeds the search_vector for "formula-first" search queries.
    generic_formula         TEXT,

    -- Pricing defaults (distributor's standard rates, NOT MRP)
    -- MRP is batch-level (DRAP mandate; printed on pack per batch run)
    default_sale_rate       NUMERIC(15,2)   NOT NULL DEFAULT 0.00
                                            CHECK (default_sale_rate >= 0),
    default_purchase_rate   NUMERIC(15,2)   NOT NULL DEFAULT 0.00
                                            CHECK (default_purchase_rate >= 0),

    -- Warehouse
    shelf_no                TEXT,                       -- Physical shelf/bin/rack location

    -- Flexible sparse attributes (avoids future schema changes)
    -- Example keys: "pack_type", "storage_condition", "cold_chain"
    attributes              JSONB           NOT NULL DEFAULT '{}',

    -- Lifecycle
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    deactivated_at          TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    -- Full-text search vector
    -- DESIGN NOTE: This is NOT a GENERATED column (unlike manufacturers/suppliers/customers).
    -- Reason: we need to include manufacturers.name and categories.name in this vector so that
    -- a query like "GSK Antibiotics Paracetamol" resolves in a single index scan without a JOIN.
    -- GENERATED columns can only reference same-row columns — not joined tables.
    -- Solution: plain TSVECTOR column, maintained by fn_rebuild_product_search_vector() trigger
    -- which fires on INSERT/UPDATE of products AND on UPDATE of manufacturers.name / categories.name.
    search_vector           TSVECTOR,

    CONSTRAINT uq_products_name         UNIQUE (name),
    CONSTRAINT chk_products_deactivated CHECK (
        (is_active = TRUE  AND deactivated_at IS NULL) OR
        (is_active = FALSE AND deactivated_at IS NOT NULL)
    ),
    CONSTRAINT chk_products_gst_schedule CHECK (
        -- Schedule X / H1 medicines typically have 0% GST in Pakistan (FBR exemption)
        -- Enforced at application layer; schema allows all combos for flexibility
        TRUE
    )
);

COMMENT ON TABLE  products                       IS 'Medicine master. Central entity. Deactivated products are hidden from transaction screens but retained for history.';
COMMENT ON COLUMN products.hsn_code              IS 'Harmonised System Nomenclature code. Mandatory for FBR-compliant GST invoicing in Pakistan.';
COMMENT ON COLUMN products.gst_rate              IS 'FBR GST slab. Most medicines in Pakistan are 0% (exempt); confirm with FBR schedules.';
COMMENT ON COLUMN products.drug_schedule         IS 'DRAP drug schedule. X = controlled. H1 = psychotropic. H = Rx-only. G = caution. OTC = unrestricted.';
COMMENT ON COLUMN products.generic_formula       IS 'Active ingredient(s) with strength. e.g. ''Paracetamol 500mg''. Pakistan doctors prescribe by generic; this enables cross-brand substitution search when a brand is out of stock.';
COMMENT ON COLUMN products.default_sale_rate     IS 'Distributor standard sale rate. NOT MRP (MRP is batch-level, printed on pack).';
COMMENT ON COLUMN products.requires_prescription IS 'TRUE for Schedule H, H1, X. Set by trigger on drug_schedule insert/update.';
COMMENT ON COLUMN products.attributes            IS 'Flexible JSONB bag for sparse product attributes (e.g., cold_chain, pack_type, storage_temp).';
COMMENT ON COLUMN products.search_vector         IS 'Trigger-maintained FTS vector. Includes name, generic_formula, form, manufacturer name, category name, HSN, DRAP reg no. Never write directly — maintained by fn_rebuild_product_search_vector().';


-- ============================================================
-- 5. PRODUCT PRICE HISTORY  (append-only audit log)
-- ============================================================
-- 3NF: product_id, changed_at → all attributes. No transitive deps.
-- This table is INSERT-ONLY. No UPDATE or DELETE ever.
CREATE TABLE IF NOT EXISTS product_price_history (
    history_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id              UUID            NOT NULL REFERENCES products(product_id)
                                            ON DELETE CASCADE,
    changed_by              UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    default_sale_rate       NUMERIC(15,2)   NOT NULL CHECK (default_sale_rate >= 0),
    default_purchase_rate   NUMERIC(15,2)   NOT NULL CHECK (default_purchase_rate >= 0),
    effective_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    notes                   TEXT,

    CONSTRAINT chk_price_history_rates CHECK (default_sale_rate >= default_purchase_rate OR default_purchase_rate = 0)
);

COMMENT ON TABLE  product_price_history IS 'Append-only log of product default rate changes. Never UPDATE or DELETE rows here.';
COMMENT ON COLUMN product_price_history.effective_from IS 'Timestamp from which these rates were active. Use to reconstruct historical pricing.';


-- ============================================================
-- 6. SUPPLIERS
-- ============================================================
-- BCNF ANALYSIS:
-- FDs: supplier_id → {all attributes}
--      strn → supplier_id (candidate key if STRN is always unique)
--      ntn  → supplier_id (candidate key if NTN  is always unique)
-- Both STRN and NTN are candidate keys → table is in BCNF. ✓
--
-- NOTE: Pakistan uses STRN (Sales Tax Registration Number),
-- not Indian GSTIN. Column named strn accordingly.
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT            NOT NULL,
    strn                TEXT            UNIQUE,        -- Sales Tax Registration Number (FBR)
    ntn                 TEXT            UNIQUE,        -- National Tax Number (FBR)
    drug_licence_no     TEXT,                          -- DRAP wholesale drug distribution licence
    address             TEXT,
    city                TEXT,
    payment_terms       TEXT,                          -- e.g. "Net 30", "Cash on Delivery"
    credit_period_days  SMALLINT        NOT NULL DEFAULT 0
                                        CHECK (credit_period_days >= 0),
    opening_balance     NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
                                                       -- Outstanding payable at system onboarding
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    deactivated_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    search_vector       TSVECTOR GENERATED ALWAYS AS (
                            to_tsvector('english',
                                coalesce(name, '') || ' ' ||
                                coalesce(strn, '') || ' ' ||
                                coalesce(ntn, '') || ' ' ||
                                coalesce(city, ''))
                        ) STORED,

    CONSTRAINT chk_suppliers_deactivated CHECK (
        (is_active = TRUE  AND deactivated_at IS NULL) OR
        (is_active = FALSE AND deactivated_at IS NOT NULL)
    )
);

COMMENT ON TABLE  suppliers              IS 'Supplier master. Represents pharmaceutical manufacturers'' agents, importers, and wholesale sub-distributors.';
COMMENT ON COLUMN suppliers.strn         IS 'Sales Tax Registration Number — Pakistan FBR identifier. Equivalent to GSTIN in Indian context. Used on all tax invoices.';
COMMENT ON COLUMN suppliers.ntn          IS 'National Tax Number — FBR income-tax identifier. Distinct from STRN.';
COMMENT ON COLUMN suppliers.drug_licence_no IS 'DRAP wholesale drug distribution licence. Required for legal purchase of Schedule H/H1/X medicines.';
COMMENT ON COLUMN suppliers.opening_balance IS 'Payable balance at the time of onboarding. Seeds the supplier ledger correctly.';


-- ============================================================
-- 7. CUSTOMERS
-- ============================================================
-- BCNF: Same analysis as suppliers. strn, ntn are candidate keys.
-- customer_type is a lookup value but only to the enum type, not
-- a separate table — enum provides all normalization benefits
-- without a join. ✓
CREATE TABLE IF NOT EXISTS customers (
    customer_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT            NOT NULL,
    strn                TEXT            UNIQUE,        -- Sales Tax Reg. No. (optional for small retailers)
    ntn                 TEXT            UNIQUE,
    drug_licence_no     TEXT,                          -- Pharmacy / hospital DRAP licence
    address             TEXT,
    city                TEXT,
    territory           TEXT,                          -- Sales area (e.g. Johar Town, DHA, Gulberg, Saddar)
    customer_type       customer_type   NOT NULL DEFAULT 'retailer',
    credit_limit        NUMERIC(15,2)   NOT NULL DEFAULT 0.00
                                        CHECK (credit_limit >= 0),
    opening_balance     NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
                                                       -- Receivable balance at onboarding
    payment_terms       TEXT,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    deactivated_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    search_vector       TSVECTOR GENERATED ALWAYS AS (
                            to_tsvector('english',
                                coalesce(name, '') || ' ' ||
                                coalesce(strn, '') || ' ' ||
                                coalesce(ntn, '') || ' ' ||
                                coalesce(city, '') || ' ' ||
                                coalesce(territory, ''))
                        ) STORED,

    CONSTRAINT chk_customers_deactivated CHECK (
        (is_active = TRUE  AND deactivated_at IS NULL) OR
        (is_active = FALSE AND deactivated_at IS NOT NULL)
    )
);

COMMENT ON TABLE  customers             IS 'Customer master. Covers retail pharmacies, hospital pharmacies, clinics, and government institutions.';
COMMENT ON COLUMN customers.strn        IS 'Sales Tax Registration Number (FBR). Required for B2B tax invoices. Optional for small unregistered retailers.';
COMMENT ON COLUMN customers.territory   IS 'Sales territory / area for route planning and territory-wise sales analysis.';
COMMENT ON COLUMN customers.customer_type IS 'Affects GST treatment: government customers may have different tax applicability.';
COMMENT ON COLUMN customers.opening_balance IS 'Receivable balance at onboarding. Seeds the customer ledger correctly.';


-- ============================================================
-- 8. CONTACT PERSONS
-- ============================================================
-- 3NF: contact_id → {all attributes}. entity_type + entity_id
-- is a logical FK (polymorphic). is_primary is a per-entity flag.
-- No transitive dependency exists. ✓
--
-- PARTIAL BCNF NOTE: The polymorphic design (entity_type + entity_id
-- rather than two nullable FKs) is a deliberate trade-off for
-- extensibility. In strict BCNF, two separate tables
-- (supplier_contacts, customer_contacts) would be purer, but
-- identical structure + polymorphic queries justify consolidation.
-- Application layer enforces referential integrity.
CREATE TABLE IF NOT EXISTS contact_persons (
    contact_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     contact_entity  NOT NULL,
    entity_id       UUID            NOT NULL,       -- supplier_id or customer_id
    name            TEXT            NOT NULL,
    role            TEXT,                           -- Owner, Salesman, Accounts, Manager
    contact_number  TEXT,
    email           TEXT,
    is_primary      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  contact_persons          IS 'Multiple contacts per supplier or customer. [Architect Note: Polymorphic reference; referential integrity is ensured by application-layer service/repository.]';
COMMENT ON COLUMN contact_persons.entity_id IS 'References suppliers.supplier_id or customers.customer_id depending on entity_type.';


-- ============================================================
-- 9. PURCHASE INVOICES (GRN — Goods Receipt Note / مال وصولی بل)
-- ============================================================
-- 3NF / BCNF: All attributes depend on purchase_invoice_id.
-- Header totals (total_amount, tax_amount, net_payable) are
-- INTENTIONAL DENORMALIZATION: snapshot semantics (invoice total
-- must be immutable after confirmation even if product rates
-- change later). Justified and documented. ✓
CREATE TABLE IF NOT EXISTS purchase_invoices (
    purchase_invoice_id UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id         UUID            NOT NULL REFERENCES suppliers(supplier_id)
                                        ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_number      TEXT            NOT NULL,      -- Supplier's printed invoice number
    invoice_date        DATE            NOT NULL,      -- Date on supplier's document
    received_date       DATE            NOT NULL DEFAULT CURRENT_DATE,
    status              invoice_status  NOT NULL DEFAULT 'draft',
    -- Snapshot totals (denormalised for immutability after confirmation)
    subtotal            NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount     NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount          NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    net_payable         NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (net_payable >= 0),
    notes               TEXT,
    created_by          UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    confirmed_by        UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    confirmed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_purchase_invoices_supplier_invoice UNIQUE (supplier_id, invoice_number),
    CONSTRAINT chk_purchase_invoice_confirmed CHECK (
        (status = 'confirmed' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL) OR
        (status != 'confirmed')
    )
);

COMMENT ON TABLE  purchase_invoices             IS 'GRN (Goods Receipt Note / مال وصولی). Foundation of supplier ledger and payables.';
COMMENT ON COLUMN purchase_invoices.invoice_number IS 'The supplier''s own printed invoice number. Unique per supplier to prevent duplicate GRN entry.';
COMMENT ON COLUMN purchase_invoices.subtotal    IS 'Intentionally denormalised. Snapshot of line-item sum at time of confirmation. Immutable after status = confirmed.';


-- ============================================================
-- 10. PURCHASE INVOICE ITEMS
-- ============================================================
-- 3NF / BCNF: (purchase_invoice_id, batch_id) → {all attributes}.
-- Prices here are snapshots of actual purchase prices at the time
-- of the GRN — NOT current product rates. ✓
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    item_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_invoice_id UUID            NOT NULL REFERENCES purchase_invoices(purchase_invoice_id)
                                        ON DELETE RESTRICT,
    product_id          UUID            NOT NULL REFERENCES products(product_id)
                                        ON DELETE RESTRICT,
    batch_number        TEXT            NOT NULL,
    manufacturing_date  DATE            NOT NULL,
    expiry_date         DATE            NOT NULL,
    mrp                 NUMERIC(15,2)   NOT NULL CHECK (mrp > 0),
                                                       -- DRAP-mandated MRP; printed on pack
    purchase_cost_per_unit NUMERIC(15,2) NOT NULL CHECK (purchase_cost_per_unit > 0),
    quantity            INTEGER         NOT NULL CHECK (quantity > 0),
    discount_pct        NUMERIC(5,2)    NOT NULL DEFAULT 0.00
                                        CHECK (discount_pct BETWEEN 0 AND 100),
    gst_rate            NUMERIC(5,2)    NOT NULL DEFAULT 0.00,  -- Snapshot of GST at time of purchase
    line_total          NUMERIC(15,2)   NOT NULL CHECK (line_total >= 0),
    tax_amount          NUMERIC(15,2)   NOT NULL DEFAULT 0.00,

    CONSTRAINT uq_purchase_item_batch UNIQUE (purchase_invoice_id, product_id, batch_number),
    CONSTRAINT chk_purchase_item_dates CHECK (expiry_date > manufacturing_date)
);

COMMENT ON TABLE  purchase_invoice_items           IS 'Line items for purchase invoices. Each item creates a corresponding batch record on invoice confirmation.';
COMMENT ON COLUMN purchase_invoice_items.mrp       IS 'MRP printed on the physical pack for this batch. Legally mandated by DRAP. Varies per batch run.';
COMMENT ON COLUMN purchase_invoice_items.line_total IS 'Snapshot total: (purchase_cost_per_unit × quantity) × (1 − discount_pct/100). Immutable after confirmation.';


-- ============================================================
-- 11. BATCHES
-- ============================================================
-- 3NF / BCNF: batch_id → {all attributes}.
-- (product_id, batch_number) is a candidate key.
-- quantity_available is the ONLY deliberate denormalisation:
--   Source of truth = SUM(signed) FROM stock_movements
--   Cache = batches.quantity_available (maintained by trigger)
--   Justification: stock_summary view is the most-queried report;
--   aggregating stock_movements on every load is expensive at scale.
-- All other columns depend only on batch_id. ✓
CREATE TABLE IF NOT EXISTS batches (
    batch_id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id              UUID            NOT NULL REFERENCES products(product_id)
                                            ON UPDATE CASCADE ON DELETE RESTRICT,
    supplier_id             UUID            NOT NULL REFERENCES suppliers(supplier_id)
                                            ON UPDATE CASCADE ON DELETE RESTRICT,
    purchase_invoice_id     UUID            REFERENCES purchase_invoices(purchase_invoice_id)
                                            ON UPDATE CASCADE ON DELETE SET NULL,
    batch_number            TEXT            NOT NULL,
    manufacturing_date      DATE            NOT NULL,
    expiry_date             DATE            NOT NULL,
    mrp                     NUMERIC(15,2)   NOT NULL CHECK (mrp > 0),
    purchase_cost_per_unit  NUMERIC(15,2)   NOT NULL CHECK (purchase_cost_per_unit > 0),
    quantity_received       INTEGER         NOT NULL CHECK (quantity_received > 0),
    -- Cached derived value — maintained by trigger from stock_movements
    quantity_available      INTEGER         NOT NULL DEFAULT 0,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_batches_product_batch UNIQUE (product_id, batch_number),
    CONSTRAINT chk_batches_dates       CHECK (expiry_date > manufacturing_date),
    CONSTRAINT chk_batches_qty_limit   CHECK (quantity_available <= quantity_received),
    -- ATOMIC GUARD: Impossible to have negative stock at the engine level (Professional race-condition fix)
    CONSTRAINT chk_batches_not_negative CHECK (quantity_available >= 0)
);

COMMENT ON TABLE  batches                      IS 'Stock batches. Each batch is linked to a GRN (purchase invoice). MRP is batch-level (DRAP mandate).';
COMMENT ON COLUMN batches.quantity_available   IS 'CACHED value. Source of truth is stock_movements. Maintained by trigger trg_stock_movement_sync. Do NOT update directly.';
COMMENT ON COLUMN batches.mrp                  IS 'Maximum Retail Price per DRAP regulations. Printed on the physical pack. Fixed for the life of the batch.';


-- ============================================================
-- 12. STOCK MOVEMENTS  (immutable financial-grade ledger)
-- ============================================================
-- 3NF / BCNF: movement_id → {all attributes}.
-- This is an append-only table — no UPDATE or DELETE ever.
-- reference_type + reference_id is a polymorphic audit pointer.
-- quantity is always positive; direction is encoded in movement_type.
CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID            NOT NULL REFERENCES batches(batch_id)
                                    ON UPDATE CASCADE ON DELETE RESTRICT,
    movement_type   movement_type   NOT NULL,
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    reference_type  TEXT,           -- 'purchase_invoice', 'sale_invoice', 'return', 'adjustment'
    reference_id    UUID,           -- ID of source document
    notes           TEXT,
    created_by      UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
    -- NO updated_at — this table is APPEND-ONLY
);

COMMENT ON TABLE  stock_movements              IS 'Immutable stock ledger. INSERT-ONLY. Source of truth for all stock quantities. Enables full audit trail and point-in-time reconstruction.';
COMMENT ON COLUMN stock_movements.quantity     IS 'Always positive. Direction (in/out) is encoded by movement_type.';
COMMENT ON COLUMN stock_movements.reference_id IS 'UUID of the source document (purchase_invoice_id, sale_invoice_id, etc.). Polymorphic with reference_type.';


-- ============================================================
-- 13. SALE INVOICES
-- ============================================================
-- 3NF / BCNF: All attributes depend on sale_invoice_id.
-- invoice_number is a candidate key. Sequence ensures collision-free, gapless-ready numbering.
CREATE SEQUENCE IF NOT EXISTS sale_invoice_num_seq;

CREATE TABLE IF NOT EXISTS sale_invoices (
    sale_invoice_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      TEXT            NOT NULL
                                        DEFAULT concat('INV-', to_char(CURRENT_DATE, 'YYYY'), '-', lpad(nextval('sale_invoice_num_seq')::text, 6, '0')),
    customer_id         UUID            NOT NULL REFERENCES customers(customer_id)
                                        ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_date        DATE            NOT NULL DEFAULT CURRENT_DATE,
    due_date            DATE,                          -- Derived from payment_terms, stored for AR ageing
    status              invoice_status  NOT NULL DEFAULT 'draft',
    -- Snapshot totals
    subtotal            NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount     NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount          NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    net_receivable      NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (net_receivable >= 0),
    amount_paid         NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    balance_due         NUMERIC(15,2)   GENERATED ALWAYS AS (net_receivable - amount_paid) STORED,
    notes               TEXT,
    created_by          UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    confirmed_by        UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    confirmed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_sale_invoices_number UNIQUE (invoice_number),
    CONSTRAINT chk_sale_invoice_due CHECK (due_date IS NULL OR due_date >= invoice_date),
    CONSTRAINT chk_sale_invoice_confirmed CHECK (
        (status = 'confirmed' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL) OR
        (status != 'confirmed')
    ),
    CONSTRAINT chk_sale_invoice_payment CHECK (amount_paid <= net_receivable)
);

COMMENT ON TABLE  sale_invoices                IS 'Sales invoices to customers. FBR-compliant GST invoice. Drives stock deduction and customer ledger entries.';
COMMENT ON COLUMN sale_invoices.balance_due    IS 'GENERATED column: net_receivable − amount_paid. Updates automatically. Drives AR ageing dashboard.';
COMMENT ON COLUMN sale_invoices.due_date       IS 'Pre-computed from invoice_date + customer payment_terms days. Used directly in AR ageing queries.';


-- ============================================================
-- 14. SALE INVOICE ITEMS
-- ============================================================
-- 3NF / BCNF: item_id → {all attributes}.
-- (sale_invoice_id, batch_id) is a candidate key. ✓
CREATE TABLE IF NOT EXISTS sale_invoice_items (
    item_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_invoice_id     UUID            NOT NULL REFERENCES sale_invoices(sale_invoice_id)
                                        ON DELETE RESTRICT,
    product_id          UUID            NOT NULL REFERENCES products(product_id)
                                        ON DELETE RESTRICT,
    batch_id            UUID            NOT NULL REFERENCES batches(batch_id)
                                        ON DELETE RESTRICT,
    quantity            INTEGER         NOT NULL CHECK (quantity > 0),
    mrp                 NUMERIC(15,2)   NOT NULL CHECK (mrp > 0),      -- Snapshot from batch
    sale_rate           NUMERIC(15,2)   NOT NULL CHECK (sale_rate > 0),
    discount_pct        NUMERIC(5,2)    NOT NULL DEFAULT 0.00
                                        CHECK (discount_pct BETWEEN 0 AND 100),
    gst_rate            NUMERIC(5,2)    NOT NULL DEFAULT 0.00,
    line_total          NUMERIC(15,2)   NOT NULL CHECK (line_total >= 0),
    tax_amount          NUMERIC(15,2)   NOT NULL DEFAULT 0.00,

    CONSTRAINT uq_sale_item_batch UNIQUE (sale_invoice_id, batch_id)
);

COMMENT ON TABLE  sale_invoice_items IS 'Line items for sales invoices. Batch selection follows FEFO (First-Expiry-First-Out) at application layer.';


-- ============================================================
-- 15. PURCHASE RETURNS
-- ============================================================
-- 3NF / BCNF: return_id → {all attributes}. ✓
CREATE TABLE IF NOT EXISTS purchase_returns (
    return_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_invoice_id UUID            NOT NULL REFERENCES purchase_invoices(purchase_invoice_id)
                                        ON DELETE RESTRICT,
    supplier_id         UUID            NOT NULL REFERENCES suppliers(supplier_id)
                                        ON DELETE RESTRICT,
    return_date         DATE            NOT NULL DEFAULT CURRENT_DATE,
    reason              return_reason   NOT NULL DEFAULT 'other',
    notes               TEXT,
    total_credit        NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (total_credit >= 0),
    status              invoice_status  NOT NULL DEFAULT 'draft',
    created_by          UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    item_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id       UUID            NOT NULL REFERENCES purchase_returns(return_id) ON DELETE CASCADE,
    batch_id        UUID            NOT NULL REFERENCES batches(batch_id) ON DELETE RESTRICT,
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    credit_rate     NUMERIC(15,2)   NOT NULL CHECK (credit_rate > 0),
    line_credit     NUMERIC(15,2)   NOT NULL CHECK (line_credit >= 0)
);

COMMENT ON TABLE purchase_returns IS 'Returns of purchased goods back to supplier. Reduces payable balance and removes stock.';


-- ============================================================
-- 16. SALE RETURNS
-- ============================================================
-- 3NF / BCNF: return_id → {all attributes}. ✓
CREATE TABLE IF NOT EXISTS sale_returns (
    return_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_invoice_id     UUID            NOT NULL REFERENCES sale_invoices(sale_invoice_id)
                                        ON DELETE RESTRICT,
    customer_id         UUID            NOT NULL REFERENCES customers(customer_id)
                                        ON DELETE RESTRICT,
    return_date         DATE            NOT NULL DEFAULT CURRENT_DATE,
    reason              return_reason   NOT NULL DEFAULT 'other',
    notes               TEXT,
    total_credit        NUMERIC(15,2)   NOT NULL DEFAULT 0.00 CHECK (total_credit >= 0),
    status              invoice_status  NOT NULL DEFAULT 'draft',
    created_by          UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_return_items (
    item_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id       UUID            NOT NULL REFERENCES sale_returns(return_id) ON DELETE CASCADE,
    batch_id        UUID            NOT NULL REFERENCES batches(batch_id) ON DELETE RESTRICT,
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    credit_rate     NUMERIC(15,2)   NOT NULL CHECK (credit_rate > 0),
    line_credit     NUMERIC(15,2)   NOT NULL CHECK (line_credit >= 0)
);

COMMENT ON TABLE sale_returns IS 'Returns of sold goods from customers. Restores stock and reduces receivable balance.';


-- ============================================================
-- 17. PAYMENTS
-- ============================================================
-- 3NF / BCNF: payment_id → {all attributes}.
-- direction (received/paid) distinguishes customer vs supplier.
-- party_id is polymorphic on direction. ✓
CREATE TABLE IF NOT EXISTS payments (
    payment_id      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    direction       payment_direction   NOT NULL,
    -- Polymorphic: direction='received' → customer_id; direction='paid' → supplier_id
    party_id        UUID                NOT NULL,
    payment_date    DATE                NOT NULL DEFAULT CURRENT_DATE,
    amount          NUMERIC(15,2)       NOT NULL CHECK (amount > 0),
    mode            payment_mode        NOT NULL DEFAULT 'cash',
    reference_no    TEXT,               -- Cheque number, bank transaction ID, JazzCash ref, etc.
    bank_name       TEXT,               -- For cheque / bank transfer
    notes           TEXT,
    created_by      UUID                REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
    -- Append-only: no updated_at
);

COMMENT ON TABLE  payments              IS 'All money movements: received from customers and paid to suppliers. Append-only ledger.';
COMMENT ON COLUMN payments.party_id     IS 'UUID of customer (direction=received) or supplier (direction=paid). [Architect Note: Polymorphic reference; ensures flexibility across audit ledgers.]';
COMMENT ON COLUMN payments.reference_no IS 'Cheque number, IBFT transaction ID, JazzCash/EasyPaisa reference, etc.';


-- ============================================================
-- 18. EXPENSES
-- ============================================================
-- 3NF / BCNF: expense_id → {all attributes}. ✓
CREATE TABLE IF NOT EXISTS expenses (
    expense_id      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date    DATE                NOT NULL DEFAULT CURRENT_DATE,
    category        expense_category    NOT NULL DEFAULT 'miscellaneous',
    description     TEXT                NOT NULL,
    amount          NUMERIC(15,2)       NOT NULL CHECK (amount > 0),
    mode            payment_mode        NOT NULL DEFAULT 'cash',
    reference_no    TEXT,
    vendor_name     TEXT,               -- Who was paid (e.g., landlord name, utility company)
    created_by      UUID                REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
    -- Append-only: no updated_at
);

COMMENT ON TABLE expenses IS 'Non-inventory operational expenses. Feeds into P&L statement in Iteration 3.';


-- ============================================================
-- TRIGGERS
-- ============================================================

-- ── updated_at maintenance ────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
-- Apply to all tables with updated_at
DO $$ DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users','manufacturers','products','suppliers','customers',
        'purchase_invoices','batches','sale_invoices',
        'purchase_returns','sale_returns'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
        EXECUTE format('
            CREATE TRIGGER trg_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();', t, t);
    END LOOP;
END $$;

-- ── deactivation timestamp ────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_deactivated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
        NEW.deactivated_at := now();
    ELSIF NEW.is_active = TRUE THEN
        NEW.deactivated_at := NULL;   -- Allow reactivation
    END IF;
    RETURN NEW;
END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users','manufacturers','products','suppliers','customers'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_deactivated ON %I;', t, t);
        EXECUTE format('
            CREATE TRIGGER trg_%I_deactivated
            BEFORE UPDATE OF is_active ON %I
            FOR EACH ROW EXECUTE FUNCTION fn_set_deactivated_at();', t, t);
    END LOOP;
END $$;

-- ── requires_prescription auto-set from drug_schedule ─────────
CREATE OR REPLACE FUNCTION fn_sync_prescription_flag()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.requires_prescription := NEW.drug_schedule IN ('H', 'H1', 'X');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_prescription ON products;
CREATE TRIGGER trg_products_prescription
BEFORE INSERT OR UPDATE OF drug_schedule ON products
FOR EACH ROW EXECUTE FUNCTION fn_sync_prescription_flag();

-- ── products.search_vector: cross-table rebuild ───────────────
-- This function builds the unified search vector that makes
-- "GSK Antibiotics Paracetamol" work in a single index scan.
-- It joins manufacturers and categories at write time so reads
-- need no joins at all. Called by three separate triggers:
--   1. After INSERT/UPDATE on products (own row changed)
--   2. After UPDATE of name on manufacturers (brand name changed)
--   3. After UPDATE of name on categories (category name changed)
CREATE OR REPLACE FUNCTION fn_rebuild_product_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_product_id        UUID;
    v_name              TEXT;
    v_generic_formula   TEXT;
    v_form              TEXT;
    v_hsn_code          TEXT;
    v_drap_reg          TEXT;
    v_manufacturer_name TEXT;
    v_category_name     TEXT;
BEGIN
    -- Determine which product(s) to update.
    -- When called from products trigger: single row (NEW.product_id).
    -- When called from manufacturers trigger: all products of that manufacturer.
    -- When called from categories trigger: all products of that category.
    -- TG_TABLE_NAME lets us branch without three separate functions.

    IF TG_TABLE_NAME = 'products' THEN
        -- Direct product insert/update: rebuild only this row.
        SELECT
            p.name, p.generic_formula, p.form, p.hsn_code, p.drap_registration_no,
            m.name, c.name
        INTO v_name, v_generic_formula, v_form, v_hsn_code, v_drap_reg,
             v_manufacturer_name, v_category_name
        FROM products p
        LEFT JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
        LEFT JOIN categories    c ON c.category_id     = p.category_id
        WHERE p.product_id = NEW.product_id;

        NEW.search_vector := to_tsvector('english',
            coalesce(v_name, '')              || ' ' ||
            coalesce(v_generic_formula, '')   || ' ' ||
            coalesce(v_form, '')              || ' ' ||
            coalesce(v_manufacturer_name, '') || ' ' ||
            coalesce(v_category_name, '')     || ' ' ||
            coalesce(v_hsn_code, '')          || ' ' ||
            coalesce(v_drap_reg, '')
        );
        RETURN NEW;

    ELSIF TG_TABLE_NAME = 'manufacturers' THEN
        -- Manufacturer name changed: rebuild search_vector for all its products.
        UPDATE products p
        SET search_vector = to_tsvector('english',
            coalesce(p.name, '')              || ' ' ||
            coalesce(p.generic_formula, '')   || ' ' ||
            coalesce(p.form, '')              || ' ' ||
            coalesce(NEW.name, '')            || ' ' ||   -- new manufacturer name
            coalesce(c.name, '')              || ' ' ||
            coalesce(p.hsn_code, '')          || ' ' ||
            coalesce(p.drap_registration_no, '')
        )
        FROM categories c
        WHERE p.manufacturer_id = NEW.manufacturer_id
          AND p.category_id = c.category_id;

        -- Also handle products with NULL category
        UPDATE products p
        SET search_vector = to_tsvector('english',
            coalesce(p.name, '')              || ' ' ||
            coalesce(p.generic_formula, '')   || ' ' ||
            coalesce(p.form, '')              || ' ' ||
            coalesce(NEW.name, '')            || ' ' ||
            coalesce(p.hsn_code, '')          || ' ' ||
            coalesce(p.drap_registration_no, '')
        )
        WHERE p.manufacturer_id = NEW.manufacturer_id
          AND p.category_id IS NULL;

        RETURN NEW;

    ELSIF TG_TABLE_NAME = 'categories' THEN
        -- Category name changed: rebuild search_vector for all its products.
        UPDATE products p
        SET search_vector = to_tsvector('english',
            coalesce(p.name, '')              || ' ' ||
            coalesce(p.generic_formula, '')   || ' ' ||
            coalesce(p.form, '')              || ' ' ||
            coalesce(m.name, '')              || ' ' ||
            coalesce(NEW.name, '')            || ' ' ||   -- new category name
            coalesce(p.hsn_code, '')          || ' ' ||
            coalesce(p.drap_registration_no, '')
        )
        FROM manufacturers m
        WHERE p.category_id = NEW.category_id
          AND p.manufacturer_id = m.manufacturer_id;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger 1: fires on products INSERT or UPDATE of any searchable column
DROP TRIGGER IF EXISTS trg_products_search_vector ON products;
CREATE TRIGGER trg_products_search_vector
BEFORE INSERT OR UPDATE OF
    name, generic_formula, form, hsn_code, drap_registration_no,
    manufacturer_id, category_id
ON products
FOR EACH ROW EXECUTE FUNCTION fn_rebuild_product_search_vector();

-- Trigger 2: fires when a manufacturer's name is edited
-- Propagates the change to all products of that manufacturer
DROP TRIGGER IF EXISTS trg_manufacturer_name_propagate ON manufacturers;
CREATE TRIGGER trg_manufacturer_name_propagate
AFTER UPDATE OF name ON manufacturers
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION fn_rebuild_product_search_vector();

-- Trigger 3: fires when a category's name is edited
-- Propagates the change to all products in that category
DROP TRIGGER IF EXISTS trg_category_name_propagate ON categories;
CREATE TRIGGER trg_category_name_propagate
AFTER UPDATE OF name ON categories
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION fn_rebuild_product_search_vector();

-- One-time backfill: populate search_vector for any products
-- inserted before triggers were created (e.g. from seed data migration)
-- Run this once after schema deployment:
-- UPDATE products SET name = name;  -- triggers BEFORE UPDATE, rebuilds all vectors

-- ── stock movement → update batches.quantity_available ────────
CREATE OR REPLACE FUNCTION fn_sync_batch_quantity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Atomic Update: The DB handles row-locking and check-constraints automatically.
    -- The chk_batches_not_negative constraint handles the race condition.
    UPDATE batches
    SET quantity_available = quantity_available +
        CASE
            WHEN NEW.movement_type IN ('purchase','sale_return','adjustment_in')
                THEN NEW.quantity
            WHEN NEW.movement_type IN ('sale','purchase_return','adjustment_out','expiry_writeoff')
                THEN -NEW.quantity
            ELSE 0
        END,
        updated_at = now()
    WHERE batch_id = NEW.batch_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_movement_sync ON stock_movements;
CREATE TRIGGER trg_stock_movement_sync
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION fn_sync_batch_quantity();

-- ── batch creation → auto-insert opening stock_movement ───────
CREATE OR REPLACE FUNCTION fn_batch_opening_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO stock_movements (
        batch_id, movement_type, quantity,
        reference_type, reference_id, notes, created_by
    ) VALUES (
        NEW.batch_id,
        'purchase',
        NEW.quantity_received,
        'purchase_invoice',
        NEW.purchase_invoice_id,
        'Opening stock on batch creation',
        NULL
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_batch_insert_opening_movement ON batches;
CREATE TRIGGER trg_batch_insert_opening_movement
AFTER INSERT ON batches
FOR EACH ROW EXECUTE FUNCTION fn_batch_opening_movement();

-- ── sale invoice: guard credit limit on confirmation ──────────
CREATE OR REPLACE FUNCTION fn_check_credit_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_current_balance   NUMERIC(15,2);
    v_credit_limit      NUMERIC(15,2);
BEGIN
    -- Safety Guard: Prevent status reversal (Confirmed -> Draft)
    IF OLD.status = 'confirmed' AND NEW.status = 'draft' THEN
        RAISE EXCEPTION 'Safety Violation: Once confirmed, an invoice status cannot be reverted to draft.';
    END IF;

    IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN
        -- PESSIMISTIC LOCK: Lock the customer row to serialize credit checks.
        -- This prevents multiple simultaneous invoices from bypassing the limit.
        PERFORM * FROM customers WHERE customer_id = NEW.customer_id FOR UPDATE;

        SELECT
            opening_balance + COALESCE(
                (SELECT SUM(net_receivable) FROM sale_invoices
                 WHERE customer_id = NEW.customer_id AND status = 'confirmed'),
            0) - COALESCE(
                (SELECT SUM(amount) FROM payments
                 WHERE party_id = NEW.customer_id AND direction = 'received'),
            0),
            credit_limit
        INTO v_current_balance, v_credit_limit
        FROM customers WHERE customer_id = NEW.customer_id;

        IF v_credit_limit > 0 AND v_current_balance + NEW.net_receivable > v_credit_limit THEN
            RAISE WARNING
                'Invoice % would exceed credit limit for customer %. Proceeding with override.',
                NEW.invoice_number, NEW.customer_id;
            -- WARNING not EXCEPTION: business choice to allow override with warning
            -- Change to EXCEPTION to hard-block if required
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_invoice_credit_check ON sale_invoices;
CREATE TRIGGER trg_sale_invoice_credit_check
BEFORE UPDATE OF status ON sale_invoices
FOR EACH ROW EXECUTE FUNCTION fn_check_credit_limit();


-- ============================================================
-- INDEXES
-- ============================================================

-- ── Full-text search (GIN on generated tsvector columns) ─────
CREATE INDEX IF NOT EXISTS idx_manufacturers_fts   ON manufacturers   USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_products_fts        ON products        USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_suppliers_fts       ON suppliers       USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_customers_fts       ON customers       USING GIN (search_vector);

-- Trigram indexes for partial-match ILIKE search (e.g. autocomplete)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm        ON products     USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_formula_trgm     ON products     USING GIN (generic_formula gin_trgm_ops);
-- ^ Critical for Pakistan: "parace" autocomplete returns all Paracetamol brands/strengths
CREATE INDEX IF NOT EXISTS idx_manufacturers_name_trgm   ON manufacturers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm       ON suppliers    USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm       ON customers    USING GIN (name gin_trgm_ops);

-- ── Master data filters ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_manufacturer   ON products  (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products  (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active         ON products  (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_schedule       ON products  (drug_schedule);

CREATE INDEX IF NOT EXISTS idx_manufacturers_country   ON manufacturers (country);
CREATE INDEX IF NOT EXISTS idx_manufacturers_active    ON manufacturers (is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_suppliers_strn          ON suppliers (strn);
CREATE INDEX IF NOT EXISTS idx_suppliers_city          ON suppliers (city);
CREATE INDEX IF NOT EXISTS idx_suppliers_active        ON suppliers (is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_customers_strn          ON customers (strn);
CREATE INDEX IF NOT EXISTS idx_customers_territory     ON customers (territory);
CREATE INDEX IF NOT EXISTS idx_customers_city          ON customers (city);
CREATE INDEX IF NOT EXISTS idx_customers_type          ON customers (customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_active        ON customers (is_active) WHERE is_active = TRUE;

-- ── Batch / stock indexes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_batches_product         ON batches (product_id);
CREATE INDEX IF NOT EXISTS idx_batches_supplier        ON batches (supplier_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry          ON batches (expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_active          ON batches (is_active) WHERE is_active = TRUE;
-- Composite: fastest path for stock dashboard query
CREATE INDEX IF NOT EXISTS idx_batches_stock_check     ON batches (product_id, is_active, quantity_available)
    WHERE is_active = TRUE AND quantity_available > 0;
-- Near-expiry alert query (covers expiry management screen)
CREATE INDEX IF NOT EXISTS idx_batches_near_expiry     ON batches (expiry_date, quantity_available)
    WHERE is_active = TRUE AND quantity_available > 0;

-- ── Stock movements ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_movements_batch         ON stock_movements (batch_id);
CREATE INDEX IF NOT EXISTS idx_movements_type          ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_reference     ON stock_movements (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_created       ON stock_movements (created_at DESC);

-- ── Invoice indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date     ON purchase_invoices (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status   ON purchase_invoices (status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice     ON purchase_invoice_items (purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product     ON purchase_invoice_items (product_id);

CREATE INDEX IF NOT EXISTS idx_sale_invoices_customer     ON sale_invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_date         ON sale_invoices (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_status       ON sale_invoices (status);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_balance      ON sale_invoices (balance_due) WHERE balance_due > 0;
-- AR ageing: most critical financial query
CREATE INDEX IF NOT EXISTS idx_sale_invoices_ageing       ON sale_invoices (customer_id, due_date, balance_due)
    WHERE status = 'confirmed' AND balance_due > 0;

CREATE INDEX IF NOT EXISTS idx_sale_items_invoice         ON sale_invoice_items (sale_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch           ON sale_invoice_items (batch_id);

-- ── Payments ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_party        ON payments (party_id, direction);
CREATE INDEX IF NOT EXISTS idx_payments_date         ON payments (payment_date DESC);

-- ── Expenses ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category     ON expenses (category);

-- ── Contact persons ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_entity       ON contact_persons (entity_type, entity_id);
-- Partial unique: only one primary contact per entity
CREATE UNIQUE INDEX IF NOT EXISTS uidx_contacts_primary
    ON contact_persons (entity_type, entity_id) WHERE is_primary = TRUE;

-- ── Price history ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_price_history_product  ON product_price_history (product_id, effective_from DESC);


-- ============================================================
-- VIEWS
-- ============================================================

-- Stock summary (the primary inventory dashboard query)
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
    p.product_id,
    p.name                                          AS product_name,
    p.generic_formula,                              -- Active ingredient(s); enables substitution decisions at the stock screen
    m.name                                          AS manufacturer_name,
    m.country                                       AS manufacturer_country,
    (m.country != 'Pakistan')                       AS is_imported,
    c.name                                          AS category_name,
    p.form,
    p.uom,
    p.drug_schedule,
    p.requires_prescription,
    p.shelf_no,
    p.default_sale_rate,
    COALESCE(SUM(b.quantity_available) FILTER (WHERE b.is_active), 0)
                                                    AS total_quantity,
    COUNT(b.batch_id) FILTER (WHERE b.is_active)   AS active_batch_count,
    MIN(b.expiry_date) FILTER (WHERE b.is_active AND b.quantity_available > 0)
                                                    AS nearest_expiry,
    COALESCE(SUM(b.quantity_available * b.mrp) FILTER (WHERE b.is_active), 0)
                                                    AS total_stock_value_at_mrp,
    CASE
        WHEN COALESCE(SUM(b.quantity_available) FILTER (WHERE b.is_active), 0) = 0
            THEN 'out_of_stock'
        WHEN MIN(b.expiry_date - CURRENT_DATE) FILTER (WHERE b.is_active AND b.quantity_available > 0) <= 30
            THEN 'expiry_critical'
        WHEN MIN(b.expiry_date - CURRENT_DATE) FILTER (WHERE b.is_active AND b.quantity_available > 0) <= 60
            THEN 'expiry_warning'
        WHEN MIN(b.expiry_date - CURRENT_DATE) FILTER (WHERE b.is_active AND b.quantity_available > 0) <= 90
            THEN 'expiry_watch'
        ELSE 'normal'
    END                                             AS stock_status
FROM products p
JOIN manufacturers m    ON m.manufacturer_id = p.manufacturer_id
LEFT JOIN categories c  ON c.category_id = p.category_id
LEFT JOIN batches b     ON b.product_id = p.product_id
WHERE p.is_active = TRUE
GROUP BY p.product_id, p.name, p.generic_formula, m.name, m.country, c.name,
         p.form, p.uom, p.drug_schedule, p.requires_prescription,
         p.shelf_no, p.default_sale_rate;

-- Near-expiry batches (dashboard alert + expiry management screen)
CREATE OR REPLACE VIEW v_near_expiry_batches AS
SELECT
    b.batch_id,
    b.batch_number,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE)                  AS days_to_expiry,
    b.quantity_available,
    b.mrp,
    ROUND(b.quantity_available * b.mrp, 2)          AS stock_value_at_mrp,
    p.product_id,
    p.name                                          AS product_name,
    p.generic_formula,                              -- Needed for cross-brand substitution at expiry management screen
    p.uom,
    m.name                                          AS manufacturer_name,
    s.name                                          AS supplier_name,
    CASE
        WHEN (b.expiry_date - CURRENT_DATE) <= 30  THEN 'critical'
        WHEN (b.expiry_date - CURRENT_DATE) <= 60  THEN 'warning'
        WHEN (b.expiry_date - CURRENT_DATE) <= 90  THEN 'watch'
        ELSE 'normal'
    END                                             AS expiry_status
FROM batches b
JOIN products p      ON p.product_id      = b.product_id
JOIN manufacturers m ON m.manufacturer_id = p.manufacturer_id
JOIN suppliers s     ON s.supplier_id     = b.supplier_id
WHERE b.is_active = TRUE
  AND b.quantity_available > 0
  AND (b.expiry_date - CURRENT_DATE) <= 90
ORDER BY days_to_expiry ASC;

-- Customer AR ledger (accounts receivable ageing)
CREATE OR REPLACE VIEW v_customer_ar AS
SELECT
    c.customer_id,
    c.name                                          AS customer_name,
    c.credit_limit,
    c.territory,
    c.customer_type,
    COALESCE(SUM(si.net_receivable) FILTER (
        WHERE si.status = 'confirmed'), 0) + c.opening_balance
        - COALESCE(SUM(p.amount) FILTER (
        WHERE p.direction = 'received'), 0)         AS outstanding_balance,
    COALESCE(SUM(si.balance_due) FILTER (
        WHERE si.status = 'confirmed'
          AND si.due_date >= CURRENT_DATE
          AND si.due_date < CURRENT_DATE + 30), 0) AS bucket_0_30,
    COALESCE(SUM(si.balance_due) FILTER (
        WHERE si.status = 'confirmed'
          AND si.due_date >= CURRENT_DATE - 30
          AND si.due_date < CURRENT_DATE), 0)       AS bucket_31_60,
    COALESCE(SUM(si.balance_due) FILTER (
        WHERE si.status = 'confirmed'
          AND si.due_date >= CURRENT_DATE - 60
          AND si.due_date < CURRENT_DATE - 30), 0)  AS bucket_61_90,
    COALESCE(SUM(si.balance_due) FILTER (
        WHERE si.status = 'confirmed'
          AND si.due_date < CURRENT_DATE - 60), 0)  AS bucket_90_plus
FROM customers c
LEFT JOIN sale_invoices si ON si.customer_id = c.customer_id
LEFT JOIN payments p       ON p.party_id = c.customer_id AND p.direction = 'received'
WHERE c.is_active = TRUE
GROUP BY c.customer_id, c.name, c.credit_limit, c.territory, c.customer_type, c.opening_balance;

-- Supplier AP ledger (accounts payable)
CREATE OR REPLACE VIEW v_supplier_ap AS
SELECT
    s.supplier_id,
    s.name                                          AS supplier_name,
    s.credit_period_days,
    COALESCE(SUM(pi.net_payable) FILTER (
        WHERE pi.status = 'confirmed'), 0) + s.opening_balance
        - COALESCE(SUM(p.amount) FILTER (
        WHERE p.direction = 'paid'), 0)             AS outstanding_payable
FROM suppliers s
LEFT JOIN purchase_invoices pi ON pi.supplier_id = s.supplier_id
LEFT JOIN payments p           ON p.party_id = s.supplier_id AND p.direction = 'paid'
WHERE s.is_active = TRUE
GROUP BY s.supplier_id, s.name, s.credit_period_days, s.opening_balance;

-- Controlled substances stock (DRAP compliance view)
CREATE OR REPLACE VIEW v_controlled_stock AS
SELECT
    p.product_id,
    p.name                  AS product_name,
    p.generic_formula,      -- Required for DRAP compliance reports on controlled substances
    p.drug_schedule,
    p.drap_registration_no,
    b.batch_id,
    b.batch_number,
    b.quantity_available,
    b.expiry_date,
    s.name                  AS supplier_name
FROM products p
JOIN batches b   ON b.product_id   = p.product_id
JOIN suppliers s ON s.supplier_id  = b.supplier_id
WHERE p.drug_schedule IN ('H1', 'X')
  AND b.is_active = TRUE
  AND b.quantity_available > 0;

-- Dashboard KPI snapshot
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    (SELECT COALESCE(SUM(net_receivable), 0) FROM sale_invoices
     WHERE status = 'confirmed' AND invoice_date = CURRENT_DATE)    AS todays_sales,
    (SELECT COALESCE(SUM(balance_due), 0) FROM sale_invoices
     WHERE status = 'confirmed' AND balance_due > 0)                AS total_outstanding_ar,
    (SELECT COUNT(*) FROM customers
     WHERE is_active = TRUE AND customer_id IN (
         SELECT customer_id FROM sale_invoices
         WHERE status = 'confirmed' AND balance_due > 0
           AND due_date < CURRENT_DATE))                             AS overdue_customers,
    (SELECT COALESCE(SUM(quantity_available * mrp), 0) FROM batches
     WHERE is_active = TRUE
       AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30)  AS near_expiry_stock_value,
    (SELECT COUNT(DISTINCT product_id) FROM batches
     WHERE is_active = TRUE AND quantity_available = 0)             AS out_of_stock_products;


-- ============================================================
-- ROW LEVEL SECURITY (prepared — enable per table as needed)
-- ============================================================
-- ALTER TABLE sale_invoices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY rls_sale_invoices ON sale_invoices
--     USING (created_by = current_setting('app.current_user_id')::UUID
--            OR current_setting('app.current_user_role') = 'admin');
-- Enable when multi-user isolation is required in future iterations.


-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Tables in this file    : 18 core tables + 2 return item tables = 20
-- Triggers                : 9 trigger functions, ~18 trigger instances
-- Views                   : 6 production views
-- Indexes                 : ~42 targeted indexes
-- Enum types              : 10
-- Extensions              : 3 (pgcrypto, pg_trgm, btree_gist)
--
-- KEY DESIGN: products.search_vector
--   Unlike all other tsvector columns in this schema (which are
--   GENERATED ALWAYS AS STORED and self-contained), products.search_vector
--   is a plain TSVECTOR maintained by fn_rebuild_product_search_vector().
--   This is because it must include manufacturers.name and categories.name
--   — values from joined tables — enabling a single "GSK Antibiotics
--   Paracetamol" query to resolve against a single GIN index with no JOIN.
--   Three triggers keep it consistent:
--     trg_products_search_vector     → product row changes
--     trg_manufacturer_name_propagate → manufacturer name changes
--     trg_category_name_propagate     → category name changes
--   After deployment, run:  UPDATE products SET name = name;
--   to backfill all vectors in one pass.
--
-- Iteration coverage:
--   Iter 1  : users, manufacturers, categories, products,
--             product_price_history, suppliers, customers,
--             contact_persons, batches, stock_movements
--   Iter 2  : purchase_invoices, purchase_invoice_items,
--             sale_invoices, sale_invoice_items,
--             purchase_returns, sale_returns
--   Iter 3  : payments, expenses
--   Always  : all views, all triggers, all indexes
-- ============================================================

-- US-202 Optimization: Fast FEFO lock acquisition
CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON batches (product_id, expiry_date) WHERE quantity_available > 0 AND is_active = TRUE;
