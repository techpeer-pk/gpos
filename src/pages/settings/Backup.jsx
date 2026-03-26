import { useState, useRef } from 'react'
import Layout from '../../components/layout/Layout'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/authStore-multi-branch'
import { populateTestData } from '../../firebase/seedData'
import firestoreService from '../../firebase/firestore-multi-branch'
import {
    collection,
    getDocs,
    doc,
    writeBatch,
} from 'firebase/firestore'

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_COLLECTIONS = [
    { id: 'products', label: 'Products', icon: '📦', defaultOn: true },
    { id: 'categories', label: 'Categories', icon: '🏷️', defaultOn: true },
    { id: 'inventory', label: 'Inventory', icon: '🏪', defaultOn: true },
    { id: 'customers', label: 'Customers', icon: '👥', defaultOn: true },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭', defaultOn: false },
    { id: 'users', label: 'Users/Staff', icon: '👨‍💼', defaultOn: false },
    { id: 'sales', label: 'Sales', icon: '💰', defaultOn: false },
    { id: 'sales_returns', label: 'Sales Returns', icon: '🔄', defaultOn: false },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: '📝', defaultOn: false },
    { id: 'expenses', label: 'Expenses', icon: '💸', defaultOn: false },
    { id: 'cash_flow', label: 'Cash Flow', icon: '🏧', defaultOn: false },
    { id: 'reconciliations', label: 'Reconciliations', icon: '📋', defaultOn: false },
    { id: 'suspended_sales', label: 'Suspended Sales', icon: '⏸️', defaultOn: false },
    { id: 'settings', label: 'Settings', icon: '⚙️', defaultOn: false },
]

const BATCH_SIZE = 499

// ── Helpers ───────────────────────────────────────────────────────────────────
function timestamp() {
    return new Date().toLocaleTimeString()
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function nowFilename() {
    const d = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `gpos-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Backup() {
    const { businessId, branchId, userRole } = useAuthStore()

    // Export state
    const [exportCols, setExportCols] = useState(
        Object.fromEntries(ALL_COLLECTIONS.map(c => [c.id, c.defaultOn]))
    )

    // Import state
    const [importFile, setImportFile] = useState(null)
    const [importData, setImportData] = useState(null)
    const [mergeMode, setMergeMode] = useState(true)
    const fileRef = useRef()

    // Shared operation state
    const [running, setRunning] = useState(false)
    const [logs, setLogs] = useState([])
    const [progress, setProgress] = useState({ done: 0, total: 0 })
    const [status, setStatus] = useState('idle') // idle | running | done | error
    const [history, setHistory] = useState([])

    const logRef = useRef()

    // ── Scope Helper ──────────────────────────────────────────────────────────
    function getCollectionRef(colId) {
        if (!businessId) return null

        const branchSpecific = [
            'inventory', 'sales', 'sales_returns', 'purchase_orders',
            'expenses', 'cash_flow', 'reconciliations', 'suspended_sales'
        ]

        if (colId === 'users') {
            return collection(db, 'business_users', businessId)
        }

        if (branchSpecific.includes(colId)) {
            if (!branchId) return null
            return collection(db, 'businesses', businessId, 'branches', branchId, colId)
        }

        // Shared business-level collections
        return collection(db, 'businesses', businessId, colId)
    }

    function getDocRef(colId, docId) {
        const colRef = getCollectionRef(colId)
        if (!colRef) return null
        return doc(colRef, docId)
    }

    // ── Logging ──────────────────────────────────────────────────────────────
    function addLog(type, msg) {
        setLogs(prev => {
            const next = [...prev, { type, msg, time: timestamp() }]
            setTimeout(() => {
                if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
            }, 30)
            return next
        })
    }

    function resetLog() {
        setLogs([])
        setProgress({ done: 0, total: 0 })
        setStatus('running')
    }

    // ── Export ───────────────────────────────────────────────────────────────
    async function startExport() {
        const selected = ALL_COLLECTIONS.filter(c => exportCols[c.id])
        if (selected.length === 0) return alert('Select at least one collection to export.')

        setRunning(true)
        resetLog()
        addLog('info', `🚀 Starting export of ${selected.length} collection(s)...`)

        const backup = {
            __meta__: {
                exportedAt: new Date().toISOString(),
                project: 'GPOS',
                collections: selected.map(c => c.id),
                version: '1.0'
            },
            __collections__: {}
        }

        let total = 0
        let done = 0

        try {
            // First pass — count docs
            for (const col of selected) {
                const colRef = getCollectionRef(col.id)
                if (!colRef) continue
                const snap = await getDocs(colRef)
                total += snap.size
            }
            setProgress({ done: 0, total })
            addLog('info', `📊 Found ${total} total documents across ${selected.length} collections`)
            addLog('info', `🏢 Scope: Business(${businessId}) | Branch(${branchId || 'Global'})`)

            // Second pass — export
            for (const col of selected) {
                const colRef = getCollectionRef(col.id)
                if (!colRef) {
                    addLog('warn', `  ⚠️ Skipping ${col.label} — Path not available in this context`)
                    continue
                }
                const snap = await getDocs(colRef)
                backup.__collections__[col.id] = {}

                for (const docSnap of snap.docs) {
                    backup.__collections__[col.id][docSnap.id] = {
                        ...docSnap.data(),
                        __collections__: {}
                    }
                    done++
                    setProgress({ done, total })
                }

                addLog('ok', `  ✅ ${col.icon} ${col.label} — ${snap.size} docs`)
            }

            // Download
            const json = JSON.stringify(backup, null, 2)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const filename = nowFilename()
            const a = document.createElement('a')
            a.href = url; a.download = filename; a.click()
            URL.revokeObjectURL(url)

            const size = formatBytes(blob.size)
            addLog('done', `🎉 Export complete! ${done} documents · ${size} · "${filename}"`)
            setStatus('done')

            // Save to history
            setHistory(prev => [{
                filename,
                size,
                docs: done,
                cols: selected.length,
                time: new Date().toLocaleString(),
                data: json
            }, ...prev])

        } catch (err) {
            addLog('error', '❌ Export failed: ' + err.message)
            setStatus('error')
        } finally {
            setRunning(false)
        }
    }

    // ── File select ──────────────────────────────────────────────────────────
    function handleFileSelect(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            try {
                const parsed = JSON.parse(ev.target.result)
                setImportData(parsed)
                setImportFile(file)
                addLog('info', `📂 Loaded: ${file.name} (${formatBytes(file.size)})`)

                // Show meta if available
                if (parsed.__meta__) {
                    const m = parsed.__meta__
                    addLog('info', `   Exported: ${m.exportedAt ? new Date(m.exportedAt).toLocaleString() : 'unknown'}`)
                    addLog('info', `   Collections: ${(m.collections || []).join(', ')}`)
                }
                const colIds = Object.keys(parsed.__collections__ || parsed)
                const totalDocs = Object.values(parsed.__collections__ || parsed)
                    .reduce((s, col) => s + Object.keys(col).length, 0)
                addLog('info', `   Preview: ${colIds.length} collections, ${totalDocs} documents`)
                setStatus('idle')
            } catch (err) {
                addLog('error', '❌ Invalid JSON: ' + err.message)
                setImportData(null)
                setImportFile(null)
            }
        }
        reader.readAsText(file)
        setLogs([]) // clear previous logs
    }

    // ── Import ───────────────────────────────────────────────────────────────
    async function startImport() {
        if (!importData) return alert('Load a backup file first.')

        const confirmed = window.confirm(
            mergeMode
                ? `Merge import: existing documents NOT in the file will be kept. Continue?`
                : `Full restore: this will OVERWRITE all matching documents. Continue?`
        )
        if (!confirmed) return

        setRunning(true)
        resetLog()

        const collections = importData.__collections__ || importData
        const colNames = Object.keys(collections)
        const totalDocs = Object.values(collections).reduce((s, c) => s + Object.keys(c).length, 0)

        addLog('info', `🚀 Starting import — ${colNames.length} collections, ${totalDocs} documents`)
        addLog('info', `   Mode: ${mergeMode ? 'Merge (safe)' : 'Overwrite'}`)

        let done = 0
        setProgress({ done: 0, total: totalDocs })

        try {
            for (const colName of colNames) {
                const docs = collections[colName]
                const docIds = Object.keys(docs)
                addLog('info', `  ↳ [${colName}] — ${docIds.length} docs`)

                for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db)
                    const chunk = docIds.slice(i, i + BATCH_SIZE)

                    for (const docId of chunk) {
                        const { __collections__, ...cleanData } = docs[docId]
                        const ref = getDocRef(colName, docId)
                        if (ref) {
                            batch.set(ref, cleanData)
                        }
                    }

                    await batch.commit()
                    done += chunk.length
                    setProgress({ done, total: totalDocs })
                }

                addLog('ok', `  ✅ [${colName}] imported ${docIds.length} docs`)
            }

            addLog('done', `🎉 Import complete! ${done} documents restored.`)
            setStatus('done')
        } catch (err) {
            addLog('error', '❌ Import failed: ' + err.message)
            setStatus('error')
        } finally {
            setRunning(false)
        }
    }

    // ── Seed Data ────────────────────────────────────────────────────────────
    async function startSeeding() {
        const confirmed = window.confirm(
            "This will populate your business with sample products, categories, customers, and staff. Continue?"
        )
        if (!confirmed) return

        setRunning(true)
        resetLog()
        addLog('info', "🌱 Initiating Seed Data process...")

        try {
            const result = await populateTestData(businessId, 'owner', firestoreService, (type, msg) => {
                addLog(type, msg)
            })

            if (result.success) {
                setStatus('done')
                addLog('done', `✨ Seeding Complete: ${result.summary.products} products, ${result.summary.categories} categories created.`)
            } else {
                setStatus('error')
                addLog('error', `❌ Seeding Failed: ${result.error}`)
            }
        } catch (err) {
            setStatus('error')
            addLog('error', `❌ Critical Error: ${err.message}`)
        } finally {
            setRunning(false)
        }
    }

    // ── Re-download from history ──────────────────────────────────────────────
    function reDownload(item) {
        const blob = new Blob([item.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = item.filename; a.click()
        URL.revokeObjectURL(url)
    }

    // ── UI helpers ────────────────────────────────────────────────────────────
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

    const logColors = {
        info: 'text-gray-400',
        ok: 'text-green-400',
        warn: 'text-yellow-400',
        error: 'text-red-400',
        done: 'text-green-300 font-bold',
    }

    const statusUI = {
        idle: { label: 'Idle', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500' },
        running: { label: 'Running', dot: 'bg-yellow-400 animate-pulse', badge: 'bg-yellow-50 text-yellow-600' },
        done: { label: 'Done', dot: 'bg-green-500', badge: 'bg-green-50 text-green-600' },
        error: { label: 'Error', dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' },
    }

    const sc = statusUI[status]

    if (userRole !== 'owner') {
        return (
            <Layout>
                <div className="p-12 text-center">
                    <div className="text-4xl mb-4">🔐</div>
                    <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
                    <p className="text-gray-500 mt-2">Only the Business Owner can perform backup or restore operations.</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="p-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-6 mt-2">
                    <h1 className="text-2xl font-bold text-gray-800">Backup & Restore</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Export your Firestore data as JSON backups, or restore from a previous backup file.
                    </p>
                </div>

                {/* Info banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
                    <span className="text-lg flex-shrink-0">💡</span>
                    <div className="text-sm text-amber-800">
                        <strong>Best practice:</strong> Export a backup before importing new products, updating prices in bulk, or making major inventory changes.
                        Backups are downloaded to your computer — nothing is stored on any external server.
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                    {/* ── EXPORT ────────────────────────────────────────── */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-green-600 px-5 py-3">
                            <h2 className="text-white font-bold text-sm uppercase tracking-widest">⬇️ Export Backup</h2>
                            <p className="text-green-100 text-xs mt-0.5">Download Firestore data as JSON</p>
                        </div>
                        <div className="p-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Select Collections</p>
                            <div className="grid grid-cols-2 gap-2 mb-5">
                                {ALL_COLLECTIONS.map(col => (
                                    <label key={col.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900 select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!exportCols[col.id]}
                                            onChange={e => setExportCols(p => ({ ...p, [col.id]: e.target.checked }))}
                                            className="rounded accent-green-600 w-4 h-4"
                                        />
                                        <span>{col.icon} {col.label}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Select all / none */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setExportCols(Object.fromEntries(ALL_COLLECTIONS.map(c => [c.id, true])))}
                                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setExportCols(Object.fromEntries(ALL_COLLECTIONS.map(c => [c.id, false])))}
                                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
                                    None
                                </button>
                            </div>

                            <button
                                onClick={startExport}
                                disabled={running}
                                className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition"
                            >
                                {running ? '⏳ Exporting...' : '⬇️ Export Now'}
                            </button>
                        </div>
                    </div>

                    {/* ── IMPORT / RESTORE ──────────────────────────────── */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-blue-600 px-5 py-3">
                            <h2 className="text-white font-bold text-sm uppercase tracking-widest">⬆️ Import / Restore</h2>
                            <p className="text-blue-100 text-xs mt-0.5">Restore from backup or import new data</p>
                        </div>
                        <div className="p-5">

                            {/* File drop */}
                            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition mb-4 ${importFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                                <span className="text-2xl mb-1">{importFile ? '✅' : '📂'}</span>
                                <span className="text-sm font-medium text-gray-600">
                                    {importFile ? importFile.name : 'Click to select backup JSON'}
                                </span>
                                {importFile && (
                                    <span className="text-xs text-gray-400 mt-1">{formatBytes(importFile.size)}</span>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </label>

                            {/* Mode */}
                            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={mergeMode}
                                        onChange={() => setMergeMode(true)}
                                        className="mt-0.5 accent-blue-600"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Merge <span className="text-xs text-green-600 font-bold">(Recommended)</span></p>
                                        <p className="text-xs text-gray-400">Adds/updates docs in file. Keeps existing docs not in file.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!mergeMode}
                                        onChange={() => setMergeMode(false)}
                                        className="mt-0.5 accent-blue-600"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Overwrite</p>
                                        <p className="text-xs text-gray-400">Overwrites all matching documents with file data.</p>
                                    </div>
                                </label>
                            </div>

                            <button
                                onClick={startImport}
                                disabled={running || !importData}
                                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition"
                            >
                                {running ? '⏳ Importing...' : '⬆️ Restore / Import'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── SEED DATA ────────────────────────────────────────── */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
                    <div className="bg-purple-600 px-5 py-3 flex items-center justify-between">
                        <div>
                            <h2 className="text-white font-bold text-sm uppercase tracking-widest">🧪 Seed Test Data</h2>
                            <p className="text-purple-100 text-xs mt-0.5">Populate sample data for testing purposes</p>
                        </div>
                        <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter border border-purple-400">DEV ONLY</span>
                    </div>
                    <div className="p-5 flex flex-col md:flex-row items-center gap-5">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Get started quickly by populating your business with <strong>5 sample products</strong>, categories, customers, 
                                and <strong>staff accounts</strong>. This will also seed initial inventory and sample sales 
                                across all your branches.
                            </p>
                        </div>
                        <div className="w-full md:w-auto">
                            <button
                                onClick={startSeeding}
                                disabled={running}
                                className="w-full md:w-48 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition shadow-sm"
                            >
                                {running ? '⏳ Seeding...' : '🧪 Seed Test Data'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Export History ─────────────────────────────────── */}
                {history.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📋 Session Export History</p>
                        <div className="divide-y divide-gray-100">
                            {history.map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 font-mono">{item.filename}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {item.docs} docs · {item.cols} collections · {item.size} · {item.time}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => reDownload(item)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition"
                                    >
                                        ⬇️ Re-download
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Log Panel ──────────────────────────────────────── */}
                {(logs.length > 0 || status !== 'idle') && (
                    <div className="bg-gray-900 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Operation Log</p>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                {sc.label}
                            </span>
                        </div>

                        {/* Progress bar */}
                        {progress.total > 0 && (
                            <div className="mb-3">
                                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
                                    <div
                                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: pct + '%' }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{progress.done} / {progress.total} documents</span>
                                    <span>{pct}%</span>
                                </div>
                            </div>
                        )}

                        {/* Log output */}
                        <div
                            ref={logRef}
                            className="font-mono text-xs space-y-0.5 max-h-60 overflow-y-auto"
                        >
                            {logs.map((l, i) => (
                                <div key={i} className={logColors[l.type] || 'text-gray-400'}>
                                    <span className="text-gray-600">{l.time} › </span>{l.msg}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    )
}
