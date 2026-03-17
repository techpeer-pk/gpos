import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '../../firebase/config'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { initializeBusiness } from '../../firebase/firestore-multi-branch'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

function Register() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleRegister = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Update Auth Profile
            await updateProfile(user, { displayName: name })

            // Step 1: Initialize business context (Initialization)
            console.log('🏗️ Initializing business setup...')
            const context = await initializeBusiness(
                user.uid,
                `${name}'s Business`,
                "Main Branch"
            )

            // Step 2: Create GLOBAL user record (SBS Guide Pattern)
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email,
                name: name,
                role: 'pending',
                businessId: context.businessId,
                createdAt: serverTimestamp()
            })

            // Step 3: Create LOCAL business profile
            await setDoc(doc(db, 'business_users', context.businessId, user.uid, 'profile'), {
                uid: user.uid,
                name: name,
                email: email,
                role: 'pending',
                businessId: context.businessId,
                status: 'pending',
                createdAt: serverTimestamp()
            })

            // Update local state and redirect to pending screen
            useAuthStore.setState({
                user,
                businessId: context.businessId,
                branchId: context.branchId,
                branchName: context.branchName,
                userId: user.uid,
                userEmail: user.email,
                userRole: 'pending',
                isAuthenticated: true
            })

            showSuccess('Registration successful! Awaiting activation.')
            navigate('/pending-approval')
        } catch (err) {
            handleError(err, 'Register', 'Failed to create account')
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Join GPOS</h1>
                    <p className="text-gray-500 mt-2">Create your employee account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="john@gpos.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Request Access'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
                    <div>
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                            Log In
                        </Link>
                    </div>
                    <div>
                        <Link to="/docs" className="text-gray-400 hover:text-blue-600 transition font-medium">
                            📘 View Documentation
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
