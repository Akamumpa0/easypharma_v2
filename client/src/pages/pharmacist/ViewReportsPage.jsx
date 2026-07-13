import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils.js';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function ViewReportsPage() {
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const [summaryRes, reportsRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get(`/reports/daily?${params}`),
      ]);
      setSummary(summaryRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Sales performance and daily summaries</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

      {/* Today's summary */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Today's Summary</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign}   label="Total Sales"  value={formatCurrency(summary?.totalSales || 0)}  color="bg-primary-500" />
        <StatCard icon={TrendingUp}   label="Total Profit" value={formatCurrency(summary?.totalProfit || 0)} color="bg-blue-500"    />
        <StatCard icon={ShoppingBag}  label="Total Cost"   value={formatCurrency(summary?.totalCost || 0)}   color="bg-orange-500"  />
        <StatCard icon={BarChart2}    label="Bills"        value={summary?.billCount || 0}                   color="bg-purple-500"  />
      </div>

      {/* Daily reports table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Daily Reports</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" className="input py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-primary-600 hover:underline">Clear</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No reports found for the selected period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date', 'Bills', 'Total Sales', 'Total Cost', 'Profit'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.billCount}</td>
                  <td className="px-4 py-3 text-primary-700 font-medium">{formatCurrency(r.totalSales)}</td>
                  <td className="px-4 py-3 text-orange-600">{formatCurrency(r.totalCost)}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{formatCurrency(r.totalProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
