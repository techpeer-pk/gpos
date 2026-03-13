import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import { db } from '../../firebase/config'
import { handleError, showSuccess } from '../../utils/errorHandler'
import {
    collection,
    getDocs,
    setDoc,
    doc,
    deleteDoc,
    serverTimestamp,
    query,
    where
} from 'firebase/firestore'

function Employees() {
    const { businessId } = useAuthStore()
    const [pendingUsers, setPendingUsers] = useState([])
    const [activeEmployees, setActiveEmployees] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        uid: '',
        name: '',
        email: '',
        role: 'cashier',
        assignedBranches: []
    })

    const [branches, setBranches] = useState([])

    // Fetch pending users from pending_users collection
    const fetchPendingUsers = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'pending_users'))
            const list = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }))
            setPendingUsers(list)
        } catch (error) {
            console.error('Error fetching pending users:', error)
            handleError(error, 'Fetch Pending Users', 'Failed to fetch pending users')
        }
    }

    // Fetch approved employees from business_users
    const fetchApprovedEmployees = async () => {
        if (!businessId) return
        try {
            const snapshot = await getDocs(collection(db, 'business_users', businessId))
            const list = []
            
            // For each user document in the business, fetch their profile
            await Promise.all(snapshot.docs.map(async (userDoc) => {
                const profileSnap = await getDocs(collection(db, 'business_users', businessId, userDoc.id, 'profile'))
                profileSnap.forEach(profileDoc => {
                    list.push({ uid: userDoc.id, ...profileDoc.data() })
                })
            }))
            
            setActiveEmployees(list)
        } catch (error) {
            console.error('Error fetching approved employees:', error)
            handleError(error, 'Fetch Employees', 'Failed to fetch employee list')
        }
    }

    const fetchBranches = async () => {
        if (!businessId) return
        try {
            const snapshot = await FirestoreService.getBranches(businessId)
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setBranches(list)
        } catch (error) {
            console.error('Error fetching branches:', error)
        }
    }

    useEffect(() => {
        if (businessId) {
            fetchPendingUsers()
            fetchApprovedEmployees()
            fetchBranches()
        }
    }, [businessId])

    // Approve pending user - move to business_users
    const handleApprove = async (uid, name, email) => {
        setLoading(true)
        try {
            if (!businessId) {
                handleError(null, 'Approve', 'No business context found')
                setLoading(false)
                return
            }

            // Create user in business_users as approved employee
            await setDoc(doc(db, 'business_users', businessId, uid, 'profile'), {
                uid,
                name,
                email,
                role: 'cashier',  // Default role
                assignedBranches: [],
                createdAt: serverTimestamp()
            })

            // Remove from pending_users
            await deleteDoc(doc(db, 'pending_users', uid))

            showSuccess(`✅ ${name} approved and added to team!`)
            await fetchPendingUsers()
            await fetchApprovedEmployees()
        } catch (err) {
            handleError(err, 'Approve User', 'Failed to approve user')
        } finally {
            setLoading(false)
        }
    }

    // Reject pending user
    const handleRejectPending = async (uid, name) => {
        if (!window.confirm(`Reject ${name}? They will need to register again.`)) {
            return
        }
        try {
            setLoading(true)
            await deleteDoc(doc(db, 'pending_users', uid))
            showSuccess(`❌ ${name} rejected`)
            await fetchPendingUsers()
        } catch (err) {
            handleError(err, 'Reject User', 'Failed to reject user')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (!form.uid) {
                handleError(null, 'Save Employee', 'Please enter employee UID')
                setLoading(false)
                return
            }
            
            await setDoc(doc(db, 'business_users', businessId, form.uid, 'profile'), {
                uid: form.uid,
                name: form.name,
                email: form.email,
                role: form.role,
                assignedBranches: form.assignedBranches || [],
                updatedAt: serverTimestamp()
            }, { merge: true })
            
            setForm({ uid: '', name: '', email: '', role: 'cashier', assignedBranches: [] })
            setShowForm(false)
            showSuccess('Employee saved successfully')
            fetchApprovedEmployees()
        } catch (err) {
            handleError(err, 'Save Employee', 'Failed to save employee')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (uid, name) => {
        if (!window.confirm(`Remove ${name} from team?`)) {
            return
        }
        try {
            setLoading(true)
            await deleteDoc(doc(db, 'business_users', businessId, uid, 'profile'))
            fetchApprovedEmployees()
            showSuccess('Employee removed')
        } catch (err) {
            handleError(err, 'Delete Employee', 'Failed to remove employee')
        } finally {
            setLoading(false)
        }
    }


    return (
        <Layout title="Employee Management">

            <div className="flex justify-between items-center mb-6 mt-12">
                <p className="text-gray-500">{activeEmployees.length} active employees</p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    + Add/Update Employee
                </button>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-yellow-700 mb-4 flex items-center gap-2">
                        <span>⏳</span> Pending Approvals ({pendingUsers.length})
                    </h3>
                    <div className="bg-yellow-50 rounded-xl border border-yellow-100 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-yellow-100/50 border-b border-yellow-100">
                                <tr>
                                    <th className="text-left px-6 py-3 font-semibold text-yellow-800">User</th>
                                    <th className="text-left px-6 py-3 font-semibold text-yellow-800">Email</th>
                                    <th className="text-left px-6 py-3 font-semibold text-yellow-800">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-yellow-100">
                                {pendingUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-yellow-100/30">
                                        <td className="px-6 py-4 font-medium text-gray-800">{user.name || user.displayName}</td>
                                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleApprove(user.uid, user.name || user.displayName, user.email)}
                                                    disabled={loading}
                                                    className="bg-green-600 text-white px-3 py-1 rounded shadow-sm hover:bg-green-700 transition disabled:opacity-50"
                                                >
                                                    ✅ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectPending(user.uid, user.name || user.displayName)}
                                                    disabled={loading}
                                                    className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-white rounded-xl p-6 shadow-sm mb-6 max-w-2xl">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Set Employee Permissions</h3>
                    <p className="text-xs text-gray-400 mb-4">Note: The UID must match the user's Firebase Authentication ID.</p>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm text-gray-600">User UID *</label>
                            <input
                                type="text"
                                required
                                value={form.uid}
                                onChange={(e) => setForm({ ...form, uid: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Paste user UID from Firebase console"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Email *</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm text-gray-600">Role</label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="cashier">Cashier (POS Only)</option>
                                <option value="manager">Manager (Inventory + Products)</option>
                                <option value="owner">Owner (Full Access)</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm text-gray-600 block mb-2">Assigned Branches</label>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                                {branches.map(branch => (
                                    <label key={branch.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-100 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={form.assignedBranches?.includes(branch.id)}
                                            onChange={(e) => {
                                                const checked = e.target.checked
                                                setForm(prev => ({
                                                    ...prev,
                                                    assignedBranches: checked
                                                        ? [...(prev.assignedBranches || []), branch.id]
                                                        : (prev.assignedBranches || []).filter(id => id !== branch.id)
                                                }))
                                            }}
                                            className="rounded text-blue-600"
                                        />
                                        <span className="truncate">{branch.branchName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="col-span-2 flex gap-3 justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                            >
                                {loading ? 'Saving...' : 'Save Permissions'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <h3 className="text-lg font-bold text-gray-800 mb-4">Active Staff</h3>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Employee</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {activeEmployees.map((emp) => (
                            <tr key={emp.uid} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                                            {emp.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-800">{emp.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-sm">{emp.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${emp.role === 'admin' ? 'bg-red-100 text-red-600' :
                                        emp.role === 'manager' ? 'bg-blue-100 text-blue-600' :
                                            'bg-green-100 text-green-600'
                                        }`}>
                                        {emp.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setForm({ 
                                                    uid: emp.uid, 
                                                    name: emp.name, 
                                                    email: emp.email, 
                                                    role: emp.role,
                                                    assignedBranches: emp.assignedBranches || []
                                                })
                                                setShowForm(true)
                                            }}
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(emp.uid)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </Layout>
    )
}

export default Employees
