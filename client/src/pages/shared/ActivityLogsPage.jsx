import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage, formatDate } from '../../lib/utils.js';

const MODULES = ['auth', 'medicines', 'stock', 'billing', 'users', 'expenses', 'profile', 'system', 'backup'];
const ACTIVITY_TYPES = ['login', 'logout', 'create', 'update', 'delete', 'purchase', 'sale', 'return', 'export', 'import'];

const typeColors = {
  login: 'badge-green', logout: 'badge-yellow', create: 'badge-blue',
  update: 'badge-yellow', delete: 'badge-red', sale: 'badge-green',
  purchase: 'badge-blue', return: 'badge-yellow', export: 'badge-blue', import: 'badge-blue',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', module: '', from: '', to: '', page: 1 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const res = await api.get(`/activity-logs?${params}`);
      setLogs(res.data.logs);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    try {
      const res = await api.get('/activity-logs/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (err) {
      alert('Failed to export activity logs: ' + getErrorMessage(err));
    }
  };

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Complete audit trail of all system actions</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search logs..." value={filters.q}
            onChange={e => setFilter('q', e.target.value)} />
        </div>
        <select className="input" value={filters.module} onChange={e => setFilter('module', e.target.value)}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
        </select>
        <input type="date" className="input" value={filters.from} onChange={e => setFilter('from', e.target.value)} placeholder="From" />
        <input type="date" className="input" value={filters.to} onChange={e => setFilter('to', e.target.value)} placeholder="To" />
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No activity logs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date & Time', 'User', 'Module', 'Action', 'Description', 'IP'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{log.userFirstName} {log.userLastName}</div>
                    <div className="text-gray-400 text-xs">{log.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-blue capitalize text-xs">{log.module}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${typeColors[log.activityType] || 'badge-blue'}`}>
                      {log.activityType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                    {log.description || log.action}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
