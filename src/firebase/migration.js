import { db } from './config'
import {
    collection,
    getDocs,
    setDoc,
    doc,
    serverTimestamp,
    writeBatch,
    query,
    where
} from 'firebase/firestore'

/**
 * Migration Service for Multi-Branch Firestore Structure
 * Handles migration from single-business flat structure to multi-branch hierarchical structure
 */

export const MigrationService = {
    /**
     * Create default business and branch for existing user
     * Called after login if user has no business yet
     */
    async createDefaultBusinessAndBranch(userId, businessName = "Main Business", branchName = "Main Branch") {
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

            // Create user assignment document
            await setDoc(doc(db, 'business_users', businessId, userId, 'profile'), {
                uid: userId,
                email: '',
                role: 'owner',
                assignedBranches: [branchId],
                permissions: ['all'],
                createdAt: serverTimestamp()
            })

            console.log(`✅ Created default business (${businessId}) and branch (${branchId})`)
            return { businessId, branchId, branchName }
        } catch (error) {
            console.error('❌ Error creating default business/branch:', error)
            throw error
        }
    },

    /**
     * Migrate all existing data from old structure to new structure
     * CAUTION: This should only be run ONCE per user
     * 
     * @param {string} userId - Current user ID
     * @param {string} businessId - Target business ID
     * @param {string} branchId - Target branch ID
     * @returns {object} Migration report with counts
     */
    async migrateExistingData(userId, businessId, branchId) {
        const batch = writeBatch(db)
        const report = {
            success: true,
            timestamp: new Date(),
            migratedCollections: {},
            errors: []
        }

        try {
            // 1. Migrate Products (Shared)
            console.log('📦 Migrating products...')
            const productsSnap = await getDocs(collection(db, 'products'))
            let productCount = 0
            productsSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'products', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'products',
                        migrationDate: serverTimestamp()
                    }
                )
                productCount++
            })
            report.migratedCollections.products = productCount

            // 2. Migrate Categories (Shared)
            console.log('📂 Migrating categories...')
            const categoriesSnap = await getDocs(collection(db, 'categories'))
            let categoryCount = 0
            categoriesSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'categories', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'categories',
                        migrationDate: serverTimestamp()
                    }
                )
                categoryCount++
            })
            report.migratedCollections.categories = categoryCount

            // 3. Migrate Customers (Shared)
            console.log('👥 Migrating customers...')
            const customersSnap = await getDocs(collection(db, 'customers'))
            let customerCount = 0
            customersSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'customers', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'customers',
                        migrationDate: serverTimestamp(),
                        loyaltyPoints: data.loyaltyPoints || 0
                    }
                )
                customerCount++
            })
            report.migratedCollections.customers = customerCount

            // 4. Migrate Suppliers (Shared)
            console.log('🚚 Migrating suppliers...')
            const suppliersSnap = await getDocs(collection(db, 'suppliers'))
            let supplierCount = 0
            suppliersSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'suppliers', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'suppliers',
                        migrationDate: serverTimestamp()
                    }
                )
                supplierCount++
            })
            report.migratedCollections.suppliers = supplierCount

            // 5. Migrate Inventory (Branch-Specific)
            console.log('📊 Migrating inventory...')
            const inventorySnap = await getDocs(collection(db, 'inventory'))
            let inventoryCount = 0
            inventorySnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'branches', branchId, 'inventory', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'inventory',
                        migrationDate: serverTimestamp()
                    }
                )
                inventoryCount++
            })
            report.migratedCollections.inventory = inventoryCount

            // 6. Migrate Sales (Branch-Specific)
            console.log('💰 Migrating sales...')
            const salesSnap = await getDocs(collection(db, 'sales'))
            let salesCount = 0
            salesSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'branches', branchId, 'sales', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'sales',
                        migrationDate: serverTimestamp()
                    }
                )
                salesCount++
            })
            report.migratedCollections.sales = salesCount

            // 7. Migrate Suspended Sales (Branch-Specific)
            console.log('⏸️ Migrating suspended sales...')
            const suspendedSnap = await getDocs(collection(db, 'suspended_sales'))
            let suspendedCount = 0
            suspendedSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'branches', branchId, 'suspended_sales', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'suspended_sales',
                        migrationDate: serverTimestamp()
                    }
                )
                suspendedCount++
            })
            report.migratedCollections.suspended_sales = suspendedCount

            // 8. Migrate Cash Flow (Branch-Specific)
            console.log('💸 Migrating cash flow...')
            const cashFlowSnap = await getDocs(collection(db, 'cash_flow'))
            let cashFlowCount = 0
            cashFlowSnap.forEach((docSnap) => {
                const data = docSnap.data()
                batch.set(
                    doc(db, 'businesses', businessId, 'branches', branchId, 'cash_flow', docSnap.id),
                    {
                        ...data,
                        createdAt: data.createdAt || serverTimestamp(),
                        migratedFrom: 'cash_flow',
                        migrationDate: serverTimestamp()
                    }
                )
                cashFlowCount++
            })
            report.migratedCollections.cash_flow = cashFlowCount

            // Commit all batched writes
            await batch.commit()

            console.log('✅ Migration successful!')
            return report
        } catch (error) {
            console.error('❌ Migration error:', error)
            report.success = false
            report.errors.push(error.message)
            throw error
        }
    },

    /**
     * Check if user has already been migrated
     * Returns businessId and branchId if exists
     */
    async getUserBusinessAndBranch(userId) {
        try {
            // Query businesses collection to find where user is owner
            const q = query(
                collection(db, 'businesses'),
                where('owner_uid', '==', userId)
            )
            const querySnap = await getDocs(q)

            if (querySnap.empty) {
                return null // User has no business yet
            }

            const businessDoc = querySnap.docs[0]
            const businessId = businessDoc.id
            const businessData = businessDoc.data()

            // Get first available branch
            const branchesSnap = await getDocs(
                collection(db, 'businesses', businessId, 'branches')
            )

            if (branchesSnap.empty) {
                return { businessId, branchId: null, branchName: null, branches: [] }
            }

            // Get all branches for user
            const branches = branchesSnap.docs.map(doc => ({
                branchId: doc.id,
                branchName: doc.data().branchName,
                location: doc.data().location
            }))

            const firstBranch = branchesSnap.docs[0]
            const branchId = firstBranch.id
            const branchName = firstBranch.data().branchName

            return { businessId, branchId, branchName, branches }
        } catch (error) {
            console.error('❌ Error getting user business:', error)
            return null
        }
    },

    /**
     * Create migration report (for debugging)
     */
    async generateMigrationReport(businessId) {
        try {
            const report = {
                timestamp: new Date(),
                businessId,
                collections: {}
            }

            // Count products
            const productsSnap = await getDocs(
                collection(db, 'businesses', businessId, 'products')
            )
            report.collections.products = productsSnap.size

            // Count customers
            const customersSnap = await getDocs(
                collection(db, 'businesses', businessId, 'customers')
            )
            report.collections.customers = customersSnap.size

            // Count branches
            const branchesSnap = await getDocs(
                collection(db, 'businesses', businessId, 'branches')
            )
            report.collections.branches = branchesSnap.size

            // Count sales per branch
            const branchDocs = branchesSnap.docs
            report.branches = {}

            for (const branchDoc of branchDocs) {
                const branchId = branchDoc.id
                const salesSnap = await getDocs(
                    collection(db, 'businesses', businessId, 'branches', branchId, 'sales')
                )
                report.branches[branchId] = {
                    sales: salesSnap.size
                }
            }

            return report
        } catch (error) {
            console.error('❌ Error generating migration report:', error)
            throw error
        }
    }
}

export default MigrationService
