import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  getOptionValue = (opt) => opt.id,
  getOptionLabel = (opt) => opt.label,
  getOptionSublabel = () => '',
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => getOptionValue(opt) === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const val = String(getOptionValue(opt) || '').toLowerCase();
    const lbl = String(getOptionLabel(opt) || '').toLowerCase();
    const sub = String(getOptionSublabel(opt) || '').toLowerCase();
    return val.includes(q) || lbl.includes(q) || sub.includes(q);
  });

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-[#686660] mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between border border-[#DDD9CE] bg-[#FCFCFA] px-3.5 py-2.5 text-left rounded-xl transition hover:border-[#161615] focus:border-[#161615] focus:bg-white focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      >
        <div className="truncate pr-2">
          {selectedOption ? (
            <div>
              <div className="font-mono-tabular text-xs font-semibold text-[#161615] truncate">
                {getOptionLabel(selectedOption)}
              </div>
              {getOptionSublabel(selectedOption) && (
                <div className="text-[11px] text-[#787670] truncate mt-0.5">
                  {getOptionSublabel(selectedOption)}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-[#8C8A84]">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#8C8A84] transition-transform ${
            isOpen ? 'rotate-180 text-[#161615]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 border border-[#DDD9CE] bg-white rounded-xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#ECEAE3] bg-[#F8F8F6] flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#8C8A84] shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-[#161615] placeholder-[#8C8A84] focus:outline-none font-mono-tabular"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#8C8A84] hover:text-[#161615] p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="px-3.5 py-1.5 bg-[#F4F3EE] border-b border-[#ECEAE3] text-[10px] uppercase font-mono-tabular tracking-wider text-[#787670]">
            {filteredOptions.length} match{filteredOptions.length === 1 ? '' : 'es'}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#F6F5F1]">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-7 text-center text-xs text-[#8C8A84]">
                No matching results for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = getOptionValue(opt);
                const isSelected = optVal === value;
                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'bg-[#161615] text-[#FAF9F6]'
                        : 'hover:bg-[#F5F4EE] text-[#161615]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-mono-tabular font-medium truncate">
                        {getOptionLabel(opt)}
                      </div>
                      {getOptionSublabel(opt) && (
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-[#C8C6BF]' : 'text-[#787670]'
                          }`}
                        >
                          {getOptionSublabel(opt)}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
