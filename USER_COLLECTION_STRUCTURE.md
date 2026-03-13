# User Collection Structure - CONFLICT RESOLUTION

## 🔴 The Problem: Dual User Collection Paths

**Date Identified:** March 13, 2026 | **Status:** ✅ RESOLVED

The codebase had conflicting user storage paths:

### Old Path (❌ DEPRECATED)
```
/users/{userId}
```
- Used by: App.jsx, Register.jsx, UserSettings.jsx, Employees.jsx
- Structure:
  ```javascript
  {
    uid: string,
    name: string,
    email: string,
    role: 'pending' | 'cashier' | 'manager' | 'admin',
    createdAt: timestamp
  }
  ```

### New Path (✅ CANONICAL)
```
/business_users/{businessId}/{userId}/profile
```
- Used by: Migration.js (newly added during Phase 1)
- Structure:
  ```javascript
  {
    uid: string,
    email: string,
    role: 'owner' | 'manager' | 'cashier',
    assignedBranches: [{branchId, branchName, role}, ...],
    permissions: [string],
    createdAt: timestamp
  }
  ```

---

## 🎯 Why This Was a Problem

1. **Data Duplication:** User data was being written to TWO collections
   - New registrations → `/users/{uid}`
   - Login → `/business_users/{businessId}/{uid}/profile`

2. **Query Inconsistency:** Different parts of the app queried different collections
   - Employees page always showed outdated `/users` collection
   - Login flow was creating new entries in `/business_users`

3. **Permission System Mismatch:** 
   - Old system: global roles (admin → owns all businesses)
   - New system: per-business roles (owner → owns specific business)

4. **Scale Issue:** Old `/users` collection had no business context
   - Can't scale to multi-tenant environments
   - No way to know which business a user belongs to

---

## ✅ Resolution: Unified Business-Scoped User Structure

### Changes Made

#### 1️⃣ **App.jsx** 
**Before:** Fetched user role from `/users/{uid}` on every app load
```javascript
const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
```

**After:** Role is managed during login and persisted in localStorage
```javascript
// User role/permissions are now managed during login
// and persisted in localStorage via authStore-multi-branch
setUser(currentUser)  // Just validate, don't fetch role
```

#### 2️⃣ **Register.jsx**
**Before:** Created user profile in `/users/{uid}`
```javascript
await setDoc(doc(db, 'users', user.uid), {
    name, email, role: 'pending', createdAt
})
```

**After:** User registration only creates Auth user
```javascript
// User profile will be created in business_users collection
// when the business owner assigns them to a branch
await updateProfile(user, { displayName: name })
// No Firestore write needed
```

#### 3️⃣ **UserSettings.jsx**
**Before:** Updated profile in `/users/{uid}`
```javascript
const userRef = doc(db, 'users', auth.currentUser.uid)
await updateDoc(userRef, { name: name })
```

**After:** Updates profile with business context
```javascript
const userRef = doc(db, 'business_users', businessId, uid, 'profile')
await updateDoc(userRef, { name: name })
```

#### 4️⃣ **Employees.jsx**
**Before:** Managed employees in `/users` collection (no business isolation)
```javascript
const snapshot = await getDocs(collection(db, 'users'))
await setDoc(doc(db, 'users', uid), { name, email, role })
```

**After:** Employees isolated per business
```javascript
// Read from business-specific collection
const collection(db, 'business_users', businessId)

// Write to business-specific profile
const doc(db, 'business_users', businessId, uid, 'profile')
```

---

## 🔄 New User Lifecycle

### 1. Registration (Self-Service)
```
User Signs Up
    ↓
Firebase Auth User Created
    ↓
Navigate to /pending
    (No Firestore entry yet)
```

### 2. Assignment (Owner Approves)
```
Owner → Employees Page → Approve/Assign
    ↓
Creates /business_users/{businessId}/{uid}/profile
    ↓
Sets role: 'manager' | 'cashier'
    ↓
Sets assignedBranches: [branchId1, branchId2, ...]
```

### 3. Login (First Time)
```
User Logs In
    ↓
Firebase Auth Succeeds
    ↓
Checks /business_users/{businessId}/{uid}/profile
    ↓
Loads role and branches
    ↓
Persists to localStorage (authStore-multi-branch)
```

### 4. Subsequent Logins
```
User Logs In
    ↓
Firebase Auth Succeeds
    ↓
authStore uses cached role/branches from localStorage
    ↓
(Optional) Sync with Firestore if needed
```

---

## 📊 Firestore Rules (Updated)

### Old Rules
```javascript
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

### New Rules
```javascript
match /business_users/{businessId}/{userId}/profile {
  // Owner can read/write their own business users
  allow read, write: if request.auth.uid == get(/databases/$(database)/documents/businesses/$(businessId)).data.owner_uid;
  
  // Employee can read/write their own profile
  allow read: if request.auth.uid == userId;
  allow update: if request.auth.uid == userId && 
                  !('role' in request.resource.data) && // Can't change own role
                  !('assignedBranches' in request.resource.data); // Can't reassign self
}
```

---

## ✅ Migration Checklist

- [x] App.jsx - Remove user role fetch on app load
- [x] Register.jsx - Stop creating `/users` entry
- [x] UserSettings.jsx - Update to use `/business_users/{businessId}/{uid}/profile`
- [x] Employees.jsx - Query and write to business-specific collection
- [x] authStore-multi-branch.js - Persist role to localStorage ✅ (already done)
- [x] Git commit - "fix: Consolidate user storage to business_users collection"
- [ ] **TODO:** Delete old `/users` collection from Firestore (manual cleanup)
- [ ] **TODO:** Update Firestore security rules (before production deployment)

---

## 🧪 Testing Checklist

After these changes:

1. **Registration Flow**
   - [ ] Register new user
   - [ ] Confirm NO entry in old `/users` collection
   - [ ] Confirm `/pending` page shows correctly

2. **Employee Assignment**
   - [ ] Login as owner
   - [ ] Employees → Approve pending user
   - [ ] Confirm entry created in `/business_users/{businessId}/{uid}/profile`
   - [ ] Confirm role is set to assigned role (manager/cashier)

3. **Login as Employee**
   - [ ] Login with newly assigned employee account
   - [ ] Confirm correct role in sidebar
   - [ ] Confirm menu items match role permissions
   - [ ] Confirm can access only assigned branches

4. **Profile Updates**
   - [ ] Login as any user
   - [ ] 👤 Profile (bottom of sidebar)
   - [ ] Update name
   - [ ] Confirm saved to `/business_users/{businessId}/{uid}/profile`

5. **Multi-Business**
   - [ ] Owner creates second branch
   - [ ] Assign same employee to both branches
   - [ ] Confirm `assignedBranches` array shows both
   - [ ] Employee can switch branches in sidebar

---

## 📝 Code References

Key files affected:
- `src/App.jsx` - Auth sync logic
- `src/pages/auth/Register.jsx` - Registration flow
- `src/pages/auth/UserSettings.jsx` - Profile settings
- `src/pages/employees/Employees.jsx` - Employee management
- `src/firebase/migration.js` - Initial setup ✅ Already correct
- `src/store/authStore-multi-branch.js` - State management ✅ Already correct

---

## 🚀 Next Steps

1. **Manual Cleanup** (when ready for production):
   - Backup old `/users` collection data (if any)
   - Delete `/users` collection from Firestore
   - Monitor for any orphaned references

2. **Firestore Rules** (before production):
   - Update security rules in Firebase Console
   - Test rules with different user roles
   - Deploy to production

3. **Documentation Updates**:
   - Update FIREBASE_DEPLOYMENT_GUIDE.md rules section
   - Update architect documentation
   - Record this resolution in project history

---

**Last Updated:** March 13, 2026
**Commit:** 85ca62f - "fix: Consolidate user storage to business_users collection"
