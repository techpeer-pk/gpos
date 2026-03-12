import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { db } from '../../firebase/config'
import { handleError } from '../../utils/errorHandler'
import { collection, getDocs, getDoc, query, where, Timestamp, doc } from 'firebase/firestore'

function Dashboard() {
    const [stats, setStats] = useState({
        todaySales: 0,
        yesterdaySales: 0,
        todayTransactions: 0,
        yesterdayTransactions: 0,
        totalProducts: 0,
        totalCustomers: 0,
        loading: true
    })
    const [settings, setSettings] = useState(null)
    const currency = settings?.currency || 'PKR'

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch Settings
                const settingsSnap = await getDoc(doc(db, 'settings', 'global'))
                if (settingsSnap.exists()) setSettings(settingsSnap.data())

                // Get Total Products & Customers counts
                const [productsSnap, customersSnap, inventorySnap] = await Promise.all([
                    getDocs(collection(db, 'products')),
                    getDocs(collection(db, 'customers')),
                    getDocs(collection(db, 'inventory'))
                ])
                const inventoryList = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }))

                // Define time ranges
                const now = new Date()
                const todayStart = new Date(now.setHours(0, 0, 0, 0))

                const yesterdayStart = new Date(todayStart)
                yesterdayStart.setDate(yesterdayStart.getDate() - 1)

                const yesterdayEnd = new Date(todayStart)

                // Query Today's Sales
                const todayQuery = query(
                    collection(db, 'sales'),
                    where('createdAt', '>=', Timestamp.fromDate(todayStart))
                )
                const todaySnap = await getDocs(todayQuery)
                const tSales = todaySnap.docs.reduce((sum, doc) => sum + doc.data().total, 0)

                // Query Yesterday's Sales
                const yesterdayQuery = query(
                    collection(db, 'sales'),
                    where('createdAt', '>=', Timestamp.fromDate(yesterdayStart)),
                    where('createdAt', '<', Timestamp.fromDate(yesterdayEnd))
                )
                const yesterdaySnap = await getDocs(yesterdayQuery)
                const ySales = yesterdaySnap.docs.reduce((sum, doc) => sum + doc.data().total, 0)

                setStats({
                    todaySales: tSales,
                    yesterdaySales: ySales,
                    todayTransactions: todaySnap.size,
                    yesterdayTransactions: yesterdaySnap.size,
                    totalProducts: productsSnap.size,
                    totalCustomers: customersSnap.size,
                    lowStockItems: productsSnap.docs
                        .map(d => {
                            const p = { id: d.id, ...d.data() }
                            const inv = inventoryList.find(i => i.productId === p.id)
                            return { ...p, currentStock: inv?.currentStock || 0, minStock: inv?.minStock || 10 }
                        })
                        .filter(p => p.currentStock <= p.minStock),
                    loading: false
                })
            } catch (err) {
                handleError(err, 'Dashboard Stats', 'Failed to load dashboard data')
                setStats(prev => ({ ...prev, loading: false }))
            }
        }

        fetchStats()
    }, [])

    const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }

    const salesGrowth = calculateGrowth(stats.todaySales, stats.yesterdaySales)
    const transGrowth = calculateGrowth(stats.todayTransactions, stats.yesterdayTransactions)

    if (stats.loading) {
        return (
            <Layout title="Dashboard">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4 mt-12">

                {/* Stat Cards */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Today's Sales</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{currency} {stats.todaySales.toLocaleString()}</h3>
                    <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {salesGrowth >= 0 ? '↑' : '↓'} {Math.abs(salesGrowth).toFixed(1)}% <span className="text-gray-400 dark:text-gray-500 font-normal">from yesterday</span>
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Transactions</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.todayTransactions}</h3>
                    <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${transGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {transGrowth >= 0 ? '↑' : '↓'} {Math.abs(transGrowth).toFixed(1)}% <span className="text-gray-400 dark:text-gray-500 font-normal">from yesterday</span>
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Products</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.totalProducts}</h3>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 italic">Active items in inventory</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Customers</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.totalCustomers}</h3>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 italic">Registered profiles</p>
                </div>

            </div>

            {/* Welcome / Quick Actions */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-lg text-white">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-bold mb-2">Welcome back to GPOS! 🚀</h2>
                    <p className="text-blue-100 mb-6 leading-relaxed text-lg">
                        Your business performance is looking great today. You have {stats.todayTransactions} new transactions to review.
                    </p>
                    <div className="flex gap-3 mb-4">
                        <button onClick={() => window.location.href = '/pos'} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 transition">
                            Open POS
                        </button>
                        <button onClick={() => window.location.href = '/inventory'} className="bg-blue-500 text-white border border-blue-400 px-6 py-2 rounded-lg font-bold hover:bg-blue-400 transition">
                            Manage Inventory
                        </button>
                    </div>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {stats.lowStockItems?.length > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Low Stock Alerts
                        </h3>
                        <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full uppercase italic border dark:border-red-900/30">Action Required</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.lowStockItems.map(item => (
                            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-red-100 dark:border-red-900/30 shadow-sm flex items-center justify-between group hover:border-red-400 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-500 font-bold">
                                        ⚠️
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-red-600 transition-colors">{item.name}</p>
                                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Current: {item.currentStock} {item.unit || 'pcs'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest mb-1">Threshold</p>
                                    <p className="text-xs font-black text-gray-500 dark:text-gray-400">{item.minStock}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </Layout>
    )
}

export default Dashboard
