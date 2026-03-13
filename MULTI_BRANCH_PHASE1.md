# Multi-Branch GPOS - Phase 1: Firestore Structure Redesign

## Current Structure (Single Business Model)

```
firestore/
├── products/{productId}
├── inventory/{inventoryId}
├── categories/{categoryId}
├── customers/{customerId}
├── sales/{saleId}
├── suspended_sales/{suspendedSaleId}
├── cash_flow/{transactionId}
└── suppliers/{supplierId}
```

---

## New Structure (Multi-Branch Model)

```
firestore/
├── businesses/{businessId}/
│   ├── metadata
│   │   ├── businessName
│   │   ├── owner_uid
│   │   ├── createdAt
│   │   └── settings/
│   │
│   ├── branches/{branchId}/
│   │   ├── metadata
│   │   │   ├── branchName
│   │   │   ├── location
│   │   │   ├── manager_uid
│   │   │   ├── settings/ (branch-specific)
│   │   │   │   ├── currency
│   │   │   │   ├── tax_rate
│   │   │   │   └── receipt_settings
│   │   │   └── createdAt
│   │   │
│   │   ├── sales/{saleId}
│   │   ├── inventory/{productId}
│   │   ├── suspended_sales/{suspendedSaleId}
│   │   └── cash_flow/{transactionId}
│   │
│   ├── customers/{customerId}  ← SHARED (shared loyalty points)
│   ├── categories/{categoryId}  ← SHARED (owner manages)
│   ├── suppliers/{supplierId}   ← SHARED (owner manages)
│   │
│   ├── products/{productId}     ← SHARED (owner pushes to branches)
│   │   ├── name
│   │   ├── sku
│   │   ├── basePrice
│   │   ├── description
│   │   └── branchPrices/{branchId} (optional overrides)
│   │
│   └── branch_stock_transfers/{transferId}  ← NEW (for inter-branch transfers)
│
└── business_users/{businessId}/
    ├── {userId}
    │   ├── uid
    │   ├── email
    │   ├── role (owner | manager | cashier)
    │   ├── assignedBranches: [...]
    │   └── permissions: [...]
```

---

## Collections Changes Summary

| Collection | Old Path | New Path | Notes |
|-----------|----------|----------|-------|
| products | `/products/{id}` | `/businesses/{bId}/products/{id}` | Shared, owner manages |
| inventory | `/inventory/{id}` | `/businesses/{bId}/branches/{brId}/inventory/{id}` | Branch-specific |
| categories | `/categories/{id}` | `/businesses/{bId}/categories/{id}` | Shared |
| customers | `/customers/{id}` | `/businesses/{bId}/customers/{id}` | Shared |
| suppliers | `/suppliers/{id}` | `/businesses/{bId}/suppliers/{id}` | Shared |
| sales | `/sales/{id}` | `/businesses/{bId}/branches/{brId}/sales/{id}` | Branch-specific |
| suspended_sales | `/suspended_sales/{id}` | `/businesses/{bId}/branches/{brId}/suspended_sales/{id}` | Branch-specific |
| cash_flow | `/cash_flow/{id}` | `/businesses/{bId}/branches/{brId}/cash_flow/{id}` | Branch-specific |
| **NEW** | - | `/businesses/{bId}/branch_stock_transfers/{id}` | Stock transfer log |
| **NEW** | - | `/business_users/{bId}/{userId}` | User role assignment |

---

## Migration Strategy

### Phase 1A: Data Migration Script
**Goal:** Move existing data from old structure to new structure without losing anything.

**Steps:**
1. Create "default business" from current user
2. Create "default branch" under that business
3. Move all documents to new paths
4. Preserve all data with timestamps

### Phase 1B: Firestore Service Layer Update
**Goal:** Update all Firestore helper functions to work with new structure.

**Key Changes:**
- Add `businessId` and `branchId` parameters to all functions
- Update `collection()` paths
- Update `query()` conditions

### Transition Plan:
1. **Backward compatibility:** A user's first login creates default business + default branch
2. **Grace period:** Old code still works if user has only 1 business + 1 branch
3. **Force migration:** After 2 weeks, UI requires branch selection

---

## Phase 1 Tasks

### Task 1: Create Migration Service
**File:** `src/firebase/migration.js`
- Function to migrate existing data to new structure
- Function to create default business + branch
- Rollback function (safety net)

### Task 2: Update Firestore Service
**File:** `src/firebase/firestore.js`
- Update all functions to accept `businessId` + `branchId`
- Create helper function to build collection paths
- Add functions for business/branch operations

### Task 3: Update Auth Store
**File:** `src/store/authStore.js`
- Store current `businessId` + `branchId` after login
- Add function to switch branches
- Store user's assigned branches

### Task 4: Add Business/Branch Selection UI
**Files:** `src/pages/auth/Login.jsx`, `src/components/layout/Sidebar.jsx`
- After login, show branch selector
- Add branch switcher in sidebar

### Task 5: Create Firebase Security Rules
**File:** `firebase.rules` (for deployment)
- Owner can access all branches
- Manager can access only assigned branch
- Customers/sales/inventory only via branch access

---

## Data Schema Examples

### Business Document
```javascript
/businesses/{businessId}/
{
  businessName: "TechPeer Store",
  owner_uid: "user123",
  createdAt: Timestamp,
  settings: {
    currency: "PKR",
    timezone: "Asia/Karachi"
  }
}
```

### Branch Document
```javascript
/businesses/{businessId}/branches/{branchId}/
{
  branchName: "Karachi Main",
  location: "Karachi, Pakistan",
  manager_uid: "user456",
  createdAt: Timestamp,
  settings: {
    currency: "PKR",
    tax_rate: 0.17,
    receipt_template: "detailed"
  }
}
```

### Product Document (Shared)
```javascript
/businesses/{businessId}/products/{productId}/
{
  name: "iPhone 15",
  sku: "APP-IP15-001",
  category_id: "cat123",
  basePrice: 150000,
  description: "Latest Apple iPhone",
  branchPrices: {
    "branch1": 145000,  // Optional override
    "branch2": 155000
  }
}
```

### Sale Document (Branch-Specific)
```javascript
/businesses/{businessId}/branches/{branchId}/sales/{saleId}/
{
  items: [...],
  total: 5000,
  discount: 500,
  tax: 850,
  finalAmount: 5350,
  customerId: "cust123",
  cashierId: "user789",
  paymentMethod: "cash",
  createdAt: Timestamp
}
```

---

## Rollout Timeline

| Time | Action |
|------|--------|
| Day 1 | Create migration service + update firestore.js |
| Day 2 | Update auth store + branch selector UI |
| Day 3 | Create security rules + test migration |
| Day 4 | Production migration (optional - can keep running both) |

---

## Success Criteria

✅ All existing data successfully migrated
✅ No data loss
✅ Old collection paths deprecated but data preserved
✅ Branch switcher works in UI
✅ Firebase rules enforce access control
✅ Owner dashboard can aggregate multiple branches
✅ All pages work with branch context

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Data loss during migration | Create backup before, test in staging |
| Query performance | Add indexes in Firestore |
| User confusion (old vs new structure) | Clear UI communication + gradual rollout |
| Security issues | Strict Firestore rules from day 1 |

---

## Next Steps

1. **Review this structure** — Kya changes chahiye?
2. **Approve migration strategy** — Safe enough?
3. **Start Task 1** — Create migration.js
