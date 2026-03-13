# Phase 1 - Quick Reference & Summary

## 🎯 What Was Created (Phase 1 Complete)

### ✅ Core Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `src/firebase/migration.js` | Data migration service | ✅ Ready |
| `src/firebase/firestore-multi-branch.js` | Multi-branch Firestore API | ✅ Ready |
| `src/store/authStore-multi-branch.js` | Auth store with branch context | ✅ Ready |
| `src/firebase/seedData.js` | Test data generator | ✅ Ready |
| `MULTI_BRANCH_PHASE1.md` | Architecture & design doc | ✅ Done |
| `PHASE1_IMPLEMENTATION_GUIDE.md` | Step-by-step implementation | ✅ Done |

---

## 🚀 Quick Start - How to Use Phase 1 Code

### 1. First-Time User Setup
```javascript
import { MigrationService } from '@/firebase/migration'
import useAuthStore from '@/store/authStore-multi-branch'

// After user logs in:
let context = await MigrationService.getUserBusinessAndBranch(userId)

if (!context) {
    // First time
    context = await MigrationService.createDefaultBusinessAndBranch(
        userId,
        "My Store",
        "Main Branch"
    )
    
    // Migrate old data
    await MigrationService.migrateExistingData(userId, context.businessId, context.branchId)
}

// Set in store
useAuthStore.setState({
    businessId: context.businessId,
    branchId: context.branchId
})
```

### 2. Using Firestore Functions
```javascript
import FirestoreService from '@/firebase/firestore-multi-branch'
import useAuthStore from '@/store/authStore-multi-branch'

// Get current context
const { businessId, branchId } = useAuthStore.getBusinessAndBranchIds()

// Shared collections (products, customers, etc.)
const products = await FirestoreService.getProducts(businessId)
const customers = await FirestoreService.getCustomers(businessId)

// Branch-specific (sales, inventory, etc.)
const sales = await FirestoreService.getSales(businessId, branchId)
const inventory = await FirestoreService.getInventory(businessId, branchId)

// New aggregation (Owner Dashboard)
const revenue = await FirestoreService.getBranchWiseRevenue(businessId)
```

### 3. Role-Based Permissions (Auth Store)
```javascript
const isOwner = useAuthStore((state) => state.isOwner())
const isManager = useAuthStore((state) => state.isManager())
const isCashier = useAuthStore((state) => state.isCashier())

const canAccess = useAuthStore((state) => state.canAccessBranch(branchId))
```

### 4. Switching Branches
```javascript
const switchBranch = useAuthStore((state) => state.switchBranch)

// User switches to different branch
switchBranch('branch-lahore', 'Lahore Branch')
```

---

## 📊 Database Structure (At a Glance)

### Old (Flat) → New (Hierarchical)
```
OLD:                          NEW:
/products/{id}                /businesses/{bId}/products/{id}
/sales/{id}                   /businesses/{bId}/branches/{brId}/sales/{id}
/customers/{id}               /businesses/{bId}/customers/{id}
/inventory/{id}               /businesses/{bId}/branches/{brId}/inventory/{id}
```

### Key Design Decisions
- ✅ **Shared:** Products, Customers, Suppliers, Categories (across all branches)
- ✅ **Branch-Specific:** Sales, Inventory, Cash Flow, Suspended Sales
- ✅ **Global Owner Dashboard:** Can see all branches combined
- ✅ **Manager Access:** Only their assigned branch
- ✅ **Cashier Access:** Only POS for their assigned branch

---

## 🔄 Migration Process (What Happens)

```
User Login
    ↓
Check if Already Migrated?
    ├─ YES → Load businessId + branchId → Done
    ├─ NO → Create default business → Create default branch → Migrate old data → Done
```

**Safety:** Old data left intact in old paths, new data in new paths

---

## 📋 Updated Function Signatures

```javascript
// BEFORE (Single Business)
getProducts(businessId)
getSales(businessId)

// AFTER (Multi-Branch)
getProducts(businessId)                              // Still same - shared!
getSales(businessId, branchId)                      // Now needs branch context
getInventory(businessId, branchId)                  // Branch-specific
getTotalSalesAcrossAllBranches(businessId)          // NEW - aggregate function
```

---

## 🧪 Testing Phase 1 Locally

### Option A: Populate with Test Data
```javascript
import FirestoreService from '@/firebase/firestore-multi-branch'
import { populateTestData } from '@/firebase/seedData'

const { businessId, branchId } = useAuthStore.getBusinessAndBranchIds()

// Generate test data
await populateTestData(businessId, userId, FirestoreService)

// Check Firestore console - should see new structure!
```

### Option B: Manual Testing
1. Create account → auto creates business + branch
2. Check Firestore console
3. Look for `/businesses/{id}/branches/{id}/` structure
4. Test switching branches (sidebar selector)

---

## ⚠️ Breaking Changes

### Old Import → New Import
```javascript
// OLD - STOP USING
import { getProducts, getSales } from '@/firebase/firestore'

// NEW - USE THIS
import FirestoreService from '@/firebase/firestore-multi-branch'
```

### Old Store → New Store
```javascript
// OLD
import useAuthStore from '@/store/authStore'

// NEW
import useAuthStore from '@/store/authStore-multi-branch'

// NEW: Need branch context
const { businessId, branchId } = useAuthStore.getBusinessAndBranchIds()
```

---

## 🎯 Files to Update Next (Phase 2)

High Priority (directly use firestore functions):
1. ✏️ `src/pages/pos/POS.jsx` - Most complex
2. ✏️ `src/pages/dashboard/Dashboard.jsx` - Dashboard needs branch selector
3. ✏️ `src/pages/accounts/CashFlow.jsx` - Branch-specific
4. ✏️ `src/pages/sales/Sales.jsx` - Branch-specific

Medium Priority:
5. ✏️ `src/pages/inventory/Inventory.jsx`
6. ✏️ `src/pages/products/Products.jsx`
7. ✏️ `src/pages/customers/Customers.jsx`

---

## 🔐 Security Rules Status

- 📋 **Rules Draft:** See `PHASE1_IMPLEMENTATION_GUIDE.md`
- ⏳ **Deployment:** After page updates (Phase 2/3)
- ⚠️ **Current:** Use development rules (permissive) for testing

---

## 📈 Performance Notes

- ✅ Structures indexes for common queries
- ✅ Batch writes for multiple operations
- ✅ Efficient permission checks (in auth store)
- ⏳ Pagination for large result sets (future)

---

## 🐛 Debugging Commands (Browser Console)

```javascript
// Check current auth context
import useAuthStore from '@/store/authStore-multi-branch'
const store = useAuthStore.getState()
console.log(store)

// Check if user is owner
console.log(store.isOwner())

// Get firestore functions
import FirestoreService from '@/firebase/firestore-multi-branch'
const sales = await FirestoreService.getSales(store.businessId, store.branchId)
console.log(sales)

// Generate migration report
import { MigrationService } from '@/firebase/migration'
const report = await MigrationService.generateMigrationReport(store.businessId)
console.log(report)
```

---

## ✅ Phase 1 Checklist

- [x] Database structure designed
- [x] Migration service created
- [x] Firestore API layer (multi-branch) built
- [x] Auth store updated
- [x] Test data generator ready
- [x] Documentation complete
- [x] Implementation guide written

---

## 📞 Troubleshooting

**Q: Migration not finding old data?**  
A: Check if collections exist in old paths. Migration looks for `/products`, `/sales`, etc.

**Q: Branch selector not appearing?**  
A: Need to add `<BranchSelector />` to Sidebar component manually

**Q: Getting "undefined" for branchId?**  
A: Use `useAuthStore.getBusinessAndBranchIds()` to get current context

**Q: Old Firestore functions not working?**  
A: You're using old store. Switch to `authStore-multi-branch.js` and new API functions

---

## 🎓 Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         Firebase / Firestore                │
├─────────────────────────────────────────────┤
│                                             │
│  /businesses/{businessId}/                  │
│  ├─ metadata (business info)                │
│  ├─ branches/{branchId}/                    │
│  │  ├─ sales/ (branch-specific) ↔ POS.jsx  │
│  │  ├─ inventory/ (branch-specific)         │
│  │  ├─ cash_flow/ (branch-specific)         │
│  │  └─ suspended_sales/                     │
│  │                                          │
│  ├─ products/ (shared)     ↔ Products.jsx   │
│  ├─ customers/ (shared)    ↔ Customers.jsx  │
│  ├─ suppliers/ (shared)                     │
│  └─ categories/ (shared)                    │
│                                             │
└─────────────────────────────────────────────┘
         ↑                           ↑
         │                           │
   useAuthStore              FirestoreService
   (Branch Context)          (API Layer)
         ↑                           ↑
         └───────────┬───────────────┘
                     │
            All Pages (React Components)
```

---

**Phase 1 Status:** ✅ Complete - Ready for Page Updates  
**Date:** March 13, 2026  
**Next:** Phase 2 - Update all pages to use new API
