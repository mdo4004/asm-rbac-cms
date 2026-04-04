import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { MdLocationOn, MdFilterList, MdPerson, MdAccessTime, MdRefresh, MdOpenInNew } from 'react-icons/md';

const CAPTURE_COLORS = {
  login:  'bg-blue-100 text-blue-700',
  '11am': 'bg-amber-100 text-amber-700',
  '730pm':'bg-purple-100 text-purple-700',
  manual: 'bg-gray-100 text-gray-600',
};

const CAPTURE_LABELS = {
  login:  '🔑 Login',
  '11am': '🕙 11 AM',
  '730pm':'🕖 7:30 PM',
  manual: '📌 Manual',
};

export default function LocationTrack() {
  const [logs,      setLogs]      = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({ date: today, user_id: '' });

  // Load employee list for dropdown
  useEffect(() => {
    api.get('/users').then(r => setEmployees(r.data.users || [])).catch(() => {});
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date)    params.date    = filters.date;
      if (filters.user_id) params.user_id = filters.user_id;
      const res = await api.get('/location/all', { params });
      setLogs(res.data.logs || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  const fmtDate = (d) => new Date(d).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true
  });

  const formatAddress = (row) => {
    const parts = [row.house_no, row.street, row.city, row.state, row.pincode].filter(Boolean);
    if (parts.length) return parts.join(', ');
    return row.address || `${row.latitude}, ${row.longitude}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <MdLocationOn className="text-red-500"/> Location Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Employee GPS captures — login, 11:00 AM &amp; 7:30 PM auto-snapshots
          </p>
        </div>
        <button onClick={loadLogs} disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
          <MdRefresh className={loading ? 'animate-spin' : ''}/>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-600">
          <MdFilterList/> Filters
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Employee</label>
            <select
              value={filters.user_id}
              onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[180px]"
            >
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadLogs}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition">
              Apply
            </button>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilters({ date:'', user_id:'' }); setTimeout(loadLogs, 50); }}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-1.5 rounded-lg">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Captures', val: logs.length, color:'blue' },
          { label:'Login Captures', val: logs.filter(l=>l.capture_type==='login').length, color:'sky' },
          { label:'11 AM Captures', val: logs.filter(l=>l.capture_type==='11am').length, color:'amber' },
          { label:'7:30 PM Captures', val: logs.filter(l=>l.capture_type==='730pm').length, color:'purple' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-gray-800">{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Capture Type</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Date &amp; Time</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Address</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Map</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <span className="inline-block animate-spin text-2xl">⏳</span>
                    <p className="mt-2">Loading…</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <MdLocationOn className="text-5xl mx-auto text-gray-200 mb-2"/>
                    <p className="font-medium">No location data found</p>
                    <p className="text-xs mt-1">Employees need to allow GPS in their browser</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                          {log.employee_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{log.employee_name}</p>
                          <p className="text-xs text-gray-400">{log.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${CAPTURE_COLORS[log.capture_type] || 'bg-gray-100 text-gray-600'}`}>
                        {CAPTURE_LABELS[log.capture_type] || log.capture_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {fmtDate(log.captured_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate text-xs leading-relaxed">
                        {formatAddress(log)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold"
                      >
                        <MdOpenInNew/> Maps
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
