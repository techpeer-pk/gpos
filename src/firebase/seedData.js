/**
 * Seed Data Generator for Multi-Branch Testing
 * Use this to populate test data into Firestore for development
 */
import { db } from './config'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export const generateSeedData = {
    /**
     * Generate sample business data
     */
    business: (overrides = {}) => ({
        businessName: 'TechPeer Electronics',
        owner_uid: 'test-owner-uid',
        createdAt: new Date(),
        settings: {
            currency: 'PKR',
            timezone: 'Asia/Karachi',
            language: 'ur'
        },
        ...overrides
    }),

    /**
     * Generate sample branch data
     */
    branch: (overrides = {}) => ({
        branchName: 'Karachi - Clifton',
        location: 'Karachi, Pakistan',
        manager_uid: 'test-manager-uid',
        createdAt: new Date(),
        settings: {
            currency: 'PKR',
            tax_rate: 0.17,
            receipt_template: 'detailed',
            receipt_header: 'TechPeer Electronics',
            receipt_footer: 'Karachi - Clifton'
        },
        ...overrides
    }),

    /**
     * Generate sample products
     */
    products: () => [
        {
            name: 'iPhone 15 Pro',
            sku: 'APP-IP15-PRO-001',
            basePrice: 250000,
            category_id: 'cat-phones',
            description: 'Latest Apple iPhone 15 Pro',
            image: 'https://via.placeholder.com/200',
            branchPrices: {
                'branch-khi': 245000, // Karachi discount
                'branch-lhr': 250000  // Lahore full price
            }
        },
        {
            name: 'Samsung Galaxy S24',
            sku: 'SAM-S24-001',
            basePrice: 200000,
            category_id: 'cat-phones',
            description: 'Samsung Galaxy S24',
            image: 'https://via.placeholder.com/200'
        },
        {
            name: 'USB-C Cable',
            sku: 'CABLE-USB-C-001',
            basePrice: 1500,
            category_id: 'cat-cables',
            description: 'High-quality USB-C Cable - 2M',
            image: 'https://via.placeholder.com/200'
        },
        {
            name: 'Phone Case - Silicone',
            sku: 'CASE-SIL-001',
            basePrice: 800,
            category_id: 'cat-cases',
            description: 'Durable Silicone Phone Case',
            image: 'https://via.placeholder.com/200'
        },
        {
            name: 'Screen Protector - Tempered Glass',
            sku: 'PROT-GLASS-001',
            basePrice: 500,
            category_id: 'cat-protectors',
            description: 'Tempered Glass Screen Protector',
            image: 'https://via.placeholder.com/200'
        }
    ],

    /**
     * Generate sample categories
     */
    categories: () => [
        { name: 'Phones', description: 'Mobile Phones & Smartphones' },
        { name: 'Cables', description: 'Charging and Data Cables' },
        { name: 'Cases', description: 'Phone Cases and Covers' },
        { name: 'Protectors', description: 'Screen Protectors' },
        { name: 'Accessories', description: 'Phone Accessories' }
    ],

    /**
     * Generate sample customers
     */
    customers: () => [
        {
            name: 'Ali Khan',
            phone: '+923001234567',
            email: 'ali.khan@email.com',
            address: 'Karachi, Pakistan',
            loyaltyPoints: 1500
        },
        {
            name: 'Fatima Ahmed',
            phone: '+923012345678',
            email: 'fatima.ahmed@email.com',
            address: 'Lahore, Pakistan',
            loyaltyPoints: 2300
        },
        {
            name: 'Muhammad Hassan',
            phone: '+923021234567',
            email: 'mhassan@email.com',
            address: 'Islamabad, Pakistan',
            loyaltyPoints: 800
        },
        {
            name: 'Ayesha Malik',
            phone: '+923031234567',
            email: 'ayesha.malik@email.com',
            address: 'Karachi, Pakistan',
            loyaltyPoints: 3100
        }
    ],

    /**
     * Generate sample suppliers
     */
    suppliers: () => [
        {
            name: 'Apple Pakistan',
            contact_person: 'Ahmed Malik',
            phone: '+922134567890',
            email: 'supplier@apple.pk',
            address: 'Karachi Trade Center, Karachi',
            payment_terms: '30 days net',
            tax_id: 'TX-001'
        },
        {
            name: 'Samsung Authorized Distributor',
            contact_person: 'Hassan Khan',
            phone: '+922145678901',
            email: 'samsung@distributor.pk',
            address: 'Lahore, Pakistan',
            payment_terms: '45 days net',
            tax_id: 'TX-002'
        },
        {
            name: 'Generic Accessories Hub',
            contact_person: 'Bilal Ahmed',
            phone: '+923001122334',
            email: 'accessories@hub.pk',
            address: 'Karachi',
            payment_terms: '15 days net',
            tax_id: 'TX-003'
        }
    ],

    /**
     * Generate sample inventory for branch
     */
    inventory: (productIds = []) => {
        return productIds.map((productId, index) => ({
            productId,
            quantity: Math.floor(Math.random() * 50) + 10,
            reorderLevel: 5,
            lastRestocked: new Date(),
            location: `Shelf-${String.fromCharCode(65 + (index % 5))}-${index}`
        }))
    },

    /**
     * Generate sample sales
     */
    sales: (customerId = null) => [
        {
            items: [
                { productId: 'p1', name: 'iPhone 15', quantity: 1, unitPrice: 250000, total: 250000 }
            ],
            subtotal: 250000,
            discount: 10000,
            tax: 40800,
            finalAmount: 280800,
            customerId: customerId || 'cust-001',
            customerName: 'Ali Khan',
            cashierId: 'cashier-001',
            paymentMethod: 'cash',
            notes: 'Regular customer - give 10k discount'
        },
        {
            items: [
                { productId: 'p3', name: 'USB-C Cable', quantity: 5, unitPrice: 1500, total: 7500 },
                { productId: 'p4', name: 'Phone Case', quantity: 2, unitPrice: 800, total: 1600 }
            ],
            subtotal: 9100,
            discount: 500,
            tax: 1445,
            finalAmount: 10045,
            customerId: customerId || 'cust-002',
            customerName: 'Fatima Ahmed',
            cashierId: 'cashier-001',
            paymentMethod: 'card'
        }
    ],

    /**
     * Generate sample cash flow transactions
     */
    cashFlow: () => [
        {
            type: 'sale',
            description: 'iPhone 15 Pro Sale',
            amount: 280800,
            paymentMethod: 'cash',
            notes: 'Reference: INV-001'
        },
        {
            type: 'return',
            description: 'Cable Return',
            amount: -7500,
            paymentMethod: 'cash',
            notes: 'Customer return - defective'
        },
        {
            type: 'purchase',
            description: 'Stock purchase from Apple',
            amount: -500000,
            paymentMethod: 'bank_transfer',
            notes: 'New stock - 5 iPhones'
        }
    ],

    /**
     * Test user data
     */
    users: () => ({
        owner: {
            uid: 'owner-uid-1',
            email: 'owner@gpos.test',
            role: 'owner',
            name: 'Business Owner',
            assignedBranches: ['branch-khi', 'branch-lhr']
        },
        manager: {
            uid: 'manager-uid-1',
            email: 'manager@gpos.test',
            role: 'manager',
            name: 'Branch Manager',
            assignedBranches: ['branch-khi']
        },
        cashier: {
            uid: 'cashier-uid-1',
            email: 'cashier@gpos.test',
            role: 'cashier',
            name: 'Point of Sale Operator',
            assignedBranches: ['branch-khi']
        }
    }),

    /**
     * Stock transfer between branches
     */
    stockTransfer: (fromBranch = 'branch-khi', toBranch = 'branch-lhr') => ({
        fromBranchId: fromBranch,
        toBranchId: toBranch,
        items: [
            {
                productId: 'p1',
                productName: 'iPhone 15',
                quantity: 5,
                reason: 'Rebalancing inventory'
            }
        ],
        initiatedBy: 'owner-uid-1',
        status: 'pending',
        notes: 'Stock transfer for Q1 2026'
    })
}

/**
 * Helper to populate Firestore with test data
 * Usage in browser console:
 * import { populateTestData } from '@/firebase/seedData'
 * await populateTestData('business-id-123', 'owner-uid')
 */
export const populateTestData = async (businessId, userId, firestoreService) => {
    try {
        console.log('🌱 Starting test data population...')

        // 1. Add categories
        console.log('📂 Adding categories...')
        const categories = generateSeedData.categories()
        let categoryIds = {}
        for (const cat of categories) {
            const docRef = await firestoreService.addCategory(businessId, cat)
            categoryIds[cat.name] = docRef.id
        }

        // 2. Add products
        console.log('📦 Adding products...')
        const products = generateSeedData.products()
        let productIds = []
        for (const product of products) {
            // Find matching category
            const categoryKey = Object.keys(categoryIds).find(
                key => product.category_id.includes(key.toLowerCase())
            )
            const docRef = await firestoreService.addProduct(businessId, {
                ...product,
                category_id: categoryIds[categoryKey] || categoryIds['Phones']
            })
            productIds.push(docRef.id)
        }

        // 3. Add suppliers
        console.log('🚚 Adding suppliers...')
        const suppliers = generateSeedData.suppliers()
        for (const supplier of suppliers) {
            await firestoreService.addSupplier(businessId, supplier)
        }

        // 4. Add customers
        console.log('👥 Adding customers...')
        const customers = generateSeedData.customers()
        let customerIds = []
        for (const customer of customers) {
            const docRef = await firestoreService.addCustomer(businessId, customer)
            customerIds.push(docRef.id)
        }

        // 5. For each branch: add inventory, sales, cash flow
        console.log('🔄 Getting branches...')
        const branchesSnap = await firestoreService.getBranches(businessId)
        
        for (const branchDoc of branchesSnap.docs) {
            const branchId = branchDoc.id
            console.log(`\n📍 Populating branch: ${branchId}`)

            // Add inventory
            console.log('📊 Adding inventory...')
            const inventory = generateSeedData.inventory(productIds)
            await firestoreService.batchAddInventoryItems(businessId, branchId, inventory)

            // Add sample sales
            console.log('💰 Adding sample sales...')
            const sales = generateSeedData.sales(customerIds[0])
            for (const sale of sales) {
                await firestoreService.addSale(businessId, branchId, {
                    ...sale,
                    createdAt: new Date()
                })
            }

            // Add cash flow
            console.log('💸 Adding cash flow...')
            const cashFlows = generateSeedData.cashFlow()
            for (const cf of cashFlows) {
                await firestoreService.addCashFlow(businessId, branchId, {
                    ...cf,
                    createdAt: new Date()
                })
            }
        }
        
        // 6. Add sample staff (Users)
        console.log('🧑‍🤝‍🧑 Adding sample staff profiles...')
        const sampleUsers = generateSeedData.users()
        const branches = await firestoreService.getBranches(businessId)
        const firstBranchId = branches.docs[0]?.id

        // Add a sample manager and cashier
        const staffToSeed = [sampleUsers.manager, sampleUsers.cashier]
        for (const staff of staffToSeed) {
            const staffUid = `staff_${staff.role}_${Date.now()}`
            
            // Create Local Profile
            await setDoc(doc(db, 'business_users', businessId, staffUid, 'profile'), {
                ...staff,
                uid: staffUid,
                businessId,
                assignedBranches: [firstBranchId],
                status: 'active',
                createdAt: serverTimestamp()
            })

            // Create Global Record
            await setDoc(doc(db, 'users', staffUid), {
                uid: staffUid,
                businessId,
                role: staff.role,
                name: staff.name,
                email: staff.email,
                updatedAt: serverTimestamp()
            })
        }

        console.log('✅ Test data population complete!')
        return {
            success: true,
            summary: {
                categories: Object.keys(categoryIds).length,
                products: productIds.length,
                customers: customerIds.length,
                suppliers: suppliers.length
            }
        }
    } catch (error) {
        console.error('❌ Error populating test data:', error)
        return { success: false, error: error.message }
    }
}

export default generateSeedData
