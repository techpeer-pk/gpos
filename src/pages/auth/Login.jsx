import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth, db } from '../../firebase/config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import FirestoreService, { getUserSessionContext } from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const [showBranchSelect, setShowBranchSelect] = useState(false)
    const [availableBranches, setAvailableBranches] = useState([])
    const [loginContext, setLoginContext] = useState(null)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            // Step 1: Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Step 2: Get user profile from GLOBAL users collection
            const userDoc = await getDoc(doc(db, 'users', user.uid))
            const userData = userDoc.exists() ? userDoc.data() : null

            if (!userData) {
                setError('No account record found. Please register or contact your admin.')
                setLoading(false)
                return
            }

            const businessId = userData.businessId
            const userRole = userData.role

            // Step 3: Check for pending status
            if (userRole === 'pending') {
                useAuthStore.setState({
                    user,
                    userId: user.uid,
                    userEmail: user.email,
                    userRole: 'pending',
                    businessId: businessId,
                    isAuthenticated: true
                })
                navigate('/pending-approval')
                return
            }

            // Step 4: Get business & branches context (Session Context)
            let context = await getUserSessionContext(user.uid)
            
            if (!context) {
                setError('Failed to load business context. Please contact support.')
                setLoading(false)
                return
            }

            const branches = context.branches?.map(branch => ({
                branchId: branch.branchId,
                branchName: branch.branchName,
                role: context.role || 'owner'
            })) || [
                {
                    branchId: context.branchId,
                    branchName: context.branchName || "Main Branch",
                    role: context.role || 'owner'
                }
            ]

            // Step 5: Decision - Show Branch Selection or Auto-Login
            if (branches.length > 1) {
                setAvailableBranches(branches)
                setLoginContext({ ...context, user, userRole })
                setShowBranchSelect(true)
            } else {
                // Auto-login to the only branch
                completeLogin(user, context, branches[0], userRole)
            }
        } catch (err) {
            console.error('❌ Login error:', err)
            setError(err.message || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    const completeLogin = (user, context, selectedBranch, role) => {
        // PRIORITY: Use the role verified by MigrationService (which has the owner safety net)
        // This allows recovery if the global users document was corrupted
        const finalRole = context.role || role
        useAuthStore.setState({
            user,
            businessId: context.businessId,
            branchId: selectedBranch.branchId,
            branchName: selectedBranch.branchName,
            assignedBranches: availableBranches.length > 0 ? availableBranches : [selectedBranch],
            isAuthenticated: true,
            userId: user.uid,
            userEmail: user.email,
            userRole: finalRole
        })
        showSuccess(`Welcome back to ${selectedBranch.branchName}!`)
        navigate('/dashboard')
    }

    if (showBranchSelect) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🏪</div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Select Branch</h2>
                        <p className="text-gray-500 mt-2">Which location would you like to open today?</p>
                    </div>

                    <div className="space-y-3">
                        {availableBranches.map((branch) => (
                            <button
                                key={branch.branchId}
                                onClick={() => completeLogin(loginContext.user, loginContext, branch, loginContext.userRole)}
                                className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-800 group-hover:text-blue-700">{branch.branchName}</p>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-0.5">{branch.role}</p>
                                    </div>
                                    <span className="text-gray-300 group-hover:text-blue-500">→</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            setShowBranchSelect(false)
                            setLoading(false)
                        }}
                        className="w-full mt-6 text-sm text-gray-400 font-bold uppercase tracking-widest hover:text-gray-600 transition"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-blue-600">GPOS</h1>
                    <p className="text-gray-400 mt-1">General Point of Sale</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
                    <div>
                        Need an account?{' '}
                        <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                            Register here
                        </Link>
                    </div>
                    <div>
                        <Link to="/docs" className="text-gray-400 hover:text-blue-600 transition font-medium">
                            📘 View Documentation
                        </Link>
                    </div>
                </div>

                <p className="text-center text-gray-400 text-sm mt-6">
                    GPOS v2.0.0 — Modern Multi-Branch POS 🔥
                </p>
            </div>
        </div>
    )
}

export default Login