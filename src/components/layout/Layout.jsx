import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

function Layout({ children, title }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)       // mobile
    const [isCollapsed, setIsCollapsed] = useState(false)            // desktop

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[40] lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                isCollapsed={isCollapsed}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Navbar
                    title={title}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onToggleCollapse={() => setIsCollapsed(prev => !prev)}
                    isCollapsed={isCollapsed}
                />
                <main className={`flex-1 pt-20 p-4 md:p-6 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
                    {children}
                </main>
            </div>
        </div>
    )
}

export default Layout