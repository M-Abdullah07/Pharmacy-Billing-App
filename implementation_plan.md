# Unify Manufacturers into Companies (Suppliers)

The user's business model is a **pharmaceutical distributor**. In this context, the company they buy from IS the manufacturer. There's no need for a separate `manufacturers` table — the existing `suppliers` table (shown in the UI as "Companies") should serve double duty as both supplier and manufacturer.

## Proposed Changes

### Summary of What Changes

| Layer | What | Action |
|-------|------|--------|
| **Frontend** | `Manufacturer.jsx` | **Remove** — no longer needed |
| **Frontend** | `Products.jsx` | Swap manufacturer dropdown → suppliers (companies) dropdown |
| **Frontend** | `App.jsx` | Remove Manufacturers route/import |
| **Frontend** | `Sidebar.jsx` | Remove Manufacturers nav item |
| **Backend** | `main.js` | Update product queries to JOIN `suppliers` instead of `manufacturers` |
| **Backend** | `preload.js` | Remove manufacturer API exports (keep supplier ones) |
| **Database** | `products.manufacturer_id` | Now points to `suppliers.supplier_id` (FK change via migration) |
| **Cleanup** | Migration script | Delete after use |

---

### Frontend

#### [MODIFY] [Products.jsx](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Frontend/src/pages/Products.jsx)
- Replace `manufacturers` state with `suppliers` state (fetched via `getSuppliers()`)
- Change the product form dropdown from "Manufacturer" → "Company" using `supplier_id` values
- Update `noMfgWarning` message to say "Companies" instead of "Manufacturers"
- Update table header "Manufacturer" → "Company"
- Update stock view filter "All Manufacturers" → "All Companies"
- Update search placeholder text

#### [MODIFY] [App.jsx](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Frontend/src/App.jsx)
- Remove `import Manufacturers from "@/pages/Manufacturer"`
- Remove the `case "Manufacturers"` route

#### [MODIFY] [Sidebar.jsx](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Frontend/src/components/Sidebar.jsx)
- Remove `{ title: "Manufacturers", icon: Factory }` from navigation (it was in a previous version; confirm if still present — if not already removed from sidebar, remove it)

---

### Backend

#### [MODIFY] [main.js](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Backend/app/main.js)
- Update `get-products` and `getProducts` queries: `LEFT JOIN manufacturers m` → `LEFT JOIN suppliers m ON m.supplier_id = p.manufacturer_id`
- Update `get-stock-summary` query similarly
- Keep manufacturer IPC handlers temporarily for backward compat but they become dead code

#### [MODIFY] [preload.js](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Backend/app/preload.js)
- Remove manufacturer API methods (`getManufacturers`, `addManufacturer`, `updateManufacturer`, `deactivateManufacturer`, `reactivateManufacturer`)

---

### Database Migration

> [!IMPORTANT]
> The `products.manufacturer_id` column currently has a FK to `manufacturers(manufacturer_id)`. We need to:
> 1. Drop the old FK constraint
> 2. Add a new FK pointing to `suppliers(supplier_id)`
> 3. Any existing products with a `manufacturer_id` that doesn't exist in `suppliers` will need to be handled

> [!WARNING]
> **If you have existing products linked to manufacturers that don't exist as suppliers**, those FK links will break. Do you currently have any products in the system? If so, we'll need to either:
> - **(A)** Auto-create supplier records for each existing manufacturer, OR
> - **(B)** Manually re-assign products to the correct company after migration
>
> If the database is still in development/testing with little data, we can simply drop the old FK and add the new one.

---

### Cleanup

#### [DELETE] [Manufacturer.jsx](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Frontend/src/pages/Manufacturer.jsx)
- Entire file removed — functionality now lives in Companies page

#### [DELETE] [migrate_unified_companies.js](file:///c:/Users/Mumtaz/Pharmax/Pharmacy-Billing-App/Backend/app/migrate_unified_companies.js)
- Delete the migration script created earlier (not needed)

---

## Open Questions

> [!IMPORTANT]
> **Do you have existing product data in the database?** If products currently reference manufacturers that don't exist as suppliers/companies, we need to handle that mapping. If the DB is mostly empty or you're OK re-entering, a simple FK swap is fine.

## Verification Plan

### Manual Verification
1. Open Products page → "Add Product" → confirm the dropdown now shows Companies (not manufacturers)
2. Confirm Manufacturers nav item is gone from sidebar
3. Confirm existing product listing still shows company names correctly under the "Company" column
4. Confirm Stock View still works with company filter
