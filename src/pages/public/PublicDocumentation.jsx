import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useThemeStore from '../../store/themeStore'
import useAuthStore from '../../store/authStore'

export default function PublicDocumentation() {
    const { isDarkMode, toggleTheme, initTheme } = useThemeStore()
    const { user } = useAuthStore()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        initTheme()
    }, [])

    const features = [
        {
            id: 'sales',
            title: 'Core Sales & POS',
            icon: '🛒',
            description: 'The primary interface for customer interactions and revenue generation.',
            items: [
                { label: 'Dynamic Cart', text: 'Real-time price calculation, tax application, and line-item/global discount controls.' },
                { label: 'Held Sales', text: 'Suspend up to 20 carts to the cloud, allowing cashiers to serve other customers concurrently.' },
                { label: 'Returns', text: 'Professional return workflow with manager-override security and automatic restocking.' },
                { label: 'Loyalty', text: 'Integrated point accumulation system with instant redemption during checkout.' },
            ]
        },
        {
            id: 'inventory',
            title: 'Inventory & Procurement',
            icon: '📦',
            description: 'Moving beyond simple tracking to automated asset management.',
            items: [
                { label: 'Product Linkage', text: 'Automatic inventory record creation for new products.' },
                { label: 'Valuation', text: 'Live reporting on Asset Value (at cost) and Potential Revenue (at retail).' },
                { label: 'PO System', text: 'Professional purchase order creation with "One-Click Receive" logic.' },
                { label: 'Alerts', text: 'Proactive monitoring with visual warnings for low-stock thresholds.' },
            ]
        },
        {
            id: 'financials',
            title: 'Financial Intelligence',
            icon: '📊',
            description: 'Professional-grade bookkeeping integrated directly into every sale.',
            items: [
                { label: 'Auto-Sync', text: 'Instant recording of cash sales in the Register history.' },
                { label: 'Expense Tracking', text: 'Monitor overheads (Rent, Utilities, etc.) with categorized reporting.' },
                { label: 'P&L Engine', text: 'COGS tracking to handle price fluctuations and calculate true Net Profit.' },
                { label: 'Reconciliation', text: 'End-of-day workflow comparing digital records vs physical cash.' },
            ]
        },
        {
            id: 'technical',
            title: 'Technical Resilience',
            icon: '📶',
            description: 'Designed to work reliably even when the internet doesn\'t.',
            items: [
                { label: 'PWA', text: 'Installable app experience for Windows, Android, and iOS.' },
                { label: 'Offline Sync', text: 'Full operation without connectivity; data syncs automatically once restored.' },
                { label: 'Role Security', text: 'Enterprise-grade permission profiles (Admin, Manager, Cashier).' },
                { label: 'Data Import', text: 'Bulk-import products and customers via CSV for rapid setup.' },
            ]
        }
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 transition-colors duration-500">

            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200 dark:shadow-none transition-transform group-hover:scale-110">
                                G
                            </div>
                            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">GPOS<span className="text-blue-600">.</span></span>
                            <span className="ml-2 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-[10px] font-black text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-800">v2.0.0</span>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? '🌙' : '☀️'}
                        </button>
                        <Link to="/pricing" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Pricing</Link>
                        <Link to="/purpose" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Purpose</Link>
                        {user ? (
                            <Link to="/dashboard" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 hover:shadow-xl transition-all">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Login</Link>
                                <Link to="/register" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 hover:shadow-xl transition-all">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile: Theme + Hamburger */}
                    <div className="flex md:hidden items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                        >
                            {isDarkMode ? '🌙' : '☀️'}
                        </button>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            aria-label="Toggle menu"
                        >
                            <div className="w-5 h-4 flex flex-col justify-between">
                                <span className={`block h-0.5 bg-gray-700 dark:bg-gray-300 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
                                <span className={`block h-0.5 bg-gray-700 dark:bg-gray-300 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}></span>
                                <span className={`block h-0.5 bg-gray-700 dark:bg-gray-300 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`}></span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                {menuOpen && (
                    <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex flex-col gap-4">
                        <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-blue-600">Features</Link>
                        <Link to="/pricing" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">Pricing</Link>
                        <Link to="/purpose" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">Purpose</Link>
                        {user ? (
                            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="w-full text-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">Login</Link>
                                <Link to="/register" onClick={() => setMenuOpen(false)} className="w-full text-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </nav>

            {/* Hero */}
            <header className="pt-40 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                        </span>
                        Enterprise Grade System
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                        The Intelligent POS for <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Modern Business.</span>
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto">
                        GPOS v2.0 transforms standard retail operations into a high-performance **Multi-Branch** ecosystem.
                        From real-time inventory to deep financial intelligence, everything you need is under one roof.
                    </p>
                </div>
            </header>

            {/* Feature Grid */}
            <main className="max-w-7xl mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {features.map((feature) => (
                        <div key={feature.id} className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                {feature.icon}
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">{feature.title}</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">{feature.description}</p>

                            <div className="grid grid-cols-1 gap-4">
                                {feature.items.map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-1">
                                            <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter mb-0.5">{item.label}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Security Banner */}
            <section className="bg-gray-900 py-16 px-6 overflow-hidden relative">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="max-w-md">
                        <h2 className="text-3xl font-black text-white mb-4 italic">Uncompromising Security.</h2>
                        <p className="text-gray-400 font-medium">
                            We employ military-grade RBAC protocols. Every transaction is audited,
                            and every user role is strictly enforced to protect your business integrity.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center">
                            <p className="text-white font-black text-2xl mb-1">99.9%</p>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Uptime</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center">
                            <p className="text-white font-black text-2xl mb-1">0ms</p>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Sync Lag</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors duration-500">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20">G</div>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400 tracking-tight">GPOS Ecosystem © {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-8">
                        <Link to="/" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Documentation</Link>
                        <Link to="/pricing" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Pricing</Link>
                        <Link to="/purpose" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Purpose</Link>
                        <Link to={user ? "/dashboard" : "/login"} className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">
                            {user ? "Dashboard" : "Login"}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
