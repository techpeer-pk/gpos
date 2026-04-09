import { NavLink } from 'react-router-dom'
import { logout } from '../../firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import useAuthStore from '../../store/authStore-multi-branch'
import { requestNotificationPermission } from '../../firebase/messaging'
import toast from 'react-hot-toast'

const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['owner', 'manager', 'cashier'] },
    { path: '/pos', icon: '🛒', label: 'POS', roles: ['owner', 'manager', 'cashier'] },
    { path: '/tables', icon: '🪑', label: 'Tables', roles: ['owner', 'manager', 'cashier'] },
    { path: '/table-order', icon: '🍽️', label: 'Take Order', roles: ['owner', 'manager', 'cashier'] },
    { path: '/products', icon: '📦', label: 'Products', roles: ['owner', 'manager'] },
    { path: '/inventory', icon: '🏪', label: 'Inventory', roles: ['owner', 'manager'] },
    { path: '/suppliers', icon: '🏭', label: 'Suppliers', roles: ['owner', 'manager'] },
    { path: '/purchase-orders', icon: '📝', label: 'PO', roles: ['owner', 'manager'] },
    { path: '/sales', icon: '💰', label: 'Sales', roles: ['owner', 'manager', 'cashier'] },
    { path: '/customers', icon: '👥', label: 'Customers', roles: ['owner', 'manager', 'cashier'] },
    { path: '/employees', icon: '👨‍💼', label: 'Employees', roles: ['owner'] },
    { path: '/branches', icon: '🏢', label: 'Branches', roles: ['owner'] },
    { path: '/reports', icon: '📈', label: 'Reports', roles: ['owner'] },
    { path: '/settings', icon: '⚙️', label: 'Settings', roles: ['owner'] },
    { path: '/import', icon: '⬆️', label: 'Import Data', roles: ['owner'] },
    { path: '/backup', icon: '🗄️', label: 'Backup & Restore', roles: ['owner'] },
    { path: '/accounts-summary', icon: '📊', label: 'Summary', roles: ['owner', 'manager'] },
    { path: '/expenses', icon: '💸', label: 'Expenses', roles: ['owner', 'manager'] },
    { path: '/cash-flow', icon: '🏧', label: 'Cash Flow', roles: ['owner', 'manager'] },
    { path: '/register-reconciliation', icon: '📝', label: 'Register Close', roles: ['owner', 'manager'] },
    { path: '/documentation', icon: '📖', label: 'Documentation', roles: ['owner', 'manager', 'cashier'] },
    { path: '/help', icon: '❓', label: 'Help & Support', roles: ['owner', 'manager', 'cashier'] },
    { path: '/user-settings', icon: '👤', label: 'Profile', roles: ['owner', 'manager', 'cashier'] },
]

function Sidebar({ isOpen, setIsOpen }) {
    const navigate = useNavigate()
    const { user, businessId, userRole, branchName, assignedBranches, switchBranch } = useAuthStore()
    const [showBranchDropdown, setShowBranchDropdown] = useState(false)
    const [notifLoading, setNotifLoading] = useState(false)

    const handleEnableNotifications = async () => {
        setNotifLoading(true)
        const token = await requestNotificationPermission(businessId, user.uid)
        if (token) {
            toast.success('Notifications enabled successfully!')
        } else {
            toast.error('Could not enable notifications. Please check browser settings.')
        }
        setNotifLoading(false)
    }

    const filteredMenu = menuItems.filter(item =>
        !item.roles || item.roles.includes(userRole)
    )

    const menuGroups = [
        { title: 'Main', paths: ['/dashboard', '/pos'] },
        { title: 'Restaurant', paths: ['/tables', '/table-order'] },
        { title: 'Management', paths: ['/products', '/inventory', '/suppliers', '/purchase-orders'] },
        { title: 'Sales', paths: ['/sales', '/customers'] },
        { title: 'Administration', paths: ['/employees', '/branches', '/reports', '/settings', '/import', '/backup'] },
        { title: 'Accounts', paths: ['/accounts-summary', '/expenses', '/cash-flow', '/register-reconciliation'] },
        { title: 'Help', paths: ['/documentation', '/help', '/user-settings'] },
    ]

    const [openGroups, setOpenGroups] = useState(() => {
        const initial = {}
        menuGroups.forEach(g => { 
            initial[g.title] = g.title === 'Main' 
        })
        return initial
    })

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className={`h-screen w-64 bg-gray-900 dark:bg-black text-white flex flex-col fixed left-0 top-0 z-[50] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

            {/* Logo */}
            <div className="p-6 border-b border-gray-700 dark:border-gray-800">
                <h1 className="text-2xl font-bold text-blue-400">GPOS</h1>
                <p className="text-gray-400 text-xs mt-1">General Point of Sale</p>
            </div>

            {/* Branch Selector */}
            {assignedBranches && assignedBranches.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-700 dark:border-gray-800">
                    <div className="relative">
                        <button
                            onClick={() => userRole !== 'cashier' && setShowBranchDropdown(!showBranchDropdown)}
                            disabled={userRole === 'cashier'}
                            className={`w-full flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-sm text-white font-medium transition ${userRole !== 'cashier' ? 'hover:bg-gray-700 cursor-pointer' : 'cursor-default opacity-90'}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🏪</span>
                                <div className="text-left">
                                    <p className="text-xs text-gray-400">Branch</p>
                                    <p className="text-sm font-semibold">{branchName || 'Select Branch'}</p>
                                </div>
                            </div>
                            {userRole !== 'cashier' && (
                                <span className={`text-gray-400 transition ${showBranchDropdown ? 'rotate-180' : ''}`}>▼</span>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {showBranchDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                                {assignedBranches.map((branch) => (
                                    <button
                                        key={branch.branchId}
                                        onClick={() => {
                                            switchBranch(branch.branchId, branch.branchName)
                                            setShowBranchDropdown(false)
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        <span className="mr-2">🏪</span>
                                        {branch.branchName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Menu (grouped) */}
            <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
                {menuGroups.map((group) => {
                    const items = filteredMenu.filter(i => group.paths.includes(i.path))
                    if (!items.length) return null
                    const open = !!openGroups[group.title]
                    return (
                        <div key={group.title}>
                            <button
                                type="button"
                                onClick={() => setOpenGroups(prev => ({ ...prev, [group.title]: !prev[group.title] }))}
                                className="w-full flex items-center justify-between px-2 mb-2 text-xs uppercase text-gray-400 font-black h-8"
                                aria-expanded={open}
                            >
                                <span>{group.title}</span>
                                <span className={`transform transition-transform text-gray-500 hover:text-white ${open ? 'rotate-90' : ''}`}>▸</span>
                            </button>

                            {open && (
                                <div className="bg-gray-800/50 dark:bg-white/5 rounded-lg p-2 space-y-1">
                                    {items.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-4 py-3 rounded-md transition text-sm font-medium ${isActive
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                                    : 'text-gray-400 hover:bg-gray-700 dark:hover:bg-white/10 hover:text-white'
                                                }`
                                            }
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            {item.label}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>

            {/* Notifications & Logout */}
            <div className="p-4 border-t border-gray-700 dark:border-gray-800 space-y-2">
                <button
                    onClick={handleEnableNotifications}
                    disabled={notifLoading}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-400 hover:bg-blue-600/10 transition w-full text-sm font-medium border border-blue-900/30"
                >
                    <span className="text-lg">{notifLoading ? '⌛' : '🔔'}</span>
                    {notifLoading ? 'Enabling...' : 'Enable Alerts'}
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 hover:bg-red-600 hover:text-white transition w-full text-sm font-medium"
                >
                    <span className="text-lg">🚪</span>
                    Logout
                </button>
            </div>

        </div>
    )
}

export default Sidebar