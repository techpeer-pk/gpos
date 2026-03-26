import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useThemeStore from '../../store/themeStore'
import useAuthStore from '../../store/authStore'

export default function Purpose() {
    const { isDarkMode, toggleTheme, initTheme } = useThemeStore()
    const { user } = useAuthStore()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        initTheme()
    }, [])

    const businessCategories = [
        {
            title: "Retail Businesses",
            icon: "🛍️",
            items: [
                "Clothing & Apparel Stores",
                "Electronics Stores",
                "Bookstores",
                "Furniture Shops",
                "General Merchandise Stores",
                "Department Stores",
                "Beauty & Cosmetics Retailers"
            ],
            advantages: [
                { label: "Inventory", text: "Real-time inventory tracking" },
                { label: "Scalability", text: "Multi-location management" },
                { label: "Analytics", text: "Sales analytics & trends" },
                { label: "Loyalty", text: "Customer loyalty programs" }
            ]
        },
        {
            title: "Restaurant & Food Service",
            icon: "🍔",
            items: [
                "Fine Dining & Fast Casual",
                "Quick Service Restaurants (QSR)",
                "Cafes & Coffee Shops",
                "Bakeries & Pizzerias",
                "Food Trucks & Delivery",
                "Catering Services"
            ],
            advantages: [
                { label: "Speed", text: "Fast checkout for high-volume" },
                { label: "Payments", text: "Multiple payment methods" },
                { label: "Receipts", text: "Professional receipt generation" },
                { label: "Cart Management", text: "Hold/Resume functionality" }
            ]
        },
        {
            title: "Service-Based Businesses",
            icon: "💇",
            items: [
                "Salons & Spa Centers",
                "Fitness Centers & Gyms",
                "Photography & Tattoo Studios",
                "Repair & Maintenance Services",
                "Medical & Dental Clinics",
                "Veterinary Clinics",
                "Personal Training Services"
            ],
            advantages: [
                { label: "Scheduling", text: "Appointment integration potential" },
                { label: "CRM", text: "Customer follow-ups" },
                { label: "Commissions", text: "Staff commission tracking" },
                { label: "Flexibility", text: "Service-based pricing" }
            ]
        }
    ]

    const moreBusinesses = [
        { title: "Specialty Retail", icon: "🏬", items: ["Grocery & Supermarkets", "Hardware Stores", "Garden Centers", "Toy & Sport Stores"] },
        { title: "Entertainment", icon: "🎫", items: ["Movie Theaters", "Theme Parks", "Concert Venues", "Museums & Galleries"] },
        { title: "Personal Care", icon: "✂️", items: ["Nail Salons", "Waxing Centers", "Makeup Studios", "Hair Services"] },
        { title: "Hospitality", icon: "🏨", items: ["Hotels & Resorts", "Hostels & B&B", "Travel Agencies", "Tour Operators"] },
        { title: "Education", icon: "🎓", items: ["Tuition Centers", "Training Institutes", "Language & Music Schools"] },
        { title: "Convenience", icon: "🏪", items: ["Mini Markets", "Vending Operations", "Pop-up Shops", "Kiosks"] }
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
                        <Link to="/" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Features</Link>
                        <Link to="/pricing" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Pricing</Link>
                        <Link to="/purpose" className="text-sm font-bold text-blue-600 dark:text-blue-400 transition">Purpose</Link>
                        {user ? (
                            <Link to="/dashboard" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 hover:shadow-xl transition-all">
                                Dashboard
                            </Link>
                        ) : (
                            <Link to="/login" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 hover:shadow-xl transition-all">
                                Login
                            </Link>
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
                        <Link to="/" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">Features</Link>
                        <Link to="/pricing" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">Pricing</Link>
                        <Link to="/purpose" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-blue-600">Purpose</Link>
                        {user ? (
                            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="w-full text-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
                                Dashboard
                            </Link>
                        ) : (
                            <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
                                Login
                            </Link>
                        )}
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <header className="pt-40 pb-20 px-6 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-6">
                        🎯 Versatile Solution
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                        Built for <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Every Business.</span>
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto">
                        Whether you're running a boutique, a bustling restaurant, or a specialized clinic, GPOS v2.0 provides the tools to streamline your **Multi-Branch** operations and grow your revenue.
                    </p>
                </div>
            </header>

            {/* Main Categories */}
            <main className="max-w-7xl mx-auto px-6 pb-20">
                <div className="space-y-16">
                    {businessCategories.map((category, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 p-8 md:p-12 shadow-sm hover:shadow-xl transition-all overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>

                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div>
                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner">
                                        {category.icon}
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-6">{category.title}</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {category.items.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-6">Key Advantages</h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        {category.advantages.map((adv, i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-blue-600">
                                                    ✓
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter">{adv.label}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{adv.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grid for more categories */}
                <div className="mt-20">
                    <h2 className="text-3xl font-black text-center text-gray-900 dark:text-gray-100 mb-12 uppercase tracking-tight">Additional Industries</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {moreBusinesses.map((category, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-blue-600 transition-all group">
                                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{category.icon}</div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-4">{category.title}</h3>
                                <ul className="space-y-2">
                                    {category.items.map((item, i) => (
                                        <li key={i} className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Ideal Profile */}
            <section className="bg-gray-900 py-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.1),transparent)] pointer-events-none"></div>
                <div className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-black text-white mb-6 italic">Ideal Business Profile.</h2>
                        <p className="text-gray-400 font-medium text-lg leading-relaxed mb-8">
                            GPOS is designed to empower small to medium-sized enterprises (SMEs) and startups with institutional-grade technology.
                        </p>
                        <div className="grid grid-cols-1 gap-4 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">✓</div>
                                <span className="font-bold">Businesses with 1-50 employees</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">✓</div>
                                <span className="font-bold">Low to high transaction volumes</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">✓</div>
                                <span className="font-bold">Budget-conscious operations</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">✓</div>
                                <span className="font-bold">Global & multi-currency support</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[32px] border border-white/10 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-6">Why GPOS?</h3>
                        <div className="space-y-6">
                            {[
                                { title: "Firebase Built", desc: "No hosting costs, enterprise-grade security." },
                                { title: "PWA Native", desc: "Installs on mobile, works perfectly offline." },
                                { title: "Zero Licensing", desc: "Keep your revenue. No hidden fees." },
                                { title: "Role-Based", desc: "Precise control for your entire staff." }
                            ].map((feature, i) => (
                                <div key={i}>
                                    <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-1">{feature.title}</h4>
                                    <p className="text-gray-400 text-sm font-medium">{feature.desc}</p>
                                </div>
                            ))}
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
                        <Link to="/" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Features</Link>
                        <Link to="/pricing" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Pricing</Link>
                        <Link to="/purpose" className="text-xs font-black uppercase text-blue-600 transition">Purpose</Link>
                        <Link to={user ? "/dashboard" : "/login"} className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">
                            {user ? "Dashboard" : "Login"}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
