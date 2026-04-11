# PharmaX C4 Model Diagrams

This document provides a visual representation of the PharmaX architecture using the C4 Model (Context, Container, Component).

## Level 1: System Context Diagram

The System Context diagram shows the PharmaX application in the context of the business environment.

```mermaid
C4Context
    title System Context Diagram for PharmaX

    Person(user, "Pharmacist / Admin", "Manages inventory, sales, and billing.")
    System(pharmax, "PharmaX Application", "Provides pharmacy billing, inventory tracking, and regulatory compliance features.")
    
    Rel(user, pharmax, "Uses", "Desktop Application")
    
    UpdateElementStyle(user, $fontColor="white", $bgColor="blue")
    UpdateElementStyle(pharmax, $fontColor="white", $bgColor="navy")
```

---

## Level 2: Container Diagram

The Container diagram shows the high-level technical building blocks of the PharmaX application.

```mermaid
C4Container
    title Container Diagram for PharmaX

    Person(user, "Pharmacist / Admin", "Manages inventory and sales.")

    System_Boundary(c1, "PharmaX Desktop App") {
        Container(renderer, "Renderer Process (UI)", "React 19, Vite", "Provides the user interface and captures user input.")
        Container(preload, "Preload Script", "Node.js", "Secure bridge between Renderer and Main processes.")
        Container(main, "Main Process (Backend)", "Node.js, Electron", "Handles business logic, security, and database access.")
    }

    ContainerDb(db, "PostgreSQL Database", "PostgreSQL 15+", "Stores master data, transaction logs, and security settings.", $tags="db")

    Rel(user, renderer, "Interacts with", "HTML/JS/CSS")
    Rel(renderer, preload, "Calls", "IPC Bridge")
    Rel(preload, main, "Invokes Handlers", "IPC")
    Rel(main, db, "Reads/Writes", "node-postgres (SQL)")

    UpdateElementStyle(user, $fontColor="white", $bgColor="blue")
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

## Level 3: Component Diagram (Main Process)

The Component diagram decomposes the Main Process into its internal functional components.

```mermaid
C4Component
    title Component Diagram - Electron Main Process

    Container(renderer, "Renderer Process", "React", "Requests data and actions via IPC.")

    System_Boundary(b1, "Main Process Components") {
        Component(ipc_dispatcher, "IPC Dispatcher", "ipcMain", "Routes incoming renderer requests to appropriate handlers.")
        Component(auth_service, "Auth Service", "Argon2, SQL", "Handles login, signup, and account locking.")
        Component(db_pool, "Database Pool", "node-postgres (Pool)", "Manages connections to the PostgreSQL instance.")
        Component(master_data_handler, "Master Data Handler", "SQL", "Manages Manufacturers, Suppliers, Products, and Categories.")
        Component(inventory_handler, "Inventory Handler", "SQL", "Manages Batches and Stock Summaries.")
    }

    ContainerDb(db, "PostgreSQL Database", "SQL Server", "Persistent storage.")

    Rel(renderer, ipc_dispatcher, "IPC Calls")
    Rel(ipc_dispatcher, auth_service, "Dispatches Auth commands")
    Rel(ipc_dispatcher, master_data_handler, "Dispatches Data queries")
    Rel(ipc_dispatcher, inventory_handler, "Dispatches Inventory tasks")

    Rel(auth_service, db_pool, "Queries")
    Rel(master_data_handler, db_pool, "Queries")
    Rel(inventory_handler, db_pool, "Queries")
    
    Rel(db_pool, db, "Executes SQL")

    UpdateElementStyle(renderer, $fontColor="black", $bgColor="lightgray")
```
