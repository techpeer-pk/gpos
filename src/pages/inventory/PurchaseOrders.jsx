import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { db } from '../../firebase/config'
import { handleError, showSuccess } from '../../utils/errorHandler'
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    where,
    limit,
    increment,
    orderBy
} from 'firebase/firestore'

import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'

function PurchaseOrders() {
    const { businessId, branchId } = useAuthStore()
    const [pos, setPos] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [products, setProducts] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    // Form state
    const [selectedSupplier, setSelectedSupplier] = useState('')
    const [orderItems, setOrderItems] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch Data
    const fetchData = async () => {
        if (!businessId || !branchId) return
        try {
            const [poSnap, supplierSnap, productSnap] = await Promise.all([
                FirestoreService.getPurchaseOrders(businessId, branchId),
                FirestoreService.getSuppliers(businessId),
                FirestoreService.getProducts(businessId)
            ])

            setPos(poSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            setSuppliers(supplierSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            setProducts(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        } catch (err) {
            handleError(err, 'Fetch PO Data', 'Failed to load procurement data')
        }
    }

    useEffect(() => {
        if (businessId && branchId) {
            fetchData()
            setInitialLoading(false)
        }
    }, [businessId, branchId])

    const addToOrder = (product) => {
        const existing = orderItems.find(item => item.productId === product.id)
        if (existing) {
            setOrderItems(orderItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setOrderItems([...orderItems, {
                productId: product.id,
                name: product.name,
                costPrice: product.costPrice || 0,
                quantity: 1
            }])
        }
    }

    const updateItem = (id, field, value) => {
        setOrderItems(orderItems.map(item =>
            item.productId === id ? { ...item, [field]: value } : item
        ))
    }

    const removeItem = (id) => {
        setOrderItems(orderItems.filter(item => item.productId !== id))
    }

    const [editingPo, setEditingPo] = useState(null)

    const totalCost = orderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0)

    const handleEdit = (po) => {
        if (po.status !== 'pending') return alert('Only pending orders can be edited')
        setEditingPo(po)
        setSelectedSupplier(po.supplierId)
        setOrderItems(po.items)
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (po) => {
        if (po.status === 'received') return alert('Cannot delete a received order')
        if (!window.confirm('Are you sure you want to delete this purchase order?')) return

        setLoading(true)
        try {
            await FirestoreService.deletePurchaseOrder(businessId, branchId, po.id)
            showSuccess('Purchase order deleted successfully')
            fetchData()
        } catch (err) {
            handleError(err, 'Delete PO', 'Failed to delete purchase order')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedSupplier) return alert('Select a supplier')
        if (orderItems.length === 0) return alert('Add items to order')

        setLoading(true)
        try {
            const supplier = suppliers.find(s => s.id === selectedSupplier)
            const poData = {
                supplierId: selectedSupplier,
                supplierName: supplier.name,
                items: orderItems,
                totalAmount: totalCost,
                status: 'pending', // pending, received, cancelled
                updatedAt: serverTimestamp()
            }

            if (editingPo) {
                await FirestoreService.updatePurchaseOrder(businessId, branchId, editingPo.id, poData)
                showSuccess('Purchase order updated')
            } else {
                await FirestoreService.addPurchaseOrder(businessId, branchId, {
                    ...poData,
                    createdAt: serverTimestamp()
                })
                showSuccess('Purchase order created')
            }

            setShowForm(false)
            setEditingPo(null)
            setOrderItems([])
            setSelectedSupplier('')
            fetchData()
        } catch (err) {
            handleError(err, 'Save PO', 'Failed to save purchase order')
        } finally {
            setLoading(false)
        }
    }

    const handleReceive = async (po) => {
        if (!window.confirm('Mark this order as received? This will automatically add items to your inventory.')) return

        setLoading(true)
        try {
            // 1. Update PO status
            await FirestoreService.updatePurchaseOrder(businessId, branchId, po.id, {
                status: 'received',
                receivedAt: serverTimestamp()
            })

            // 2. Update Inventory for each item
            for (const item of po.items) {
                const invSnap = await FirestoreService.getInventoryByProduct(businessId, branchId, item.productId)

                if (!invSnap.empty) {
                    const invDoc = invSnap.docs[0]
                    await FirestoreService.updateInventory(businessId, branchId, invDoc.id, {
                        quantity: increment(item.quantity),
                        lastUpdated: serverTimestamp()
                    })
                } else {
                    // Fallback: create inventory if missing
                    await FirestoreService.addInventory(businessId, branchId, item.productId, {
                        productId: item.productId,
                        quantity: item.quantity,
                        reorderLevel: 10,
                        lastUpdated: serverTimestamp()
                    })
                }
            }

            showSuccess('Order received and inventory updated!')
            fetchData()
        } catch (err) {
            handleError(err, 'Receive PO', 'Failed to receive order')
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Layout title="Purchase Orders">

            {initialLoading && (
                <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center z-[9999]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Synchronizing Supply Chain Logistics...</p>
                </div>
            )}

            <div className="flex justify-between items-center mb-8 mt-12">
                <p className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-widest">{pos.length} total procurement cycles</p>
                <button
                    onClick={() => {
                        setShowForm(!showForm)
                        if (showForm) {
                            setEditingPo(null)
                            setOrderItems([])
                            setSelectedSupplier('')
                        }
                    }}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                    {showForm ? 'Cancel Procurement' : '+ Initialize Purchase Order'}
                </button>
            </div>

            {showForm && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">

                    {/* Item Picker */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-6 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search Stock Database..."
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProducts.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => addToOrder(p)}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm border dark:border-gray-700 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                        📦
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-100 truncate uppercase tracking-tight">{p.name}</p>
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mt-1">Cost: {p.costPrice || 0}</p>
                                    </div>
                                    <span className="text-blue-600 dark:text-blue-400 font-black text-xl group-hover:scale-125 transition-transform">+</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary Form */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col h-[600px]">
                        <h3 className="font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest text-xs mb-8 flex items-center gap-3">
                            <span className="text-xl">📋</span> {editingPo ? 'Review Procurement' : 'Draft Order Sheet'}
                        </h3>

                        <div className="mb-6">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Vendor Authorization</label>
                            <select
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                            >
                                <option value="">Identify Supply Node</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                            {orderItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-4 grayscale">
                                    <div className="text-6xl mb-4">📜</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-gray-500">Manifest Is Empty.<br />Await Input From Stock Database.</p>
                                </div>
                            ) : (
                                orderItems.map(item => (
                                    <div key={item.productId} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-3 group/item">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-black text-gray-800 dark:text-gray-100 truncate flex-1 uppercase tracking-tight">{item.name}</p>
                                            <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors ml-2">✕</button>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">Units</label>
                                                <input
                                                    type="number"
                                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">Unit Cost</label>
                                                <input
                                                    type="number"
                                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                                    value={item.costPrice}
                                                    onChange={(e) => updateItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t dark:border-gray-800 pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-black text-gray-400 dark:text-gray-500 uppercase text-[10px] tracking-widest">Aggregate Liability</span>
                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || orderItems.length === 0}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Transmitting...' : (editingPo ? 'Update PO Manifest' : 'Authorize Order')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">PO Identifier</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Supply Node</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Valuation</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Lifecycle</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {pos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-gray-400 dark:text-gray-500 italic">No purchase orders mapped in procurement history.</td>
                                </tr>
                            ) : (
                                pos.map(po => (
                                    <tr key={po.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-5 font-black text-gray-800 dark:text-gray-100 text-sm">#{po.id.slice(-6).toUpperCase()}</td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight">{po.supplierName}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Verified Vendor</p>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-600 dark:text-gray-400 font-bold">
                                            {po.createdAt?.toDate().toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight">
                                                {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${po.status === 'received' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30' :
                                                po.status === 'pending' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30' :
                                                    'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-100 dark:border-gray-700'
                                                }`}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                {po.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleReceive(po)}
                                                            className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition shadow-lg shadow-green-500/20 active:scale-95"
                                                        >
                                                            📥 Receive
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(po)}
                                                            className="p-2 text-blue-400 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition opacity-0 group-hover:opacity-100"
                                                            title="Modify Order"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(po)}
                                                            className="p-2 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition opacity-0 group-hover:opacity-100"
                                                            title="Purge Order"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => window.open(`/po-invoice/${po.id}`, '_blank')}
                                                    className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                                    title="Generate Print"
                                                >
                                                    🖨️ Print
                                                </button>
                                                {po.status === 'received' && (
                                                    <span className="text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest italic ml-2">Logged ✅</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </Layout>
    )
}

export default PurchaseOrders
