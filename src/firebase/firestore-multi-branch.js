import { db } from './config'
import {
    collection,
    collectionGroup,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    arrayUnion,
    increment,
    query,
    where,
    serverTimestamp,
    writeBatch,
    limit,
    orderBy
} from 'firebase/firestore'

/**
 * Helper function to build collection paths for multi-branch structure
 */
const getCollectionPath = (businessId, branchId, collectionName) => {
    const branchSpecific = ['sales', 'inventory', 'suspended_sales', 'cash_flow']

    if (branchSpecific.includes(collectionName)) {
        return `businesses/${businessId}/branches/${branchId}/${collectionName}`
    }

    // Shared collections
    return `businesses/${businessId}/${collectionName}`
}

// ============================================
// PRODUCTS (Shared across branches)
// ============================================

export const addProduct = (businessId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/products`), {
        ...data,
        createdAt: serverTimestamp()
    })
}

export const getProducts = (businessId) => {
    return getDocs(collection(db, `businesses/${businessId}/products`))
}

export const getProductById = (businessId, productId) => {
    return getDoc(doc(db, `businesses/${businessId}/products/${productId}`))
}

export const updateProduct = (businessId, productId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/products/${productId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deleteProduct = (businessId, productId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/products/${productId}`))
}

// ============================================
// INVENTORY (Branch-Specific)
// ============================================

export const addInventory = (businessId, branchId, productId, data) => {
    const docId = `${productId}_inv`
    return setDoc(doc(db, `businesses/${businessId}/branches/${branchId}/inventory/${docId}`), {
        ...data,
        productId,
        createdAt: serverTimestamp()
    })
}

export const getInventory = (businessId, branchId) => {
    return getDocs(collection(db, `businesses/${businessId}/branches/${branchId}/inventory`))
}

export const getInventoryByProduct = (businessId, branchId, productId) => {
    const q = query(
        collection(db, `businesses/${businessId}/branches/${branchId}/inventory`),
        where('productId', '==', productId),
        limit(1)
    )
    return getDocs(q)
}

export const updateInventory = (businessId, branchId, docId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/inventory/${docId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const decrementInventory = (businessId, branchId, docId, quantity) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/inventory/${docId}`), {
        quantity: increment(-quantity),
        updatedAt: serverTimestamp()
    })
}

// ============================================
// CATEGORIES (Shared)
// ============================================

export const addCategory = (businessId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/categories`), {
        ...data,
        createdAt: serverTimestamp()
    })
}

export const getCategories = (businessId) => {
    return getDocs(collection(db, `businesses/${businessId}/categories`))
}

export const updateCategory = (businessId, categoryId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/categories/${categoryId}`), data)
}

export const deleteCategory = (businessId, categoryId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/categories/${categoryId}`))
}

// ============================================
// CUSTOMERS (Shared - Loyalty points across all branches)
// ============================================

export const addCustomer = (businessId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/customers`), {
        ...data,
        loyaltyPoints: 0,
        createdAt: serverTimestamp()
    })
}

export const getCustomers = (businessId) => {
    return getDocs(collection(db, `businesses/${businessId}/customers`))
}

export const getCustomerById = (businessId, customerId) => {
    return getDoc(doc(db, `businesses/${businessId}/customers/${customerId}`))
}

export const updateCustomer = (businessId, customerId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/customers/${customerId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const incrementCustomerLoyalty = (businessId, customerId, points) => {
    return updateDoc(doc(db, `businesses/${businessId}/customers/${customerId}`), {
        loyaltyPoints: increment(points)
    })
}

export const deleteCustomer = (businessId, customerId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/customers/${customerId}`))
}

// ============================================
// SUPPLIERS (Shared)
// ============================================

export const addSupplier = (businessId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/suppliers`), {
        ...data,
        createdAt: serverTimestamp()
    })
}

export const getSuppliers = (businessId) => {
    return getDocs(collection(db, `businesses/${businessId}/suppliers`))
}

export const updateSupplier = (businessId, supplierId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/suppliers/${supplierId}`), data)
}

export const deleteSupplier = (businessId, supplierId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/suppliers/${supplierId}`))
}

// ============================================
// SALES (Branch-Specific)
// ============================================

export const addSale = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/sales`), {
        ...data,
        branchId,
        createdAt: serverTimestamp()
    })
}

export const getSales = (businessId, branchId) => {
    return getDocs(
        query(
            collection(db, `businesses/${businessId}/branches/${branchId}/sales`),
            orderBy('createdAt', 'desc')
        )
    )
}

export const getSale = (businessId, branchId, saleId) => {
    return getDoc(doc(db, `businesses/${businessId}/branches/${branchId}/sales/${saleId}`))
}

export const getSalesForDate = (businessId, branchId, startDate, endDate) => {
    const q = query(
        collection(db, `businesses/${businessId}/branches/${branchId}/sales`),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
    )
    return getDocs(q)
}

export const updateSale = (businessId, branchId, saleId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/sales/${saleId}`), data)
}

export const deleteSale = (businessId, branchId, saleId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/sales/${saleId}`))
}

// ============================================
// SUSPENDED SALES (Branch-Specific)
// ============================================

export const addSuspendedSale = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/suspended_sales`), {
        ...data,
        branchId,
        createdAt: serverTimestamp()
    })
}

export const getSuspendedSales = (businessId, branchId) => {
    return getDocs(collection(db, `businesses/${businessId}/branches/${branchId}/suspended_sales`))
}

export const getSuspendedSaleById = (businessId, branchId, saleId) => {
    return getDoc(doc(db, `businesses/${businessId}/branches/${branchId}/suspended_sales/${saleId}`))
}

export const updateSuspendedSale = (businessId, branchId, saleId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/suspended_sales/${saleId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deleteSuspendedSale = (businessId, branchId, saleId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/suspended_sales/${saleId}`))
}

// ============================================
// CASH FLOW (Branch-Specific)
// ============================================

export const addCashFlow = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/cash_flow`), {
        ...data,
        branchId,
        createdAt: serverTimestamp()
    })
}

export const getCashFlow = (businessId, branchId) => {
    return getDocs(
        query(
            collection(db, `businesses/${businessId}/branches/${branchId}/cash_flow`),
            orderBy('createdAt', 'desc')
        )
    )
}

export const getCashFlowForDate = (businessId, branchId, startDate, endDate) => {
    const q = query(
        collection(db, `businesses/${businessId}/branches/${branchId}/cash_flow`),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
    )
    return getDocs(q)
}

export const updateCashFlow = (businessId, branchId, cashFlowId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/cash_flow/${cashFlowId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deleteCashFlow = (businessId, branchId, cashFlowId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/cash_flow/${cashFlowId}`))
}

// ============================================
// REGISTER RECONCILIATION (Branch-Specific)
// ============================================

export const addReconciliation = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/reconciliations`), {
        ...data,
        branchId,
        createdAt: serverTimestamp()
    })
}

export const getReconciliations = (businessId, branchId) => {
    return getDocs(
        query(
            collection(db, `businesses/${businessId}/branches/${branchId}/reconciliations`),
            orderBy('createdAt', 'desc')
        )
    )
}

// ============================================
// BRANCH STOCK TRANSFERS (New Feature)
// ============================================

export const createStockTransfer = (businessId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branch_stock_transfers`), {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp()
    })
}

export const getStockTransfers = (businessId) => {
    return getDocs(
        query(
            collection(db, `businesses/${businessId}/branch_stock_transfers`),
            orderBy('createdAt', 'desc')
        )
    )
}

export const updateStockTransfer = (businessId, transferId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branch_stock_transfers/${transferId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

// ============================================
// PURCHASE ORDERS (Branch-Specific)
// ============================================

export const addPurchaseOrder = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/purchase_orders`), {
        ...data,
        branchId,
        createdAt: serverTimestamp()
    })
}

export const getPurchaseOrders = (businessId, branchId) => {
    return getDocs(
        query(
            collection(db, `businesses/${businessId}/branches/${branchId}/purchase_orders`),
            orderBy('createdAt', 'desc')
        )
    )
}

export const updatePurchaseOrder = (businessId, branchId, poId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/purchase_orders/${poId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deletePurchaseOrder = (businessId, branchId, poId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/purchase_orders/${poId}`))
}

export const getPurchaseOrderById = (businessId, branchId, poId) => {
    return getDoc(doc(db, `businesses/${businessId}/branches/${branchId}/purchase_orders/${poId}`))
}

// ============================================
// EXPENSES (Branch-Specific)
// ============================================

export const addExpense = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/expenses`), {
        ...data,
        branchId,
        createdAt: serverTimestamp()
    })
}

export const getExpenses = (businessId, branchId) => {
    return getDocs(
        query(
            collection(db, `businesses/${businessId}/branches/${branchId}/expenses`),
            orderBy('date', 'desc')
        )
    )
}

export const updateExpense = (businessId, branchId, expenseId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/expenses/${expenseId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deleteExpense = (businessId, branchId, expenseId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/expenses/${expenseId}`))
}

// ============================================
// BUSINESS & BRANCH MANAGEMENT
// ============================================

export const getBusiness = (businessId) => {
    return getDoc(doc(db, `businesses/${businessId}`))
}

export const updateBusiness = (businessId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const getBranches = (businessId) => {
    return getDocs(collection(db, `businesses/${businessId}/branches`))
}

export const addBranch = (businessId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches`), {
        ...data,
        createdAt: serverTimestamp()
    })
}

export const updateBranch = (businessId, branchId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const getBranch = (businessId, branchId) => {
    return getDoc(doc(db, `businesses/${businessId}/branches/${branchId}`))
}

export const deleteBranch = (businessId, branchId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}`))
}

// ============================================
// BATCH OPERATIONS
// ============================================

export const batchAddInventoryItems = (businessId, branchId, items) => {
    const batch = writeBatch(db)

    items.forEach((item) => {
        const docId = `${item.productId}_inv`
        batch.set(doc(db, `businesses/${businessId}/branches/${branchId}/inventory/${docId}`), {
            ...item,
            productId: item.productId,
            createdAt: serverTimestamp()
        })
    })

    return batch.commit()
}

export const batchUpdateSalesWithCashFlow = (businessId, branchId, saleData, cashFlowData) => {
    const batch = writeBatch(db)

    // Add sale
    batch.set(
        doc(db, `businesses/${businessId}/branches/${branchId}/sales`, saleData.id),
        saleData
    )

    // Add cash flow
    batch.set(
        doc(db, `businesses/${businessId}/branches/${branchId}/cash_flow`, cashFlowData.id),
        cashFlowData
    )

    return batch.commit()
}

// ============================================
// AGGREGATION HELPERS (for Owner Dashboard)
// ============================================

/**
 * Get total sales across all branches
 */
export const getTotalSalesAcrossAllBranches = async (businessId) => {
    try {
        const branchesSnap = await getDocs(collection(db, `businesses/${businessId}/branches`))
        let totalSales = 0
        let totalAmount = 0

        for (const branchDoc of branchesSnap.docs) {
            const salesSnap = await getDocs(
                collection(db, `businesses/${businessId}/branches/${branchDoc.id}/sales`)
            )
            totalSales += salesSnap.size
            salesSnap.forEach((saleDoc) => {
                totalAmount += (saleDoc.data().finalAmount || 0)
            })
        }

        return { totalSales, totalAmount }
    } catch (error) {
        console.error('Error getting total sales:', error)
        throw error
    }
}

/**
 * Get branch-wise sales summary
 */
export const getBranchWiseRevenue = async (businessId) => {
    try {
        const branchesSnap = await getDocs(collection(db, `businesses/${businessId}/branches`))
        const branchRevenue = []

        for (const branchDoc of branchesSnap.docs) {
            const branchData = branchDoc.data()
            const salesSnap = await getDocs(
                collection(db, `businesses/${businessId}/branches/${branchDoc.id}/sales`)
            )

            let revenue = 0
            salesSnap.forEach((saleDoc) => {
                revenue += (saleDoc.data().finalAmount || 0)
            })

            branchRevenue.push({
                branchId: branchDoc.id,
                branchName: branchData.branchName,
                totalSales: salesSnap.size,
                totalRevenue: revenue
            })
        }

        return branchRevenue
    } catch (error) {
        console.error('Error getting branch revenue:', error)
        throw error
    }
}

// ============================================
// SESSION & INITIALIZATION (Refactored from Migration)
// ============================================

/**
 * Initialize a new business and its first branch
 * Used during registration
 */
export const initializeBusiness = async (userId, businessName = "Main Business", branchName = "Main Branch") => {
    try {
        const businessId = `business_${Date.now()}`
        const branchId = `branch_${Date.now()}`

        // Create business document
        await setDoc(doc(db, 'businesses', businessId), {
            businessName,
            owner_uid: userId,
            createdAt: serverTimestamp(),
            settings: {
                currency: 'PKR',
                timezone: 'Asia/Karachi',
                language: 'ur'
            }
        })

        // Create branch document
        await setDoc(doc(db, 'businesses', businessId, 'branches', branchId), {
            branchName,
            location: '',
            manager_uid: userId,
            createdAt: serverTimestamp(),
            settings: {
                currency: 'PKR',
                tax_rate: 0.17,
                receipt_template: 'detailed',
                receipt_header: businessName,
                receipt_footer: branchName
            }
        })

        // Create user assignment document (Local Business Profile)
        await setDoc(doc(db, 'business_users', businessId, userId, 'profile'), {
            uid: userId,
            businessId,
            email: '',
            role: 'owner',
            assignedBranches: [branchId],
            permissions: ['all'],
            createdAt: serverTimestamp()
        })

        // Create global user mapping (Master Record)
        await setDoc(doc(db, 'users', userId), {
            uid: userId,
            businessId,
            role: 'owner',
            updatedAt: serverTimestamp()
        })

        return { businessId, branchId, branchName }
    } catch (error) {
        console.error('❌ Error initializing business:', error)
        throw error
    }
}

/**
 * Get the full business and branch context for a user session
 * Used during login and app hydration
 */
export const getUserSessionContext = async (userId) => {
    try {
        let businessId = null
        let userRole = null

        // 1. Check global users collection for mapping
        const userMapping = await getDoc(doc(db, 'users', userId))
        if (userMapping.exists()) {
            businessId = userMapping.data().businessId
            userRole = userMapping.data().role
        }

        // 2. Fallback: Search businesses for owner
        if (!businessId) {
            const q = query(
                collection(db, 'businesses'),
                where('owner_uid', '==', userId)
            )
            const querySnap = await getDocs(q)
            if (!querySnap.empty) {
                businessId = querySnap.docs[0].id
                userRole = 'owner'
            }
        }

        // 3. Fallback for Cashiers/Managers: Search profile collectionGroup
        if (!businessId) {
            const profileQuery = query(
                collectionGroup(db, 'profile'),
                where('uid', '==', userId)
            )
            const profileSnap = await getDocs(profileQuery)
            if (!profileSnap.empty) {
                const profileData = profileSnap.docs[0].data()
                businessId = profileData.businessId
                userRole = profileData.role
            }
        }

        if (!businessId) return null

        // Get business data
        const businessDoc = await getDoc(doc(db, 'businesses', businessId))
        if (!businessDoc.exists()) return null

        // 4. Get User Profile and apply OWNER SAFETY NET
        const profileSnap = await getDoc(doc(db, 'business_users', businessId, userId, 'profile'))

        // CRITICAL: Ensure primary owner always has 'owner' role
        const isPrimaryOwner = businessDoc.data().owner_uid === userId
        if (isPrimaryOwner) {
            userRole = 'owner'
        } else if (profileSnap.exists()) {
            userRole = profileSnap.data().role
        }

        // Get all branches for this business
        const branchesSnap = await getDocs(
            collection(db, 'businesses', businessId, 'branches')
        )

        if (branchesSnap.empty) {
            return { businessId, branchId: null, branchName: null, branches: [], role: userRole }
        }

        // Aggregate accessible branches
        let branches = branchesSnap.docs.map(d => ({
            branchId: d.id,
            branchName: d.data().branchName,
            role: userRole
        }))

        // For cashiers, filter to only assigned branches
        if (userRole === 'cashier' || userRole === 'manager' && profileSnap.exists()) {
            const assignedBranches = profileSnap.data().assignedBranches || []
            if (assignedBranches.length > 0) {
                branches = branches.filter(b => assignedBranches.includes(b.branchId))
            }
        }

        const defaultBranch = branches[0] || { branchId: branchesSnap.docs[0].id, branchName: branchesSnap.docs[0].data().branchName }

        return {
            businessId,
            branchId: defaultBranch.branchId,
            branchName: defaultBranch.branchName,
            branches,
            role: userRole
        }
    } catch (error) {
        console.error('❌ Error getting session context:', error)
        return null
    }
}

/**
 * Store FCM token for a specific user
 */
export const saveUserFcmToken = async (businessId, userId, token) => {
    try {
        const userProfileRef = doc(db, 'business_users', businessId, userId, 'profile');
        await updateDoc(userProfileRef, {
            fcmTokens: arrayUnion(token),
            lastTokenUpdate: serverTimestamp()
        });
    } catch (error) {
        console.error('❌ Error saving FCM token:', error);
    }
}

// ============================================
// TABLES (Branch-Specific)
// ============================================

export const addTable = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/tables`), {
        ...data,
        status: 'empty',
        createdAt: serverTimestamp()
    })
}

export const getTables = (businessId, branchId) => {
    return getDocs(query(
        collection(db, `businesses/${businessId}/branches/${branchId}/tables`),
        orderBy('number', 'asc')
    ))
}

export const updateTable = (businessId, branchId, tableId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/tables/${tableId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deleteTable = (businessId, branchId, tableId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/tables/${tableId}`))
}

// ============================================
// TABLE ORDERS (Branch-Specific)
// ============================================

export const addTableOrder = (businessId, branchId, data) => {
    return addDoc(collection(db, `businesses/${businessId}/branches/${branchId}/table_orders`), {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp()
    })
}

export const getTableOrders = (businessId, branchId) => {
    return getDocs(query(
        collection(db, `businesses/${businessId}/branches/${branchId}/table_orders`),
        where('status', 'in', ['pending', 'preparing', 'served']),
        orderBy('createdAt', 'desc')
    ))
}

export const getTableOrdersByTable = (businessId, branchId, tableId) => {
    return getDocs(query(
        collection(db, `businesses/${businessId}/branches/${branchId}/table_orders`),
        where('tableId', '==', tableId),
        where('status', 'in', ['pending', 'preparing', 'served'])
    ))
}

export const updateTableOrder = (businessId, branchId, orderId, data) => {
    return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}/table_orders/${orderId}`), {
        ...data,
        updatedAt: serverTimestamp()
    })
}

export const deleteTableOrder = (businessId, branchId, orderId) => {
    return deleteDoc(doc(db, `businesses/${businessId}/branches/${branchId}/table_orders/${orderId}`))
}

export default {
    // Products
    addProduct, getProducts, getProductById, updateProduct, deleteProduct,
    // Inventory
    addInventory, getInventory, getInventoryByProduct, updateInventory, decrementInventory,
    // Categories
    addCategory, getCategories, updateCategory, deleteCategory,
    // Customers
    addCustomer, getCustomers, getCustomerById, updateCustomer, incrementCustomerLoyalty, deleteCustomer,
    // Suppliers
    addSupplier, getSuppliers, updateSupplier, deleteSupplier,
    // Sales
    addSale, getSales, getSale, getSalesForDate, updateSale, deleteSale,
    // Suspended Sales
    addSuspendedSale, getSuspendedSales, getSuspendedSaleById, updateSuspendedSale, deleteSuspendedSale,
    // Cash Flow
    addCashFlow, getCashFlow, getCashFlowForDate, updateCashFlow, deleteCashFlow,
    // Reconciliation
    addReconciliation, getReconciliations,
    // Stock Transfer
    createStockTransfer, getStockTransfers, updateStockTransfer,
    // Purchase Orders
    addPurchaseOrder, getPurchaseOrders, updatePurchaseOrder, deletePurchaseOrder, getPurchaseOrderById,
    // Expenses
    addExpense, getExpenses, updateExpense, deleteExpense,
    // Business & Branch
    getBusiness, updateBusiness, getBranches, addBranch, updateBranch, getBranch, deleteBranch,
    // Batch Operations
    batchAddInventoryItems, batchUpdateSalesWithCashFlow,
    // Aggregation
    getTotalSalesAcrossAllBranches, getBranchWiseRevenue,
    // Session & Context
    initializeBusiness, getUserSessionContext,
    // Messaging
    saveUserFcmToken,
    // Tables
    addTable, getTables, updateTable, deleteTable,
    // Table Orders
    addTableOrder, getTableOrders, getTableOrdersByTable, updateTableOrder, deleteTableOrder,
}
