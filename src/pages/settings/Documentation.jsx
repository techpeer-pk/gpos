import Layout from '../../components/layout/Layout'

function Documentation() {
    const sections = [
        {
            title: "🚀 Project Overview",
            content: "GPOS is a modern, reactive Point of Sale system built with React and Firebase. It is designed for speed, security, and global flexibility, featuring real-time inventory synchronization, role-based access control, and dynamic business configurations."
        },
        {
            title: "🛠️ Technology Stack",
            items: [
                "Frontend: React.js (Vite)",
                "Backend: Firebase Cloud Firestore",
                "Authentication: Firebase Auth (Role-based)",
                "State Management: Zustand",
                "Styling: Vanilla CSS with Modern Layouts"
            ]
        },
        {
            title: "✨ Core Features",
            subsections: [
                {
                    subtitle: "POS Engine",
                    list: [
                        "Hold Sale: Suspend carts to serve other customers swiftly.",
                        "Reprint Last Receipt: Always available reprint button for the latest transaction.",
                        "Interactive Tax: Per-sale tax toggle with custom labels.",
                        "Loyalty Program: Points redemption integrated into checkout."
                    ]
                },
                {
                    subtitle: "Security & Role Management",
                    list: [
                        "Triple-Lock Auth: All new users start as 'pending' for admin approval.",
                        "Least Privilege: Features like 'Returns' and 'Stock Editing' are hidden from cashiers.",
                        "Secure Routes: Role-based navigation protection."
                    ]
                }
            ]
        },
        {
            title: "🔄 Operations & Sync",
            content: "Inventory levels are fully synchronized. Every sale deducts stock, and every return restores it automatically. Returns are strictly audited in the 'sales_returns' collection."
        }
    ]

    return (
        <Layout title="Documentation">
            <div className="max-w-4xl mx-auto py-8 px-4 mt-12">
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-black uppercase tracking-tight">GPOS Manual</h1>
                            <p className="text-blue-100 font-bold opacity-80 italic">Version 2.0.0 — Modern Architecture</p>
                        </div>
                        <div className="absolute top-0 right-0 p-12 text-9xl opacity-10 font-black pointer-events-none">DOCS</div>
                    </div>

                    <div className="p-8 space-y-12">
                        {sections.map((section, idx) => (
                            <section key={idx} className="space-y-4">
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                    {section.title}
                                </h2>

                                {section.content && (
                                    <p className="text-gray-600 leading-relaxed font-medium">
                                        {section.content}
                                    </p>
                                )}

                                {section.items && (
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {section.items.map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-blue-500 font-bold">•</span>
                                                <span className="text-sm font-bold text-gray-700">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {section.subsections && (
                                    <div className="space-y-6 pl-4 border-l-2 border-gray-50">
                                        {section.subsections.map((sub, i) => (
                                            <div key={i} className="space-y-2">
                                                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">{sub.subtitle}</h3>
                                                <ul className="space-y-2">
                                                    {sub.list.map((li, j) => (
                                                        <li key={j} className="text-sm text-gray-500 font-medium">
                                                            {li}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-8 border-t border-gray-100 text-center">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">
                            System Documentation & Maintenance Guide — © {new Date().getFullYear()} GPOS
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    )
}

export default Documentation
