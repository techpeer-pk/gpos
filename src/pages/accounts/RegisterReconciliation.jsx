import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { db } from '../../firebase/config'
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore'
import { handleError, showSuccess } from '../../utils/errorHandler'

import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'

function RegisterReconciliation() {
    const { businessId, branchId } = useAuthStore()
    const [cashFlow, setCashFlow] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [settings, setSettings] = useState(null)
    const [actualCash, setActualCash] = useState('')
    const [notes, setNotes] = useState('')
    const [lastReconciliation, setLastReconciliation] = useState(null)

    const currency = settings?.currency || 'PKR'

    useEffect(() => {
        const fetchData = async () => {
            if (!businessId || !branchId) return
            try {
                // Fetch business settings
                const businessSnap = await FirestoreService.getBusiness(businessId)
                if (businessSnap.exists()) setSettings(businessSnap.data())

                // Fetch last reconciliation
                const lastRecSnap = await FirestoreService.getReconciliations(businessId, branchId)

                let startTime = null
                if (!lastRecSnap.empty) {
                    const last = lastRecSnap.docs[0].data()
                    setLastReconciliation({ ...last, id: lastRecSnap.docs[0].id })
                    startTime = last.createdAt
                }

                // Fetch cash flow since last reconciliation
                const cashSnap = await FirestoreService.getCashFlow(businessId, branchId)
                let cashList = cashSnap.docs.map(d => ({ id: d.id, ...d.data() }))

                if (startTime) {
                    cashList = cashList.filter(c => {
                        const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt)
                        return cDate > startTime.toDate()
                    })
                }

                setCashFlow(cashList)

            } catch (err) {
                handleError(err, 'Fetch Data', 'Failed to load reconciliation data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [businessId, branchId])

    const cashIn = cashFlow.filter(c => c.type === 'in').reduce((sum, c) => sum + (c.amount || 0), 0)
    const cashOut = cashFlow.filter(c => c.type === 'out').reduce((sum, c) => sum + (c.amount || 0), 0)
    const openingBalance = lastReconciliation?.actualCash || 0
    const expectedCash = openingBalance + cashIn - cashOut
    const difference = parseFloat(actualCash || 0) - expectedCash

    const handleCloseRegister = async (e) => {
        e.preventDefault()
        if (!actualCash) return alert('Please enter actual cash counted')

        setSubmitting(true)
        try {
            const reportData = {
                openingBalance,
                cashIn,
                cashOut,
                expectedCash,
                actualCash: parseFloat(actualCash),
                difference,
                notes,
                status: 'completed',
                createdAt: serverTimestamp(),
                periodStart: lastReconciliation?.createdAt || null,
                periodEnd: serverTimestamp()
            }

            await FirestoreService.addReconciliation(businessId, branchId, reportData)
            showSuccess('Register closed and report saved!')

            // Reset for next shift
            setActualCash('')
            setNotes('')
            setTimeout(() => {
                window.location.href = '/cash-flow'
            }, 1000)
        } catch (err) {
            handleError(err, 'Close Register', 'Failed to save reconciliation report')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <Layout title="Register Reconciliation">
                <div className="min-h-[60vh] bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-[10px]">Calculating Final Positions...</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="Register Reconciliation">
            <div className="mt-12 max-w-4xl mx-auto pb-20">
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-500">
                    <div className="p-12 bg-gradient-to-br from-gray-950 to-blue-950 text-white relative">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-3">Operational Cycle Termination</h3>
                            <h2 className="text-5xl font-black tracking-tight mb-2">Register Reconciliation</h2>
                            <p className="text-blue-200/60 text-[11px] font-black uppercase tracking-widest">
                                Protocol last executed: {lastReconciliation ? new Date(lastReconciliation.createdAt.toDate()).toLocaleString('en-GB') : 'INITIAL RUN'}
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group">
                            <span className="text-[160px] block transition-transform group-hover:scale-110 duration-700">🏧</span>
                        </div>
                    </div>

                    <div className="p-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* Summary side */}
                        <div className="space-y-10">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-8">Financial Position Summary</h4>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center py-4 border-b border-gray-50 dark:border-gray-800">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Starting Float</span>
                                        <span className="font-black text-gray-800 dark:text-gray-100">{currency} {openingBalance.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-gray-50 dark:border-gray-800">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Verified Inflow</span>
                                        <span className="font-black text-green-600 dark:text-green-400">+{currency} {cashIn.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-gray-50 dark:border-gray-800">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Authorized Outflow</span>
                                        <span className="font-black text-red-600 dark:text-red-400">-{currency} {cashOut.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-6 bg-gray-50 dark:bg-gray-800/50 px-8 rounded-[2rem] mt-8 border border-gray-100 dark:border-gray-800 shadow-inner">
                                        <span className="text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Theoretical Drawer Target</span>
                                        <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{currency} {expectedCash.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-600/5 dark:bg-blue-400/5 rounded-[2rem] p-8 border border-blue-600/10 dark:border-blue-400/10 relative overflow-hidden">
                                <p className="text-[11px] text-blue-800 dark:text-blue-300 font-bold leading-relaxed relative z-10 flex gap-4">
                                    <span className="text-2xl mt-1">💡</span>
                                    The theoretical target is synthesized from the terminal starting float plus all verified liquidity shifts (sales + manual movements) recorded during the active cycle.
                                </p>
                            </div>
                        </div>

                        {/* Audit side */}
                        <form onSubmit={handleCloseRegister} className="space-y-8">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-8">Physical Audit Data</h4>

                            <div>
                                <label className="text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-widest block mb-3">Actual Terminal Balance *</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-600">{currency}</span>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={actualCash}
                                        onChange={(e) => setActualCash(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-16 pr-6 py-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-2xl font-black text-gray-800 dark:text-gray-100 placeholder:opacity-20"
                                    />
                                </div>
                            </div>

                            <div className={`p-8 rounded-[2rem] border-2 transition-all duration-500 flex flex-col items-center justify-center text-center ${difference === 0 ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30'}`}>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">Net Liquidity Variance</p>
                                <h3 className={`text-4xl font-black tracking-tighter ${difference === 0 ? 'text-green-600 dark:text-green-400' : difference > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {currency} {difference.toLocaleString()}
                                </h3>
                                <div className={`mt-3 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${difference === 0 ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                                    {difference === 0 ? 'POS TERMINAL BALANCED' : difference > 0 ? 'UNEXPECTED SURPLUS' : 'LIQUIDITY SHORTFALL'}
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-widest block mb-3">Audit Justification / Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter detailed audit justification for any variance discovered..."
                                    className="w-full px-6 py-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-800 dark:text-gray-100 placeholder:opacity-20 min-h-[140px]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 text-white rounded-[1.5rem] py-6 font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Authenticating Data...' : 'SECURE & TERMINAL CLOSE'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-3 mx-auto group"
                    >
                        <span className="transition-transform group-hover:-translate-x-1">←</span> REVERT TO CASH STREAM
                    </button>
                </div>
            </div>
        </Layout>
    )
}

export default RegisterReconciliation
