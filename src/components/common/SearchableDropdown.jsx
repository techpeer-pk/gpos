import { useState, useEffect, useRef } from 'react'

/**
 * A reusable searchable dropdown component.
 * @param {Object} props
 * @param {Array} props.options - Array of objects {id, name, phone, ...}
 * @param {Object} props.value - Selected option object
 * @param {Function} props.onChange - Callback when an option is selected
 * @param {string} props.placeholder - Placeholder for the search input
 * @param {string} props.label - Optional label
 * @param {string} props.className - Additional class names
 */
export default function SearchableDropdown({
    options = [],
    value = null,
    onChange,
    placeholder = 'Search...',
    label = '',
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const containerRef = useRef(null)
    const inputRef = useRef(null)

    // Filter options based on search query
    const filteredOptions = options.filter(opt =>
        (opt.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (opt.phone || '').includes(search)
    )

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Reset scroll and highlight when search changes or opens
    useEffect(() => {
        setHighlightedIndex(-1)
    }, [search, isOpen])

    const handleSelect = (option) => {
        onChange(option)
        setSearch('')
        setIsOpen(false)
        setHighlightedIndex(-1)
    }

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true)
            }
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex(prev => (prev > -1 ? prev - 1 : prev))
                break
            case 'Enter':
                e.preventDefault()
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex])
                } else if (search === '' && filteredOptions.length > 0) {
                     // If searching for nothing and hit enter, maybe pick first? 
                     // Or just close if nothing highlighted.
                }
                break
            case 'Escape':
                setIsOpen(false)
                break
            default:
                break
        }
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-bold">{label}</label>}
            
            <div 
                className={`flex items-center border dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all cursor-text overflow-hidden ${isOpen ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => inputRef.current?.focus()}
            >
                <div className="flex-1 flex items-center min-w-0">
                    {!search && !isOpen && (
                        <div className="text-sm text-gray-800 dark:text-gray-100 truncate mr-2">
                            {value ? `${value.name} (${value.phone || 'No Phone'})` : 'Walk-in Customer'}
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        className="bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 w-full"
                        placeholder={value ? '' : placeholder}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <div className="text-gray-400 text-[10px] ml-2 select-none">▼</div>
                {value && (
                    <button 
                        type="button"
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation()
                            onChange(null)
                            setSearch('')
                        }}
                    >✕</button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div 
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b dark:border-gray-800 transition-colors ${!value ? 'bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                        onClick={() => handleSelect(null)}
                    >
                        🚶 Walk-in Customer
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400 italic text-center">No customers found</div>
                    ) : (
                        filteredOptions.map((opt, idx) => (
                            <div
                                key={opt.id}
                                className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b last:border-0 dark:border-gray-800 flex flex-col ${highlightedIndex === idx ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} ${value?.id === opt.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                onClick={() => handleSelect(opt)}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                            >
                                <span className={`font-bold ${value?.id === opt.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{opt.name}</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase">{opt.phone}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
