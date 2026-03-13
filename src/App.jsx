import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/common/ErrorBoundary'
import { onAuthChange } from './firebase/auth'
import { db } from './firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import ProtectedRoute from './routes/ProtectedRoute'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
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

function App() {
  const { user, setUser, loading, setLoading } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
    const unsubscribe = onAuthChange(async (currentUser) => {
      setLoading(true)
      try {
        if (currentUser) {
          // User role/permissions are now managed during login
          // and persisted in localStorage via authStore-multi-branch
          // Just validate user exists in Firebase Auth
          setUser(currentUser)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error("Auth sync error:", err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

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
      <Routes>
        <Route path="/" element={<PublicDocumentation />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/purpose" element={<Purpose />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/pending" element={user && isPending ? <PendingApproval /> : <Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Products /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute allowedRoles={['admin']}><Branches /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Inventory /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
        <Route path="/user-settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/invoice/:id" element={<Invoice />} />
        <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute allowedRoles={['admin']}><Import /></ProtectedRoute>} />
        <Route path="/backup" element={<ProtectedRoute allowedRoles={['admin']}><Backup /></ProtectedRoute>} />
        <Route path="/accounts-summary" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AccountsSummary /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Expenses /></ProtectedRoute>} />
        <Route path="/cash-flow" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CashFlow /></ProtectedRoute>} />
        <Route path="/register-reconciliation" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RegisterReconciliation /></ProtectedRoute>} />
        <Route path="/po-invoice/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><POInvoice /></ProtectedRoute>} />
        <Route path="/docs" element={<PublicDocumentation />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App