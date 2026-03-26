import { useState, useEffect, memo } from 'react'
import Layout from '../../components/layout/Layout'
import { auth } from '../../firebase/config'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'
import { serverTimestamp } from 'firebase/firestore'
import { generateReceiptMessage, getWhatsAppLink, getSMSLink } from '../../utils/receiptHelper'
import SearchableDropdown from '../../components/common/SearchableDropdown'

// ─── Cart Panel — defined OUTSIDE POS so it never remounts on parent re-render
const CartPanel = memo(({
    cart, customers, selectedCustomer, setSelectedCustomer,
    currency, subtotal, tax, total, change, taxEnabled, setTaxEnabled,
    settings, redeemPoints, setRedeemPoints, redemptionValue,
    paymentMethod, setPaymentMethod,
    amountPaid, setAmountPaid,
    lastSaleId, lastSaleData, success,
    loading, handleCheckout, handleHoldSale, clearCart,
    setMobileCartOpen, updateQty, removeFromCart, handleShare
}) => (
    <>
        {/* Cart Header */}
        <div className="p-4 border-b dark:border-gray-800 space-y-3 flex-shrink-0">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                    🛒 Cart ({cart.length} items)
                </h3>
                <button
                    className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                    onClick={() => setMobileCartOpen(false)}
                >✕</button>
            </div>
            <div className="mt-2">
                <SearchableDropdown
                    label="Customer"
                    options={customers}
                    value={selectedCustomer}
                    onChange={setSelectedCustomer}
                    placeholder="Search by name or phone..."
                />
            </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-center mt-8">Click products to add them here</p>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                            <p className="text-blue-600 dark:text-blue-400 text-sm font-bold">{currency} {item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100">-</button>
                            <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                                className="w-12 text-center border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg text-sm py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                            />
                            <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                ))
            )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t space-y-3 flex-shrink-0">
            <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span><span>{currency} {subtotal.toFixed(2)}</span>
                </div>
                {settings?.taxEnabled && (
                    <div className="flex justify-between text-sm text-gray-500 items-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTaxEnabled(!taxEnabled)}
                                className={`w-8 h-4 rounded-full transition ${taxEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-3 h-3 bg-white dark:bg-gray-200 rounded-full shadow transition-transform ${taxEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                            <span className="dark:text-gray-300">{settings.taxLabel || 'Tax'} ({settings.taxRate}%)</span>
                        </div>
                        <span className="dark:text-gray-300">{currency} {tax.toFixed(2)}</span>
                    </div>
                )}
                {settings?.loyaltyEnabled && selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
                    <div className="flex justify-between text-sm items-center py-1 bg-blue-50 dark:bg-blue-900/20 px-2 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={redeemPoints} onChange={(e) => setRedeemPoints(e.target.checked)} className="w-4 h-4 rounded text-blue-600 bg-white dark:bg-gray-800" />
                            <span className="text-blue-700 dark:text-blue-400 text-xs font-bold">Redeem {selectedCustomer.loyaltyPoints} pts</span>
                        </div>
                        <span className="text-blue-700 dark:text-blue-400 font-bold">-{currency} {redemptionValue.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between font-black text-xl text-gray-900 dark:text-gray-100 border-t-2 border-gray-900 dark:border-gray-700 pt-3 mt-1">
                    <span>Total</span><span>{currency} {total.toFixed(2)}</span>
                </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-3 gap-2">
                {['cash', 'card', 'credit'].map(method => (
                    <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-lg text-xs font-medium capitalize transition ${paymentMethod === method ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >{method}</button>
                ))}
            </div>

            {/* Amount Paid */}
            {paymentMethod === 'cash' && (
                <div>
                    <input
                        type="number"
                        placeholder="Amount paid"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {change > 0 && (
                        <p className="text-green-600 dark:text-green-400 text-sm mt-1 font-medium italic">Change: {currency} {change.toFixed(2)}</p>
                    )}
                </div>
            )}

            {/* Print Receipt */}
            {(lastSaleId && cart.length === 0) && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex flex-col items-center gap-3">
                    <div className="text-center">
                        <p className="text-blue-800 font-black text-sm uppercase tracking-widest">
                            {success ? 'Sale Completed! 🎉' : 'Last Sale Information'}
                        </p>
                        <p className="text-blue-600 text-[10px] font-bold mt-0.5">Receipt ID: #{lastSaleId.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={() => window.open(`/invoice/${lastSaleId}`, '_blank')}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-md flex items-center gap-2 w-full justify-center"
                        ><span>📜</span> View Full Invoice</button>

                        {lastSaleData?.customerPhone && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleShare('whatsapp', lastSaleData)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition flex items-center gap-2 justify-center"
                                ><span>📱</span> WhatsApp</button>
                                <button
                                    onClick={() => handleShare('sms', lastSaleData)}
                                    className="bg-gray-800 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition flex items-center gap-2 justify-center"
                                ><span>💬</span> Send SMS</button>
                            </div>
                        )}

                        <button
                            onClick={clearCart}
                            className="bg-white text-blue-600 border-2 border-blue-100 px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition flex items-center gap-2 w-full justify-center"
                        >➕ New Sale</button>
                    </div>
                </div>
            )}

            {/* Checkout */}
            <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-green-700 transition shadow-lg disabled:opacity-50"
            >{loading ? 'Processing...' : `Pay ${currency} ${total.toFixed(2)}`}</button>

            {/* Hold & Clear */}
            {cart.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleHoldSale} disabled={loading} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50">⏸️ Hold Sale</button>
                    <button onClick={clearCart} className="w-full text-red-400 hover:text-red-600 border border-red-100 rounded-lg py-2 text-sm">Clear Cart</button>
                </div>
            )}
        </div>
    </>
))

// ─── Main POS Component ───────────────────────────────────────────────────────
function POS() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState('all')
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [customers, setCustomers] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [settings, setSettings] = useState(null)
    const [initialLoading, setInitialLoading] = useState(true)
    const [taxEnabled, setTaxEnabled] = useState(true)
    const [redeemPoints, setRedeemPoints] = useState(false)
    const [suspendedSales, setSuspendedSales] = useState([])
    const [showHeldSales, setShowHeldSales] = useState(false)
    const [lastSaleId, setLastSaleId] = useState(null)
    const [lastSaleData, setLastSaleData] = useState(null)
    const [mobileCartOpen, setMobileCartOpen] = useState(false)
    const [barcodeFlash, setBarcodeFlash] = useState(false)
    const { user, businessId, branchId } = useAuthStore()

    const [amountPaid, setAmountPaid] = useState('')

    const currency = settings?.currency || 'PKR'

    const handleShare = (method, sale) => {
        const message = generateReceiptMessage(sale, settings)
        if (method === 'whatsapp') {
            window.open(getWhatsAppLink(sale.customerPhone, message), '_blank')
        } else {
            window.location.href = getSMSLink(sale.customerPhone, message)
        }
    }

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                // Use new multi-branch API
                const [productSnap, inventorySnap, categorySnap, customerSnap] = await Promise.all([
                    FirestoreService.getProducts(businessId),
                    FirestoreService.getInventory(businessId, branchId),
                    FirestoreService.getCategories(businessId),
                    FirestoreService.getCustomers(businessId),
                ])
                const inventoryList = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }))
                const categoryList = categorySnap.docs.map(d => ({ id: d.id, ...d.data() }))
                setProducts(productSnap.docs.map(d => {
                    const p = { id: d.id, ...d.data() }
                    const inv = inventoryList.find(i => i.productId === p.id)
                    return { ...p, stock: inv?.quantity ?? null }
                }))
                setCategories(categoryList)
                setCustomers(customerSnap.docs.map(d => ({ id: d.id, ...d.data() })))
                
                // Set default settings (no global settings collection in new structure)
                setSettings({ currency: 'PKR', taxLabel: 'Tax', loyaltyPointsPerAmount: 1 })
                
                // Get suspended sales for this branch
                const suspSnap = await FirestoreService.getSuspendedSales(businessId, branchId)
                setSuspendedSales(suspSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch (err) {
                console.error('POS fetch error:', err)
            } finally {
                setInitialLoading(false)
            }
        }
        
        if (businessId && branchId) {
            fetchInitial()
        }
    }, [businessId, branchId])

    if (initialLoading) {
        return (
            <Layout title="POS">
                <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading POS data...</p>
                </div>
            </Layout>
        )
    }

    const addToCart = (product) => {
        setSuccess(false)
        setLastSaleId(null)
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id))

    const updateQty = (id, qty) => {
        if (qty < 1) return removeFromCart(id)
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item))
    }

    const clearCart = () => {
        setCart([])
        setLastSaleId(null)
        setSuccess(false)
        setAmountPaid('')
        setMobileCartOpen(false)
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const activeTaxRate = (settings?.taxEnabled && taxEnabled) ? settings.taxRate : 0
    const tax = (subtotal * activeTaxRate) / 100
    const redemptionValue = (redeemPoints && selectedCustomer)
        ? selectedCustomer.loyaltyPoints * (settings?.pointsRedemptionRate || 0) : 0
    const total = Math.max(0, subtotal + tax - redemptionValue)
    const change = amountPaid && parseFloat(amountPaid) > total ? parseFloat(amountPaid) - total : 0

    const handleBarcodeSearch = (e) => {
        if (e.key === 'Enter') {
            const barcode = search.trim()
            if (!barcode) return
            const found = products.find(p => p.barcode && p.barcode.trim() === barcode)
                || products.find(p => p.name.toLowerCase() === barcode.toLowerCase())
            if (found) {
                addToCart(found)
                setSearch('')
                setBarcodeFlash(true)
                setTimeout(() => setBarcodeFlash(false), 500)
            }
        }
    }

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search))
        const matchesCategory = activeCategory === 'all' || p.category === activeCategory
        return matchesSearch && matchesCategory
    })

    const getCategoryName = (catId) => {
        if (!catId) return 'General'
        const cat = categories.find(c => c.id === catId)
        return cat ? cat.name : catId
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return alert('Cart is empty!')
        const paid = amountPaid
        if (paymentMethod === 'cash' && (!paid || parseFloat(paid) <= 0)) return alert('Please enter amount paid!')
        if (paymentMethod === 'cash' && parseFloat(paid) < total) return alert(`Amount paid is less than total! Minimum: ${currency} ${total.toFixed(2)}`)
        setLoading(true)
        try {
            const saleData = {
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    costPrice: item.costPrice || 0,
                    quantity: item.quantity,
                    total: item.price * item.quantity
                })),
                subtotal, tax, 
                finalAmount: total,
                currency,
                taxLabel: settings?.taxLabel || 'Tax',
                discount: redeemPoints ? redemptionValue : 0,
                paymentMethod,
                amountPaid: Number(amountPaid) || total,
                change: Number(change) || 0,
                cashierName: user?.name || auth.currentUser?.displayName || 'Unknown Staff',
                cashierId: auth.currentUser?.uid,
                customerId: selectedCustomer?.id || 'walk-in',
                customerName: selectedCustomer?.name || 'Walk-in Customer',
                customerPhone: selectedCustomer?.phone || '',
                status: 'completed',
                createdAt: serverTimestamp()
            }

            // Add sale using new API
            const newSale = await FirestoreService.addSale(businessId, branchId, saleData)

            // Update customer loyalty points
            if (selectedCustomer && selectedCustomer.id !== 'walk-in') {
                const earnedPoints = Math.floor((total / 100) * (settings?.loyaltyPointsPerAmount || 1))
                const pointsToDeduct = redeemPoints ? selectedCustomer.loyaltyPoints : 0
                await FirestoreService.updateCustomer(businessId, selectedCustomer.id, {
                    totalSpent: (selectedCustomer.totalSpent || 0) + total,
                    loyaltyPoints: (selectedCustomer.loyaltyPoints || 0) + earnedPoints - pointsToDeduct,
                    totalVisits: (selectedCustomer.totalVisits || 0) + 1,
                    lastVisit: serverTimestamp()
                })
            }

            // Update inventory for each item
            for (const item of cart) {
                const invSnap = await FirestoreService.getInventoryByProduct(businessId, branchId, item.id)
                if (invSnap.docs.length > 0) {
                    const invDoc = invSnap.docs[0]
                    const currentQty = invDoc.data().quantity || 0
                    await FirestoreService.updateInventory(businessId, branchId, invDoc.id, {
                        quantity: Math.max(0, currentQty - item.quantity),
                        lastUpdated: serverTimestamp()
                    })
                }
            }

            const finalSaleData = { id: newSale.id, ...saleData }

            // Add to cash flow if cash payment
            if (paymentMethod === 'cash') {
                try {
                    await FirestoreService.addCashFlow(businessId, branchId, {
                        type: 'in',
                        category: 'Sales',
                        amount: total,
                        reason: `POS Sale (Auto-sync) #${newSale.id.slice(-6)}`,
                        date: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp(),
                        saleId: newSale.id
                    })
                } catch (err) {
                    console.error('Cash Flow Sync Failed:', err)
                }
            }

            setCart([])
            setAmountPaid('')
            setSelectedCustomer(null)
            setRedeemPoints(false)
            setSuccess(newSale.id)
            setLastSaleId(newSale.id)
            setLastSaleData(finalSaleData)
            setMobileCartOpen(true)
            showSuccess('Sale completed successfully')
            setTimeout(() => setSuccess(false), 15000)
        } catch (err) {
            handleError(err, 'Process Sale', 'Failed to complete sale')
        } finally {
            setLoading(false)
        }
    }

    const handleHoldSale = async () => {
        if (cart.length === 0) return alert('Cart is empty!')
        setLoading(true)
        try {
            await FirestoreService.addSuspendedSale(businessId, branchId, {
                items: cart,
                subtotal, tax,
                taxLabel: settings?.taxLabel || 'Tax',
                discount: redemptionValue,
                total,
                currency,
                customerId: selectedCustomer?.id || 'walk-in',
                customerName: selectedCustomer?.name || 'Walk-in Customer',
                cashierId: auth.currentUser?.uid,
                cashierName: user?.name || auth.currentUser?.displayName || 'Unknown Staff',
                createdAt: serverTimestamp()
            })
            setCart([])
            setSelectedCustomer(null)
            setRedeemPoints(false)
            setMobileCartOpen(false)
            setAmountPaid('')
            
            // Refresh suspended sales list
            const snapshot = await FirestoreService.getSuspendedSales(businessId, branchId)
            setSuspendedSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
            alert('Sale suspended successfully!')
        } catch (err) {
            console.error(err)
            handleError(err, 'Hold Sale', 'Failed to suspend sale')
        } finally {
            setLoading(false)
        }
    }

    const restoreHeldSale = async (heldSale) => {
        if (cart.length > 0 && !window.confirm('Current cart will be cleared. Continue?')) return
        setCart(heldSale.items)
        setSelectedCustomer(customers.find(c => c.id === heldSale.customerId) || null)
        try {
            await FirestoreService.deleteSuspendedSale(businessId, branchId, heldSale.id)
            setSuspendedSales(suspendedSales.filter(s => s.id !== heldSale.id))
            setShowHeldSales(false)
            showSuccess('Sale resumed')
        } catch (err) {
            handleError(err, 'Resume Sale', 'Failed to resume sale')
        }
    }

    const cartProps = {
        cart, customers, selectedCustomer, setSelectedCustomer,
        currency, subtotal, tax, total, change, taxEnabled, setTaxEnabled,
        settings, redeemPoints, setRedeemPoints, redemptionValue,
        paymentMethod, setPaymentMethod,
        amountPaid, setAmountPaid,
        lastSaleId, success, loading,
        handleCheckout, handleHoldSale, clearCart,
        setMobileCartOpen, updateQty, removeFromCart
    }

    return (
        <Layout title="POS">
            <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-80px)] mt-12 relative">

                {/* Left — Products */}
                <div className="flex-1 lg:overflow-y-auto min-w-0">
                    <div className="flex gap-3 mb-4 pt-2">
                        <input
                            type="text"
                            placeholder="🔍 Search by name or barcode..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleBarcodeSearch}
                            className={`flex-1 border dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-all ${barcodeFlash ? 'bg-green-50 dark:bg-green-900/20 border-green-400 ring-2 ring-green-400' : ''}`}
                        />
                        <button
                            onClick={() => setShowHeldSales(true)}
                            className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition relative"
                        >
                            <span>⏸️</span> Held
                            {suspendedSales.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{suspendedSales.length}</span>
                            )}
                        </button>
                    </div>

                    {categories.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                            <button onClick={() => setActiveCategory('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex-shrink-0 ${activeCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border dark:border-gray-700 hover:border-blue-400'}`}>
                                {categories.find(c => c.icon)?.icon || '🏪'} All
                            </button>
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex-shrink-0 ${activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border dark:border-gray-700 hover:border-blue-400'}`}>
                                    {cat.icon} {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 lg:pb-4">
                        {filtered.map(product => (
                            <button key={product.id} onClick={() => addToCart(product)} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md dark:hover:shadow-blue-900/20 hover:border-blue-500 border-2 border-transparent transition text-left">
                                <div className="w-full h-16 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3"><span className="text-3xl">📦</span></div>
                                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{product.name}</p>
                                <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">{currency} {product.price}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-gray-400 dark:text-gray-500 text-xs">{getCategoryName(product.category)}</p>
                                    {product.stock !== null && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${product.stock <= 0 ? 'bg-red-100 dark:bg-red-900/20 text-red-500' : product.stock <= 10 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600' : 'bg-green-100 dark:bg-green-900/20 text-green-600'}`}>
                                            {product.stock <= 0 ? 'Out' : `${product.stock} left`}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-dashed border-gray-200 dark:border-gray-800">
                                🔍 No products found. Try a different search!
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Cart */}
                <div className="hidden lg:flex w-96 bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 flex-col shrink-0 h-full overflow-hidden">
                    <CartPanel {...cartProps} />
                </div>

                {/* Mobile Floating Button + Bottom Sheet */}
                <div className="lg:hidden">
                    <button onClick={() => setMobileCartOpen(true)} className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 z-[999]">
                        🛒 Cart
                        {cart.length > 0 && <span className="bg-white text-green-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">{cart.length}</span>}
                        {cart.length > 0 && <span className="text-sm font-black">{currency} {total.toFixed(2)}</span>}
                    </button>
                    {mobileCartOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]" onClick={() => setMobileCartOpen(false)} />}
                    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-[999] transition-transform duration-300 max-h-[90vh] flex flex-col border-t dark:border-gray-800 ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        </div>
                        <CartPanel {...cartProps} />
                    </div>
                </div>
            </div>

            {/* Held Sales Modal */}
            {showHeldSales && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border dark:border-gray-800">
                        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-orange-50 dark:bg-orange-950/20">
                            <div>
                                <h3 className="text-xl font-black text-orange-800 dark:text-orange-400 uppercase tracking-tight">Suspended Sales</h3>
                                <p className="text-orange-600 dark:text-orange-500 text-xs font-bold">Pick up where you left off</p>
                            </div>
                            <button onClick={() => setShowHeldSales(false)} className="text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 p-2 rounded-full transition">✕</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {suspendedSales.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 dark:text-gray-500 italic">No held sales found</div>
                            ) : (
                                <div className="space-y-4">
                                    {suspendedSales.map((sale) => (
                                        <div key={sale.id} className="border dark:border-gray-800 rounded-2xl p-5 hover:border-orange-500 transition-all flex justify-between items-center group bg-gray-50/50 dark:bg-gray-800/30">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-800 dark:text-gray-100">#{sale.id.slice(-6).toUpperCase()}</span>
                                                    <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-black uppercase">{sale.items?.length} Items</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 italic leading-none">{sale.customerName}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{sale.createdAt?.toDate().toLocaleString()}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Total</p>
                                                    <p className="text-xl font-black text-gray-900 dark:text-gray-100">{sale.currency} {sale.total?.toFixed(2)}</p>
                                                </div>
                                                <button onClick={() => restoreHeldSale(sale)} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition shadow-lg group-hover:scale-105">Retrieve</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default POS