import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth, db } from '../../firebase/config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import FirestoreService from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'
import { MigrationService } from '../../firebase/migration'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            // Step 1: Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Step 2: Get user profile from global users collection
            const userDoc = await getDoc(doc(db, 'users', user.uid))
            const userData = userDoc.exists() ? userDoc.data() : null

            // Step 3: Check for pending status
            if (userData?.role === 'pending' || userData?.status === 'pending') {
                useAuthStore.setState({
                    user,
                    userId: user.uid,
                    userEmail: user.email,
                    userRole: 'pending',
                    isAuthenticated: true
                })
                navigate('/pending-approval')
                return
            }

            // Step 4: Get business info
            let context = await MigrationService.getUserBusinessAndBranch(user.uid)

            if (!context) {
                // If no business context, and not pending, then something is wrong
                // or they are an employee without an assignment yet.
                setError('No business assigned to your account. Please contact your manager.')
                setLoading(false)
                return
            }

            // Step 5: Store business and branch context
            const assignedBranches = context.branches?.map(branch => ({
                branchId: branch.branchId,
                branchName: branch.branchName,
                role: 'owner'
            })) || [
                {
                    branchId: context.branchId,
                    branchName: context.branchName || "Main Branch",
                    role: 'owner'
                }
            ]

            useAuthStore.setState({
                user,
                businessId: context.businessId,
                branchId: context.branchId,
                branchName: context.branchName || "Main Branch",
                assignedBranches,
                isAuthenticated: true,
                userId: user.uid,
                userEmail: user.email,
                userRole: 'owner'
            })

            console.log('✅ Login successful. Business:', context.businessId, 'Branch:', context.branchId)

            showSuccess('Logged in successfully')
            navigate('/dashboard')
        } catch (err) {
            console.error('❌ Login error:', err)
            setError(err.message || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
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
                    GPOS v1.0 — Powered by Firebase 🔥
                </p>
            </div>
        </div>
    )
}

export default Login