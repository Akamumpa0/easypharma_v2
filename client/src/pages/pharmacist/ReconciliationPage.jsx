import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';

const statusConfig = {
  gain:     { label: 'Gain',     class: 'badge-green', Icon: TrendingUp   },
  loss:     { label: 'Loss',     class: 'badge-red',   Icon: TrendingDown },
  balanced: { label: 'Balanced', class: 'badge-blue',  Icon: Minus        },
};

export default function ReconciliationPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reconciliation/daily?date=${date}`);
      setReport(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">Opening vs closing stock — daily variance report</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input w-44"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button onClick={fetchReport} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Items',  value: report.summary?.totalItems  || 0, color: 'bg-blue-500'    },
            { label: 'Balanced',     value: report.summary?.balanced    || 0, color: 'bg-green-500'   },
            { label: 'Gains',        value: report.summary?.totalGain   || 0, color: 'bg-primary-500' },
            { label: 'Losses',       value: report.summary?.totalLoss   || 0, color: 'bg-red-500'     },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-5 flex items-center gap-4">
              <div className={`p-3 rounded-full ${color}`}>
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reconciliation table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading reconciliation data...</div>
        ) : !report || report.items?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No stock data found for {date}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Medicine', 'Unit', 'Opening Stock', 'Closing Stock', 'Net Movement', 'Variance', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.items.map(item => {
                const cfg = statusConfig[item.status] || statusConfig.balanced;
                const Icon = cfg.Icon;
                return (
                  <tr key={item.medicineId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.medicineName}</td>
                    <td className="px-4 py-3 text-gray-500">{item.unitName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.openingStock}</td>
                    <td className="px-4 py-3 text-gray-700">{item.closingStock}</td>
                    <td className="px-4 py-3">
                      <span className={item.netMovement >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {item.netMovement >= 0 ? `+${item.netMovement}` : item.netMovement}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={item.variance >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {item.variance >= 0 ? `+${item.variance}` : item.variance}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cfg.class} flex items-center gap-1 w-fit`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
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
