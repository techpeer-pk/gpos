import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Auth Store - Multi-Branch Aware
 * Stores current user, business, and branch context
 */

const useAuthStore = create(
    persist(
        (set, get) => ({
            // User Info
            user: null,
            isAuthenticated: false,
            userEmail: '',
            userId: '',
            userRole: 'cashier', // owner | manager | cashier

            // Business & Branch Context
            businessId: null,
            branchId: null,
            businessName: '',
            branchName: '',
            branchLocation: '',
            
            // User's Available Branches
            assignedBranches: [], // [{ branchId, branchName, role }, ...]
            
            // Theme (existing)
            isDarkMode: false,

            // Auth Loading State
            loading: true,

            // ========== USER ACTIONS ==========

            setLoading: (loading) => set({ loading }),

            setUser: (user) => {
                set({
                    user,
                    isAuthenticated: !!user,
                    userId: user?.uid || '',
                    userEmail: user?.email || ''
                })
            },

            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    userId: '',
                    userEmail: '',
                    businessId: null,
                    branchId: null,
                    businessName: '',
                    branchName: '',
                    assignedBranches: [],
                    userRole: 'cashier'
                })
            },

            // ========== BUSINESS & BRANCH ACTIONS ==========

            /**
             * Set the current business and branch
             * Called after login or when business selection is made
             */
            setBusinessAndBranch: (businessId, branchId, businessName = '', branchName = '', userRole = 'cashier') => {
                set({
                    businessId,
                    branchId,
                    businessName,
                    branchName,
                    userRole
                })
            },

            /**
             * Set available branches for user
             * Called during login - user can switch between these
             */
            setAssignedBranches: (assignedBranches) => {
                set({ assignedBranches })
            },

            /**
             * Switch to a different branch (if user has access)
             * @param {string} branchId - Branch ID to switch to
             */
            switchBranch: (branchId, branchName = '') => {
                const { assignedBranches } = get()
                const branchExists = assignedBranches.some(b => b.branchId === branchId)
                
                if (branchExists) {
                    set({ branchId, branchName })
                    return true
                } else {
                    console.warn(`Branch ${branchId} not accessible to this user`)
                    return false
                }
            },

            /**
             * Update branch information (metadata)
             */
            updateBranchInfo: (branchName, branchLocation = '') => {
                set({
                    branchName,
                    branchLocation
                })
            },

            // ========== USER ROLE ACTIONS ==========

            /**
             * Check if user has a specific role
             */
            hasRole: (role) => {
                const { userRole } = get()
                if (userRole === 'owner') return true // Owner can do everything
                return userRole === role
            },

            /**
             * Check if user has any of the given roles
             */
            hasAnyRole: (roles) => {
                const { userRole } = get()
                if (userRole === 'owner') return true
                return roles.includes(userRole)
            },

            /**
             * Check if user can access a specific branch
             */
            canAccessBranch: (branchId) => {
                const { assignedBranches, userRole } = get()
                if (userRole === 'owner') return true // Owner can access all branches
                return assignedBranches.some(b => b.branchId === branchId)
            },

            // ========== THEME ACTIONS ==========

            toggleDarkMode: () => {
                set((state) => ({ isDarkMode: !state.isDarkMode }))
            },

            setDarkMode: (isDark) => {
                set({ isDarkMode: isDark })
            },

            // ========== GETTERS ==========

            /**
             * Get current user info
             */
            getUserInfo: () => {
                const { user, userId, userEmail, userRole } = get()
                return { user, userId, userEmail, userRole }
            },

            /**
             * Get current business/branch context
             */
            getCurrentContext: () => {
                const { businessId, branchId, businessName, branchName } = get()
                return { businessId, branchId, businessName, branchName }
            },

            /**
             * Get only business and branch IDs (useful for queries)
             */
            getBusinessAndBranchIds: () => {
                const { businessId, branchId } = get()
                return { businessId, branchId }
            },

            /**
             * Check if user is owner
             */
            isOwner: () => {
                const { userRole } = get()
                return userRole === 'owner'
            },

            /**
             * Check if user is manager
             */
            isManager: () => {
                const { userRole } = get()
                return userRole === 'manager'
            },

            /**
             * Check if user is cashier
             */
            isCashier: () => {
                const { userRole } = get()
                return userRole === 'cashier'
            },

            /**
             * Check if user is fully set up (business + branch assigned)
             */
            isFullySetUp: () => {
                const { businessId, branchId } = get()
                return !!businessId && !!branchId
            }
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({
                // Persist these fields to localStorage
                isDarkMode: state.isDarkMode,
                businessId: state.businessId,
                branchId: state.branchId,
                businessName: state.businessName,
                branchName: state.branchName,
                userRole: state.userRole,
                assignedBranches: state.assignedBranches
            })
        }
    )
)

export default useAuthStore
