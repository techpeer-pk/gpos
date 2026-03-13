import { useState, useEffect, useMemo } from 'react'
import Layout from '../../components/layout/Layout'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { serverTimestamp } from 'firebase/firestore'

function Inventory() {
    const { businessId, branchId } = useAuthStore()
    const [inventory, setInventory] = useState([])
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        productId: '',
        quantity: '',
        reorderLevel: '',
    })

    const [initialLoading, setInitialLoading] = useState(true)

    const [searchTerm, setSearchTerm] = useState('')
    const [sortCol, setSortCol] = useState('name')
    const [sortDir, setSortDir] = useState('asc')
    const [page, setPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(25)

    // ── Bulk Restock ─────────────────────────────────────────
    const [showBulk, setShowBulk] = useState(false)
    const [bulkSearch, setBulkSearch] = useState('')
    const [bulkChanges, setBulkChanges] = useState({})
    const [bulkLoading, setBulkLoading] = useState(false)
    // ─────────────────────────────────────────────────────────

    const fetchData = async () => {
        try {
            const [productSnap, inventorySnap, categorySnap] = await Promise.all([
                FirestoreService.getProducts(businessId),
                FirestoreService.getInventory(businessId, branchId),
                FirestoreService.getCategories(businessId),
            ])

            const productList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            const inventoryList = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            const categoryList = categorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            setProducts(productList)
            setCategories(categoryList)

            // Auto-create missing inventory records for products
            const inventoryProductIds = new Set(inventoryList.map(i => i.productId))
            const missing = productList.filter(p => !inventoryProductIds.has(p.id))
            if (missing.length > 0) {
                await Promise.all(missing.map(p =>
                    FirestoreService.addInventory(businessId, branchId, p.id, {
                        productId: p.id,
                        quantity: 0,
                        reorderLevel: 10,
                        lastRestocked: serverTimestamp()
                    })
                ))
                // Refetch after creating missing records
                const freshSnap = await FirestoreService.getInventory(businessId, branchId)
                const freshList = freshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                setInventory(freshList)
            } else {
                setInventory(inventoryList)
            }
        } catch (err) {
            console.error('Inventory fetch error:', err)
        }
    }

    useEffect(() => {
        const init = async () => {
            if (businessId && branchId) {
                await fetchData()
            }
            setInitialLoading(false)
        }
        init()
    }, [businessId, branchId])

    const getProductName = (productId) => {
        const product = products.find(p => p.id === productId)
        return product ? product.name : 'Unknown Product'
    }

    const getProductCategory = (productId) => {
        const product = products.find(p => p.id === productId)
        if (!product?.category) return ''
        const cat = categories.find(c => c.id === product.category)
        return cat ? cat.name : product.category
    }

    const getStockStatus = (current, min) => {
        if (current <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-600' }
        if (current <= min) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-600' }
        return { label: 'In Stock', color: 'bg-green-100 text-green-600' }
    }

    const filteredInventory = inventory.filter(item =>
        getProductName(item.productId).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.addInventory(businessId, branchId, form.productId, {
                productId: form.productId,
                quantity: parseInt(form.quantity),
                reorderLevel: parseInt(form.reorderLevel),
                lastRestocked: serverTimestamp()
            })
            setForm({ productId: '', quantity: '', reorderLevel: '' })
            setShowForm(false)
            fetchData()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleStockUpdate = async (id, newStock) => {
        await FirestoreService.updateInventory(businessId, branchId, id, {
            quantity: parseInt(newStock),
            lastUpdated: serverTimestamp()
        })
        fetchData()
    }

    const lowStockCount = inventory.filter(i => i.quantity <= i.reorderLevel).length
    const outOfStockCount = inventory.filter(i => i.quantity <= 0).length

    // ── Bulk Restock Handlers ─────────────────────────────────
    const openBulkModal = () => {
        setBulkChanges({})
        setBulkSearch('')
        setShowBulk(true)
    }

    const setBulkField = (invId, field, value) => {
        setBulkChanges(prev => ({
            ...prev,
            [invId]: { mode: 'add', ...prev[invId], [field]: value }
        }))
    }

    const handleBulkApply = async () => {
        const entries = Object.entries(bulkChanges).filter(([, v]) => v.value !== '' && v.value !== undefined)
        if (entries.length === 0) return
        setBulkLoading(true)
        try {
            await Promise.all(entries.map(([invId, change]) => {
                const item = inventory.find(i => i.id === invId)
                if (!item) return Promise.resolve()
                const parsed = parseInt(change.value) || 0
                const newStock = change.mode === 'add'
                    ? Math.max(0, item.quantity + parsed)
                    : Math.max(0, parsed)
                return FirestoreService.updateInventory(businessId, branchId, invId, {
                    quantity: newStock,
                    lastUpdated: serverTimestamp()
                })
            }))
            await fetchData()
            setShowBulk(false)
            setBulkChanges({})
        } catch (err) {
            console.error('Bulk restock failed:', err)
        } finally {
            setBulkLoading(false)
        }
    }

    const bulkFiltered = useMemo(() => {
        const q = bulkSearch.trim().toLowerCase()
        if (!q) return inventory
        return inventory.filter(item =>
            getProductName(item.productId).toLowerCase().includes(q) ||
            getProductCategory(item.productId).toLowerCase().includes(q)
        )
    }, [inventory, products, categories, bulkSearch])

    const changedCount = Object.values(bulkChanges).filter(v => v.value !== '' && v.value !== undefined).length
    // ─────────────────────────────────────────────────────────

    // ── Datatable Logic ──────────────────────────────────────
    const ROWS_OPTIONS = [10, 25, 50, 100]

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortCol(col)
            setSortDir('asc')
        }
        setPage(1)
    }

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <span className="ml-1 opacity-25">↕</span>
        return <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
    }

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return inventory
        return inventory.filter(item =>
            getProductName(item.productId).toLowerCase().includes(q) ||
            getProductCategory(item.productId).toLowerCase().includes(q)
        )
    }, [inventory, products, categories, searchTerm])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let aVal, bVal
            if (sortCol === 'name') {
                aVal = getProductName(a.productId).toLowerCase()
                bVal = getProductName(b.productId).toLowerCase()
            } else if (sortCol === 'stock') {
                aVal = a.currentStock || 0; bVal = b.currentStock || 0
            } else if (sortCol === 'status') {
                aVal = a.currentStock <= 0 ? 0 : a.currentStock <= a.minStock ? 1 : 2
                bVal = b.currentStock <= 0 ? 0 : b.currentStock <= b.minStock ? 1 : 2
            } else if (sortCol === 'min') {
                aVal = a.minStock || 0; bVal = b.minStock || 0
            } else if (sortCol === 'max') {
                aVal = a.maxStock || 0; bVal = b.maxStock || 0
            } else {
                aVal = a[sortCol] || ''; bVal = b[sortCol] || ''
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [filtered, sortCol, sortDir, products, categories])

    const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage))
    const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    // ────────────────────────────────────────────────────────

    if (initialLoading) {
        return (
            <Layout title="Inventory">
                <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center z-[9999]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Stock Database...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Inventory">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 mt-12">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest">Total Inventory Items</p>
                    <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 uppercase tracking-tight">{inventory.length}</h3>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border-l-4 border-l-yellow-400 border border-gray-100 dark:border-gray-800">
                    <p className="text-yellow-600 dark:text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-1">Low Stock Warning</p>
                    <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{lowStockCount}</h3>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border-l-4 border-l-red-500 border border-gray-100 dark:border-gray-800">
                    <p className="text-red-600 dark:text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">Critical Depletion</p>
                    <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{outOfStockCount}</h3>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
                <p className="text-gray-500 dark:text-gray-400 font-medium">{inventory.length} items tracked</p>
                <div className="flex gap-3">
                    <button
                        onClick={openBulkModal}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-500/20 flex items-center gap-2"
                    >
                        <span>📦</span> Bulk Restock
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                    >
                        + Add Stock Record
                    </button>
                </div>
            </div>

            {/* Add Stock Form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 transition-all animate-in slide-in-from-top duration-300">
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-6 uppercase tracking-tight">📦 New Stock Record</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Select Product *</label>
                            <select
                                required
                                value={form.productId}
                                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            >
                                <option value="">Select Product</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Current Stock *</label>
                            <input
                                type="number"
                                required
                                value={form.currentStock}
                                onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Threshold (Min Stock) *</label>
                            <input
                                type="number"
                                required
                                value={form.minStock}
                                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="10"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Target (Max Stock) *</label>
                            <input
                                type="number"
                                required
                                value={form.maxStock}
                                onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="500"
                            />
                        </div>
                        <div className="md:col-span-2 flex gap-3 justify-end mt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 rounded-xl border dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-black dark:hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Confirm Stock Record'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Bulk Restock Modal ─────────────────────────────── */}
            {showBulk && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b dark:border-gray-800 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">📦 Bulk Restock / Adjustment</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                    Edit multiple stock levels at once. Only changed rows will be saved.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowBulk(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >✕</button>
                        </div>

                        {/* Modal Search */}
                        <div className="px-6 py-3 border-b dark:border-gray-800 flex-shrink-0">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                                <input
                                    type="text"
                                    value={bulkSearch}
                                    onChange={e => setBulkSearch(e.target.value)}
                                    placeholder="Filter by product name or category..."
                                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                                />
                            </div>
                        </div>

                        {/* Mode legend */}
                        <div className="px-6 py-2 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400 flex-shrink-0">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span> ADD = add to current stock</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block"></span> SET = replace stock value</span>
                        </div>

                        {/* Scrollable product list */}
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800">
                            {bulkFiltered.length === 0 ? (
                                <p className="text-center py-16 text-gray-400 italic text-sm">No products found.</p>
                            ) : (
                                bulkFiltered.map(item => {
                                    const change = bulkChanges[item.id] || { mode: 'add', value: '' }
                                    const isChanged = change.value !== '' && change.value !== undefined
                                    const status = getStockStatus(item.currentStock, item.minStock)
                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-3 px-6 py-3 transition-colors ${isChanged ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                                        >
                                            {/* Product info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight text-sm truncate">{getProductName(item.productId)}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{getProductCategory(item.productId) || '—'}</p>
                                            </div>

                                            {/* Current stock */}
                                            <div className="text-center flex-shrink-0 w-14">
                                                <span className="text-[9px] text-gray-400 block uppercase tracking-widest">Current</span>
                                                <span className={`text-sm font-black ${status.color.includes('red') ? 'text-red-500' : status.color.includes('yellow') ? 'text-yellow-600' : 'text-gray-800 dark:text-gray-100'}`}>
                                                    {item.currentStock}
                                                </span>
                                            </div>

                                            {/* Preview after */}
                                            <div className="text-center flex-shrink-0 w-14">
                                                <span className="text-[9px] text-gray-400 block uppercase tracking-widest">After</span>
                                                <span className="text-sm font-black text-green-600 dark:text-green-400">
                                                    {isChanged
                                                        ? (change.mode === 'add'
                                                            ? Math.max(0, item.currentStock + (parseInt(change.value) || 0))
                                                            : Math.max(0, parseInt(change.value) || 0))
                                                        : '—'
                                                    }
                                                </span>
                                            </div>

                                            {/* Mode toggle: Add / Set */}
                                            <div className="flex rounded-xl overflow-hidden border dark:border-gray-700 flex-shrink-0">
                                                <button
                                                    onClick={() => setBulkField(item.id, 'mode', 'add')}
                                                    className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${change.mode === 'add'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                >Add</button>
                                                <button
                                                    onClick={() => setBulkField(item.id, 'mode', 'set')}
                                                    className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${change.mode === 'set'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                >Set</button>
                                            </div>

                                            {/* Quantity input */}
                                            <input
                                                type="number"
                                                min="0"
                                                value={change.value}
                                                onChange={e => setBulkField(item.id, 'value', e.target.value)}
                                                placeholder={change.mode === 'add' ? '+qty' : 'qty'}
                                                className={`w-20 text-right border-2 rounded-xl px-3 py-1.5 text-sm font-black focus:outline-none transition-all ${isChanged
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                                    : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-blue-500'
                                                    }`}
                                            />

                                            {/* Clear row */}
                                            {isChanged && (
                                                <button
                                                    onClick={() => {
                                                        setBulkChanges(prev => {
                                                            const next = { ...prev }
                                                            delete next[item.id]
                                                            return next
                                                        })
                                                    }}
                                                    className="text-gray-300 hover:text-red-400 transition text-sm flex-shrink-0 w-4"
                                                >✕</button>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 rounded-b-3xl gap-4">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {changedCount === 0 ? 'No changes yet — edit stock quantities above.' : `${changedCount} product${changedCount > 1 ? 's' : ''} will be updated.`}
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBulk(false)}
                                    className="px-5 py-2 rounded-xl border dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
                                >Cancel</button>
                                <button
                                    onClick={handleBulkApply}
                                    disabled={bulkLoading || changedCount === 0}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition shadow-lg shadow-green-500/20 flex items-center gap-2"
                                >
                                    {bulkLoading ? 'Saving...' : `✅ Apply ${changedCount > 0 ? changedCount : ''} Change${changedCount !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ─────────────────────────────────────────────────── */}

            {/* Inventory Table */}

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">

                {/* Controls: Search + Rows per page */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b dark:border-gray-800">
                    <div className="relative w-full sm:max-w-sm">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
                            placeholder="Search by product name or category..."
                            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); setPage(1) }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                            >✕</button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold flex-shrink-0">
                        <span>Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>entries</span>
                    </div>
                </div>

                {/* Search result banner */}
                {searchTerm && (
                    <div className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 border-b dark:border-gray-800">
                        {filtered.length === 0 ? 'No results found.' : `${filtered.length} result${filtered.length > 1 ? 's' : ''} for "${searchTerm}"`}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                            <tr>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-10">#</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('name')}>
                                    Product Ledger <SortIcon col="name" />
                                </th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('stock')}>
                                    Level <SortIcon col="stock" />
                                </th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('min')}>
                                    Safety Bounds <SortIcon col="min" />
                                </th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('status')}>
                                    Alerts <SortIcon col="status" />
                                </th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Adjustment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-20 text-gray-400 dark:text-gray-500 italic">
                                        {searchTerm ? 'No matches found for your search' : 'No inventory records found'}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((item, index) => {
                                    const status = getStockStatus(item.currentStock, item.minStock)
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-4 py-4 text-gray-400 dark:text-gray-500 text-xs font-medium">
                                                {(page - 1) * rowsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{getProductName(item.productId)}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{getProductCategory(item.productId) || `ID: ${item.productId.slice(-8)}`}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xl font-black text-gray-900 dark:text-gray-100">{item.currentStock}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase ml-1">UNITS</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-4 text-xs font-bold">
                                                    <div className="text-center">
                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 block uppercase tracking-tighter">Min</span>
                                                        <span className="text-gray-600 dark:text-gray-400">{item.minStock}</span>
                                                    </div>
                                                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative border dark:border-gray-700">
                                                        <div
                                                            className={`absolute inset-0 transition-all ${item.currentStock <= item.minStock ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${Math.min((item.currentStock / (item.maxStock || 1)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 block uppercase tracking-tighter">Max</span>
                                                        <span className="text-gray-600 dark:text-gray-400">{item.maxStock}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${status.color.includes('red') ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : status.color.includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' : 'bg-green-50 dark:bg-green-900/20 text-green-600'}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="number"
                                                        defaultValue={item.currentStock}
                                                        className="w-24 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-xl px-3 py-2 text-sm font-black text-gray-800 dark:text-gray-100 focus:outline-none transition-all text-right shadow-inner"
                                                        onBlur={(e) => handleStockUpdate(item.id, e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {filtered.length === 0
                            ? 'No entries'
                            : `Showing ${Math.min((page - 1) * rowsPerPage + 1, filtered.length)}–${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length} entries`}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs font-bold rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">«</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-xs font-bold rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                            const p = start + i
                            if (p > totalPages) return null
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                >{p}</button>
                            )
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 text-xs font-bold rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">›</button>
                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs font-bold rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">»</button>
                    </div>
                </div>
            </div>

        </Layout>
    )
}

export default Inventory