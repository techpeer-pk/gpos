import { NavLink } from 'react-router-dom'
import { logout } from '../../firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuthStore from '../../store/authStore-multi-branch'

const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['admin', 'manager', 'cashier'] },
    { path: '/pos', icon: '🛒', label: 'POS', roles: ['admin', 'manager', 'cashier'] },
    { path: '/products', icon: '📦', label: 'Products', roles: ['admin', 'manager'] },
    { path: '/inventory', icon: '🏪', label: 'Inventory', roles: ['admin', 'manager'] },
    { path: '/suppliers', icon: '🏭', label: 'Suppliers', roles: ['admin', 'manager'] },
    { path: '/purchase-orders', icon: '📝', label: 'PO', roles: ['admin', 'manager'] },
    { path: '/sales', icon: '💰', label: 'Sales', roles: ['admin', 'manager', 'cashier'] },
    { path: '/customers', icon: '👥', label: 'Customers', roles: ['admin', 'manager', 'cashier'] },
    { path: '/employees', icon: '👨‍💼', label: 'Employees', roles: ['admin'] },
    { path: '/reports', icon: '📈', label: 'Reports', roles: ['admin'] },
    { path: '/settings', icon: '⚙️', label: 'Settings', roles: ['admin'] },
    { path: '/import', icon: '⬆️', label: 'Import Data', roles: ['admin'] },
    { path: '/backup', icon: '🗄️', label: 'Backup & Restore', roles: ['admin'] },
    { path: '/accounts-summary', icon: '📊', label: 'Summary', roles: ['admin', 'manager'] },
    { path: '/expenses', icon: '💸', label: 'Expenses', roles: ['admin', 'manager'] },
    { path: '/cash-flow', icon: '🏧', label: 'Cash Flow', roles: ['admin', 'manager'] },
    { path: '/register-reconciliation', icon: '📝', label: 'Register Close', roles: ['admin', 'manager'] },
    { path: '/documentation', icon: '📖', label: 'Documentation', roles: ['admin', 'manager', 'cashier'] },
    { path: '/help', icon: '❓', label: 'Help & Support', roles: ['admin', 'manager', 'cashier'] },
    { path: '/user-settings', icon: '👤', label: 'Profile', roles: ['admin', 'manager', 'cashier'] },
]

function Sidebar({ isOpen, setIsOpen }) {
    const navigate = useNavigate()
    const { user, branchName, assignedBranches, switchBranch } = useAuthStore()
    const [showBranchDropdown, setShowBranchDropdown] = useState(false)

    const filteredMenu = menuItems.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    )

    const menuGroups = [
        { title: 'Main', paths: ['/dashboard', '/pos'] },
        { title: 'Management', paths: ['/products', '/inventory', '/suppliers', '/purchase-orders'] },
        { title: 'Sales', paths: ['/sales', '/customers'] },
        { title: 'Administration', paths: ['/employees', '/reports', '/settings', '/import', '/backup'] },
        { title: 'Accounts', paths: ['/accounts-summary', '/expenses', '/cash-flow', '/register-reconciliation'] },
        { title: 'Help', paths: ['/documentation', '/help', '/user-settings'] },
    ]

    const [openGroups, setOpenGroups] = useState(() => {
        const initial = {}
        menuGroups.forEach(g => { initial[g.title] = g.title === 'Main' })
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
                            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white font-medium transition"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🏪</span>
                                <div className="text-left">
                                    <p className="text-xs text-gray-400">Branch</p>
                                    <p className="text-sm font-semibold">{branchName || 'Select Branch'}</p>
                                </div>
                            </div>
                            <span className={`text-gray-400 transition ${showBranchDropdown ? 'rotate-180' : ''}`}>▼</span>
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

            {/* Logout */}
            <div className="p-4 border-t border-gray-700 dark:border-gray-800">
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