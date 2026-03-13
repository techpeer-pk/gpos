import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { auth, db } from '../../firebase/config'
import { updateProfile, updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import useAuthStore from '../../store/authStore-multi-branch'
import { handleError, showSuccess } from '../../utils/errorHandler'

function UserSettings() {
    const { user, businessId } = useAuthStore()
    const [name, setName] = useState(user?.displayName || '')
    const [newPassword, setNewPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        if (user) setName(user.displayName || '')
    }, [user])

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        try {
            // Update Firebase Auth
            await updateProfile(auth.currentUser, { displayName: name })

            // Update Firestore business_users collection
            if (businessId && auth.currentUser?.uid) {
                const userRef = doc(db, 'business_users', businessId, auth.currentUser.uid, 'profile')
                await updateDoc(userRef, { name: name })
            }

            showSuccess('Profile updated successfully')
        } catch (err) {
            handleError(err, 'Update Profile', 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (!newPassword) return
        setLoading(true)
        setMessage(null)
        try {
            await updatePassword(auth.currentUser, newPassword)
            setNewPassword('')
            showSuccess('Password changed successfully')
        } catch (err) {
            handleError(err, 'Change Password', 'Failed to change password. You may need to re-login first.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Layout title="My Profile Settings">
            <div className="max-w-xl">

                {message && (
                    <div className={`mt-12 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                        {message.type === 'success' ? '✅' : '❌'} {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">

                    {/* Account Info */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mt-12">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">
                                👤
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-800">{user?.displayName || 'User'}</h3>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{user?.role} Account</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800 transition-all"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full border-2 border-gray-50 bg-gray-50 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed font-medium italic"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Contact admin to change your registered email.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Update Profile Name'}
                            </button>
                        </form>
                    </div>

                    {/* Security */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                            <span>🔐</span> Security & Password
                        </h3>
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800 transition-all"
                                    placeholder="••••••••"
                                    minLength="6"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !newPassword}
                                className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition shadow-lg disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </Layout>
    )
}

export default UserSettings
