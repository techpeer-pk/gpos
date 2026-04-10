import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary'
import { onAuthChange } from './firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import ProtectedRoute from './routes/ProtectedRoute'
import useAuthStore from './store/authStore-multi-branch'
import useThemeStore from './store/themeStore'
import { onMessageListener } from './firebase/messaging'
import toast, { Toaster } from 'react-hot-toast'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import PendingApproval from './pages/auth/PendingApproval'
import Invoice from './pages/sales/Invoice'
import Pricing from './pages/public/Pricing'
import Dashboard from './pages/dashboard/Dashboard'
import Products from './pages/products/Products'
import POS from './pages/pos/POS'
import Sales from './pages/sales/Sales'
import Customers from './pages/customers/Customers'
import Inventory from './pages/inventory/Inventory'
import Employees from './pages/employees/Employees'
import Reports from './pages/reports/Reports'
import Settings from './pages/settings/Settings'
import Documentation from './pages/settings/Documentation'
import Help from './pages/settings/Help'
import UserSettings from './pages/auth/UserSettings'
import Suppliers from './pages/inventory/Suppliers'
import PurchaseOrders from './pages/inventory/PurchaseOrders'
import Import from './pages/settings/Import'
import Backup from './pages/settings/Backup'
import Branches from './pages/settings/Branches'
import Expenses from './pages/accounts/Expenses'
import CashFlow from './pages/accounts/CashFlow'
import AccountsSummary from './pages/accounts/AccountsSummary'
import RegisterReconciliation from './pages/accounts/RegisterReconciliation'
import POInvoice from './pages/inventory/POInvoice'
import PublicDocumentation from './pages/public/PublicDocumentation'
import Purpose from './pages/public/Purpose'
import NotificationListener from './components/common/NotificationListener'
import Tables from './pages/restaurant/Tables'
import TableOrder from './pages/restaurant/TableOrder'

function App() {
  const { user, setUser, loading, setLoading } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
    const unsubscribe = onAuthChange(async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser)

          // Step 1: Force context sync on mount/refresh
          // This applies the OWNER SAFETY NET globally
          const { getUserSessionContext } = await import('./firebase/firestore-multi-branch')
          const context = await getUserSessionContext(currentUser.uid)

          if (context) {
            console.log(`🔐 Session Synced: User=${currentUser.uid} Role=${context.role} Biz=${context.businessId}`)

            useAuthStore.setState({
              businessId: context.businessId,
              branchId: useAuthStore.getState().branchId || context.branchId,
              branchName: useAuthStore.getState().branchName || context.branchName,
              userRole: context.role || 'cashier',
              assignedBranches: context.branches || []
            })

            // Load businessType from Firestore
            try {
              const { getBusiness } = await import('./firebase/firestore-multi-branch')
              const bizSnap = await getBusiness(context.businessId)
              if (bizSnap.exists()) {
                const bizType = bizSnap.data().businessType || 'retail'
                useAuthStore.setState({ businessType: bizType })
              }
            } catch (e) {
              console.warn('Could not load businessType', e)
            }
          } else {
            console.warn(`⚠️ No session context found for ${currentUser.uid}`)
          }
        } else {
          setUser(null)
          useAuthStore.setState({ userRole: 'cashier', businessId: null, branchId: null })
        }
      } catch (error) {
        console.error('❌ Session Sync Critical Error:', error)
      } finally {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [setUser, setLoading, initTheme])

  // Foreground Messaging Listener
  useEffect(() => {
    onMessageListener()
      .then((payload) => {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <span className="text-2xl">🔔</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900">{payload.notification.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{payload.notification.body}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000 });
      })
      .catch((err) => console.log('failed: ', err));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center z-[9999]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">GPOS Loading...</p>
      </div>
    )
  }
  const isPending = user && user.role === 'pending'

  return (
    <ErrorBoundary>
      <Toaster position="top-right" reverseOrder={false} />
      <NotificationListener />
      <Routes>
        <Route path="/" element={<PublicDocumentation />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/purpose" element={<Purpose />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Products /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/tables" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
        <Route path="/table-order" element={<ProtectedRoute><TableOrder /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute allowedRoles={['owner']}><Employees /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute allowedRoles={['owner']}><Branches /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Inventory /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['owner']}><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['owner']}><Settings /></ProtectedRoute>} />
        <Route path="/user-settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/invoice/:businessId/:branchId/:id" element={<Invoice />} />
        <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute allowedRoles={['owner']}><Import /></ProtectedRoute>} />
        <Route path="/backup" element={<ProtectedRoute allowedRoles={['owner']}><Backup /></ProtectedRoute>} />
        <Route path="/accounts-summary" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><AccountsSummary /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Expenses /></ProtectedRoute>} />
        <Route path="/cash-flow" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><CashFlow /></ProtectedRoute>} />
        <Route path="/register-reconciliation" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><RegisterReconciliation /></ProtectedRoute>} />
        <Route path="/po-invoice/:id" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><POInvoice /></ProtectedRoute>} />
        <Route path="/docs" element={<PublicDocumentation />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App