import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useThemeStore from '../../store/themeStore'

export default function Pricing() {
    const { isDarkMode, toggleTheme, initTheme } = useThemeStore()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        initTheme()
    }, [])

    const toggleFaq = (e) => {
        const item = e.currentTarget.parentElement
        item.classList.toggle('open')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 transition-colors duration-500">
            {/* Nav */}
            <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200 dark:shadow-none group-hover:scale-110 transition-transform">
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
                        <Link to="/purpose" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition" >Purpose</Link>
                        <a href="https://wa.me/923090404293?text=Hello%20GPOS%20Team%2C%20I%20have%20a%20question%20about%20your%20product." target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95">
                            Contact Us
                        </a>
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
                        <Link to="/purpose" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">Purpose</Link>
                        <Link to="/pricing" onClick={() => setMenuOpen(false)} className="text-sm font-bold text-blue-600">Pricing</Link>
                        <a
                            href="https://wa.me/923090404293?text=Hello%20GPOS%20Team%2C%20I%20have%20a%20question%20about%20your%20product."
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMenuOpen(false)}
                            className="w-full text-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all active:scale-95"
                        >
                            Contact Us
                        </a>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <header className="pt-40 pb-20 px-6 bg-gradient-to-br from-blue-50/50 via-transparent to-amber-50/50 dark:from-blue-900/10 dark:via-transparent dark:to-amber-900/10 transition-colors duration-500">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-800">
                        🇵🇰 Made for Pakistani Businesses
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                        Simple Pricing.<br /><span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">No Surprises.</span>
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto mb-4">
                        Professional **Multi-Branch** Point of Sale software built for small businesses. Start free, scale when you're ready.
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest">⚡ No monthly lock-in. Cancel anytime.</p>
                </div>
            </header>

            {/* Pricing Grid */}
            <main className="max-w-7xl mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

                    {/* Starter Plan */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Starter</div>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-lg font-bold text-gray-500 dark:text-gray-400">PKR</span>
                            <span className="text-5xl font-black text-gray-900 dark:text-gray-100">0</span>
                            <span className="text-sm font-medium text-gray-400">/ month</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
                            Perfect for trying GPOS. Get started today with no credit card required.
                        </p>
                        <ul className="space-y-4 mb-8">
                            <PlanFeature check label="1 Cashier Account" />
                            <PlanFeature check label="Up to 50 Products" />
                            <PlanFeature check label="Basic POS & Checkout" />
                            <PlanFeature check label="Sales History" />
                            <PlanFeature check label="Digital Receipts" />
                            <PlanFeature check label="Works Offline (PWA)" />
                            <PlanFeature cross label="Advanced Reports" />
                            <PlanFeature cross label="Multiple Cashiers" />
                            <PlanFeature cross label="Customer Loyalty" />
                        </ul>
                        <a href="https://wa.me/923090404293?text=Hello%20GPOS%20Team%2C%20I%20have%20a%20question%20about%20your%20product." target="_blank" rel="noopener noreferrer" className="block w-full text-center py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 font-black uppercase tracking-widest text-xs hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95">
                            Get Started Free
                        </a>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border-2 border-blue-600 shadow-2xl shadow-blue-500/10 relative scale-105 z-10">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30">
                            ⭐ Most Popular
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Professional</div>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">PKR</span>
                            <span className="text-5xl font-black text-gray-900 dark:text-gray-100">3,500</span>
                            <span className="text-sm font-medium text-gray-400">/ month</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
                            Everything you need to run a professional retail or service business.
                        </p>
                        <ul className="space-y-4 mb-8">
                            <PlanFeature check label="Up to 3 Cashier Accounts" />
                            <PlanFeature check label="Unlimited Products" />
                            <PlanFeature check label="Full POS with Barcode Scanner" />
                            <PlanFeature check label="Advanced Reports" />
                            <PlanFeature check label="Customer Loyalty" />
                            <PlanFeature check label="Inventory Management" />
                            <PlanFeature check label="GST / Tax Configuration" />
                            <PlanFeature check label="Held Sales (Park Orders)" />
                            <PlanFeature check label="WhatsApp Support" />
                        </ul>
                        <a href="https://wa.me/923090404293?text=Hello%20GPOS%20Team%2C%20I%20have%20a%20question%20about%20your%20product." target="_blank" rel="noopener noreferrer" className="block w-full text-center py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                            Start 7-Day Free Trial
                        </a>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Enterprise</div>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-lg font-bold text-gray-500 dark:text-gray-400">PKR</span>
                            <span className="text-5xl font-black text-gray-900 dark:text-gray-100">7,500</span>
                            <span className="text-sm font-medium text-gray-400">/ month</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
                            For businesses with multiple staff and advanced reporting needs.
                        </p>
                        <ul className="space-y-4 mb-8">
                            <PlanFeature check label="Unlimited Cashier Accounts" />
                            <PlanFeature check label="Everything in Professional" />
                            <PlanFeature check label="Profit & Loss Reports" />
                            <PlanFeature check label="Expense Tracking" />
                            <PlanFeature check label="Supplier Management" />
                            <PlanFeature check label="Purchase Orders" />
                            <PlanFeature check label="Role-Based Access (RBAC)" />
                            <PlanFeature check label="End of Day Reconciliation" />
                            <PlanFeature check label="Priority Phone Support" />
                        </ul>
                        <a href="https://wa.me/923090404293?text=Hello%20GPOS%20Team%2C%20I%20have%20a%20question%20about%20your%20product." target="_blank" rel="noopener noreferrer" className="block w-full text-center py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 font-black uppercase tracking-widest text-xs hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95">
                            Contact for Demo
                        </a>
                    </div>

                </div>
            </main>

            {/* One-time Services */}
            <section className="bg-white dark:bg-gray-900 py-20 px-6 border-y border-gray-100 dark:border-gray-800 transition-colors duration-500">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-tight">One-Time Services</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-12">Get professional setup and training at your location.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ServiceCard emoji="🚀" title="Basic Setup" price="5,000" desc="Installation, Firebase configuration, and product entry." />
                        <ServiceCard emoji="🎓" title="Setup + Training" price="12,000" desc="Full setup plus hands-on training for staff." />
                        <ServiceCard emoji="⚙️" title="Custom Feature" price="15,000+" desc="Tailored Features built for your workflow." />
                        <ServiceCard emoji="🔄" title="Data Migration" price="8,000" desc="Import products and ledger from your old system." />
                    </div>
                </div>
            </section>

            {/* FAQ Area */}
            <section className="py-20 px-6 max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-center text-gray-900 dark:text-gray-100 mb-12 uppercase tracking-tight">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <FaqItem question="Is GPOS really free to start?" answer="Yes! The Starter plan is 100% free with no credit card required. You can upgrade only when you need professional features." />
                    <FaqItem question="Can I use it on mobile?" answer="Yes! GPOS is a PWA that works on all devices with a web browser, including mobile phones, tablets, and desktops. You can even install it as an app on Android and iOS." />
                    <FaqItem question="Does it work without internet?" answer="Absolutely. GPOS is a PWA that works offline. Data syncs automatically once your internet connection is restored." />
                    <FaqItem question="Can I use a barcode scanner?" answer="Yes! GPOS supports all USB and Bluetooth barcode scanners for instant product lookup and lightning-fast checkout." />
                    <FaqItem question="Is my data safe and secure?" answer="Your data is stored on Google Firebase — the same ultra-secure infrastructure used by the world's top applications." />
                    <FaqItem question="What happens to my data if I cancel?" answer="Your data remains safe in your Firebase account. You can export all your products and sales history anytime." />
                    <FaqItem question="Do I need a printer?" answer="No. You can send digital receipts directly to your customers via WhatsApp or SMS." />
                </div>
            </section>

            {/* Final CTA */}
            <section className="bg-gray-900 dark:bg-black py-20 px-6 transition-colors duration-500">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">Modernize Your Business.</h2>
                    <p className="text-gray-400 font-medium mb-12 text-lg">Join businesses across Pakistan scale their operations with GPOS.</p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <a href="https://wa.me/923090404293" target="_blank" rel="noopener noreferrer" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1 transition-all">
                            📱 WhatsApp Us
                        </a>
                        <Link to="/register" className="px-10 py-4 bg-gray-800 text-white border border-gray-700 rounded-2xl font-black uppercase tracking-widest text-sm hover:border-gray-500 transition-all">
                            Sign Up Now
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors duration-500">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-xs">G</div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">© 2026 GPOS — Built with <span className="text-red-500">❤️</span> in Pakistan.</p>
                    </div>
                    <div className="flex gap-8">
                        <Link to="/" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Features</Link>
                        <Link to="/purpose" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Purpose</Link>
                        <Link to="/login" className="text-xs font-black uppercase text-gray-400 hover:text-blue-600 transition">Dashboard</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function PlanFeature({ label, check, cross }) {
    return (
        <li className="flex items-start gap-3">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${check ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                {check ? '✓' : '✕'}
            </div>
            <span className={`text-sm ${cross ? 'text-gray-400 line-through decoration-2' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>{label}</span>
        </li>
    )
}

function ServiceCard({ emoji, title, price, desc }) {
    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-blue-600 transition-colors group">
            <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-500 w-fit mx-auto">{emoji}</div>
            <h4 className="font-black text-gray-900 dark:text-gray-100 mb-1 leading-tight">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{desc}</p>
            <div className="text-blue-600 dark:text-blue-400 font-black text-lg">PKR {price}</div>
        </div>
    )
}

function FaqItem({ question, answer }) {
    const toggle = (e) => {
        const item = e.currentTarget.parentElement
        item.classList.toggle('open')
    }
    return (
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 group transition-all [&.open]:ring-2 [&.open]:ring-blue-600">
            <button
                onClick={toggle}
                className="w-full text-left px-6 py-5 flex items-center justify-between group"
            >
                <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{question}</span>
                <span className="text-gray-400 transition-transform duration-300 group-[.open]:rotate-180">▼</span>
            </button>
            <div className="hidden group-[.open]:block px-6 pb-5 pt-0 text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed animate-in slide-in-from-top-2">
                {answer}
            </div>
        </div>
    )
}
