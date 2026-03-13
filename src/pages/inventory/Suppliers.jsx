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
    serverTimestamp
} from 'firebase/firestore'

import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

function Suppliers() {
    const { businessId } = useAuthStore()
    const [suppliers, setSuppliers] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        category: '',
    })
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [initialLoading, setInitialLoading] = useState(true)

    // Fetch Suppliers
    const fetchSuppliers = async () => {
        if (!businessId) return
        try {
            const snapshot = await FirestoreService.getSuppliers(businessId)
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        } catch (err) {
            handleError(err, 'Fetch Suppliers', 'Failed to load suppliers')
        }
    }

    useEffect(() => {
        if (businessId) {
            fetchSuppliers()
            setInitialLoading(false)
        }
    }, [businessId])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.addSupplier(businessId, {
                ...form,
                createdAt: serverTimestamp()
            })
            setForm({ name: '', contactPerson: '', email: '', phone: '', address: '', category: '' })
            setShowForm(false)
            showSuccess('Supplier added successfully')
            fetchSuppliers()
        } catch (err) {
            handleError(err, 'Add Supplier', 'Failed to add supplier')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.updateSupplier(businessId, editingSupplier.id, {
                ...editingSupplier,
                updatedAt: serverTimestamp()
            })
            setEditingSupplier(null)
            showSuccess('Supplier updated successfully')
            fetchSuppliers()
        } catch (err) {
            handleError(err, 'Update Supplier', 'Failed to update supplier')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('Delete this supplier?')) {
            try {
                await FirestoreService.deleteSupplier(businessId, id)
                showSuccess('Supplier deleted')
                fetchSuppliers()
            } catch (err) {
                handleError(err, 'Delete Supplier', 'Failed to delete supplier')
            }
        }
    }

    return (
        <Layout title="Suppliers">

            {initialLoading && (
                <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center z-[9999]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Negotiating Vendor Matrix...</p>
                </div>
            )}

            <div className="flex justify-between items-center mb-8 mt-12">
                <p className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-widest">{suppliers.length} active supply nodes</p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                    + Add Supplier Node
                </button>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 transition-all animate-in slide-in-from-top duration-300">
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-6 uppercase tracking-tight">🏭 Onboard New Supplier</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Corporate Identity / Company *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="Enter corporate name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Liaison Officer / Contact Person</label>
                            <input
                                type="text"
                                value={form.contactPerson}
                                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="Name of representative"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Hotline / Phone *</label>
                            <input
                                type="text"
                                required
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="+92XXXXXXXXXX"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Official Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="vendor@example.com"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Headquarters / Warehouse Address</label>
                            <textarea
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                rows="2"
                                placeholder="Physical location of operations"
                            />
                        </div>
                        <div className="col-span-2 flex gap-4 justify-end mt-4">
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
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {loading ? 'Onboarding...' : 'Finalize Agreement'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {editingSupplier && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in scale-in duration-300 border dark:border-gray-800">
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">📝 Retune Alliance</h3>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Modifying Supplier Parameters</p>
                            </div>
                            <button onClick={() => setEditingSupplier(null)} className="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Corporate Identity / Company *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingSupplier.name}
                                    onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Liaison Officer / Contact Person</label>
                                <input
                                    type="text"
                                    value={editingSupplier.contactPerson}
                                    onChange={(e) => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Hotline / Phone *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingSupplier.phone}
                                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Official Email</label>
                                <input
                                    type="email"
                                    value={editingSupplier.email}
                                    onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Headquarters / Warehouse Address</label>
                                <textarea
                                    value={editingSupplier.address}
                                    onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    rows="2"
                                />
                            </div>
                            <div className="md:col-span-2 flex gap-4 justify-end mt-4 border-t dark:border-gray-800 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingSupplier(null)}
                                    className="px-6 py-3 rounded-xl border dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {loading ? 'Retuning...' : 'Sync Alliance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {suppliers.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800 italic">
                        No supply nodes mapped yet.
                    </div>
                ) : (
                    suppliers.map((s) => (
                        <div key={s.id} className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />

                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                                    🏭
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingSupplier(s)}
                                        className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <h4 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-1 uppercase tracking-tight">{s.name}</h4>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-2 font-black uppercase tracking-widest">
                                <span className="text-lg">👤</span> {s.contactPerson || 'Anonymous Liaison'}
                            </p>

                            <div className="space-y-3 border-t dark:border-gray-800 pt-6">
                                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">📞</span>
                                    {s.phone}
                                </p>
                                {s.email && (
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">📧</span>
                                        <span className="truncate">{s.email}</span>
                                    </p>
                                )}
                                {s.address && (
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-500 flex items-center gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 shrink-0">📍</span>
                                        <span className="line-clamp-1 italic">{s.address}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

        </Layout>
    )
}

export default Suppliers
