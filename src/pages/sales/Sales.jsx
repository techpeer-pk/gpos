import { useState, useEffect, useMemo } from 'react'
import Layout from '../../components/layout/Layout'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'
import { generateReceiptMessage, getWhatsAppLink, getSMSLink } from '../../utils/receiptHelper'
import { serverTimestamp } from 'firebase/firestore'

const ROWS_OPTIONS = [10, 25, 50, 100]

function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col) return <span className="ml-1 opacity-25">↕</span>
    return <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function Sales() {
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [initialLoading, setInitialLoading] = useState(true)
    const [settings, setSettings] = useState(null)
    const [search, setSearch] = useState('')
    const [sortCol, setSortCol] = useState('createdAt')
    const [sortDir, setSortDir] = useState('desc')
    const [page, setPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const currency = settings?.currency || 'PKR'
    const { user, businessId, branchId } = useAuthStore()

    const fetchSales = async () => {
        setLoading(true)
        try {
            // Get sales for current branch
            const salesSnap = await FirestoreService.getSales(businessId, branchId)
            setSettings({ currency: 'PKR' })
            const list = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            setSales(list)
        } catch (err) {
            handleError(err, 'Fetch Sales', 'Failed to load sales history')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const init = async () => {
            if (businessId && branchId) {
                await fetchSales()
            }
            setInitialLoading(false)
        }
        init()
    }, [businessId, branchId])

    const handleReturn = async (sale) => {
        if (!window.confirm('Are you sure you want to return this entire sale? This will restore items to inventory.')) return
        setLoading(true)
        try {
            // Update sale status
            await FirestoreService.updateSale(businessId, branchId, sale.id, {
                status: 'returned',
                returnedAt: serverTimestamp()
            })

            // Restore inventory for each item
            for (const item of sale.items) {
                const invSnap = await FirestoreService.getInventoryByProduct(businessId, branchId, item.productId)
                if (invSnap.docs.length > 0) {
                    const invDoc = invSnap.docs[0]
                    const currentQty = invDoc.data().quantity || 0
                    await FirestoreService.updateInventory(businessId, branchId, invDoc.id, {
                        quantity: currentQty + item.quantity,
                        lastUpdated: serverTimestamp()
                    })
                }
            }
            showSuccess('Sale returned and stock restored successfully')
            fetchSales()
            setSelected(null)
        } catch (err) {
            handleError(err, 'Process Return', 'Failed to process return')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return '-'
        return timestamp.toDate().toLocaleString()
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)

    // ── Interactive Table Logic ──────────────────────────────
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
        if (!q) return sales
        return sales.filter(s =>
            s.id.toLowerCase().includes(q) ||
            s.id.slice(-6).toLowerCase().includes(q) ||
            (s.customerName?.toLowerCase().includes(q)) ||
            (s.cashierName?.toLowerCase().includes(q)) ||
            (s.paymentMethod?.toLowerCase().includes(q))
        )
    }, [sales, search])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let aVal, bVal
            if (sortCol === 'createdAt') {
                aVal = a.createdAt?.toMillis?.() || 0
                bVal = b.createdAt?.toMillis?.() || 0
            } else if (sortCol === 'total') {
                aVal = a.total || 0; bVal = b.total || 0
            } else if (sortCol === 'items') {
                aVal = a.items?.length || 0; bVal = b.items?.length || 0
            } else if (sortCol === 'method') {
                aVal = a.paymentMethod || ''; bVal = b.paymentMethod || ''
            } else {
                aVal = a[sortCol] || ''; bVal = b[sortCol] || ''
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [filtered, sortCol, sortDir])

    const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage))
    const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    // ────────────────────────────────────────────────────────

    if (initialLoading) {
        return (
            <Layout title="Sales History">
                <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Financial History...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Sales History">

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-12">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Transactions</p>
                    <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">{sales.length}</h3>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-black text-green-600 dark:text-green-400">
                        {sales[0]?.currency || 'PKR'} {totalRevenue.toFixed(2)}
                    </h3>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Average Sale</p>
                    <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {sales[0]?.currency || 'PKR'} {sales.length ? (totalRevenue / sales.length).toFixed(2) : '0.00'}
                    </h3>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* Sales Table */}
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">

                    {/* Controls: Search + Rows per page */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b dark:border-gray-800">
                        <div className="relative w-full sm:max-w-sm">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                            <input
                                type="text"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1) }}
                                placeholder="Search by Transaction ID, Customer, Cashier..."
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

                    {/* Search result info banner */}
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
                                    <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('id')}>
                                        Transaction ID <SortIcon col="id" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('createdAt')}>
                                        Date & Time <SortIcon col="createdAt" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('items')}>
                                        Items <SortIcon col="items" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('method')}>
                                        Payment <SortIcon col="method" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('total')}>
                                        Revenue <SortIcon col="total" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th className="text-left px-4 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-12 text-gray-400 dark:text-gray-500 italic">
                                            Syncing with ledger...
                                        </td>
                                    </tr>
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-12 text-gray-400 dark:text-gray-500 italic">
                                            {search ? 'No transactions match your search.' : 'No sales yet. Make your first sale in POS!'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((sale, index) => (
                                        <tr
                                            key={sale.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${selected?.id === sale.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                            onClick={() => setSelected(sale)}
                                        >
                                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs font-medium">
                                                {(page - 1) * rowsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-gray-800 dark:text-gray-100 font-mono">
                                                        #{sale.id.slice(-6).toUpperCase()}
                                                    </span>
                                                    <span
                                                        className="text-[9px] text-gray-400 dark:text-gray-600 font-mono truncate max-w-[140px]"
                                                        title={sale.id}
                                                    >
                                                        {sale.id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-[11px] font-medium">{formatDate(sale.createdAt)}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs font-bold">{sale.items?.length} items</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sale.paymentMethod === 'cash'
                                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                    : sale.paymentMethod === 'card'
                                                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                                                    }`}>
                                                    {sale.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900 dark:text-gray-100 text-sm">{sale.currency || 'PKR'} {sale.total?.toLocaleString()}</span>
                                                    {sale.status === 'returned' && (
                                                        <span className="text-[10px] text-red-500 font-black uppercase">Returned</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setSelected(sale)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs font-black uppercase tracking-widest"
                                                    >Detail</button>
                                                    <button
                                                        onClick={() => window.open(`/invoice/${sale.id}`, '_blank')}
                                                        className="text-gray-600 dark:text-gray-400 hover:text-blue-600 font-black text-[10px] uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg border dark:border-gray-700 transition"
                                                    >📜 Receipt</button>
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
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${p === page
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >{p}</button>
                                )
                            })}

                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 text-xs font-bold rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">›</button>
                            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs font-bold rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">»</button>
                        </div>
                    </div>
                </div>

                {/* Sale Detail Panel */}
                {selected && (
                    <div className="w-full lg:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 lg:sticky lg:top-24 lg:h-fit transition-all duration-300 animate-in slide-in-from-right">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Voucher Breakdown</h3>
                            <button
                                onClick={() => setSelected(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >✕</button>
                        </div>

                        {/* Full Transaction ID */}
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Transaction ID</p>
                            <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 break-all">{selected.id}</p>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-1">Short: #{selected.id.slice(-6).toUpperCase()}</p>
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6 border-b dark:border-gray-800 pb-2">
                            Issued: {formatDate(selected.createdAt)}
                        </p>

                        <div className="space-y-4 mb-8">
                            {selected.items?.map((item, i) => (
                                <div key={i} className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{item.name}</span>
                                        <span className="text-[10px] text-gray-500 font-medium">Qty: {item.quantity} × {currency} {item.price}</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-900 dark:text-gray-100">{selected.currency || 'PKR'} {item.total}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t dark:border-gray-800 pt-6 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                                <span className="uppercase tracking-widest">Subtotal</span>
                                <span>{selected.currency || 'PKR'} {selected.subtotal?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                                <span className="uppercase tracking-widest">{selected.taxLabel || 'Tax'}</span>
                                <span>{selected.currency || 'PKR'} {selected.tax?.toFixed(2)}</span>
                            </div>
                            {selected.discount > 0 && (
                                <div className="flex justify-between text-xs font-black text-blue-600 dark:text-blue-400">
                                    <span className="uppercase tracking-widest">Discount Applied</span>
                                    <span>-{selected.currency || 'PKR'} {selected.discount?.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-black text-gray-900 dark:text-gray-100 border-t dark:border-gray-800 pt-4 text-xl">
                                <span className="uppercase tracking-tighter">Net Total</span>
                                <span className="text-blue-600 dark:text-blue-400">{selected.currency || 'PKR'} {selected.total?.toFixed(2)}</span>
                            </div>
                            <div className="pt-4 space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 italic">
                                    <span>Paid Amount</span>
                                    <span>{selected.currency || 'PKR'} {selected.amountPaid?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold text-green-600 dark:text-green-400 italic">
                                    <span>Change Returned</span>
                                    <span>{selected.currency || 'PKR'} {selected.change?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${selected.paymentMethod === 'cash'
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : selected.paymentMethod === 'card'
                                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                                }`}>
                                Method: {selected.paymentMethod}
                            </span>

                            {selected.customerPhone && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            const msg = generateReceiptMessage(selected, settings)
                                            window.open(getWhatsAppLink(selected.customerPhone, msg), '_blank')
                                        }}
                                        className="bg-green-600 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition flex items-center justify-center gap-2"
                                    ><span>📱</span> WhatsApp</button>
                                    <button
                                        onClick={() => {
                                            const msg = generateReceiptMessage(selected, settings)
                                            window.location.href = getSMSLink(selected.customerPhone, msg)
                                        }}
                                        className="bg-gray-800 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition flex items-center justify-center gap-2"
                                    ><span>💬</span> SMS</button>
                                </div>
                            )}
                        </div>

                        {selected.status !== 'returned' && (user?.role === 'admin' || user?.role === 'manager') && (
                            <button
                                onClick={() => handleReturn(selected)}
                                disabled={loading}
                                className="w-full mt-8 bg-red-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                🔄 Process Void Return
                            </button>
                        )}
                    </div>
                )}
            </div>

        </Layout>
    )
}

export default Sales