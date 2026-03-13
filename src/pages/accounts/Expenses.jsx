import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { db } from '../../firebase/config'
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore'

const CATEGORIES = [
    'Rent',
    'Utilities',
    'Salaries',
    'Marketing',
    'Inventory',
    'Maintenance',
    'Taxes',
    'Other'
]

import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

function Expenses() {
    const { businessId, branchId } = useAuthStore()
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingExpense, setEditingExpense] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All')

    const [form, setForm] = useState({
        title: '',
        amount: '',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    const fetchExpenses = async () => {
        if (!businessId || !branchId) return
        try {
            const snapshot = await FirestoreService.getExpenses(businessId, branchId)
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        } catch (err) {
            handleError(err, 'Fetch Expenses', 'Failed to load expense records')
        }
    }

    useEffect(() => {
        if (businessId && branchId) {
            fetchExpenses()
            setInitialLoading(false)
        }
    }, [businessId, branchId])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.addExpense(businessId, branchId, {
                ...form,
                amount: parseFloat(form.amount),
                createdAt: serverTimestamp()
            })
            setForm({
                title: '',
                amount: '',
                category: 'Other',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            })
            setShowForm(false)
            showSuccess('Expense recorded successfully')
            fetchExpenses()
        } catch (err) {
            handleError(err, 'Add Expense', 'Failed to record expense')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.updateExpense(businessId, branchId, editingExpense.id, {
                ...editingExpense,
                amount: parseFloat(editingExpense.amount),
                updatedAt: serverTimestamp()
            })
            setEditingExpense(null)
            showSuccess('Expense updated successfully')
            fetchExpenses()
        } catch (err) {
            handleError(err, 'Update Expense', 'Failed to update expense')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('Delete this expense record?')) {
            try {
                await FirestoreService.deleteExpense(businessId, branchId, id)
                showSuccess('Expense deleted')
                fetchExpenses()
            } catch (err) {
                handleError(err, 'Delete Expense', 'Failed to delete expense')
            }
        }
    }

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exp.notes?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)

    if (initialLoading) {
        return (
            <Layout title="Expenses">
                <div className="min-h-[60vh] bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Analyzing Financial Outflows...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Expenses">
            <div className="mt-12">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 relative z-10">Aggregate Expenditure</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tight relative z-10">
                            PKR {totalAmount.toLocaleString()}
                        </h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-2 relative z-10 uppercase tracking-widest">Active Filter Boundary</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-8">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                            <input
                                type="text"
                                placeholder="Query Expenditure Database..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80 font-medium transition-all"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-6 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                        >
                            <option value="All">Global Categories</option>
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                        + Initialize Expense Record
                    </button>
                </div>

                {/* Expense List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Title</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-gray-400 dark:text-gray-500 italic">
                                            No financial leakages detected in history.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((exp) => (
                                        <tr key={exp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-400 font-bold">
                                                {new Date(exp.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{exp.title}</p>
                                                {exp.notes && <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5 line-clamp-1">{exp.notes}</p>}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-black text-gray-900 dark:text-gray-100 text-right tracking-tight">
                                                PKR {exp.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingExpense(exp)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
                                                        title="Modify"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exp.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                                        title="Purge"
                                                    >
                                                        🗑️
                                                    </button>
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

            {/* Add Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Record Financial Flow</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Transaction Descriptor *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    placeholder="e.g. Asset Liquidation / Operational Utility"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Valuation *</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    >
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Event Timestamp</label>
                                <input
                                    type="date"
                                    required
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Supplemental Intelligence</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    rows="3"
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
                                    className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                                >
                                    {loading ? 'Transmitting...' : 'Commit Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingExpense && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
                            <h3 className="text-xl font-black text-blue-800 dark:text-blue-100 uppercase tracking-tight">Modify Transaction</h3>
                            <button onClick={() => setEditingExpense(null)} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Descriptor *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingExpense.title}
                                    onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Valuation *</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={editingExpense.amount}
                                        onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Category</label>
                                    <select
                                        value={editingExpense.category}
                                        onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    >
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Event Timestamp</label>
                                <input
                                    type="date"
                                    required
                                    value={editingExpense.date}
                                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Supplemental Intelligence</label>
                                <textarea
                                    value={editingExpense.notes}
                                    onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                                    rows="3"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingExpense(null)}
                                    className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                                >
                                    {loading ? 'Transmitting...' : 'Commit Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default Expenses
