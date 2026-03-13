import { useState, useEffect } from 'react'
import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import './Settings.css'

export default function Branches() {
    const { businessId, userRole } = useAuthStore()
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(true)
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
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Check if user is owner
    if (userRole !== 'owner') {
        return (
            <div className="page-container">
                <div className="error-box">
                    ❌ Only business owners can manage branches
                </div>
            </div>
        )
    }

    // Fetch branches
    const fetchBranches = async () => {
        try {
            setLoading(true)
            const snap = await FirestoreService.getBranches(businessId)
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setBranches(data)
            setError('')
        } catch (err) {
            console.error('Error fetching branches:', err)
            setError('Failed to fetch branches')
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
            setError('Branch name is required')
            return
        }

        try {
            setLoading(true)
            
            if (editingId) {
                // Update existing branch
                const branchRef = `businesses/${businessId}/branches/${editingId}`
                await FirestoreService.updateBranch(businessId, editingId, {
                    branchName: formData.branchName,
                    location: formData.location,
                    phone: formData.phone,
                    email: formData.email,
                    manager: formData.manager,
                    isActive: formData.isActive
                })
                setSuccess(`✅ Branch "${formData.branchName}" updated successfully`)
            } else {
                // Create new branch
                await FirestoreService.addBranch(businessId, {
                    branchName: formData.branchName,
                    location: formData.location,
                    phone: formData.phone,
                    email: formData.email,
                    manager: formData.manager,
                    isActive: true
                })
                setSuccess(`✅ Branch "${formData.branchName}" created successfully`)
            }

            // Reset form and refresh
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
            setError('')
            await fetchBranches()

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error saving branch:', err)
            setError(`Failed to save branch: ${err.message}`)
        } finally {
            setLoading(false)
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
        setError('')
    }

    // Handle delete
    const handleDelete = async (branchId, branchName) => {
        if (!confirm(`Are you sure you want to delete "${branchName}"? This action cannot be undone.`)) {
            return
        }

        try {
            setLoading(true)
            await FirestoreService.deleteBranch(businessId, branchId)
            setSuccess(`✅ Branch "${branchName}" deleted`)
            setError('')
            await fetchBranches()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error deleting branch:', err)
            setError(`Failed to delete branch: ${err.message}`)
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
        setError('')
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>🏪 Branch Management</h1>
                <p>Create, edit, and manage your business branches</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="error-box">
                    {error}
                    <button onClick={() => setError('')} className="close-btn">✕</button>
                </div>
            )}

            {/* Success Alert */}
            {success && (
                <div className="success-box">
                    {success}
                </div>
            )}

            {/* Add Branch Button */}
            {!showForm && (
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(true)}
                    disabled={loading}
                >
                    ➕ Add New Branch
                </button>
            )}

            {/* Branch Form */}
            {showForm && (
                <div className="form-container">
                    <div className="form-header">
                        <h2>{editingId ? '✏️ Edit Branch' : '📝 Create New Branch'}</h2>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Branch Name *</label>
                            <input
                                type="text"
                                value={formData.branchName}
                                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                placeholder="e.g., Main Branch, Downtown Location"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g., 123 Main St, City, State"
                                />
                            </div>

                            <div className="form-group">
                                <label>Manager Name</label>
                                <input
                                    type="text"
                                    value={formData.manager}
                                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                    placeholder="Branch manager name"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="branch@example.com"
                                />
                            </div>
                        </div>

                        {editingId && (
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    Active Branch
                                </label>
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="btn-success" disabled={loading}>
                                {loading ? '⏳ Saving...' : (editingId ? '💾 Update' : '✅ Create')}
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={loading}>
                                ❌ Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Branches List */}
            {loading && !showForm ? (
                <div className="loading">⏳ Loading branches...</div>
            ) : branches.length === 0 ? (
                <div className="no-data">
                    <p>📭 No branches yet. Click "Add New Branch" to create one.</p>
                </div>
            ) : (
                <div className="branches-grid">
                    {branches.map((branch) => (
                        <div key={branch.id} className="branch-card">
                            <div className="branch-header">
                                <div>
                                    <h3>🏪 {branch.branchName}</h3>
                                    {!branch.isActive && <span className="badge-inactive">Inactive</span>}
                                </div>
                                <span className="branch-id">ID: {branch.id.substring(0, 8)}...</span>
                            </div>

                            <div className="branch-details">
                                {branch.location && (
                                    <div className="detail-row">
                                        <span className="label">📍 Location:</span>
                                        <span>{branch.location}</span>
                                    </div>
                                )}
                                {branch.manager && (
                                    <div className="detail-row">
                                        <span className="label">👤 Manager:</span>
                                        <span>{branch.manager}</span>
                                    </div>
                                )}
                                {branch.phone && (
                                    <div className="detail-row">
                                        <span className="label">📱 Phone:</span>
                                        <a href={`tel:${branch.phone}`}>{branch.phone}</a>
                                    </div>
                                )}
                                {branch.email && (
                                    <div className="detail-row">
                                        <span className="label">📧 Email:</span>
                                        <a href={`mailto:${branch.email}`}>{branch.email}</a>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <span className="label">📅 Created:</span>
                                    <span>{branch.createdAt ? new Date(branch.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>

                            <div className="branch-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() => handleEdit(branch)}
                                    disabled={loading}
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => handleDelete(branch.id, branch.branchName)}
                                    disabled={loading}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
