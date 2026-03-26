import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../../firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { handleError } from '../../utils/errorHandler'
import { QRCodeCanvas } from 'qrcode.react'
import useAuthStore from '../../store/authStore-multi-branch'
import FirestoreService from '../../firebase/firestore-multi-branch'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { generateReceiptMessage, getWhatsAppLink, getSMSLink } from '../../utils/receiptHelper'

function Invoice() {
    const { businessId: paramBizId, branchId: paramBranchId, id } = useParams()
    const { user, businessId: storeBizId, branchId: storeBranchId } = useAuthStore()
    
    // Prioritize URL parameters for public access, fallback to store for staff
    const businessId = paramBizId || storeBizId
    const branchId = paramBranchId || storeBranchId
    const navigate = useNavigate()
    const voucherRef = useRef()
    const [sale, setSale] = useState(null)
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState('standard') // 'standard' or 'digital'

    const handleShare = (method) => {
        const message = generateReceiptMessage(sale, settings, businessId, branchId)
        if (method === 'whatsapp') {
            window.open(getWhatsAppLink(sale.customerPhone, message), '_blank')
        } else {
            window.location.href = getSMSLink(sale.customerPhone, message)
        }
    }

    const downloadPDF = async () => {
        const element = voucherRef.current
        const canvas = await html2canvas(element, { scale: 2, useCORS: true })
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`receipt_${sale.id.slice(-6)}.pdf`)
    }

    const shareAsImage = async () => {
        const element = voucherRef.current
        const canvas = await html2canvas(element, { scale: 2, useCORS: true })
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'receipt.png', { type: 'image/png' })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'GPOS Digital Receipt',
                        text: `Transaction #${sale.id.slice(-6).toUpperCase()}`
                    })
                } catch (err) {
                    console.error('Share failed:', err)
                }
            } else {
                // Fallback to WhatsApp if can't share file
                handleShare('whatsapp')
            }
        })
    }

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!businessId || !branchId) return
            try {
                // Fetch Sale using multi-branch service
                const saleSnap = await FirestoreService.getSale(businessId, branchId, id)
                if (saleSnap.exists()) {
                    setSale({ id: saleSnap.id, ...saleSnap.data() })
                }

                // Fetch Business and Branch Data for branding
                const [bizSnap, branchSnap] = await Promise.all([
                    FirestoreService.getBusiness(businessId),
                    FirestoreService.getBranch(businessId, branchId)
                ])

                if (branchSnap.exists()) {
                    const branchData = branchSnap.data()
                    const bizData = bizSnap.exists() ? bizSnap.data() : {}
                    
                    // Merge settings: Branch overrides Business
                    setSettings({
                        businessName: bizData.businessName || 'GPOS Business',
                        ...bizData.settings,
                        ...branchData.settings,
                        // Priority for Header: branch.receipt_header -> businessName
                        displayHeader: branchData.settings?.receipt_header || branchData.settings?.receiptHeader || bizData.businessName || 'GPOS Business',
                        displayFooter: branchData.settings?.receipt_footer || branchData.settings?.receiptFooter || 'Thank you!'
                    })
                }
            } catch (err) {
                handleError(err, 'Fetch Invoice', 'Failed to load invoice')
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchInvoice()
    }, [id, businessId, branchId])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
    )

    if (!sale) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <p className="text-gray-500 mb-4 font-medium italic">Invoice not found or deleted.</p>
            <button onClick={() => navigate(-1)} className="text-blue-600 font-bold hover:underline">← Go Back</button>
        </div>
    )


    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0 print:px-0">

            {/* Action Buttons (Only for Authenticated Staff) */}
            {user ? (
                <div className="max-w-xl mx-auto mb-6 flex flex-col gap-4 print:hidden">
                    <div className="flex justify-between items-center">
                        <button onClick={() => navigate(-1)} className="text-gray-600 font-medium hover:text-gray-800 transition">
                            ← Back to App
                        </button>
                        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                            <button
                                onClick={() => setViewMode('standard')}
                                className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition ${viewMode === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600'}`}
                            >Standard</button>
                            <button
                                onClick={() => setViewMode('digital')}
                                className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition ${viewMode === 'digital' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600'}`}
                            >Digital Voucher</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <button
                            onClick={() => window.print()}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition flex items-center gap-2 text-xs"
                        ><span>🖨️</span> Print</button>
                        <button
                            onClick={downloadPDF}
                            className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition flex items-center gap-2 text-xs"
                        ><span>📄</span> PDF</button>
                        <button
                            onClick={shareAsImage}
                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition flex items-center gap-2 text-xs"
                        ><span>🖼️</span> Share Image</button>
                        <button
                            onClick={() => handleShare('whatsapp')}
                            className="bg-green-50 text-green-600 px-4 py-2 rounded-xl font-bold hover:bg-green-100 transition flex items-center gap-2 text-xs"
                        ><span>📱</span> WhatsApp</button>
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto mb-6 text-center print:hidden">
                    <p className="text-gray-400 font-black text-[10px] tracking-widest uppercase">Verified Receipt Portal</p>
                </div>
            )}

            {/* standard View */}
            {viewMode === 'standard' ? (
                <div ref={voucherRef} className="max-w-xl mx-auto bg-white shadow-2xl rounded-2xl p-8 print:shadow-none print:rounded-none print:p-4">
                    {/* Header */}
                    <div className="text-center border-b pb-6 mb-6">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                            {settings?.displayHeader || settings?.businessName || 'GPOS Business'}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest italic leading-tight">
                            Official Receipt
                        </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                        <div className="space-y-1">
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Bill To</p>
                            <p className="font-black text-gray-800 text-lg leading-tight">{sale.customerName}</p>
                            <p className="text-gray-500 font-medium">Type: {sale.customerId === 'walk-in' ? 'Walk-in' : 'Registered Member'}</p>
                            <p className="text-gray-400 font-bold uppercase text-[9px] mt-2 tracking-widest leading-none">Served By</p>
                            <p className="text-gray-600 font-bold italic">{sale.cashierName || 'Staff'}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Transaction</p>
                            <p className="font-bold text-gray-800">#{sale.id.slice(-6).toUpperCase()}</p>
                            <p className="text-gray-500 text-xs">
                                {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'N/A'} — {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleTimeString() : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-8">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-gray-900 text-gray-900 text-[11px] font-black uppercase tracking-tighter">
                                    <th className="py-2">Item Description</th>
                                    <th className="py-2 text-center w-20">Qty</th>
                                    <th className="py-2 text-right w-24">Price</th>
                                    <th className="py-2 text-right w-24">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sale.items?.map((item, idx) => (
                                    <tr key={idx} className="text-sm">
                                        <td className="py-3 font-semibold text-gray-800">{item.name}</td>
                                        <td className="py-3 text-center text-gray-600 font-medium">{item.quantity}</td>
                                        <td className="py-3 text-right text-gray-600 font-medium">{(item.price || 0).toFixed(2)}</td>
                                        <td className="py-3 text-right font-black text-gray-800">{(item.total || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="border-t-2 border-gray-900 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-bold uppercase text-[11px]">Subtotal</span>
                            <span className="font-bold text-gray-800">{sale.currency || 'PKR'} {(sale.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {(sale.tax || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-bold uppercase text-[11px]">{sale.taxLabel || 'Tax'}</span>
                                <span className="font-bold text-gray-800">{sale.currency || 'PKR'} {(sale.tax || 0).toFixed(2)}</span>
                            </div>
                        )}
                        {(sale.discount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-blue-600">
                                <span className="font-bold uppercase text-[11px]">Discount</span>
                                <span className="font-bold">-{sale.currency || 'PKR'} {(sale.discount || 0).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-2 bg-gray-50 rounded px-3 border-l-4 border-blue-600">
                            <span className="font-black text-gray-900 text-lg">Total Amount</span>
                            <span className="font-black text-gray-900 text-2xl">{sale.currency || 'PKR'} {(sale.finalAmount || sale.total || sale.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {sale.paymentMethod === 'cash' && (sale.change || 0) > 0 && (
                            <div className="flex justify-between text-xs text-green-600 font-bold px-3">
                                <span>CHANGE RETURNED</span>
                                <span>{sale.currency || 'PKR'} {(sale.change || 0).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer Message */}
                    <div className="mt-10 pt-10 border-t border-dashed border-gray-200 text-center">
                        <p className="text-gray-600 font-medium text-sm italic">
                            "{settings?.displayFooter || settings?.receiptFooter || 'Thank you for shopping with us!'}"
                        </p>
                        <div className="mt-4 flex flex-col items-center">
                            <div className="w-16 h-1 w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                            <p className="text-[9px] text-gray-400 font-black mt-2 uppercase tracking-[0.2em]">Generated by GPOS System v1.0</p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Digital Voucher View (Premium ARY style) */
                <div ref={voucherRef} className="max-w-xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-8 text-white relative">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">
                                    {settings?.businessName || 'GPOS Business'}
                                </h1>
                                <p className="text-blue-200 text-xs font-black uppercase tracking-widest pl-0.5">Official Digital Voucher</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl shadow-lg ring-4 ring-blue-600/20">
                                <QRCodeCanvas
                                    value={`${window.location.origin}/invoice/${businessId}/${branchId}/${sale.id}`}
                                    size={64}
                                    level="H"
                                />
                            </div>
                        </div>
                        <div className="mt-8">
                            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Total Bill Amount</p>
                            <p className="text-5xl font-black tracking-tighter">
                                <span className="text-2xl font-bold opacity-50 mr-2">{sale.currency || 'PKR'}</span>
                                {(sale.finalAmount || sale.total || sale.subtotal || 0).toLocaleString()}
                            </p>
                        </div>
                        {/* Decorative background shape */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-y-6 text-sm">
                            <div>
                                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Customer</p>
                                <p className="font-bold text-gray-900">{sale.customerName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Voucher No</p>
                                <p className="font-bold text-gray-900 uppercase">#{sale.id.slice(-6)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Issue Date</p>
                                <p className="font-bold text-gray-900 font-mono">
                                    {sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Payment</p>
                                <p className="font-bold text-blue-600 uppercase italic tracking-tighter">{sale.paymentMethod}</p>
                            </div>
                        </div>

                        {/* Items Simplified */}
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] mb-4 text-center">Purchased Items</p>
                            <div className="space-y-3">
                                {sale.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{item.name}</span>
                                            <span className="text-gray-400 text-[10px]">Qty: {item.quantity} × {(item.price || 0).toFixed(2)}</span>
                                        </div>
                                        <span className="font-black text-gray-900">{sale.currency || 'PKR'} {(item.total || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 border-dashed space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                    <span>SUBTOTAL</span>
                                    <span>{sale.currency || 'PKR'} {(sale.subtotal || 0).toFixed(2)}</span>
                                </div>
                                {(sale.tax || 0) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                        <span>{sale.taxLabel?.toUpperCase() || 'TAX'}</span>
                                        <span>{sale.currency || 'PKR'} {(sale.tax || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {(sale.discount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-blue-400 font-bold">
                                        <span>DISCOUNT</span>
                                        <span>-{sale.currency || 'PKR'} {(sale.discount || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Payable</span>
                                    <span className="text-lg font-black text-gray-900">{sale.currency || 'PKR'} {(sale.finalAmount || sale.total || sale.subtotal || 0).toFixed(2)}</span>
                                </div>
                                {sale.paymentMethod === 'cash' && (sale.change || 0) > 0 && (
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                                        <span className="text-[9px] font-black text-green-600 uppercase">Change Returned</span>
                                        <span className="text-sm font-black text-green-600">{sale.currency || 'PKR'} {(sale.change || 0).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Message (Digital) */}
                        <div className="px-8 pb-4 text-center">
                             <p className="text-gray-400 font-medium text-[10px] italic">
                                "{settings?.displayFooter || settings?.receiptFooter || 'Thank you for shopping with us!'}"
                            </p>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="border-t border-gray-200 pt-3">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Verified By</p>
                                <p className="text-xs font-bold text-gray-800 mt-1">GPOS System</p>
                            </div>
                            <div className="border-t border-gray-200 pt-3 text-right">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Electronic Signature</p>
                                <p className="text-xs font-bold text-indigo-600 mt-1 italic uppercase tracking-tighter">{sale.id.slice(0, 8)}</p>
                            </div>
                        </div>

                        {/* Verification Footer */}
                        <div className="text-center bg-blue-50/50 -mx-8 -mb-8 p-6 mt-12 border-t border-blue-100">
                            <p className="text-[10px] text-blue-800 font-black tracking-[0.15em] uppercase mb-1">Official Document Verification</p>
                            <p className="text-[9px] text-blue-600 font-medium">Scan QR to verify this transaction on the GPOS secure portal</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Invoice
