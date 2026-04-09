import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'
import { serverTimestamp } from 'firebase/firestore'

function TableOrder() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const tableId = searchParams.get('tableId')
    const tableNo = searchParams.get('tableNo')

    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState('all')
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState([])
    const [settings, setSettings] = useState(null)
    const [initialLoading, setInitialLoading] = useState(true)
    const [placing, setPlacing] = useState(false)
    const [tables, setTables] = useState([])
    const [selectedTableId, setSelectedTableId] = useState(tableId || '')
    const [selectedTableNo, setSelectedTableNo] = useState(tableNo || '')
    const [note, setNote] = useState('')
    const [showCart, setShowCart] = useState(false)

    const { businessId, branchId, user } = useAuthStore()
    const currency = settings?.currency || 'PKR'

    useEffect(() => {
        if (!businessId || !branchId) return
        const fetchData = async () => {
            try {
                const [productSnap, categorySnap, tableSnap, bizSnap, branchSnap] = await Promise.all([
                    FirestoreService.getProducts(businessId),
                    FirestoreService.getCategories(businessId),
                    FirestoreService.getTables(businessId, branchId),
                    FirestoreService.getBusiness(businessId),
                    FirestoreService.getBranch(businessId, branchId),
                ])
                setProducts(productSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active !== false))
                setCategories(categorySnap.docs.map(d => ({ id: d.id, ...d.data() })))
                setTables(tableSnap.docs.map(d => ({ id: d.id, ...d.data() })))

                const bizData = bizSnap.exists() ? bizSnap.data() : {}
                const branchData = branchSnap.exists() ? branchSnap.data() : {}
                setSettings({ ...bizData.settings, ...branchData.settings, businessName: bizData.businessName })
            } catch (err) {
                handleError(err, 'Load Menu', 'Failed to load menu')
            } finally {
                setInitialLoading(false)
            }
        }
        fetchData()
    }, [businessId, branchId])

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id)
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
            return [...prev, { ...product, qty: 1 }]
        })
    }

    const updateQty = (id, qty) => {
        if (qty < 1) setCart(prev => prev.filter(i => i.id !== id))
        else setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
    }

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

    const getCategoryName = (catId) => {
        const cat = categories.find(c => c.id === catId)
        return cat ? cat.name : 'General'
    }

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchCat = activeCategory === 'all' || p.category === activeCategory
        return matchSearch && matchCat
    })

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return alert('Please add items to your order!')
        if (!selectedTableId) return alert('Please select a table!')
        setPlacing(true)
        try {
            await FirestoreService.addTableOrder(businessId, branchId, {
                tableId: selectedTableId,
                tableNumber: selectedTableNo,
                items: cart.map(i => ({
                    productId: i.id,
                    name: i.name,
                    price: i.price,
                    qty: i.qty,
                    total: i.price * i.qty,
                    imageUrl: i.imageUrl || '',
                })),
                subtotal,
                currency,
                note,
                waiterName: user?.name || 'Staff',
                waiterId: user?.uid,
                status: 'pending',
                createdAt: serverTimestamp(),
            })

            // Mark table as occupied
            await FirestoreService.updateTable(businessId, branchId, selectedTableId, { status: 'occupied' })

            showSuccess(`Order placed for Table ${selectedTableNo}!`)
            setCart([])
            setNote('')
            navigate('/tables')
        } catch (err) {
            handleError(err, 'Place Order', 'Failed to place order')
        } finally {
            setPlacing(false)
        }
    }

    if (initialLoading) {
        return (
            <Layout title="Table Order">
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Table Order">
            <div className="mt-12 flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-80px)] relative">

                {/* LEFT — Menu */}
                <div className="flex-1 lg:overflow-y-auto min-w-0">

                    {/* Table Selector */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <span className="text-2xl">🪑</span>
                        <div className="flex-1">
                            <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Select Table</p>
                            <select
                                value={selectedTableId}
                                onChange={(e) => {
                                    const t = tables.find(t => t.id === e.target.value)
                                    setSelectedTableId(e.target.value)
                                    setSelectedTableNo(t?.number || '')
                                }}
                                className="w-full border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                            >
                                <option value="">-- Select Table --</option>
                                {tables.map(t => (
                                    <option key={t.id} value={t.id}>
                                        Table {t.number} ({t.seats} seats) — {t.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedTableNo && (
                            <div className="bg-orange-500 text-white rounded-xl px-5 py-2 font-black text-lg text-center min-w-[80px]">
                                {selectedTableNo}
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="🔍 Search menu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 mb-4"
                    />

                    {/* Category Filter */}
                    {categories.length > 0 && (
                        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                            <button
                                onClick={() => setActiveCategory('all')}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition flex-shrink-0 ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border dark:border-gray-700 hover:border-orange-400'}`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition flex-shrink-0 ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border dark:border-gray-700 hover:border-orange-400'}`}
                                >
                                    {cat.icon && <span className="mr-1">{cat.icon}</span>}
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Menu Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-28 lg:pb-4">
                        {filtered.map(product => {
                            const inCart = cart.find(i => i.id === product.id)
                            return (
                                <div
                                    key={product.id}
                                    className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border-2 transition-all cursor-pointer ${inCart ? 'border-orange-500 shadow-orange-500/20 shadow-md' : 'border-transparent hover:border-orange-300 hover:shadow-md'}`}
                                    onClick={() => addToCart(product)}
                                >
                                    {/* Food Image */}
                                    {product.imageUrl ? (
                                        <div className="relative">
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-36 object-cover"
                                                onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-36 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-5xl">🍽️</div>' }}
                                            />
                                            {inCart && (
                                                <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-black text-sm shadow-lg">
                                                    {inCart.qty}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative w-full h-36 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                            <span className="text-5xl">🍽️</span>
                                            {inCart && (
                                                <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-black text-sm shadow-lg">
                                                    {inCart.qty}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight">{product.name}</p>
                                        {product.description && (
                                            <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-0.5 line-clamp-2">{product.description}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-orange-600 dark:text-orange-400 font-black">{currency} {product.price}</p>
                                            <p className="text-[10px] text-gray-400">{getCategoryName(product.category)}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); addToCart(product) }}
                                            className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-1.5 text-xs font-bold transition"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed">
                                🔍 No items found
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Order Summary (desktop) */}
                <div className="hidden lg:flex w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-800 flex-col shrink-0 h-full overflow-hidden">
                    <OrderPanel
                        cart={cart} updateQty={updateQty} subtotal={subtotal} currency={currency}
                        note={note} setNote={setNote} placing={placing}
                        handlePlaceOrder={handlePlaceOrder} selectedTableNo={selectedTableNo}
                    />
                </div>

                {/* Mobile bottom bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex gap-3 z-40">
                    <button
                        onClick={() => setShowCart(true)}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl py-3 font-bold flex items-center justify-center gap-2"
                    >
                        🛒 Cart {cart.length > 0 && <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">{cart.length}</span>}
                    </button>
                    <button
                        onClick={handlePlaceOrder}
                        disabled={placing || cart.length === 0}
                        className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-bold hover:bg-orange-600 disabled:opacity-50 transition"
                    >
                        {placing ? 'Placing...' : `Place Order — ${currency} ${subtotal.toFixed(0)}`}
                    </button>
                </div>

                {/* Mobile Cart Sheet */}
                {showCart && (
                    <div className="fixed inset-0 bg-black/60 z-50 lg:hidden flex flex-col justify-end">
                        <div className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] flex flex-col">
                            <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-black text-gray-800 dark:text-gray-100">Your Order</h3>
                                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <OrderPanel
                                    cart={cart} updateQty={updateQty} subtotal={subtotal} currency={currency}
                                    note={note} setNote={setNote} placing={placing}
                                    handlePlaceOrder={handlePlaceOrder} selectedTableNo={selectedTableNo}
                                    onClose={() => setShowCart(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

function OrderPanel({ cart, updateQty, subtotal, currency, note, setNote, placing, handlePlaceOrder, selectedTableNo, onClose }) {
    return (
        <>
            <div className="p-5 border-b dark:border-gray-800 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-gray-800 dark:text-gray-100 text-lg">Order Summary</h3>
                        {selectedTableNo && (
                            <p className="text-orange-500 font-bold text-sm">Table: {selectedTableNo}</p>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <span className="bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-black text-sm">
                            {cart.reduce((s, i) => s + i.qty, 0)}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                        <p className="text-3xl mb-2">🍽️</p>
                        <p className="text-sm">Tap items to add them</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                            {item.imageUrl && (
                                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
                                <p className="text-orange-600 dark:text-orange-400 text-sm font-black">{currency} {(item.price * item.qty).toFixed(0)}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100">-</button>
                                <span className="w-6 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 bg-orange-500 text-white rounded-full text-sm font-bold hover:bg-orange-600">+</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t dark:border-gray-800 space-y-3 flex-shrink-0">
                <div className="flex justify-between font-black text-xl text-gray-800 dark:text-gray-100">
                    <span>Total</span>
                    <span className="text-orange-600 dark:text-orange-400">{currency} {subtotal.toFixed(0)}</span>
                </div>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Special instructions (optional)..."
                    rows={2}
                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
                <button
                    onClick={handlePlaceOrder}
                    disabled={placing || cart.length === 0}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-orange-600 transition shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                    {placing ? 'Placing Order...' : '🍽️ Place Order'}
                </button>
            </div>
        </>
    )
}

export default TableOrder
