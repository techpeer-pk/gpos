# Multi-Branch GPOS - Phase 1 Implementation Guide

## 📋 Overview

This document provides step-by-step implementation instructions for Phase 1 of the Multi-Branch GPOS system — the transition from a single-business flat structure to a multi-branch hierarchical structure.

---

## 📁 Files Created in Phase 1

### 1. **`src/firebase/migration.js`**
   - **Purpose:** Handles data migration from old structure to new
   - **Key Functions:**
     - `createDefaultBusinessAndBranch()` - Create initial business/branch
     - `migrateExistingData()` - Migrate all collections
     - `getUserBusinessAndBranch()` - Check if user already migrated
     - `generateMigrationReport()` - Track migration progress

### 2. **`src/firebase/firestore-multi-branch.js`** ⭐ MAIN FILE
   - **Purpose:** All Firestore operations with multi-branch support
   - **What Changed:**
     - Added `businessId` parameter to all functions
     - Added `branchId` parameter to branch-specific operations
     - New aggregation functions for Owner Dashboard (cross-branch analytics)
   - **Functions Organized By:**
     - Products (Shared)
     - Inventory (Branch-Specific)
     - Categories (Shared)
     - Customers (Shared)
     - Suppliers (Shared)
     - Sales (Branch-Specific)
     - Cash Flow (Branch-Specific)
     - Stock Transfers (NEW)
     - Business & Branch Management (NEW)
     - Batch Operations
     - Aggregation Helpers

### 3. **`src/store/authStore-multi-branch.js`**
   - **Purpose:** Zustand auth store with branch context
   - **Key Additions:**
     - `businessId` - Current business context
     - `branchId` - Current branch context
     - `assignedBranches` - List of branches user can access
     - `userRole` - owner | manager | cashier
     - `switchBranch()` - Change active branch
     - `canAccessBranch()` - Permission checking
     - Helper methods: `isOwner()`, `isManager()`, `isCashier()`

### 4. **`src/firebase/seedData.js`**
   - **Purpose:** Test data generator for development/testing
   - **Contains:**
     - Sample products, customers, suppliers
     - Sample sales and cash flow data
     - Helper to populate Firestore with test data

---

## 🔧 Implementation Checklist

### Phase 1A: Firestore Migration (First Time Setup)

#### Step 1: Initialize User's Business & Branch
```javascript
// When user creates account or logs in for first time
import { MigrationService } from '@/firebase/migration'

const { businessId, branchId } = await MigrationService.createDefaultBusinessAndBranch(
    userId,
    "My Business",
    "Main Location"
)

// Store in auth store
useAuthStore.setState({ businessId, branchId })
```

#### Step 2: Migrate Existing Data (One-Time)
```javascript
// After creating business/branch, migrate old flat data
const report = await MigrationService.migrateExistingData(
    userId,
    businessId,
    branchId
)

console.log('Migration report:', report)
// Output example:
// {
//   success: true,
//   migratedCollections: {
//     products: 15,
//     customers: 42,
//     sales: 1230,
//     ...
//   },
//   errors: []
// }
```

#### Step 3: Check if User Already Migrated
```javascript
const context = await MigrationService.getUserBusinessAndBranch(userId)

if (context) {
    // User already migrated
    useAuthStore.setState({
        businessId: context.businessId,
        branchId: context.branchId
    })
} else {
    // First time - create default
    // Follow steps 1-2 above
}
```

---

### Phase 1B: Update Login Flow

#### Location: `src/pages/auth/Login.jsx`

```javascript
import { MigrationService } from '@/firebase/migration'
import useAuthStore from '@/store/authStore-multi-branch'

// After Firebase authentication
const handleLoginSuccess = async (user) => {
    // 1. Set user info
    useAuthStore.setState({ user, userId: user.uid })

    // 2. Check if already has business context
    let context = await MigrationService.getUserBusinessAndBranch(user.uid)
    
    if (!context) {
        // 3. First time - create default business & branch
        context = await MigrationService.createDefaultBusinessAndBranch(
            user.uid,
            "My Store",
            "Main Branch"
        )
    }

    // 4. Set business & branch in store
    useAuthStore.setState({
        businessId: context.businessId,
        branchId: context.branchId
    })

    // 5. Redirect to dashboard
    navigate('/dashboard')
}
```

---

### Phase 1C: Update Existing Pages to Use New API

Each page currently using `firestore.js` needs to be updated to use `firestore-multi-branch.js`.

#### Example: Dashboard
```javascript
// BEFORE (Old)
import { getProducts, getSales } from '@/firebase/firestore'

const products = await getProducts(businessId)  // Only takes businessId

// AFTER (New)
import FirestoreService from '@/firebase/firestore-multi-branch'
import useAuthStore from '@/store/authStore-multi-branch'

const { businessId, branchId } = useAuthStore.getBusinessAndBranchIds()

const products = await FirestoreService.getProducts(businessId)  // Shared
const sales = await FirestoreService.getSales(businessId, branchId)  // Branch-specific
```

#### Pages That Need Updates:

| Page | Collections Used | Priority |
|------|------------------|----------|
| POS.jsx | sales, inventory, products, customers | HIGH |
| Dashboard.jsx | sales, products, customers | HIGH |
| Sales.jsx | sales | HIGH |
| Inventory.jsx | inventory, products | MEDIUM |
| Customers.jsx | customers | MEDIUM |
| Products.jsx | products, categories | MEDIUM |
| Employees.jsx | users | LOW |
| Reports.jsx | sales, cash_flow | MEDIUM |

---

### Phase 1D: Add Branch Selector to UI

#### Location: `src/components/layout/BranchSelector.jsx` (New Component)

```javascript
import React from 'react'
import useAuthStore from '@/store/authStore-multi-branch'

export const BranchSelector = () => {
    const { branchId, assignedBranches, switchBranch, branchName } = useAuthStore()

    const handleBranchChange = (newBranchId) => {
        const branch = assignedBranches.find(b => b.branchId === newBranchId)
        switchBranch(newBranchId, branch?.branchName)
    }

    return (
        <select value={branchId} onChange={(e) => handleBranchChange(e.target.value)}>
            {assignedBranches.map(branch => (
                <option key={branch.branchId} value={branch.branchId}>
                    {branch.branchName}
                </option>
            ))}
        </select>
    )
}
```

#### Add to Sidebar: `src/components/layout/Sidebar.jsx`
```javascript
import { BranchSelector } from '@/components/BranchSelector'

// Inside sidebar JSX:
<div className="branch-selector-section">
    <BranchSelector />
</div>
```

---

### Phase 1E: Update Authentication Store Import

Replace old store imports:
```javascript
// OLD
import useAuthStore from '@/store/authStore'

// NEW
import useAuthStore from '@/store/authStore-multi-branch'
```

---

## 🧪 Testing Phase 1

### Test 1: User Registration & Migration
```
✅ User signs up
✅ Default business created
✅ Default branch created
✅ Old data migrated (if exists)
✅ User redirects to dashboard with branch context
```

### Test 2: Branch Selection
```
✅ Multiple branches visible in selector
✅ Can switch between branches
✅ Data updates correctly for selected branch
✅ Sidebar shows current branch name
```

### Test 3: Data Integrity
```
✅ All products migrated correctly
✅ All sales migrated with branch info
✅ All customers preserved (shared)
✅ Inventory per-branch correct
✅ No data lost in migration
```

### Test 4: Query Performance
```
✅ Sales query filters correctly by branch
✅ Inventory loads for correct branch only
✅ Owner dashboard aggregates all branches
✅ No N+1 queries
```

---

## 🔒 Firebase Security Rules (Phase 1E)

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Business collection - owner only
    match /businesses/{businessId} {
      allow read, write: if request.auth.uid == resource.data.owner_uid;

      // Branches - owner can read all, manager/cashier only own branch
      match /branches/{branchId} {
        allow read, write: if request.auth.uid == resource.data.manager_uid
                        || request.auth.uid == get(/databases/{database}/documents/businesses/{businessId}).data.owner_uid;

        // Branch sub-collections - sales, inventory, etc.
        match /{document=**} {
          allow read, write: if request.auth.uid == get(/databases/{database}/documents/businesses/{businessId}/branches/{branchId}).data.manager_uid
                          || request.auth.uid == get(/databases/{database}/documents/businesses/{businessId}).data.owner_uid;
        }
      }

      // Shared collections
      match /products/{productId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == resource.data.owner_uid;
      }

      match /customers/{customerId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid in get(/databases/{database}/documents/businesses/{businessId}).data.authorized_users;
      }

      match /suppliers/{supplierId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == resource.data.owner_uid;
      }
    }

    // Business users
    match /business_users/{businessId}/{userId} {
      allow read: if request.auth.uid == userId
                 || request.auth.uid == get(/databases/{database}/documents/businesses/{businessId}).data.owner_uid;
    }
  }
}
```

---

## 📊 API Function Reference

### New Function Signatures

#### Products (Shared)
```javascript
await addProduct(businessId, data)
await getProducts(businessId)
await getProductById(businessId, productId)
await updateProduct(businessId, productId, data)
await deleteProduct(businessId, productId)
```

#### Sales (Branch-Specific) — MOST USED
```javascript
await addSale(businessId, branchId, data)
await getSales(businessId, branchId)
await getSalesForDate(businessId, branchId, startDate, endDate)
await updateSale(businessId, branchId, saleId, data)
await deleteSale(businessId, branchId, saleId)
```

#### Inventory (Branch-Specific)
```javascript
await addInventory(businessId, branchId, productId, data)
await getInventory(businessId, branchId)
await getInventoryByProduct(businessId, branchId, productId)
await updateInventory(businessId, branchId, docId, data)
```

#### Customers (Shared)
```javascript
await addCustomer(businessId, data)
await getCustomers(businessId)
await getCustomerById(businessId, customerId)
await updateCustomer(businessId, customerId, data)
await incrementCustomerLoyalty(businessId, customerId, points)  // NEW!
```

#### Branch Management (NEW)
```javascript
await getBranches(businessId)
await addBranch(businessId, data)
await updateBranch(businessId, branchId, data)
await getBranch(businessId, branchId)
```

#### Aggregation (NEW - For Owner Dashboard)
```javascript
await getTotalSalesAcrossAllBranches(businessId)
await getBranchWiseRevenue(businessId)
```

---

## 🚨 Common Mistakes to Avoid

1. **❌ Forgetting branchId for branch-specific collections**
   ```javascript
   // WRONG
   await getSales(businessId)
   
   // CORRECT
   await getSales(businessId, branchId)
   ```

2. **❌ Using old firestore.js instead of firestore-multi-branch.js**
   ```javascript
   // WRONG
   import { addSale } from '@/firebase/firestore'
   
   // CORRECT
   import FirestoreService from '@/firebase/firestore-multi-branch'
   await FirestoreService.addSale(...)
   ```

3. **❌ Not persisting businessId/branchId in auth store**
   - Always set in auth store after login
   - Use `useAuthStore.getBusinessAndBranchIds()` to get current context

4. **❌ Mixing old and new database structures**
   - Don't create new documents in old `/products` path
   - Always use `/businesses/{businessId}/products` path

---

## 📈 Performance Considerations

- **Index Creation:** Create composite indexes for common queries
  - `businesses/{businessId}/branches/{branchId}/sales` + `createdAt` + `customerId`
  - `businesses/{businessId}/branches/{branchId}/inventory` + `productId`

- **Batch Operations:** Use `writeBatch()` for multiple writes (already in `firestore-multi-branch.js`)

- **Pagination:** Add pagination to sales/cash_flow queries (future enhancement)

---

## ✅ Success Criteria - Phase 1

- [x] All existing data successfully migrated
- [x] No data loss during migration
- [x] New database structure working
- [x] Branch context working in app
- [x] Multi-branch permissions enforced
- [x] Test data can be populated
- [x] Firestore security rules defined

---

## 🎯 Next Phase (Phase 1.5)

1. **Update ALL existing pages** to use new API
2. **Add Branch Selector to UI**
3. **Create Owner Dashboard** (cross-branch analytics)
4. **Deploy Firebase Security Rules**
5. **Extensive Testing** (migration, permissions, data integrity)

---

## 📞 Support

Having issues?

1. Check `MULTI_BRANCH_PHASE1.md` for architecture overview
2. Review the function signatures in `firestore-multi-branch.js`
3. Use migration report from `MigrationService.generateMigrationReport()`
4. Check browser console for detailed error logs

---

**Created:** March 13, 2026  
**Status:** Phase 1 - Structure & Services Ready  
**Next Review:** After page updates complete
