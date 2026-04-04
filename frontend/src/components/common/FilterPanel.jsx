/**
 * FilterPanel.jsx — Inline (always-visible) filter bar
 * Replaces the old popup/dropdown filter. Consistent across Admin + Employee panels.
 * Usage: same props as before — config, values, onChange, onApply, onReset, activeCount
 */
export default function FilterPanel({ config = [], values = {}, onChange, onApply, onReset, activeCount = 0 }) {
  if (!config.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="text-sm font-bold text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Apply
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Filter fields — responsive grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {config.map(field => (
          <div key={field.key} className={field.type === 'date-range' ? 'col-span-2' : ''}>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
              {field.label}
            </label>

            {field.type === 'date-range' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    className="form-input text-xs py-1.5 w-full"
                    value={values[field.key + '_from'] || ''}
                    onChange={e => onChange(field.key + '_from', e.target.value)}
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">From</span>
                </div>
                <div>
                  <input
                    type="date"
                    className="form-input text-xs py-1.5 w-full"
                    value={values[field.key + '_to'] || ''}
                    onChange={e => onChange(field.key + '_to', e.target.value)}
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">To</span>
                </div>
              </div>

            ) : field.type === 'amount-range' ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  className="form-input text-xs py-1.5"
                  placeholder="Min ₹"
                  value={values[field.key + '_min'] || ''}
                  onChange={e => onChange(field.key + '_min', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input text-xs py-1.5"
                  placeholder="Max ₹"
                  value={values[field.key + '_max'] || ''}
                  onChange={e => onChange(field.key + '_max', e.target.value)}
                />
              </div>

            ) : field.type === 'select' ? (
              <select
                className="form-input text-xs py-1.5 w-full"
                value={values[field.key] || ''}
                onChange={e => onChange(field.key, e.target.value)}
              >
                <option value="">— All —</option>
                {(field.options || []).map(o => (
                  <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
                ))}
              </select>

            ) : (
              <input
                type="text"
                className="form-input text-xs py-1.5 w-full"
                placeholder={field.placeholder || `Search ${field.label}…`}
                value={values[field.key] || ''}
                onChange={e => onChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
