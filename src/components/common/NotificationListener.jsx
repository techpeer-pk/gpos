import { useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/authStore-multi-branch'
import toast from 'react-hot-toast'

export default function NotificationListener() {
    const { businessId, branchId, userRole } = useAuthStore()
    const notifiedItems = useRef(new Set())

    useEffect(() => {
        if (!businessId || !branchId || (userRole !== 'owner' && userRole !== 'manager')) return

        console.log('📡 Starting Low Stock Listener...')
        
        // Listen to inventory where quantity < minThreshold
        const q = query(
            collection(db, `businesses/${businessId}/branches/${branchId}/inventory`),
            where('quantity', '<', 15) // Simplified for demo, ideally we compare dynamic threshold
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified' || change.type === 'added') {
                    const item = change.doc.data()
                    const itemId = change.doc.id
                    
                    // Only notify once per item in this session to avoid spam
                    if (item.quantity < (item.minThreshold || 15) && !notifiedItems.current.has(itemId)) {
                        notifiedItems.current.add(itemId)
                        
                        toast.error(
                            (t) => (
                                <div className="flex flex-col gap-1">
                                    <p className="font-bold text-sm">⚠️ Low Stock Alert</p>
                                    <p className="text-xs">
                                        <span className="font-black">{item.productName || 'Unknown Product'}</span> is low in stock! 
                                        Remaining: <span className="text-red-600 font-bold">{item.quantity}</span>
                                    </p>
                                    <button 
                                        onClick={() => toast.dismiss(t.id)}
                                        className="mt-2 text-[10px] font-black uppercase text-blue-600 hover:underline"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            ),
                            { duration: 6000, id: itemId }
                        )
                    } else if (item.quantity >= (item.minThreshold || 15)) {
                        // Reset notification flag if stock is replenished
                        notifiedItems.current.delete(itemId)
                    }
                }
            })
        })

        return () => unsubscribe()
    }, [businessId, branchId, userRole])

    return null // Invisible companion component
}
