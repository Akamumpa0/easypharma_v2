import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage } from '../../lib/utils.js';

const urgencyConfig = {
  critical: { label: 'Critical', class: 'badge-red' },
  high:     { label: 'High',     class: 'badge-yellow' },
  medium:   { label: 'Medium',   class: 'badge-blue' },
};

export default function ReorderPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reorder');
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reorder Recommendations</h1>
          <p className="text-sm text-gray-500 mt-1">Medicines that need restocking based on sales history</p>
        </div>
        <button onClick={fetch} className="btn-secondary"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Items to Reorder</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.count}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Estimated Reorder Cost</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(data.totalEstimatedCost)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Critical Items</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {data.recommendations.filter(r => r.urgency === 'critical').length}
            </p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Analyzing stock...</div>
        ) : !data || data.recommendations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">All stock levels look good!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Medicine', 'Current Stock', 'Reorder Level', 'Monthly Sales', 'Days Left', 'Suggested Qty', 'Est. Cost', 'Urgency'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recommendations.map((r) => {
                const u = urgencyConfig[r.urgency] || { label: r.urgency || 'Normal', class: 'badge-blue' };
                return (
                  <tr key={r.medicineId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {r.medicineName}
                      {r.brandName && <span className="text-gray-400 text-xs ml-1">({r.brandName})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.currentStock === 0 ? 'badge-red' : 'badge-yellow'}`}>
                        {r.currentStock} {r.unitName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.reorderLevel}</td>
                    <td className="px-4 py-3 text-gray-600">{r.monthlySales}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.daysRemaining !== null ? `${r.daysRemaining}d` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-primary-700">{r.suggestedReorderQty}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(r.estimatedCost)}</td>
                    <td className="px-4 py-3">
                      <span className={u.class}>{u.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
