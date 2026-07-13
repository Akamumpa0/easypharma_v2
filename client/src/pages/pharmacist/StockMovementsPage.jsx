import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Download } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';

const MOVEMENT_COLORS = {
  purchased: 'badge-green',
  sold:      'badge-blue',
  returned:  'badge-yellow',
  damaged:   'badge-red',
  disposed:  'badge-red',
  adjusted:  'badge-yellow',
};

const TYPES = ['purchased','sold','returned','damaged','disposed','adjusted'];

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState('');
  const [filters, setFilters]    = useState({ type: '', from: '', to: '' });

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to', filters.to);
      const res = await api.get(`/reconciliation/movements?${params}`);
      setMovements(res.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-6 h-6" /> Stock Movement Timeline
        </h1>
        <p className="text-sm text-gray-500 mt-1">Every stock transaction — purchased, sold, returned, damaged, disposed</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="input w-44" value={filters.type} onChange={e => setFilter('type', e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <input type="date" className="input w-44" value={filters.from} onChange={e => setFilter('from', e.target.value)} />
        <span className="self-center text-gray-400">to</span>
        <input type="date" className="input w-44" value={filters.to} onChange={e => setFilter('to', e.target.value)} />
        {(filters.type || filters.from || filters.to) && (
          <button onClick={() => setFilters({ type: '', from: '', to: '' })} className="btn-secondary text-xs">Clear</button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading movements...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No movements found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date', 'Medicine', 'Type', 'Quantity', 'Batch', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.medicineName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${MOVEMENT_COLORS[m.movementType] || 'badge-blue'}`}>
                      {m.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={m.quantity > 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{m.batchNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
