# SE Deliverable #3 — Design Diagrams

## Pharmacy Billing App

**Tech Stack:** Electron (Node.js Main Process) · React 19 + Vite (Renderer) · PostgreSQL 14+  
**Architecture Style:** Dual-Process Electron (Layered + Client–Server within a desktop shell)

---

## 1. Architecture Diagram

_Architecture Style: **Layered Architecture** within an **Electron dual-process model**. The Renderer (UI) is strictly isolated from the Main (backend) process via IPC — no direct DB access from the UI, enforcing separation of concerns and preventing SQL injection._

```mermaid
graph TD
    subgraph "Electron Desktop Application"
        subgraph "Renderer Process — UI Layer"
            UI1[React 19 SPA]
            UI2[Shadcn / Radix UI Components]
            UI3[Vite Bundler]
            UI1 --> UI2
        end

        subgraph "IPC Bridge — Security Boundary"
            IPC[Electron IPC Channel\nipcMain / ipcRenderer]
        end

        subgraph "Main Process — Application Logic Layer"
            MP1[IPC Handler / Controller]
            MP2[Business Logic Services\nInvoicing · Inventory · Payments]
            MP3[Auth & Session Manager]
            MP4[PostgreSQL Client\n pg / node-postgres]
        end

        subgraph "Data Layer"
            DB[(PostgreSQL 14+\npharmax_schema)]
        end
    end

    UI1 -- "ipcRenderer.invoke()" --> IPC
    IPC -- "ipcMain.handle()" --> MP1
    MP1 --> MP2
    MP1 --> MP3
    MP2 --> MP4
    MP3 --> MP4
    MP4 -- "SQL Queries\nPessimistic Locking" --> DB
```

---

## 2. Component Diagram

```mermaid
graph LR
    subgraph Frontend["Frontend Components (React)"]
        AUTH_UI[AuthComponent]
        DASH[Dashboard]
        PROD_UI[ProductManagement]
        PURCH_UI[PurchaseManagement]
        SALE_UI[SaleManagement]
        INV_UI[InventoryBatchView]
        PAY_UI[PaymentComponent]
        RETURN_UI[ReturnsComponent]
        RPT_UI[ReportsComponent]
    end

    subgraph IPC_Layer["IPC Bridge"]
        IPC_BUS[ipcRenderer / ipcMain]
    end

    subgraph Backend["Backend Services (Main Process)"]
        AUTH_SVC[AuthService]
        PROD_SVC[ProductService]
        PURCH_SVC[PurchaseInvoiceService]
        SALE_SVC[SaleInvoiceService]
        INV_SVC[InventoryService]
        PAY_SVC[PaymentService]
        RETURN_SVC[ReturnService]
        RPT_SVC[ReportService]
        DB_SVC[DatabaseService\n pg pool]
    end

    subgraph DB["Database (PostgreSQL)"]
        DB_SCHEMA[(pharmax_schema\nAll Tables)]
    end

    AUTH_UI & DASH & PROD_UI & PURCH_UI & SALE_UI & INV_UI & PAY_UI & RETURN_UI & RPT_UI --> IPC_BUS
    IPC_BUS --> AUTH_SVC & PROD_SVC & PURCH_SVC & SALE_SVC & INV_SVC & PAY_SVC & RETURN_SVC & RPT_SVC
    AUTH_SVC & PROD_SVC & PURCH_SVC & SALE_SVC & INV_SVC & PAY_SVC & RETURN_SVC & RPT_SVC --> DB_SVC
    DB_SVC --> DB_SCHEMA
```

---

## 3. Data Flow Diagrams

### DFD Level 0 — Context Diagram

```mermaid
flowchart LR
    PH((Pharmacist\n/ Admin))
    SYS[Pharmacy Billing System]
    SUP((Supplier))
    CUST((Customer))

    PH -- "Login, Manage Inventory,\nCreate Invoices, Record Payments" --> SYS
    SYS -- "Receipts, Reports,\nBalance Info" --> PH
    SUP -- "Purchase Invoice Data,\nBatch / Lot Info" --> SYS
    CUST -- "Order / Prescription" --> SYS
    SYS -- "Sale Invoice / Receipt" --> CUST
```

---

### DFD Level 1 — Main Processes

```mermaid
flowchart TD
    USER[User / Pharmacist]

    P1(("1.0\nAuthentication"))
    P2(("2.0\nInventory Management"))
    P3(("3.0\nPurchase Management"))
    P4(("4.0\nSales Management"))
    P5(("5.0\nPayment Processing"))
    P6(("6.0\nReturns Management"))
    P7(("7.0\nReporting"))

    DS1[("users")]
    DS2[("products\nbatches\ncategories")]
    DS3[("purchase_invoices\npurchase_invoice_items\nbatches")]
    DS4[("sale_invoices\nsale_invoice_items\nstock_movements")]
    DS5[("payments\nexpenses")]
    DS6[("purchase_returns\nsale_returns")]
    DS7[("All Tables")]

    USER -- "Credentials" --> P1
    P1 -- "Session Token" --> USER
    P1 --> DS1

    USER -- "Product / Category Data" --> P2
    P2 --> DS2
    DS2 -- "Stock Levels" --> USER

    USER -- "Purchase Order Data" --> P3
    P3 --> DS3

    USER -- "Sale Order Data" --> P4
    P4 --> DS4
    DS4 -- "Invoice / Receipt" --> USER

    USER -- "Payment Info" --> P5
    P5 --> DS5

    USER -- "Return Request" --> P6
    P6 --> DS6

    P7 --> DS7
    DS7 -- "Reports & Analytics" --> USER
```

---

### DFD Level 2 — Sales Management (Process 4.0 Drill-down)

```mermaid
flowchart TD
    USER([Pharmacist])

    P41[4.1\nSelect Customer]
    P42[4.2\nSearch & Add\nMedicine Items]
    P43[4.3\nApply Discount\n& GST]
    P44[4.4\nGenerate Invoice\nNumber]
    P45[4.5\nDeduct Stock\n via Batch]
    P46[4.6\nRecord Sale\n Invoice]
    P47[4.7\nProcess Payment\nor Credit]

    DS_CUST[(customers)]
    DS_PROD[(products / batches)]
    DS_INV[(sale_invoices\nsale_invoice_items)]
    DS_STOCK[(stock_movements)]
    DS_PAY[(payments)]

    USER -- "Customer Name / ID" --> P41
    P41 --> DS_CUST
    DS_CUST -- "Customer Credit Limit" --> P41

    P41 -- "Customer Confirmed" --> P42
    USER -- "Medicine Name / Batch" --> P42
    P42 --> DS_PROD
    DS_PROD -- "Available Stock, MRP" --> P42

    P42 -- "Line Items" --> P43
    P43 -- "Net Payable" --> P44
    P44 -- "Invoice Number (Sequence)" --> P45
    P45 --> DS_STOCK
    P45 --> P46
    P46 --> DS_INV
    P46 -- "Invoice Created" --> P47
    P47 --> DS_PAY
    P47 -- "Receipt" --> USER
```

---

## 4. Activity Diagrams

### Activity 1 — Create Sale Invoice

```mermaid
flowchart TD
    START([Start]) --> LOGIN{Is User\nLogged In?}
    LOGIN -- No --> AUTH[Authenticate\nUser]
    AUTH --> LOGIN
    LOGIN -- Yes --> SEL_CUST[Select / Search Customer]
    SEL_CUST --> CHECK_CUST{Customer\nFound?}
    CHECK_CUST -- No --> ADD_CUST[Add New Customer]
    ADD_CUST --> SEL_CUST
    CHECK_CUST -- Yes --> ADD_ITEMS[Add Medicine Line Items\nSelect Product + Batch]
    ADD_ITEMS --> CHECK_STOCK{Stock\nAvailable?}
    CHECK_STOCK -- No --> NOTIFY[Show Out-of-Stock\nAlert]
    NOTIFY --> ADD_ITEMS
    CHECK_STOCK -- Yes --> APPLY_DISC[Apply Discount & GST]
    APPLY_DISC --> REVIEW[Review Invoice\nSubtotal / Tax / Net]
    REVIEW --> CONFIRM{Confirm\nInvoice?}
    CONFIRM -- No --> EDIT[Edit Items]
    EDIT --> ADD_ITEMS
    CONFIRM -- Yes --> GEN_INV[Generate Invoice Number\nDeduct Stock via Batch]
    GEN_INV --> REC_PAY{Full / Partial\nPayment Now?}
    REC_PAY -- Yes --> REC_PAYMENT[Record Payment\nMode: Cash/Bank/Credit]
    REC_PAYMENT --> PRINT[Print / Save Receipt]
    REC_PAY -- No --> CREDIT[Post to\nCustomer Balance Due]
    CREDIT --> PRINT
    PRINT --> END([End])
```

---

### Activity 2 — Process Purchase Invoice

```mermaid
flowchart TD
    START([Start]) --> SEL_SUP[Select Supplier]
    SEL_SUP --> ENTER_INV[Enter Supplier Invoice\nNumber & Date]
    ENTER_INV --> ADD_ITEMS[Add Medicine Items\nBatch / Lot / Expiry / Cost]
    ADD_ITEMS --> VALIDATE{Valid Batch\n& Expiry Dates?}
    VALIDATE -- No --> CORRECT[Correct Item Data]
    CORRECT --> ADD_ITEMS
    VALIDATE -- Yes --> MORE{Add More\nItems?}
    MORE -- Yes --> ADD_ITEMS
    MORE -- No --> CALC[Calculate Subtotal\nDiscount / GST / Net]
    CALC --> REVIEW[Review Purchase Invoice]
    REVIEW --> CONFIRM{Confirm?}
    CONFIRM -- No --> EDIT[Edit Invoice]
    EDIT --> ADD_ITEMS
    CONFIRM -- Yes --> SAVE_INV[Save Purchase Invoice\nCreate Batch Records]
    SAVE_INV --> UPD_STOCK[Update Inventory\nstock_movements INSERT]
    UPD_STOCK --> PAY_SUP{Pay Supplier\nNow?}
    PAY_SUP -- Yes --> REC_PAY[Record Payment\nto Supplier]
    PAY_SUP -- No --> CREDIT[Post to\nSupplier Payable]
    REC_PAY --> END([End])
    CREDIT --> END
```

---

### Activity 3 — Record a Payment

```mermaid
flowchart TD
    START([Start]) --> SEL_TYPE{Payment\nDirection?}
    SEL_TYPE -- "Receive from Customer" --> SEL_CUST[Select Customer]
    SEL_TYPE -- "Pay to Supplier" --> SEL_SUP[Select Supplier]
    SEL_CUST --> CHECK_BAL_C[Check Customer\nBalance Due]
    SEL_SUP --> CHECK_BAL_S[Check Supplier\nPayable]
    CHECK_BAL_C --> ENTER_AMT[Enter Payment Amount]
    CHECK_BAL_S --> ENTER_AMT
    ENTER_AMT --> SEL_MODE[Select Payment Mode\nCash / Bank Transfer / Cheque]
    SEL_MODE --> ENTER_REF{Mode = Bank\nor Cheque?}
    ENTER_REF -- Yes --> REF_NO[Enter Reference No.\n& Bank Name]
    ENTER_REF -- No --> VALIDATE
    REF_NO --> VALIDATE{Amount ≤\nBalance?}
    VALIDATE -- No --> WARN[Show Overpayment\nWarning]
    WARN --> ENTER_AMT
    VALIDATE -- Yes --> SAVE[Save Payment Record\nUpdate Balance Due]
    SAVE --> PRINT[Print Payment Voucher]
    PRINT --> END([End])
```

---

## 5. Use Case Diagram

```mermaid
graph LR
    subgraph Actors
        PH((Pharmacist))
        ADM((Admin))
        SYS((System))
    end

    subgraph "Pharmacy Billing App"
        UC1(Login / Logout)
        UC2(Manage Products\n& Categories)
        UC3(Manage Suppliers\n& Customers)
        UC4(Create Purchase Invoice)
        UC5(Create Sale Invoice)
        UC6(Track Inventory\n& Batches)
        UC7(Process Purchase Return)
        UC8(Process Sale Return)
        UC9(Record Payment)
        UC10(Manage Expenses)
        UC11(View Reports\n& Analytics)
        UC12(Manage Users)
        UC13(Auto-deduct Stock\non Sale Confirm)
        UC14(Lock Balances\nPessimistic Lock)
    end

    PH --> UC1
    PH --> UC4
    PH --> UC5
    PH --> UC6
    PH --> UC7
    PH --> UC8
    PH --> UC9
    PH --> UC11

    ADM --> UC1
    ADM --> UC2
    ADM --> UC3
    ADM --> UC10
    ADM --> UC12
    ADM --> UC11

    UC5 --> UC13
    UC13 -.->|include| SYS
    UC9 --> UC14
    UC14 -.->|include| SYS
```

---

## 6. Sequence Diagrams

### Sequence 1 — Create Sale Invoice

```mermaid
sequenceDiagram
    actor Pharmacist
    participant UI as React UI
    participant IPC as IPC Bridge
    participant SVC as SaleInvoiceService
    participant DB as PostgreSQL

    Pharmacist->>UI: Fill invoice form (customer, items, discount)
    UI->>IPC: ipcRenderer.invoke('create-sale-invoice', payload)
    IPC->>SVC: handleCreateSaleInvoice(payload)
    SVC->>DB: BEGIN TRANSACTION
    SVC->>DB: SELECT customer FOR UPDATE (credit check)
    DB-->>SVC: Customer record + balance
    SVC->>DB: SELECT batch FOR UPDATE (stock check per item)
    DB-->>SVC: Available quantities
    SVC->>DB: INSERT sale_invoices (status=draft)
    SVC->>DB: INSERT sale_invoice_items (each line)
    SVC->>DB: INSERT stock_movements (deduct qty from batch)
    SVC->>DB: UPDATE batches SET quantity_available = qty - sold
    SVC->>DB: UPDATE sale_invoices SET status=confirmed
    SVC->>DB: COMMIT
    DB-->>SVC: Success
    SVC-->>IPC: { invoice_id, invoice_number }
    IPC-->>UI: Success response
    UI-->>Pharmacist: Show invoice + receipt
```

---

### Sequence 2 — Process Purchase Invoice

```mermaid
sequenceDiagram
    actor Pharmacist
    participant UI as React UI
    participant IPC as IPC Bridge
    participant SVC as PurchaseInvoiceService
    participant DB as PostgreSQL

    Pharmacist->>UI: Enter supplier invoice (items, batch, expiry, cost)
    UI->>IPC: ipcRenderer.invoke('create-purchase-invoice', payload)
    IPC->>SVC: handleCreatePurchaseInvoice(payload)
    SVC->>DB: BEGIN TRANSACTION
    SVC->>DB: INSERT purchase_invoices (status=draft)
    SVC->>DB: INSERT purchase_invoice_items (each line)
    loop For each batch item
        SVC->>DB: INSERT batches (batch_number, qty_received, expiry)
        SVC->>DB: INSERT stock_movements (type=purchase_in)
    end
    SVC->>DB: UPDATE purchase_invoices SET status=confirmed
    SVC->>DB: COMMIT
    DB-->>SVC: Success
    SVC-->>IPC: { purchase_invoice_id }
    IPC-->>UI: Success response
    UI-->>Pharmacist: Show confirmed purchase invoice
```

---

### Sequence 3 — Record Payment

```mermaid
sequenceDiagram
    actor Pharmacist
    participant UI as React UI
    participant IPC as IPC Bridge
    participant SVC as PaymentService
    participant DB as PostgreSQL

    Pharmacist->>UI: Select party, enter amount, mode, reference
    UI->>IPC: ipcRenderer.invoke('record-payment', payload)
    IPC->>SVC: handleRecordPayment(payload)
    SVC->>DB: BEGIN TRANSACTION
    SVC->>DB: SELECT sale_invoice / supplier balance FOR UPDATE
    DB-->>SVC: Current balance_due
    alt Amount > balance_due
        SVC-->>IPC: Error: overpayment
        IPC-->>UI: Show warning
    else Amount valid
        SVC->>DB: INSERT payments (amount, mode, reference_no, direction)
        SVC->>DB: UPDATE sale_invoices SET amount_paid, balance_due
        SVC->>DB: COMMIT
        DB-->>SVC: Success
        SVC-->>IPC: { payment_id }
        IPC-->>UI: Success
        UI-->>Pharmacist: Print payment voucher
    end
```

---

## 7. Class Diagram

_Derived from the PostgreSQL schema in `database/pharmax_schema.sql`._

```mermaid
classDiagram
    class User {
        +UUID user_id
        +String username
        +String password_hash
        +Boolean is_active
        +DateTime last_login_at
        +Int failed_attempts
        +DateTime locked_until
        +login()
        +logout()
    }

    class Manufacturer {
        +UUID manufacturer_id
        +String name
        +String drap_mfg_licence
        +String country
        +String contact_number
        +String email
        +Boolean is_active
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
        +Decimal gst_rate
        +String drug_schedule
        +Boolean requires_prescription
        +String generic_formula
        +Decimal default_sale_rate
        +Decimal default_purchase_rate
        +JSONB attributes
        +Boolean is_active
        +updatePrice()
        +checkStock()
    }

    class ProductPriceHistory {
        +UUID history_id
        +UUID product_id
        +UUID changed_by
        +Decimal default_sale_rate
        +Decimal default_purchase_rate
        +DateTime effective_from
        +String notes
    }

    class Supplier {
        +UUID supplier_id
        +String name
        +String strn
        +String ntn
        +String drug_licence_no
        +Decimal opening_balance
        +Int credit_period_days
        +Boolean is_active
        +getBalance()
    }

    class Customer {
        +UUID customer_id
        +String name
        +String strn
        +CustomerType customer_type
        +Decimal credit_limit
        +Decimal opening_balance
        +Boolean is_active
        +checkCreditLimit()
        +getBalanceDue()
    }

    class ContactPerson {
        +UUID contact_id
        +EntityType entity_type
        +UUID entity_id
        +String name
        +String role
        +String contact_number
        +Boolean is_primary
    }

    class Batch {
        +UUID batch_id
        +UUID product_id
        +UUID supplier_id
        +UUID purchase_invoice_id
        +String batch_number
        +Date expiry_date
        +Decimal mrp
        +Decimal purchase_cost_per_unit
        +Int quantity_received
        +Int quantity_available
        +Boolean is_active
        +isExpired()
        +deductStock(qty)
    }

    class StockMovement {
        +UUID movement_id
        +UUID batch_id
        +MovementType movement_type
        +Int quantity
        +String reference_type
        +UUID reference_id
        +UUID created_by
    }

    class PurchaseInvoice {
        +UUID purchase_invoice_id
        +UUID supplier_id
        +String invoice_number
        +Date invoice_date
        +InvoiceStatus status
        +Decimal subtotal
        +Decimal discount_amount
        +Decimal tax_amount
        +Decimal net_payable
        +UUID created_by
        +confirm()
        +calculateTotals()
    }

    class PurchaseInvoiceItem {
        +UUID item_id
        +UUID purchase_invoice_id
        +UUID product_id
        +String batch_number
        +Date expiry_date
        +Decimal mrp
        +Decimal purchase_cost_per_unit
        +Int quantity
        +Decimal discount_pct
        +Decimal gst_rate
        +Decimal line_total
    }

    class SaleInvoice {
        +UUID sale_invoice_id
        +String invoice_number
        +UUID customer_id
        +Date invoice_date
        +Date due_date
        +InvoiceStatus status
        +Decimal subtotal
        +Decimal discount_amount
        +Decimal tax_amount
        +Decimal net_receivable
        +Decimal amount_paid
        +Decimal balance_due
        +UUID created_by
        +confirm()
        +calculateTotals()
        +applyPayment(amount)
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
        +Decimal line_total
    }

    class PurchaseReturn {
        +UUID return_id
        +UUID purchase_invoice_id
        +UUID supplier_id
        +Date return_date
        +ReturnReason reason
        +Decimal total_credit
        +InvoiceStatus status
        +process()
    }

    class SaleReturn {
        +UUID return_id
        +UUID sale_invoice_id
        +UUID customer_id
        +Date return_date
        +ReturnReason reason
        +Decimal total_credit
        +InvoiceStatus status
        +process()
    }

    class Payment {
        +UUID payment_id
        +PaymentDirection direction
        +UUID party_id
        +Date payment_date
        +Decimal amount
        +PaymentMode mode
        +String reference_no
        +UUID created_by
        +validate()
    }

    class Expense {
        +UUID expense_id
        +Date expense_date
        +ExpenseCategory category
        +String description
        +Decimal amount
        +PaymentMode mode
        +UUID created_by
    }

    %% Relationships
    Manufacturer "1" --> "0..*" Product : manufactures
    Category "1" --> "0..*" Product : classifies
    Product "1" --> "0..*" ProductPriceHistory : tracks
    User "1" --> "0..*" ProductPriceHistory : changedBy

    Supplier "1" --> "0..*" PurchaseInvoice : supplies
    PurchaseInvoice "1" --> "1..*" PurchaseInvoiceItem : contains
    Product "1" --> "0..*" PurchaseInvoiceItem : referencedIn

    Product "1" --> "0..*" Batch : stockedAs
    Supplier "1" --> "0..*" Batch : sourcedFrom
    PurchaseInvoice "1" --> "0..*" Batch : receivedOn

    Batch "1" --> "0..*" StockMovement : tracks
    User "1" --> "0..*" StockMovement : records

    Customer "1" --> "0..*" SaleInvoice : billedTo
    SaleInvoice "1" --> "1..*" SaleInvoiceItem : contains
    Product "1" --> "0..*" SaleInvoiceItem : referencedIn
    Batch "1" --> "0..*" SaleInvoiceItem : dispatchedFrom

    PurchaseInvoice "1" --> "0..*" PurchaseReturn : returnedAgainst
    SaleInvoice "1" --> "0..*" SaleReturn : returnedAgainst

    Supplier "1" --> "0..*" ContactPerson : hasContact
    Customer "1" --> "0..*" ContactPerson : hasContact

    User "1" --> "0..*" Payment : records
    User "1" --> "0..*" Expense : records
    User "1" --> "0..*" SaleInvoice : creates
    User "1" --> "0..*" PurchaseInvoice : creates
```

---

_End of Design Diagrams — SE Deliverable #3_
