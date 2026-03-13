import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import FirestoreService from '../../firebase/firestore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'
import { serverTimestamp } from 'firebase/firestore'
import useAuthStore from '../../store/authStore-multi-branch'

function Customers() {
    const { user, businessId } = useAuthStore()
    const [customers, setCustomers] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    })
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [initialLoading, setInitialLoading] = useState(true)

    const fetchCustomers = async () => {
        try {
            const snapshot = await FirestoreService.getCustomers(businessId)
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setCustomers(list)
        } catch (err) {
            handleError(err, 'Fetch Customers')
        }
    }

    useEffect(() => {
        if (businessId) {
            fetchCustomers()
            setInitialLoading(false)
        }
    }, [businessId])

    if (initialLoading) {
        return (
            <Layout title="Customers">
                <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center z-[9999]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Synchronizing CRM Database...</p>
                </div>
            </Layout>
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.addCustomer(businessId, {
                ...form,
                loyaltyPoints: 0,
                totalSpent: 0,
                totalVisits: 0,
                createdAt: serverTimestamp()
            })
            setForm({ name: '', phone: '', email: '', address: '' })
            setShowForm(false)
            showSuccess('Customer added successfully')
            fetchCustomers()
        } catch (err) {
            handleError(err, 'Add Customer', 'Failed to add customer')
        } finally {
            setLoading(false)
        }
    }

    // Update Customer
    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await FirestoreService.updateCustomer(businessId, editingCustomer.id, {
                ...editingCustomer,
                updatedAt: serverTimestamp()
            })
            setEditingCustomer(null)
            showSuccess('Customer updated successfully')
            fetchCustomers()
        } catch (err) {
            handleError(err, 'Update Customer', 'Failed to update customer')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('Delete this customer?')) {
            try {
                await FirestoreService.deleteCustomer(businessId, id)
                showSuccess('Customer deleted')
                fetchCustomers()
            } catch (err) {
                handleError(err, 'Delete Customer')
            }
        }
    }

    return (
        <Layout title="Customers">

            {/* Header */}
            <div className="flex justify-between items-center mb-8 mt-12">
                <p className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-widest">{customers.length} registered clients found</p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                >
                    + Add New Profile
                </button>
            </div>

            {/* Add Customer Form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 transition-all animate-in slide-in-from-top duration-300">
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-6 uppercase tracking-tight">👤 Initialize New Customer Profile</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Legal Identity / Full Name *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="Enter full name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Primary Contact / Phone *</label>
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
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Digital Correspondence / Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="customer@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Registered Address</label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="Street, City, Postal Address"
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
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {loading ? 'Filing...' : 'Confirm Registration'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Customer Modal */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl border dark:border-gray-800 transition-all scale-in animate-in duration-300">
                        <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-6 uppercase tracking-tight">📝 Reconfigure Profile</h3>
                        <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Legal Identity / Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCustomer.name}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Primary Contact / Phone *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCustomer.phone}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Digital Correspondence / Email</label>
                                <input
                                    type="email"
                                    value={editingCustomer.email}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Registered Address</label>
                                <input
                                    type="text"
                                    value={editingCustomer.address}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div className="col-span-2 flex gap-3 justify-end mt-8 border-t dark:border-gray-800 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingCustomer(null)}
                                    className="px-6 py-3 rounded-xl border dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {loading ? 'Reconfiguring...' : 'Synchronize Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customers Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                            <tr>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Subscriber / Entity</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Contact Info</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Metadata</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Loyalty Bank</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Revenue Impact</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Direct Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-16 text-gray-400 dark:text-gray-500 italic">
                                        No customers yet. Click "Add New Profile" to start!
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight">{customer.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Verified Client</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-600 dark:text-gray-300">{customer.phone}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{customer.email || 'No Digital ID'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 max-w-[200px] truncate">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">{customer.address || '-'}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-yellow-100 dark:border-yellow-900/30">
                                                ⭐ {customer.loyaltyPoints.toLocaleString()} Points
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-green-600 dark:text-green-400 font-black text-sm">PKR {customer.totalSpent.toLocaleString()}</span>
                                                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter">Gross Expenditure</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {(user?.role === 'admin' || user?.role === 'manager') && (
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => setEditingCustomer(customer)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-black uppercase tracking-widest"
                                                    >
                                                        Review
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="text-red-500 group-hover:text-red-600 text-xs font-black uppercase tracking-widest"
                                                    >
                                                        Purge
                                                    </button>
                                                </div>
                                            )}
                                            {user?.role === 'cashier' && (
                                                <span className="text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest italic">Immutable</span>
                                            )}
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

export default Customers