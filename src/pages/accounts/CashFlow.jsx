import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { db } from '../../firebase/config'
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    doc,
    serverTimestamp,
    query,
    orderBy,
    limit
} from 'firebase/firestore'

import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

function CashFlow() {
    const { businessId, branchId } = useAuthStore()
    const [movements, setMovements] = useState([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [type, setType] = useState('in') // 'in' or 'out'
    const [settings, setSettings] = useState(null)
    const currency = settings?.currency || 'PKR'

    const [form, setForm] = useState({
        amount: '',
        reason: '',
        date: new Date().toISOString().split('T')[0]
    })

    const [editingMovement, setEditingMovement] = useState(null)

    const fetchMovements = async () => {
        if (!businessId || !branchId) return
        try {
            const [movementsSnap, businessSnap] = await Promise.all([
                FirestoreService.getCashFlow(businessId, branchId),
                FirestoreService.getBusiness(businessId)
            ])

            if (businessSnap.exists()) setSettings(businessSnap.data())
            setMovements(movementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        } catch (err) {
            handleError(err, 'Fetch Cash Flow', 'Failed to load cash flow records')
        }
    }

    useEffect(() => {
        if (businessId && branchId) {
            fetchMovements()
            setInitialLoading(false)
        }
    }, [businessId, branchId])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const amount = parseFloat(form.amount)
            await FirestoreService.addCashFlow(businessId, branchId, {
                ...form,
                amount: type === 'out' ? -Math.abs(amount) : Math.abs(amount),
                type,
                createdAt: serverTimestamp()
            })
            setForm({
                amount: '',
                reason: '',
                date: new Date().toISOString().split('T')[0]
            })
            setShowForm(false)
            showSuccess('Cash flow recorded')
            fetchMovements()
        } catch (err) {
            handleError(err, 'Add Cash Flow', 'Failed to record cash flow')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const amount = parseFloat(editingMovement.amount)
            await FirestoreService.updateCashFlow(businessId, branchId, editingMovement.id, {
                ...editingMovement,
                amount: editingMovement.type === 'out' ? -Math.abs(amount) : Math.abs(amount),
                updatedAt: serverTimestamp()
            })
            setEditingMovement(null)
            showSuccess('Cash flow updated')
            fetchMovements()
        } catch (err) {
            handleError(err, 'Update Cash Flow', 'Failed to update record')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('Delete this cash flow record? This will affect the calculated balance.')) {
            try {
                await FirestoreService.deleteCashFlow(businessId, branchId, id)
                showSuccess('Record deleted')
                fetchMovements()
            } catch (err) {
                handleError(err, 'Delete Cash Flow', 'Failed to delete record')
            }
        }
    }

    const currentBalance = movements.reduce((sum, m) => sum + (m.amount || 0), 0)

    if (initialLoading) {
        return (
            <Layout title="Cash Flow">
                <div className="min-h-[60vh] bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-[10px]">Syncing Liquidity Streams...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Cash Flow">
            <div className="mt-12">
                {/* Balance Card */}
                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-10 shadow-sm border border-gray-100 dark:border-gray-800 mb-10 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full -mt-32 transition-transform group-hover:scale-110 duration-700 pointer-events-none"></div>
                    <div className="relative z-10 w-full lg:w-auto">
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Unified Register Balance</p>
                        <h3 className={`text-5xl font-black tracking-tight ${currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {currency} {currentBalance.toLocaleString()}
                        </h3>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-3 font-black uppercase tracking-[0.2em]">Manual Liquidity Adjustments Only</p>
                    </div>
                    <div className="flex flex-wrap gap-4 w-full lg:w-auto relative z-10">
                        <button
                            onClick={() => window.location.href = '/register-reconciliation'}
                            className="flex-1 lg:flex-none px-8 py-4 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm active:scale-95"
                        >
                            📝 Register Audit
                        </button>
                        <button
                            onClick={() => { setType('in'); setShowForm(true); }}
                            className="flex-1 lg:flex-none px-10 py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-700 transition shadow-xl shadow-green-500/20 active:scale-95"
                        >
                            Inflow
                        </button>
                        <button
                            onClick={() => { setType('out'); setShowForm(true); }}
                            className="flex-1 lg:flex-none px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition shadow-xl shadow-red-500/20 active:scale-95"
                        >
                            Outflow
                        </button>
                    </div>
                </div>

                {/* History List */}
                <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Inflow/Outflow Manifest</h4>
                        <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/10 font-black uppercase tracking-widest">Archive Limit: 50</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {movements.length === 0 ? (
                                    <tr>
                                        <td className="px-8 py-20 text-center text-gray-400 dark:text-gray-500 italic uppercase tracking-widest text-[10px] font-black opacity-30">No liquidity fluctuations mapped.</td>
                                    </tr>
                                ) : (
                                    movements.map((m) => (
                                        <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${m.type === 'in' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'}`}>
                                                        {m.type === 'in' ? '↓' : '↑'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{m.reason}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1 tracking-widest">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString('en-GB') : new Date(m.createdAt).toLocaleString('en-GB')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`px-8 py-6 text-right font-black text-lg tracking-tight ${m.type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                <div className="flex items-center justify-end gap-8">
                                                    <span>{m.type === 'in' ? '+' : ''} {m.amount?.toLocaleString()}</span>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                                        <button
                                                            onClick={() => setEditingMovement({ ...m, amount: Math.abs(m.amount) })}
                                                            className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
                                                            title="Modify"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(m.id)}
                                                            className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                                            title="Purge"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
                        <div className={`p-8 border-b dark:border-gray-800 flex justify-between items-center ${type === 'in' ? 'bg-green-50/50 dark:bg-green-900/20' : 'bg-red-50/50 dark:bg-red-900/20'}`}>
                            <h3 className={`text-xl font-black uppercase tracking-tight ${type === 'in' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                                Cash {type === 'in' ? 'Injection' : 'Extraction'} Entry
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Liquidity Volume *</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">PKR</span>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl pl-16 pr-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-black tracking-tight"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Audit Reason / Justification *</label>
                                <textarea
                                    required
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold min-h-[120px]"
                                    placeholder={type === 'in' ? 'e.g. Replenishing Float Capacity' : 'e.g. Petty Cash Disbursement'}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 px-6 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition disabled:opacity-50 active:scale-95 ${type === 'in' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                                >
                                    {loading ? 'Transmitting...' : `Verify ${type === 'in' ? 'Inflow' : 'Outflow'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingMovement && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
                        <div className={`p-8 border-b dark:border-gray-800 flex justify-between items-center ${editingMovement.type === 'in' ? 'bg-green-50/50 dark:bg-green-900/20' : 'bg-red-50/50 dark:bg-red-900/20'}`}>
                            <h3 className={`text-xl font-black uppercase tracking-tight ${editingMovement.type === 'in' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                                Modify {editingMovement.type === 'in' ? 'Inflow' : 'Outflow'}
                            </h3>
                            <button onClick={() => setEditingMovement(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Adjusted Valuation *</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={editingMovement.amount}
                                    onChange={(e) => setEditingMovement({ ...editingMovement, amount: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-black tracking-tight"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Descriptor Justification *</label>
                                <textarea
                                    required
                                    value={editingMovement.reason}
                                    onChange={(e) => setEditingMovement({ ...editingMovement, reason: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold min-h-[120px]"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingMovement(null)}
                                    className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 px-6 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition disabled:opacity-50 active:scale-95 ${editingMovement.type === 'in' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                                >
                                    {loading ? 'Transmitting...' : 'Commit Revision'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default CashFlow
