# Lessons Learned — Pharmax Pharmacy Billing App

**Team**: 6th Semester BS Computer Science Students  
**Course**: Software Engineering (First Time)  
**Project**: Pharmax — A desktop pharmacy management system built with Electron, React, and PostgreSQL

---

## 1. Requirements Engineering & Iterative Development

We learned that requirements are **never complete on day one**. Our project evolved across three iterations (Proposal → Iteration 1 → Iteration 2 → Sprint 3), and each cycle revealed gaps in the original specification.

**Concrete example from our project:**
- The original design had no concept of "Purchase Returns." This requirement emerged only after implementing the Purchase Invoice module, when we realized pharmacies need to send damaged goods back to suppliers. We had to design a new `purchase_returns` table, its associated backend service, and frontend UI mid-sprint.

**Takeaway:** Agile iteration is not just theory from textbooks — it genuinely saves projects. Trying to lock down every requirement upfront would have given us a system that doesn't match real pharmacy workflows.

---

## 2. SOLID Principles — Learned the Hard Way

The most impactful lesson was understanding **why** SOLID principles matter, because we experienced the pain of violating them first.

### What went wrong (the monolith):
Our initial `main.js` was a single 1,500+ line file containing every database query, every IPC handler, and all the application logic. Adding a new feature meant scrolling through thousands of lines and hoping you didn't break something unrelated.

### What we did to fix it:
We refactored into a **service-per-domain** architecture:

```
Backend/app/services/
├── authService.js        ← Authentication & account lockout
├── productService.js     ← Product CRUD
├── partyService.js       ← Suppliers & Customers
├── stockService.js       ← Inventory & batch management
├── purchaseService.js    ← GRN & purchase returns
├── saleService.js        ← FEFO sales with transactions
├── ledgerService.js      ← Supplier ledger & payables
├── systemService.js      ← Dashboard, backup, export
└── db.js                 ← Database abstraction layer
```

Each service follows the **Single Responsibility Principle (SRP)** — it handles exactly one business domain. The `main.js` now only registers services:

```javascript
authService(ipcMain, db);
productService(ipcMain, db);
saleService(ipcMain, db);
// ... clean, readable, maintainable
```

**Takeaway:** We now understand that SOLID isn't academic theory — it's the difference between a codebase that grows gracefully and one that becomes unmaintainable within weeks.

---

## 3. Database Design & Schema Evolution

Designing a normalized relational schema for a real-world domain (pharmacy inventory with batches, expiry dates, multi-supplier relationships) taught us that:

- **ERD diagrams are essential**, not optional. Our `database/ERD.png` was referenced constantly during development.
- **Database triggers and constraints** (e.g., auto-generating invoice numbers, stock movement tracking) push business logic to where it's most reliable — the database itself.
- **Schema migrations** are a reality. Our `database/migrations/` folder grew as we added features like `purchase_returns`, `payments`, and `expenses` tables that weren't in the original design.

**Takeaway:** Spend time on the data model before writing UI code. Every hour invested in schema design saved us days of debugging later.

---

## 4. Security — SQL Injection Is Real

We discovered that our codebase had **actual SQL injection vulnerabilities** in production code:

### Vulnerability 1: Open query handler
```javascript
// ❌ BEFORE — any SQL could be executed from the frontend
ipcMain.handle("query-db", async (event, sql, params) => {
  return await queryDb(sql, params);
});
```

### Vulnerability 2: Unvalidated table name interpolation
```javascript
// ❌ BEFORE — table name from user input directly in SQL
const rows = await queryDb(`SELECT * FROM ${dbTable}`);
```

### Our fixes:
1. **Deleted** the open `query-db` handler entirely.
2. **Added an allow-list** for CSV export:
```javascript
// ✅ AFTER — only pre-approved table names pass through
const EXPORTABLE_TABLES = new Set(["products", "categories", ...]);
if (!EXPORTABLE_TABLES.has(dbTable)) {
  return { success: false, error: "Not permitted." };
}
```

**Takeaway:** Security is not a feature you add at the end — it must be considered from the start. Even in a desktop app with no internet-facing API, defense-in-depth matters because the renderer process should never be fully trusted.

---

## 5. Architecture Decisions Have Long-Term Consequences

Choosing **Electron + React + PostgreSQL** gave us a powerful stack, but we learned that architectural decisions made early become expensive to change later:

| Decision | Benefit | Cost |
|---|---|---|
| Electron for desktop | Cross-platform, web tech stack | Large bundle size (~200MB), complex build pipeline |
| PostgreSQL over SQLite | Full relational power, triggers, JSONB | Requires separate DB installation for end users |
| React with Vite | Fast HMR, component model | Added complexity with Electron-Vite bridge |
| IPC-based backend | Process isolation, security | Verbose boilerplate for every new feature |

**Takeaway:** There are no "free" technology choices. Every decision involves trade-offs, and understanding these trade-offs is a core SE skill.

---

## 6. Testing — Not Just Writing Tests, but Thinking in Boundaries

Applying **Boundary Value Analysis** and **Equivalence Class Partitioning** from our SE lecture to actual code made the concepts tangible:

- **Password minimum length boundary (5→6→7 chars)** caught a real edge case in our signup validation.
- **Account lockout boundary (4→5 failed attempts)** verified our security mechanism works at the exact threshold.
- **Empty/whitespace input boundaries** revealed that `.trim()` was critical for username validation.

**Takeaway:** Testing theory from lectures becomes meaningful only when you apply it to your own code and discover bugs you would have shipped to users.

---

## 7. Version Control & Collaboration (Git)

Working as a team on a shared codebase taught us:

- **Commit early, commit often.** We lost work early on because of uncommitted changes.
- **Branching matters.** We saw the `test` branch being created alongside `main`, showing how feature branches prevent destabilizing production code.
- **Merge conflicts are normal**, not errors. Resolving them is a skill that only improves with practice.

---

## 8. Documentation Is a First-Class Deliverable

Our project contains multiple documentation artifacts (`UML_Diagrams_V1.md`, `ARCHITECTURE_DOCUMENTATION.md`, `sprint3_user_stories.md`, `code_audit.md`) that were not afterthoughts — they were essential for:

- **Onboarding:** When a team member needed to understand a module they didn't write, documentation was the first stop.
- **Decision tracking:** Why did we choose FEFO (First-Expiry-First-Out) for sale allocation? The architecture docs explain it.
- **Course deliverables:** Connecting code to SE concepts (use cases, UML, testing) required well-maintained documentation.

**Takeaway:** Code without documentation is a liability. Documentation without code is fiction. You need both, kept in sync.

---

## 9. UI/UX Matters More Than We Expected

We learned that even a backend-heavy pharmacy management system lives or dies by its interface:

- **The splash screen** wasn't cosmetic — without it, users thought the app had crashed during the 2-3 second database initialization.
- **Toast notifications** for success/error feedback prevented users from repeating actions (double-submitting invoices).
- **Professional design** (gradients, proper spacing, Lucide icons) increased trust from our test users compared to the raw HTML prototype.

**Takeaway:** Software engineering isn't just about making things work — it's about making things work *for people*.

---

## 10. Technical Debt Is Inevitable — Managing It Is the Skill

By the end of the project, we had accumulated identifiable technical debt:

- Components over 1,000 lines that need splitting (God Components)
- Duplicated Toast logic across 8+ files
- Missing React Error Boundaries
- No server-side input validation on IPC handlers

We tracked this in a `code_audit.md` file with severity ratings and a prioritized backlog. **The lesson isn't that debt is bad — it's that untracked debt is dangerous.**

**Takeaway:** Shipping imperfect code on time while maintaining a clear record of what needs improvement is more professional than endlessly refactoring and never delivering.

---

## Summary Table

| # | Lesson | SE Concept |
|---|---|---|
| 1 | Requirements change — iterate | Agile, Iterative Development |
| 2 | Monoliths collapse — modularize | SOLID, SRP, Clean Architecture |
| 3 | Schema first, UI second | Database Design, Normalization |
| 4 | Never trust user input | Security Engineering, SQL Injection |
| 5 | Every tech choice has trade-offs | Architecture Decision Records |
| 6 | Test at the boundaries | BVA, Equivalence Partitioning |
| 7 | Git is a team survival tool | Version Control, CI/CD |
| 8 | Docs are deliverables, not chores | Software Documentation |
| 9 | UX is engineering, not decoration | Human-Computer Interaction |
| 10 | Track debt, don't ignore it | Technical Debt Management |

---

*Pharmax — Built by 6th Semester CS Students, Software Engineering Course 2026*
