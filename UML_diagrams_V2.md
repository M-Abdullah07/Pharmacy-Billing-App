# PharmaX — SE Deliverable 3: Design Diagrams

**Sprint 2 | Pharmacy Billing Application**

---

## 2a. Architecture Diagram

### Architecture Styles Used

PharmaX employs **two complementary architecture styles**:

1. **Layered (N-Tier) Architecture** — The system is divided into three strict tiers: Presentation (React Renderer), Business Logic (Electron Main Process), and Data (PostgreSQL). Each layer only communicates with the layer directly below it.

2. **Client-Server Architecture** — Within the desktop application, the React Renderer Process acts as the "client" and the Electron Main Process acts as the "server". All data requests originate from the client and are fulfilled by the server over a strict IPC channel.

**Rationale:** The Layered pattern enforces Separation of Concerns — the UI cannot directly query the database, which eliminates SQL injection at the renderer boundary. The Client-Server model maps naturally to Electron's security model (`contextIsolation: true`), where the Preload Script acts as a controlled API gateway between untrusted renderer JavaScript and the privileged Node.js main process.

```mermaid
graph TB
    subgraph Presentation_Layer["Presentation Layer - Renderer Process"]
        UI["React 19 SPA - Vite Bundled\nLogin | Dashboard | Products\nAdd Sale | Add Batch | Customers\nManufacturers | Companies"]
        PL["Preload Script - contextBridge API\nSecure IPC Gateway\nExposes: electronAPI.*"]
    end

    subgraph Business_Logic_Layer["Business Logic Layer - Main Process"]
        IPC["IPC Dispatcher - ipcMain.handle"]
        AUTH["Auth Service\nArgon2id Hashing\nAccount Lock Logic"]
        MASTER["Master Data Handler\nProducts - Categories\nManufacturers - Suppliers\nCustomers - Contact Persons"]
        INV["Inventory Handler\nBatches - Stock Summary\nNear-Expiry View"]
        COMP["Companies Handler\nBackward-compat over Suppliers"]
        WIN["Window Manager\nBrowserWindow\nApp Lifecycle"]
    end

    subgraph Data_Layer["Data Layer"]
        POOL["PostgreSQL Connection Pool\nnode-postgres Pool\nHost: 127.0.0.1:5432\nDB: Pharmax"]
        DB[("PostgreSQL 15+\nDatabase\nTables - Views\nTriggers - Enums\nGIN Indexes")]
    end

    UI -->|"window.electronAPI.* IPC Bridge"| PL
    PL -->|"ipcRenderer.invoke channel"| IPC
    IPC --> AUTH
    IPC --> MASTER
    IPC --> INV
    IPC --> COMP
    AUTH -->|"parameterized SQL"| POOL
    MASTER -->|"parameterized SQL"| POOL
    INV -->|"parameterized SQL"| POOL
    COMP -->|"parameterized SQL"| POOL
    POOL -->|"TCP Socket"| DB
    WIN -.->|"creates"| UI
```

---

## 2b. Component Diagram

```mermaid
graph LR
    subgraph Frontend["Frontend - Renderer Process"]
        direction TB
        APP["App.jsx\nRoot Component\nRouter + Auth Guard"]

        subgraph Pages["Pages"]
            LOGIN["Login.jsx"]
            SIGNUP["Signup.jsx"]
            DASH["Dashboard.jsx"]
            ADDSALE["AddSale.jsx"]
            ADDBATCH["AddBatch.jsx"]
            PRODUCTS["Products.jsx"]
            CUSTOMERS["AddCustomers.jsx"]
            COMPANIES["Companies.jsx"]
            MANUFACTURER["Manufacturer.jsx"]
            AREAS["AddArea.jsx"]
        end

        subgraph Components["Shared Components"]
            SIDEBAR["Sidebar.jsx\nNav + Logout"]
            HEADER["Header.jsx"]
            CMD["Command.jsx\nCtrl+J Search"]
            STATS["StatsPanel.jsx"]
            CHART["AnalyticsChart.jsx"]
            ACTIVITY["ActivityList.jsx"]
        end
    end

    subgraph Bridge["IPC Bridge"]
        PRELOAD["preload.js\ncontextBridge\nwindow.electronAPI"]
    end

    subgraph Backend["Backend - Main Process"]
        MAIN["main.js\nElectron Main"]
        subgraph Handlers["IPC Handlers - ipcMain.handle"]
            H_AUTH["Auth Handlers\nlogin-user\nsignup-user"]
            H_MFR["Manufacturer Handlers\nget/add/update/deactivate/reactivate"]
            H_CAT["Category Handler\nget-categories"]
            H_PROD["Product Handlers\nget-products / getProducts\nadd/update/deactivate/reactivate"]
            H_SUP["Supplier Handlers\nget/add/update/deactivate/reactivate"]
            H_CUST["Customer Handlers\nget/add/update/delete/reactivate"]
            H_CONTACT["Contact Person Handlers\nget/add/delete-contact-person"]
            H_BATCH["Batch Handlers\nget-batches\nadd-batch"]
            H_STOCK["Stock Handlers\nget-stock-summary\nget-stock-by-product\nget-near-expiry"]
            H_COMP["Company Handlers\nget-companies\nadd-company"]
            H_GEN["Generic DB Handlers\nquery-db\nrun-db"]
        end
        DBPOOL["PostgreSQL Pool\nnode-postgres"]
    end

    subgraph DB["Database"]
        POSTGRES[("PostgreSQL\nPharmax DB")]
    end

    APP --> Pages
    APP --> Components
    Pages -->|"window.electronAPI.*"| PRELOAD
    PRELOAD -->|"ipcRenderer.invoke"| Handlers
    Handlers --> DBPOOL
    DBPOOL -->|SQL| POSTGRES
    MAIN --> Handlers
    MAIN --> DBPOOL
```

---

## 2c. Data Flow Diagrams

### DFD Level 0 — Context Diagram

```mermaid
graph LR
    U(["Pharmacist / Admin"])
    SYS["0\nPharmaX\nPharmacy Billing System"]
    EXT1(["Manufacturer\nExternal Info"])
    EXT2(["Supplier\nExternal Entity"])
    EXT3(["Customer\nExternal Entity"])

    U -->|"Login Credentials\nSale Data\nInventory Data\nMaster Data Forms"| SYS
    SYS -->|"Invoices - Reports\nStock Alerts - Receipts"| U
    EXT1 -->|"Product Info\nDRAP Licence"| SYS
    EXT2 -->|"Purchase Invoices\nBatch and Expiry Info"| SYS
    SYS -->|"Purchase Orders\nPayment Records"| EXT2
    EXT3 -->|"Sale Orders\nPayments"| SYS
    SYS -->|"Sale Invoices\nCredit Statements"| EXT3
```

---

### DFD Level 1 — Main Processes

```mermaid
graph TB
    U(["Pharmacist / Admin"])

    P1["1.0\nAuthentication\nand Session\nManagement"]
    P2["2.0\nMaster Data\nManagement\nProducts, Suppliers,\nCustomers, Manufacturers"]
    P3["3.0\nInventory\nManagement\nBatches and Stock"]
    P4["4.0\nSales\nProcessing\nAdd Sale"]
    P5["5.0\nReporting and\nDashboard"]

    DS1[("D1: Users")]
    DS2[("D2: Products\nManufacturers\nSuppliers\nCustomers")]
    DS3[("D3: Batches\nStock Movements")]
    DS4[("D4: Sale Invoices\nSale Items")]
    DS5[("D5: Stock\nSummary View")]

    U -->|"username, password"| P1
    P1 <-->|"user_id, auth status\nfailed_attempts"| DS1
    P1 -->|"session token"| U

    U -->|"Master data forms"| P2
    P2 <-->|"CRUD operations"| DS2
    P2 -->|"Confirmation and Lists"| U

    U -->|"Batch details"| P3
    P3 <-->|"Batch records\nMovement ledger"| DS3
    P3 -->|"Stock status\nExpiry alerts"| U

    U -->|"Sale form data\nProduct selection"| P4
    P4 <-->|"Invoice records"| DS4
    P4 -->|"Stock deduction"| DS3
    P4 -->|"Invoice confirmation"| U

    P5 <-->|"Aggregate queries"| DS5
    P5 <-->|"Near-expiry data"| DS3
    P5 -->|"Reports and Charts"| U
```

---

### DFD Level 2 — Process 1: Authentication Detail

```mermaid
graph TB
    U(["User"])

    P1_1["1.1\nValidate\nCredentials"]
    P1_2["1.2\nCheck Account\nStatus and Lock"]
    P1_3["1.3\nVerify Password\nArgon2id"]
    P1_4["1.4\nUpdate Login\nAudit Fields"]
    P1_5["1.5\nCreate / Register\nNew Account"]

    DS1[("D1: users table")]

    U -->|"username + password"| P1_1
    P1_1 -->|"SELECT user record"| DS1
    DS1 -->|"user row: hash, is_active, failed_attempts, locked_until"| P1_1
    P1_1 -->|"user data"| P1_2
    P1_2 -->|"account ok"| P1_3
    P1_2 -->|"locked or inactive"| U
    P1_3 -->|"password match"| P1_4
    P1_3 -->|"mismatch: increment failed_attempts"| DS1
    P1_4 -->|"UPDATE last_login_at, reset failed_attempts"| DS1
    P1_4 -->|"session with userId and username"| U
    U -->|"signup: username + password"| P1_5
    P1_5 -->|"Argon2id hash then INSERT user record"| DS1
    DS1 -->|"new user_id"| U
```

---

### DFD Level 2 — Process 3: Inventory Management Detail

```mermaid
graph TB
    U(["Pharmacist"])

    P3_1["3.1\nAdd New Batch\nReceive Stock"]
    P3_2["3.2\nQuery Stock\nSummary"]
    P3_3["3.3\nQuery Stock\nBy Product"]
    P3_4["3.4\nNear-Expiry\nAlert Check"]

    DB_BATCH[("D3a: batches")]
    DB_MOVE[("D3b: stock_movements\ntrigger auto-fills")]
    DB_VIEW[("D3c: v_stock_summary\nv_near_expiry_batches")]
    DB_PROD[("D2: products")]
    DB_SUP[("D2: suppliers")]

    U -->|"batch form data"| P3_1
    P3_1 -->|"SELECT product_id"| DB_PROD
    P3_1 -->|"SELECT supplier_id"| DB_SUP
    P3_1 -->|"INSERT batch record"| DB_BATCH
    DB_BATCH -->|"trigger: trg_batch_insert_opening_movement"| DB_MOVE
    DB_BATCH -->|"batch_id"| U

    U -->|"request stock list"| P3_2
    P3_2 -->|"SELECT * FROM view"| DB_VIEW
    DB_VIEW -->|"stock levels + status"| P3_2
    P3_2 -->|"stock table"| U

    U -->|"productId"| P3_3
    P3_3 -->|"SELECT by product_id"| DB_BATCH
    DB_BATCH -->|"batch rows with expiry_status"| P3_3
    P3_3 -->|"available batches"| U

    U -->|"request near-expiry"| P3_4
    P3_4 -->|"SELECT near-expiry view"| DB_VIEW
    DB_VIEW -->|"near-expiry batch list"| P3_4
    P3_4 -->|"expiry alerts"| U
```

---

## 2d. Activity Diagrams

### Activity Diagram 1: User Login Process

```mermaid
flowchart TD
    START([Start]) --> ENTER["User enters username\nand password"]
    ENTER --> SUBMIT["Click Login button"]
    SUBMIT --> IPC1["Renderer invokes:\nwindow.electronAPI.loginUser()"]
    IPC1 --> LOOKUP["Main Process:\nSELECT user by username"]
    LOOKUP --> EXISTS{User found?}
    EXISTS -->|No| ERR1["Return error:\nInvalid username or password"]
    ERR1 --> SHOW_ERR["Display error on Login page"]
    SHOW_ERR --> ENTER

    EXISTS -->|Yes| ACTIVE{is_active = TRUE?}
    ACTIVE -->|No| ERR2["Return error:\nAccount deactivated"]
    ERR2 --> SHOW_ERR

    ACTIVE -->|Yes| LOCKED{locked_until\ngreater than NOW?}
    LOCKED -->|Yes| ERR3["Return error:\nAccount locked 15 min"]
    ERR3 --> SHOW_ERR

    LOCKED -->|No| VERIFY["Argon2id.verify\npassword_hash vs input"]
    VERIFY --> MATCH{Password correct?}

    MATCH -->|No| INCR["Increment failed_attempts"]
    INCR --> FIVE{failed_attempts\ngreater or equal 5?}
    FIVE -->|Yes| LOCK["SET locked_until = NOW + 15min"]
    LOCK --> ERR3
    FIVE -->|No| ERR1

    MATCH -->|Yes| RESET["RESET failed_attempts = 0\nUPDATE last_login_at = NOW"]
    RESET --> SESSION["Store session in localStorage\nuserId and username"]
    SESSION --> NAV["Navigate to Dashboard"]
    NAV --> END([End])
```

---

### Activity Diagram 2: Add Sale Process

```mermaid
flowchart TD
    START([Start]) --> OPEN["Pharmacist opens\nAdd Sale page"]
    OPEN --> SELECT_CUST["Select Customer from dropdown"]
    SELECT_CUST --> ADD_ITEM["Click Add Product"]
    ADD_ITEM --> FETCH_PROD["Fetch product list\nvia getProducts()"]
    FETCH_PROD --> PICK_PROD["Select product from list"]
    PICK_PROD --> FETCH_BATCH["Fetch available batches\nvia getStockByProduct(productId)"]
    FETCH_BATCH --> BATCH_AVAIL{Batches available?}
    BATCH_AVAIL -->|No| WARN["Show Out of Stock warning"]
    WARN --> ADD_ITEM

    BATCH_AVAIL -->|Yes| PICK_BATCH["Select batch\nFEFO order - earliest expiry first"]
    PICK_BATCH --> ENTER_QTY["Enter quantity and discount percent"]
    ENTER_QTY --> CALC["Calculate line_total\nqty x sale_rate x discount"]
    CALC --> MORE{Add more products?}
    MORE -->|Yes| ADD_ITEM
    MORE -->|No| REVIEW["Review invoice summary\nsubtotal, tax, net_receivable"]
    REVIEW --> CONFIRM{Confirm Sale?}
    CONFIRM -->|No - Edit| ADD_ITEM
    CONFIRM -->|Yes| INSERT_INV["INSERT sale_invoice\nand sale_invoice_items\nvia IPC: insert-sale"]
    INSERT_INV --> DEDUCT["Deduct stock from batch\nquantity_available minus qty"]
    DEDUCT --> LOG_MOVE["INSERT stock_movement\nmovement_type = SALE"]
    LOG_MOVE --> PRINT["Generate Invoice"]
    PRINT --> END([End])
```

---

### Activity Diagram 3: Add Batch (Receive Inventory)

```mermaid
flowchart TD
    START([Start]) --> OPEN["Pharmacist opens\nAdd Batch page"]
    OPEN --> FETCH_P["Fetch products list\nwindow.electronAPI.getProducts()"]
    FETCH_P --> FETCH_S["Fetch suppliers list\nwindow.electronAPI.getSuppliers()"]
    FETCH_S --> FILL["Fill batch form:\nProduct, Supplier, Batch Number\nMfg Date, Expiry Date\nMRP and Purchase Cost\nQuantity Received"]

    FILL --> VALIDATE{Form valid?}
    VALIDATE -->|No - Missing fields| ERR["Show field-level\nvalidation errors"]
    ERR --> FILL

    VALIDATE -->|Yes| DUP_CHK["Check: batch_number unique\nfor this product"]
    DUP_CHK --> DUP{Duplicate batch?}
    DUP -->|Yes| ERR2["Show error:\nBatch number already exists"]
    ERR2 --> FILL

    DUP -->|No| IPC_CALL["invoke add-batch data\nvia window.electronAPI.addBatch()"]
    IPC_CALL --> INSERT_BATCH["INSERT INTO batches\nproduct_id, supplier_id\nbatch_number, expiry_date\nmrp, quantity_received"]
    INSERT_BATCH --> TRIGGER["PostgreSQL trigger fires:\ntrg_batch_insert_opening_movement"]
    TRIGGER --> INSERT_MOVE["Auto-INSERT stock_movement\nmovement_type = PURCHASE_IN\nquantity = quantity_received"]
    INSERT_MOVE --> UPDATE_QTY["UPDATE batches\nSET quantity_available = quantity_received"]
    UPDATE_QTY --> SUCCESS["Show success toast:\nBatch added successfully"]
    SUCCESS --> CLEAR["Clear form for next entry"]
    CLEAR --> END([End])
```

---

## 2e. Use Case Diagram

```mermaid
graph LR
    ADM(["Pharmacist / Admin"])
    SYS_DB(["PostgreSQL Database\nSystem Actor"])

    subgraph PharmaX["PharmaX System"]
        subgraph Auth["Authentication"]
            UC1["Login to System"]
            UC2["Register New Account"]
            UC3["Account Lockout - 5 failed attempts"]
        end

        subgraph MasterData["Master Data Management"]
            UC4["Manage Manufacturers\nAdd / Edit / Deactivate / Reactivate"]
            UC5["Manage Products\nAdd / Edit / Deactivate / Reactivate"]
            UC6["Manage Suppliers\nAdd / Edit / Deactivate / Reactivate"]
            UC7["Manage Customers\nAdd / Edit / Delete / Reactivate"]
            UC8["Manage Contact Persons\nAdd / Delete"]
            UC9["View Categories\nRead-only / pre-seeded"]
        end

        subgraph Inventory["Inventory Management"]
            UC10["Add Batch - Receive Stock"]
            UC11["View Stock Summary"]
            UC12["View Stock by Product"]
            UC13["View Near-Expiry Alerts"]
        end

        subgraph Sales["Sales Processing"]
            UC14["Create Sale Invoice"]
            UC15["View Sales Reports"]
            UC16["View Credit Dues"]
        end

        subgraph System["System Utilities"]
            UC17["View Dashboard"]
            UC18["Backup and Export Data"]
            UC19["App Settings"]
            UC20["Command Menu Search - Ctrl+J"]
        end
    end

    ADM --> UC1
    ADM --> UC2
    UC1 -.->|"includes"| UC3
    ADM --> UC4
    ADM --> UC5
    ADM --> UC6
    ADM --> UC7
    ADM --> UC8
    ADM --> UC9
    ADM --> UC10
    ADM --> UC11
    ADM --> UC12
    ADM --> UC13
    ADM --> UC14
    ADM --> UC15
    ADM --> UC16
    ADM --> UC17
    ADM --> UC18
    ADM --> UC19
    ADM --> UC20

    UC10 -.->|"triggers auto stock movement"| SYS_DB
    UC14 -.->|"writes invoices"| SYS_DB
    UC1 -.->|"reads users"| SYS_DB
```

---

## 2f. Sequence Diagrams

### Sequence Diagram 1: User Login

```mermaid
sequenceDiagram
    actor User as Pharmacist
    participant LoginPage as Login.jsx Renderer
    participant Preload as preload.js contextBridge
    participant Main as main.js ipcMain
    participant DB as PostgreSQL

    User->>LoginPage: Enter username and password, Click Login
    LoginPage->>Preload: window.electronAPI.loginUser(username, password)
    Preload->>Main: ipcRenderer.invoke('login-user', username, password)
    Main->>DB: SELECT user_id, password_hash, is_active, failed_attempts, locked_until FROM users WHERE username=$1
    DB-->>Main: user row

    alt User not found
        Main-->>LoginPage: success false, error Invalid username or password
        LoginPage-->>User: Show error toast
    else Account inactive
        Main-->>LoginPage: success false, error Account deactivated
        LoginPage-->>User: Show error toast
    else Account locked
        Main-->>LoginPage: success false, error Account locked 15 min
        LoginPage-->>User: Show error toast
    else Password mismatch
        Main->>DB: UPDATE users SET failed_attempts increment, locked_until if needed
        DB-->>Main: OK
        Main-->>LoginPage: success false, error
        LoginPage-->>User: Show error toast
    else Login successful
        Main->>DB: UPDATE users SET failed_attempts=0, last_login_at=NOW()
        DB-->>Main: OK
        Main-->>LoginPage: success true, userId
        LoginPage->>LoginPage: localStorage.setItem pharmax_user
        LoginPage-->>User: Redirect to Dashboard
    end
```

---

### Sequence Diagram 2: Add Sale Invoice

```mermaid
sequenceDiagram
    actor User as Pharmacist
    participant AddSale as AddSale.jsx Renderer
    participant Preload as preload.js
    participant Main as main.js
    participant DB as PostgreSQL

    User->>AddSale: Open Add Sale page
    AddSale->>Preload: window.electronAPI.getCustomers()
    Preload->>Main: invoke get-customers
    Main->>DB: SELECT from customers WHERE is_active=TRUE
    DB-->>Main: customers array
    Main-->>AddSale: customers array

    AddSale->>Preload: window.electronAPI.getProducts()
    Preload->>Main: invoke get-products
    Main->>DB: SELECT products JOIN manufacturers JOIN categories
    DB-->>Main: products array
    Main-->>AddSale: products array

    User->>AddSale: Select customer and fill invoice date
    User->>AddSale: Select product from dropdown
    AddSale->>Preload: window.electronAPI.getStockByProduct(productId)
    Preload->>Main: invoke get-stock-by-product productId
    Main->>DB: SELECT batches WHERE product_id=$1 AND quantity_available>0 ORDER BY expiry_date ASC
    DB-->>Main: batches array FEFO ordered
    Main-->>AddSale: batches array

    User->>AddSale: Select batch, enter qty and discount
    AddSale->>AddSale: Calculate line_total, tax_amount, net_receivable

    User->>AddSale: Click Confirm Sale
    AddSale->>Preload: window.electronAPI.queryDb INSERT sale_invoice
    Preload->>Main: invoke query-db sql params
    Main->>DB: BEGIN TRANSACTION
    Main->>DB: INSERT INTO sale_invoices RETURNING sale_invoice_id
    DB-->>Main: sale_invoice_id
    Main->>DB: INSERT INTO sale_invoice_items per line item
    Main->>DB: UPDATE batches SET quantity_available minus qty WHERE batch_id=$1
    Main->>DB: INSERT INTO stock_movements movement_type SALE
    Main->>DB: COMMIT
    DB-->>Main: OK
    Main-->>AddSale: success true
    AddSale-->>User: Show Sale Confirmed toast and Display Invoice
```

---

### Sequence Diagram 3: Add Batch (Receive Inventory)

```mermaid
sequenceDiagram
    actor User as Pharmacist
    participant AddBatch as AddBatch.jsx Renderer
    participant Preload as preload.js
    participant Main as main.js
    participant DB as PostgreSQL

    User->>AddBatch: Open Add Batch page
    AddBatch->>Preload: window.electronAPI.getProducts()
    Preload->>Main: invoke get-products
    Main->>DB: SELECT products WHERE is_active=TRUE
    DB-->>Main: products array
    Main-->>AddBatch: products array

    AddBatch->>Preload: window.electronAPI.getSuppliers()
    Preload->>Main: invoke get-suppliers
    Main->>DB: SELECT suppliers WHERE is_active=TRUE
    DB-->>Main: suppliers array
    Main-->>AddBatch: suppliers array

    User->>AddBatch: Fill form: Product, Supplier, Batch No, Mfg Date, Expiry, MRP, Cost, Qty

    User->>AddBatch: Click Add Batch
    AddBatch->>AddBatch: Client-side validation of required fields

    alt Validation fails
        AddBatch-->>User: Show field-level errors
    else Validation passes
        AddBatch->>Preload: window.electronAPI.addBatch(data)
        Preload->>Main: invoke add-batch data
        Main->>DB: INSERT INTO batches product_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp, purchase_cost_per_unit, quantity_received RETURNING batch_id

        alt Duplicate batch_number for product error code 23505
            DB-->>Main: UNIQUE violation error
            Main-->>AddBatch: success false, error Batch already exists
            AddBatch-->>User: Show error toast
        else Insert successful
            DB->>DB: TRIGGER trg_batch_insert_opening_movement fires\nINSERT stock_movement PURCHASE_IN\nUPDATE quantity_available
            DB-->>Main: batch_id returned
            Main-->>AddBatch: success true, batchId
            AddBatch-->>User: Show Batch added success toast and Clear form
        end
    end
```

---

## 2g. Class Diagram

```mermaid
classDiagram
    class User {
        +UUID user_id
        +String username
        +String password_hash
        +Boolean is_active
        +Timestamp last_login_at
        +Int failed_attempts
        +Timestamp locked_until
        +Timestamp created_at
        +Timestamp updated_at
        +login(username, password) Result
        +signup(username, password) Result
        +resetLockout() void
    }

    class Manufacturer {
        +UUID manufacturer_id
        +String name
        +String drap_mfg_licence
        +String country
        +String contact_number
        +String email
        +Boolean is_active
        +Timestamp created_at
        +Timestamp updated_at
        +activate() void
        +deactivate() void
    }

    class Category {
        +UUID category_id
        +String name
        +String description
        +Boolean is_active
    }

    class Product {
        +UUID product_id
        +UUID manufacturer_id
        +UUID category_id
        +String name
        +String form
        +String uom
        +Int quantity_in_uom
        +String hsn_code
        +Decimal gst_rate
        +Enum drug_schedule
        +String drap_registration_no
        +Boolean requires_prescription
        +String generic_formula
        +Decimal default_sale_rate
        +Decimal default_purchase_rate
        +String shelf_no
        +JSONB attributes
        +Boolean is_active
        +activate() void
        +deactivate() void
    }

    class ProductPriceHistory {
        +UUID history_id
        +UUID product_id
        +UUID changed_by
        +Decimal default_sale_rate
        +Decimal default_purchase_rate
        +Timestamp effective_from
        +String notes
    }

    class Supplier {
        +UUID supplier_id
        +String name
        +String strn
        +String ntn
        +String drug_licence_no
        +String address
        +String city
        +String payment_terms
        +Int credit_period_days
        +Decimal opening_balance
        +Boolean is_active
        +activate() void
        +deactivate() void
    }

    class Customer {
        +UUID customer_id
        +String name
        +String strn
        +String ntn
        +String drug_licence_no
        +String address
        +String city
        +String territory
        +Enum customer_type
        +Decimal credit_limit
        +Decimal opening_balance
        +String payment_terms
        +Boolean is_active
        +activate() void
        +deactivate() void
    }

    class ContactPerson {
        +UUID contact_id
        +Enum entity_type
        +UUID entity_id
        +String name
        +String role
        +String contact_number
        +String email
        +Boolean is_primary
        +Timestamp created_at
    }

    class Batch {
        +UUID batch_id
        +UUID product_id
        +UUID supplier_id
        +UUID purchase_invoice_id
        +String batch_number
        +Date manufacturing_date
        +Date expiry_date
        +Decimal mrp
        +Decimal purchase_cost_per_unit
        +Int quantity_received
        +Int quantity_available
        +Boolean is_active
        +Timestamp created_at
        +Timestamp updated_at
        +getExpiryStatus() String
        +getDaysToExpiry() Int
    }

    class StockMovement {
        +UUID movement_id
        +UUID batch_id
        +Enum movement_type
        +Int quantity
        +String reference_type
        +UUID reference_id
        +String notes
        +UUID created_by
        +Timestamp created_at
    }

    class PurchaseInvoice {
        +UUID purchase_invoice_id
        +UUID supplier_id
        +String invoice_number
        +Date invoice_date
        +Date received_date
        +Enum status
        +Decimal subtotal
        +Decimal discount_amount
        +Decimal tax_amount
        +Decimal net_payable
        +String notes
        +UUID created_by
        +UUID confirmed_by
        +Timestamp confirmed_at
        +confirm() void
    }

    class PurchaseInvoiceItem {
        +UUID item_id
        +UUID purchase_invoice_id
        +UUID product_id
        +String batch_number
        +Date manufacturing_date
        +Date expiry_date
        +Decimal mrp
        +Decimal purchase_cost_per_unit
        +Int quantity
        +Decimal discount_pct
        +Decimal gst_rate
        +Decimal line_total
        +Decimal tax_amount
        +calculateLineTotal() Decimal
    }

    class SaleInvoice {
        +UUID sale_invoice_id
        +String invoice_number
        +UUID customer_id
        +Date invoice_date
        +Date due_date
        +Enum status
        +Decimal subtotal
        +Decimal discount_amount
        +Decimal tax_amount
        +Decimal net_receivable
        +Decimal amount_paid
        +Decimal balance_due
        +String notes
        +UUID created_by
        +UUID confirmed_by
        +Timestamp confirmed_at
        +confirm() void
        +calculateTotals() void
    }

    class SaleInvoiceItem {
        +UUID item_id
        +UUID sale_invoice_id
        +UUID product_id
        +UUID batch_id
        +Int quantity
        +Decimal mrp
        +Decimal sale_rate
        +Decimal discount_pct
        +Decimal gst_rate
        +Decimal line_total
        +Decimal tax_amount
        +calculateLineTotal() Decimal
    }

    class Payment {
        +UUID payment_id
        +Enum direction
        +UUID party_id
        +Date payment_date
        +Decimal amount
        +Enum mode
        +String reference_no
        +String bank_name
        +String notes
        +UUID created_by
        +Timestamp created_at
    }

    class Expense {
        +UUID expense_id
        +Date expense_date
        +Enum category
        +String description
        +Decimal amount
        +Enum mode
        +String reference_no
        +String vendor_name
        +UUID created_by
        +Timestamp created_at
    }

    Manufacturer "1" --> "0..*" Product : manufactures
    Category "1" --> "0..*" Product : classifies
    Product "1" --> "0..*" ProductPriceHistory : tracks price
    User "1" --> "0..*" ProductPriceHistory : changed by
    Supplier "1" --> "0..*" PurchaseInvoice : supplies via
    User "1" --> "0..*" PurchaseInvoice : creates and confirms
    PurchaseInvoice "1" *-- "1..*" PurchaseInvoiceItem : contains
    Product "1" --> "0..*" PurchaseInvoiceItem : line item for
    Product "1" --> "0..*" Batch : stocked as
    Supplier "1" --> "0..*" Batch : sourced from
    PurchaseInvoice "1" --> "0..*" Batch : received on
    Batch "1" --> "0..*" StockMovement : tracks movement
    User "1" --> "0..*" StockMovement : recorded by
    Customer "1" --> "0..*" SaleInvoice : billed to
    User "1" --> "0..*" SaleInvoice : creates and confirms
    SaleInvoice "1" *-- "1..*" SaleInvoiceItem : contains
    Product "1" --> "0..*" SaleInvoiceItem : line item for
    Batch "1" --> "0..*" SaleInvoiceItem : dispatched from
    Supplier "1" --> "0..*" ContactPerson : has contacts
    Customer "1" --> "0..*" ContactPerson : has contacts
    User "1" --> "0..*" Payment : records
    User "1" --> "0..*" Expense : records
```

---

_Generated from codebase analysis: `Backend/app/main.js`, `Backend/app/preload.js`, `Frontend/src/App.jsx`, `Frontend/src/components/Sidebar.jsx`, `database/pharmax_schema.sql` ERD, `Docs/architecture/ARCHITECTURE.md`, and `README.md`._
