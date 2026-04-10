import { useState, useEffect } from 'react'
import useAuthStore from '../../store/authStore-multi-branch'
import useThemeStore from '../../store/themeStore'

function Navbar({ title, onMenuClick, onToggleCollapse, isCollapsed }) {
    const { user, userRole } = useAuthStore()
    const { isDarkMode, toggleTheme } = useThemeStore()
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return (
        <div className={`h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 fixed top-0 right-0 z-[30] transition-all duration-300 ${isCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-64'}`}>

            <div className="flex items-center gap-3">
                {/* Mobile toggle */}
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
                >
                    <span className="text-xl dark:text-gray-400">☰</span>
                </button>
                {/* Desktop toggle */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition items-center justify-center"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    <span className="text-lg">{isCollapsed ? '▶' : '◀'}</span>
                </button>
                {/* Page Title */}
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{title}</h2>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDarkMode ? '🌙' : '☀️'}
                </button>

                {/* Offline Badge */}
                {!isOnline && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100 dark:border-red-900/30 flex items-center gap-2 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full"></span>
                        Offline Mode
                    </div>
                )}
                {isOnline && (
                    <div className="hidden md:flex bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-900/30 items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full"></span>
                        Online
                    </div>
                )}
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-none">{user?.displayName || 'User'}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{userRole || 'Staff'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 dark:shadow-none ring-2 ring-white dark:ring-gray-800">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
            </div>

        </div>
    )
}

export default Navbar