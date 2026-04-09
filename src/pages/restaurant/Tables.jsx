import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

const STATUS_CONFIG = {
    empty:    { label: 'Empty',    color: 'bg-green-100 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    occupied: { label: 'Occupied', color: 'bg-red-100 dark:bg-red-900/30 border-red-400 text-red-700 dark:text-red-400',   dot: 'bg-red-500' },
    reserved: { label: 'Reserved', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-500', dot: 'bg-yellow-500' },
}

function Tables() {
    const [tables, setTables] = useState([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ number: '', seats: '4', section: '' })
    const { businessId, branchId, userRole } = useAuthStore()
    const navigate = useNavigate()

    const fetchTables = async () => {
        try {
            const snap = await FirestoreService.getTables(businessId, branchId)
            setTables(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (err) {
            handleError(err, 'Fetch Tables', 'Failed to load tables')
        } finally {
            setInitialLoading(false)
        }
    }

    useEffect(() => {
        if (businessId && branchId) fetchTables()
    }, [businessId, branchId])

    const handleAddTable = async (e) => {
        e.preventDefault()
        if (!form.number.trim()) return
        setLoading(true)
        try {
            await FirestoreService.addTable(businessId, branchId, {
                number: form.number.trim(),
                seats: parseInt(form.seats) || 4,
                section: form.section.trim(),
                status: 'empty',
            })
            setForm({ number: '', seats: '4', section: '' })
            setShowForm(false)
            showSuccess('Table added')
            fetchTables()
        } catch (err) {
            handleError(err, 'Add Table', 'Failed to add table')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (table, newStatus) => {
        try {
            await FirestoreService.updateTable(businessId, branchId, table.id, { status: newStatus })
            setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: newStatus } : t))
        } catch (err) {
            handleError(err, 'Update Table', 'Failed to update table status')
        }
    }

    const handleDelete = async (tableId) => {
        if (!window.confirm('Delete this table?')) return
        try {
            await FirestoreService.deleteTable(businessId, branchId, tableId)
            setTables(prev => prev.filter(t => t.id !== tableId))
            showSuccess('Table deleted')
        } catch (err) {
            handleError(err, 'Delete Table')
        }
    }

    const stats = {
        empty: tables.filter(t => t.status === 'empty').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
    }

    if (initialLoading) {
        return (
            <Layout title="Tables">
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Table Management">
            <div className="mt-12">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">Floor Plan</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{tables.length} tables configured</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/table-order')}
                            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2"
                        >
                            🍽️ Take Order
                        </button>
                        {(userRole === 'owner' || userRole === 'manager') && (
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                            >
                                + Add Table
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {Object.entries(stats).map(([status, count]) => (
                        <div key={status} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-800 flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[status].dot}`} />
                            <div>
                                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{count}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{status}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Table Form */}
                {showForm && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border dark:border-gray-800 mb-6">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Add New Table</h3>
                        <form onSubmit={handleAddTable} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Table No. *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.number}
                                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. T1, VIP-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Seats</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.seats}
                                    onChange={(e) => setForm({ ...form, seats: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">Section</label>
                                <input
                                    type="text"
                                    value={form.section}
                                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Indoor, Rooftop"
                                />
                            </div>
                            <div className="sm:col-span-3 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? 'Saving...' : 'Save Table'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tables Grid */}
                {tables.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed dark:border-gray-800">
                        <p className="text-5xl mb-4">🪑</p>
                        <p className="font-bold text-lg">No tables yet</p>
                        <p className="text-sm mt-1">Click "Add Table" to set up your floor plan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {tables.map(table => {
                            const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.empty
                            return (
                                <div
                                    key={table.id}
                                    className={`relative rounded-2xl border-2 p-4 transition-all ${cfg.color}`}
                                >
                                    <div className="text-center mb-3">
                                        <p className="text-2xl font-black">{table.number}</p>
                                        <p className="text-xs opacity-70 mt-0.5">{table.seats} seats</p>
                                        {table.section && <p className="text-[10px] opacity-60 mt-0.5">{table.section}</p>}
                                    </div>

                                    {/* Status Toggle */}
                                    <select
                                        value={table.status}
                                        onChange={(e) => handleStatusChange(table, e.target.value)}
                                        className="w-full text-[11px] font-bold border-0 bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-current mb-2 cursor-pointer"
                                    >
                                        <option value="empty">Empty</option>
                                        <option value="occupied">Occupied</option>
                                        <option value="reserved">Reserved</option>
                                    </select>

                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => navigate(`/table-order?tableId=${table.id}&tableNo=${table.number}`)}
                                            className="flex-1 bg-white/60 dark:bg-black/20 hover:bg-white/90 dark:hover:bg-black/30 rounded-lg py-1 text-[11px] font-bold transition"
                                        >
                                            Order
                                        </button>
                                        {(userRole === 'owner' || userRole === 'manager') && (
                                            <button
                                                onClick={() => handleDelete(table.id)}
                                                className="bg-white/60 dark:bg-black/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg px-2 py-1 text-[11px] transition text-red-500"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default Tables
