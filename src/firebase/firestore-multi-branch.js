import { db } from './config'
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
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
        quantity: FieldValue.increment(-quantity),
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
        loyaltyPoints: FieldValue.increment(points)
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
    addSale, getSales, getSalesForDate, updateSale, deleteSale,
    // Suspended Sales
    addSuspendedSale, getSuspendedSales, getSuspendedSaleById, updateSuspendedSale, deleteSuspendedSale,
    // Cash Flow
    addCashFlow, getCashFlow, getCashFlowForDate,
    // Stock Transfer
    createStockTransfer, getStockTransfers, updateStockTransfer,
    // Business & Branch
    getBusiness, updateBusiness, getBranches, addBranch, updateBranch, getBranch,
    // Batch Operations
    batchAddInventoryItems, batchUpdateSalesWithCashFlow,
    // Aggregation
    getTotalSalesAcrossAllBranches, getBranchWiseRevenue
}
