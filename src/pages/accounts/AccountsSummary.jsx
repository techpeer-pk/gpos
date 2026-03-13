import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'

function AccountsSummary() {
    const { businessId, branchId } = useAuthStore()
    const [sales, setSales] = useState([])
    const [expenses, setExpenses] = useState([])
    const [cashFlow, setCashFlow] = useState([])
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('month') // 'today', 'month', 'year'

    const currency = settings?.currency || 'PKR'

    useEffect(() => {
        const fetchData = async () => {
            if (!businessId || !branchId) return
            try {
                const [salesSnap, expSnap, cashSnap, businessSnap] = await Promise.all([
                    FirestoreService.getSales(businessId, branchId),
                    FirestoreService.getExpenses(businessId, branchId),
                    FirestoreService.getCashFlow(businessId, branchId),
                    FirestoreService.getBusiness(businessId)
                ])

                setSales(salesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
                setExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })))
                setCashFlow(cashSnap.docs.map(d => ({ id: d.id, ...d.data() })))
                if (businessSnap.exists()) setSettings(businessSnap.data())
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [businessId, branchId])

    const filterByPeriod = (data, dateField = 'createdAt') => {
        const now = new Date()
        return data.filter(item => {
            if (!item[dateField]) return false
            // Handle both Firestore Timestamp and ISO strings
            const date = item[dateField].toDate ? item[dateField].toDate() : new Date(item[dateField])

            if (period === 'today') return date.toDateString() === now.toDateString()
            if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            if (period === 'year') return date.getFullYear() === now.getFullYear()
            return true
        })
    }

    const filteredSales = filterByPeriod(sales)
    const filteredExpenses = filterByPeriod(expenses, 'date')
    const filteredCashFlow = filterByPeriod(cashFlow)

    // Advanced Financial Logic
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0)

    // Calculate COGS: Sum of (item.costPrice * item.quantity) for all items in filtered sales
    const totalCOGS = filteredSales.reduce((sum, sale) => {
        const saleCOGS = (sale.items || []).reduce((itemSum, item) => {
            return itemSum + ((item.costPrice || 0) * (item.quantity || 0))
        }, 0)
        return sum + saleCOGS
    }, 0)

    const grossProfit = totalRevenue - totalCOGS
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const netProfit = grossProfit - totalExpenses

    // Total cash balance is always cumulative
    const cashBalance = cashFlow.reduce((sum, c) => sum + (c.amount || 0), 0)

    if (loading) {
        return (
            <Layout title="Accounts Summary">
                <div className="min-h-[60vh] bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest text-[10px] font-black">Consolidating Ledger...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Accounts Summary">
            <div className="mt-12">
                {/* Period Selector */}
                <div className="flex bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 dark:border-gray-800 shadow-xl mb-10 w-fit mx-auto">
                    {['today', 'month', 'year'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Main Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Primary Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                                    <span className="text-9xl">💰</span>
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Aggregate Inflow</p>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter text-white">COGS: {currency} {totalCOGS.toLocaleString()}</p>
                                    </div>
                                </div>
                                <h3 className="text-4xl font-black mb-8 relative z-10 tracking-tight">{currency} {totalRevenue.toLocaleString()}</h3>
                                <div className="mt-auto flex items-center justify-between relative z-10 border-t border-white/10 pt-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black bg-white/10 w-fit px-4 py-1.5 rounded-full border border-white/10 uppercase tracking-widest">
                                        <span>↑</span> Verified sales
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Gross Yield</p>
                                        <p className="text-lg font-black">{currency} {grossProfit.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-red-500/5 rounded-full transition-transform group-hover:scale-150 duration-700"></div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Operational Outflow</p>
                                    <h3 className="text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{currency} {totalExpenses.toLocaleString()}</h3>
                                </div>
                                <div className="mt-10 flex flex-wrap gap-2 relative z-10">
                                    {[...new Set(filteredExpenses.map(e => e.category))].slice(0, 3).map(cat => (
                                        <span key={cat} className="text-[9px] font-black uppercase tracking-widest bg-gray-50/50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors hover:border-red-200 dark:hover:border-red-900/30 hover:text-red-500">
                                            {cat}
                                        </span>
                                    ))}
                                    {filteredExpenses.length === 0 && <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 italic">No leakages recorded</span>}
                                </div>
                            </div>
                        </div>

                        {/* Financial health card */}
                        <div className="bg-white dark:bg-gray-900 rounded-[32px] p-10 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Verified Net Surplus</p>
                                    <h3 className={`text-6xl font-black tracking-tight ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {currency} {netProfit.toLocaleString()}
                                    </h3>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Efficiency Quotient</p>
                                    <p className="text-3xl font-black text-gray-800 dark:text-gray-100">
                                        {totalRevenue ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar visual - COGS vs Expenses vs Profit */}
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-6 rounded-2xl overflow-hidden flex shadow-inner border border-gray-50 dark:border-gray-700">
                                <div
                                    className="bg-orange-400 dark:bg-orange-500 h-full transition-all duration-1000 border-r border-white/20 dark:border-black/10"
                                    style={{ width: `${totalRevenue ? (totalCOGS / totalRevenue) * 100 : 0}%` }}
                                    title="Cost of Goods Sold"
                                ></div>
                                <div
                                    className="bg-red-500 dark:bg-red-600 h-full transition-all duration-1000 border-r border-white/20 dark:border-black/10"
                                    style={{ width: `${totalRevenue ? (totalExpenses / totalRevenue) * 100 : 0}%` }}
                                    title="Operational Overhead"
                                ></div>
                                <div
                                    className={`h-full transition-all duration-1000 ${netProfit >= 0 ? 'bg-green-500 dark:bg-green-600' : 'bg-red-900 dark:bg-red-950'}`}
                                    style={{ width: `${totalRevenue ? (Math.max(0, netProfit) / totalRevenue) * 100 : 0}%` }}
                                    title="Net Profit"
                                ></div>
                            </div>
                            <div className="flex justify-between mt-5 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                <div className="flex items-center gap-6">
                                    <span className="flex items-center gap-2 transition-colors hover:text-orange-500"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-sm shadow-orange-500/50"></span> COGS</span>
                                    <span className="flex items-center gap-2 transition-colors hover:text-red-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span> Expenses</span>
                                    <span className="flex items-center gap-2 transition-colors hover:text-green-500"><span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span> True Profit</span>
                                </div>
                                <span className="text-gray-300 dark:text-gray-700 italic hidden md:block">Financial Architecture Visualization</span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Stats / Register */}
                    <div className="space-y-8">
                        <div className="bg-gray-950 dark:bg-gray-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                                <span className="text-[140px]">🏧</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Vault Liquidity</p>
                            <h3 className="text-4xl font-black mb-6 tracking-tight relative z-10">{currency} {cashBalance.toLocaleString()}</h3>
                            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 relative z-10 transition-colors hover:bg-blue-600/20">
                                <p className="text-[10px] text-blue-300 font-bold leading-relaxed uppercase tracking-wide">
                                    Tracking manual cash maneuvers. Verified against physical reconciliation data.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-[400px]">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-8 flex items-center justify-between">
                                Cash Flow Manifest
                                <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/10 font-black">LATEST 5</span>
                            </h4>
                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                {filteredCashFlow.slice(0, 5).map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100/50 dark:border-gray-800/50 transition-all hover:translate-x-1">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-gray-800 dark:text-gray-100 truncate uppercase tracking-tight">{m.reason}</p>
                                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${m.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>{m.type}</p>
                                        </div>
                                        <p className={`text-sm font-black ${m.type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} ml-4`}>
                                            {m.type === 'in' ? '+' : ''} {m.amount.toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                                {filteredCashFlow.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale py-10">
                                        <span className="text-4xl mb-4">📭</span>
                                        <p className="text-[9px] font-black uppercase tracking-widest">No Activity Logged</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    )
}

export default AccountsSummary
