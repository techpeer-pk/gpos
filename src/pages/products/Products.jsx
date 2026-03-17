import { useState, useEffect, useMemo } from 'react'
import Layout from '../../components/layout/Layout'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'
import { serverTimestamp } from 'firebase/firestore'

const ROWS_OPTIONS = [10, 25, 50, 100]

function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col) return <span className="ml-1 opacity-25">↕</span>
    return <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function Products() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState(null)
    const currency = settings?.currency || 'PKR'
    const [form, setForm] = useState({
        name: '',
        price: '',
        costPrice: '',
        category: '',
        unit: 'pcs',
        barcode: '',
    })
    const [editingProduct, setEditingProduct] = useState(null)
    const [initialLoading, setInitialLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortCol, setSortCol] = useState('name')
    const [sortDir, setSortDir] = useState('asc')
    const [page, setPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(25)

    // Category Modal State
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [categoryLoading, setCategoryLoading] = useState(false)

    const { businessId, branchId } = useAuthStore()

    // Resolve category ID to name
    const getCategoryName = (catId) => {
        if (!catId) return '-'
        const cat = categories.find(c => c.id === catId)
        return cat ? cat.name : catId
    }

    // Fetch Products + Categories
    const fetchProducts = async () => {
        try {
            const [productSnapshot, inventorySnapshot, categorySnapshot] = await Promise.all([
                FirestoreService.getProducts(businessId),
                FirestoreService.getInventory(businessId, branchId),
                FirestoreService.getCategories(businessId),
            ])

            const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            const inventoryList = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            const categoryList = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            setCategories(categoryList)

            const mergedList = productList.map(p => ({
                ...p,
                stock: inventoryList.find(i => i.productId === p.id)?.quantity || 0
            }))
            setProducts(mergedList)

            // Default settings (simulated for now as specific business settings aren't in a global doc anymore)
            setSettings({ currency: 'PKR' })
        } catch (err) {
            handleError(err, 'Fetch Products', 'Failed to load products')
        }
    }

    useEffect(() => {
        if (businessId) {
            fetchProducts()
            setInitialLoading(false)
        }
    }, [businessId, branchId])

    // Add Product
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const productData = {
                ...form,
                price: parseFloat(form.price),
                costPrice: parseFloat(form.costPrice),
                active: true,
                createdAt: serverTimestamp()
            }

            // Use hierarchical API
            const docRef = await FirestoreService.addProduct(businessId, productData)

            // Auto-create inventory record for this branch (and keep it simple for now)
            await FirestoreService.addInventory(businessId, branchId, docRef.id, {
                productId: docRef.id,
                quantity: 0,
                reorderLevel: 10,
                lastUpdated: serverTimestamp()
            })

            setForm({ name: '', price: '', costPrice: '', category: '', unit: 'pcs', barcode: '' })
            setShowForm(false)
            showSuccess('Product added successfully')
            fetchProducts()
        } catch (err) {
            handleError(err, 'Add Product', 'Failed to add product')
        } finally {
            setLoading(false)
        }
    }

    // Update Product
    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const updatedData = {
                ...editingProduct,
                price: parseFloat(editingProduct.price),
                costPrice: parseFloat(editingProduct.costPrice),
                updatedAt: serverTimestamp()
            }

            await FirestoreService.updateProduct(businessId, editingProduct.id, updatedData)

            setEditingProduct(null)
            showSuccess('Product updated successfully')
            fetchProducts()
        } catch (err) {
            handleError(err, 'Update Product', 'Failed to update product')
        } finally {
            setLoading(false)
        }
    }

    // Delete Product
    const handleDelete = async (id) => {
        if (window.confirm('Delete this product? This will also remove its inventory data.')) {
            try {
                // Delete product and inventory (hierarchically)
                await FirestoreService.deleteProduct(businessId, id)

                // Note: In hierarchical structure, inventory is per branch. 
                // We should ideally delete inventory for ALL branches, but here we delete for the current context.
                // Or better, if FirestoreService.deleteProduct is implemented to clean up, use it.
                // For now, let's assume we need to clean up the current branch inventory.
                const invSnap = await FirestoreService.getInventoryByProduct(businessId, branchId, id)
                invSnap.forEach(async (invDoc) => {
                    await FirestoreService.deleteInventory(businessId, branchId, invDoc.id)
                })

                fetchProducts()
                showSuccess('Product deleted')
            } catch (err) {
                handleError(err, 'Delete Product')
            }
        }
    }

    // Add Category
    const handleCategorySubmit = async (e) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return

        setCategoryLoading(true)
        try {
            await FirestoreService.addCategory(businessId, {
                name: newCategoryName.trim(),
                createdAt: serverTimestamp()
            })
            setNewCategoryName('')
            setShowCategoryModal(false)
            showSuccess('Category added successfully')
            fetchProducts() // Refresh categories
        } catch (err) {
            handleError(err, 'Add Category', 'Failed to add category')
        } finally {
            setCategoryLoading(false)
        }
    }

    // ── Datatable Logic ──────────────────────────────────────
    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortCol(col)
            setSortDir('asc')
        }
        setPage(1)
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return products
        return products.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q) ||
            getCategoryName(p.category).toLowerCase().includes(q) ||
            p.unit?.toLowerCase().includes(q)
        )
    }, [products, categories, search])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let aVal, bVal
            if (sortCol === 'price') {
                aVal = a.price || 0; bVal = b.price || 0
            } else if (sortCol === 'stock') {
                aVal = a.stock || 0; bVal = b.stock || 0
            } else if (sortCol === 'category') {
                aVal = getCategoryName(a.category); bVal = getCategoryName(b.category)
            } else {
                aVal = (a[sortCol] || '').toString().toLowerCase()
                bVal = (b[sortCol] || '').toString().toLowerCase()
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [filtered, sortCol, sortDir])

    const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage))
    const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    // ────────────────────────────────────────────────────────

    return (
        <Layout title="Products">

            {initialLoading && (
                <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center z-[9999]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Products Engine...</p>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6 mt-12">
                <p className="text-gray-500 dark:text-gray-400 font-medium">{products.length} products total</p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                    + Add Product
                </button>
            </div>

            {/* Add Product Form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6 transition-all animate-in slide-in-from-top duration-300">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase tracking-tight">New Product Entry</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="e.g. Premium Item"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Category</label>
                            <div className="flex gap-2">
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="flex-1 border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryModal(true)}
                                    className="px-3 bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    title="Add New Category"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Sale Price *</label>
                            <input
                                type="number"
                                required
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Cost Price</label>
                            <input
                                type="number"
                                value={form.costPrice}
                                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Barcode</label>
                            <input
                                type="text"
                                value={form.barcode}
                                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Scan or type barcode"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Unit</label>
                            <select
                                value={form.unit}
                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="pcs">Pieces (pcs)</option>
                                <option value="kg">Kilogram (kg)</option>
                                <option value="ltr">Liter (ltr)</option>
                                <option value="box">Box</option>
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2 flex gap-3 justify-end pt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 border dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                            >
                                {loading ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl border dark:border-gray-800 border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Modify Product</h3>
                            <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Product Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Category</label>
                                <div className="flex gap-2">
                                    <select
                                        value={editingProduct.category}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                        className="flex-1 border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryModal(true)}
                                        className="px-3 bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        title="Add New Category"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Sale Price *</label>
                                <input
                                    type="number"
                                    required
                                    value={editingProduct.price}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Cost Price</label>
                                <input
                                    type="number"
                                    value={editingProduct.costPrice}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Barcode</label>
                                <input
                                    type="text"
                                    value={editingProduct.barcode}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Unit</label>
                                <select
                                    value={editingProduct.unit}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="pcs">Pieces (pcs)</option>
                                    <option value="kg">Kilogram (kg)</option>
                                    <option value="ltr">Liter (ltr)</option>
                                    <option value="box">Box</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2 flex gap-3 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    className="px-6 py-2 border dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                >
                                    {loading ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">

                {/* Controls: Search + Rows per page */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b dark:border-gray-800">
                    <div className="relative w-full sm:max-w-sm">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Search by name, barcode, category..."
                            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); setPage(1) }}
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
                {search && (
                    <div className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 border-b dark:border-gray-800">
                        {filtered.length === 0 ? 'No results found.' : `${filtered.length} result${filtered.length > 1 ? 's' : ''} for "${search}"`}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                            <tr>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-10">#</th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('name')}>
                                    Product Details <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                                </th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('category')}>
                                    Category <SortIcon col="category" sortCol={sortCol} sortDir={sortDir} />
                                </th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('price')}>
                                    Sale Price <SortIcon col="price" sortCol={sortCol} sortDir={sortDir} />
                                </th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('stock')}>
                                    Availability <SortIcon col="stock" sortCol={sortCol} sortDir={sortDir} />
                                </th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-gray-400 dark:text-gray-500 italic">
                                        {search ? 'No products match your search.' : 'No products yet. Click "Add Product" to start!'}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((product, index) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs font-medium">
                                            {(page - 1) * rowsPerPage + index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">SKU: {product.barcode || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border dark:border-gray-700">
                                                {getCategoryName(product.category)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{currency} {product.price.toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block w-fit ${product.stock <= 5 ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                                                {product.stock} {product.unit} Available
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setEditingProduct(product)}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-black uppercase tracking-widest"
                                                >Edit</button>
                                                <button
                                                    onClick={() => window.location.href = '/inventory'}
                                                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs font-black uppercase tracking-widest"
                                                >Supply</button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-black uppercase tracking-widest"
                                                >Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
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

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] transition-all animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl w-full max-w-md border dark:border-gray-800 border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">New Category</h3>
                            <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleCategorySubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="e.g. Beverages"
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryModal(false)}
                                    className="px-6 py-2 border dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={categoryLoading}
                                    className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                >
                                    {categoryLoading ? 'Saving...' : 'Save Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </Layout>
    )
}

export default Products