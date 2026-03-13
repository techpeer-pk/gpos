import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

export default function Branches() {
    const { businessId, userRole, isOwner } = useAuthStore()
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState({
        branchName: '',
        location: '',
        phone: '',
        email: '',
        manager: '',
        isActive: true
    })

    // Fetch branches
    const fetchBranches = async () => {
        if (!businessId) return
        try {
            setLoading(true)
            const snap = await FirestoreService.getBranches(businessId)
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setBranches(data)
        } catch (err) {
            handleError(err, 'Fetch Branches', 'Failed to load branch list')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (businessId) {
            fetchBranches()
        }
    }, [businessId])

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.branchName.trim()) {
            return handleError(null, 'Validation', 'Branch name is required')
        }

        setSubmitting(true)
        try {
            if (editingId) {
                await FirestoreService.updateBranch(businessId, editingId, {
                    ...formData,
                    updatedAt: new Date()
                })
                showSuccess(`Branch "${formData.branchName}" updated`)
            } else {
                await FirestoreService.addBranch(businessId, {
                    ...formData,
                    createdAt: new Date()
                })
                showSuccess(`Branch "${formData.branchName}" created`)
            }

            // Reset form and refresh
            handleCancel()
            await fetchBranches()
        } catch (err) {
            handleError(err, 'Save Branch', 'Failed to process branch record')
        } finally {
            setSubmitting(false)
        }
    }

    // Handle edit
    const handleEdit = (branch) => {
        setFormData({
            branchName: branch.branchName,
            location: branch.location || '',
            phone: branch.phone || '',
            email: branch.email || '',
            manager: branch.manager || '',
            isActive: branch.isActive !== false
        })
        setEditingId(branch.id)
        setShowForm(true)
    }

    // Handle delete
    const handleDelete = async (branchId, branchName) => {
        if (!confirm(`Are you sure you want to delete "${branchName}"? This action will archive but keep historical data accessible for reports.`)) {
            return
        }

        try {
            setLoading(true)
            await FirestoreService.deleteBranch(businessId, branchId)
            showSuccess(`Branch "${branchName}" deleted`)
            await fetchBranches()
        } catch (err) {
            handleError(err, 'Delete Branch', 'Failed to remove branch')
        } finally {
            setLoading(false)
        }
    }

    // Cancel editing
    const handleCancel = () => {
        setFormData({
            branchName: '',
            location: '',
            phone: '',
            email: '',
            manager: '',
            isActive: true
        })
        setEditingId(null)
        setShowForm(false)
    }

    if (!isOwner()) {
        return (
            <Layout title="Unauthorized">
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 mt-12">
                    <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-4xl mb-6">🚫</div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight mb-2">Access Restricted</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Only business owners can manage corporate branches. Please contact your administrator if you believe this is an error.</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Branch Management">
            <div className="mt-12 max-w-7xl mx-auto pb-20 px-4 sm:px-6 lg:px-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="relative">
                        <h2 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.4em] mb-2">Corporate Infrastructure</h2>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">Branch Network</h1>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-3 font-medium">Coordinate logistics and operational presence across {branches.length} active locations.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-gray-950 dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-105 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
                    >
                        <span>➕</span> Deploy New Branch
                    </button>
                </div>

                {/* Branches Grid */}
                {loading && !showForm ? (
                    <div className="min-h-[40vh] flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Network Status...</p>
                    </div>
                ) : branches.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] p-20 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                        <span className="text-6xl mb-6 block opacity-20 grayscale">🏬</span>
                        <h3 className="text-xl font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">System Vacant</h3>
                        <p className="text-gray-400 dark:text-gray-500 mt-2">Initialize your first physical presence to begin operations.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {branches.map((branch) => (
                            <div key={branch.id} className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 ${branch.isActive ? 'bg-blue-500/5' : 'bg-red-500/5'} rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150`}></div>
                                
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${branch.isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        🏪
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${branch.isActive ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                        {branch.isActive ? 'Operational' : 'Suspended'}
                                    </span>
                                </div>

                                <div className="space-y-1 mb-8 relative z-10">
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{branch.branchName}</h3>
                                    <p className="text-gray-400 dark:text-gray-500 font-bold text-[11px] uppercase tracking-widest truncate">{branch.location || 'Remote/Virtual Presence'}</p>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-gray-50 dark:border-gray-800 relative z-10">
                                    <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                                        <span className="text-lg opacity-40">👤</span>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Designated lead</span>
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{branch.manager || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                                        <span className="text-lg opacity-40">📱</span>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Contact Protocol</span>
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{branch.phone || 'System Default'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 flex gap-3 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                    <button
                                        onClick={() => handleEdit(branch)}
                                        className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        🔧 Configure
                                    </button>
                                    <button
                                        onClick={() => handleDelete(branch.id, branch.branchName)}
                                        className="px-4 bg-red-500/10 text-red-600 dark:text-red-400 py-3 rounded-xl font-black text-[10px] uppercase transition-all hover:bg-red-600 hover:text-white"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
                        <div className="p-10 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {editingId ? 'Network Configuration' : 'Protocol Deployment'}
                                </h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">
                                    {editingId ? `MODIFICATION AT: ${editingId.substring(0, 12)}` : 'INITIALIZING NEW BRANCH NODE'}
                                </p>
                            </div>
                            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">✕</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-3">Presence Identifier (Branch Name) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.branchName}
                                        onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                        className="w-full border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none font-bold text-lg transition-all"
                                        placeholder="e.g. DOWNTOWN LOGISTICS HUB"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-3">Physical Coordinates (Location)</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none font-bold transition-all"
                                        placeholder="Street Address, City"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-3">Designated Controller (Manager)</label>
                                    <input
                                        type="text"
                                        value={formData.manager}
                                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                        className="w-full border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none font-bold transition-all"
                                        placeholder="Full Name"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-3">Communication Protocol (Phone)</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none font-bold transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-3">Support Vector (Email)</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl px-6 py-4 focus:border-blue-500 outline-none font-bold transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">Operational Status</span>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Defines if this node is active in POS & Inventory streams</p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 px-8 py-5 border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95"
                                >
                                    Abort Operation
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition shadow-2xl shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                                >
                                    {submitting ? 'Transmitting Data...' : (editingId ? 'Commit Changes' : 'Execute Deployment')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    )
}
