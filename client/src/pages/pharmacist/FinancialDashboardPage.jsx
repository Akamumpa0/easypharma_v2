import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Package,
  BarChart2, ShoppingCart, RefreshCw, Calendar,
} from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage } from '../../lib/utils.js';

function StatCard({ icon: Icon, label, value, sub, color = 'bg-primary-500', trend }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MedicineRow({ item, rank }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-sm text-gray-500">#{rank}</td>
      <td className="px-4 py-2 text-sm font-medium">{item.medicineName}</td>
      <td className="px-4 py-2 text-sm">{item.quantitySold}</td>
      <td className="px-4 py-2 text-sm text-primary-700">{formatCurrency(item.revenue)}</td>
      <td className="px-4 py-2 text-sm text-green-600">{formatCurrency(item.profit)}</td>
      <td className="px-4 py-2 text-sm">
        <span className={`badge ${item.margin >= 30 ? 'badge-green' : item.margin >= 15 ? 'badge-yellow' : 'badge-red'}`}>
          {item.margin}%
        </span>
      </td>
    </tr>
  );
}

export default function FinancialDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [profit, setProfit] = useState(null);
  const [medAnalytics, setMedAnalytics] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p, m, e, v] = await Promise.all([
        api.get('/analytics/summary'),
        api.get(`/analytics/profit?period=${period}`),
        api.get(`/analytics/medicines?period=${period}`),
        api.get('/expenses/summary'),
        api.get('/valuation?method=FIFO'),
      ]);
      setSummary(s.data);
      setProfit(p.data);
      setMedAnalytics(m.data);
      setExpenseSummary(e.data);
      setValuation(v.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="bg-red-50 text-red-700 p-4 rounded-md">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, profit, inventory and expense overview</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input w-36"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={fetchAll} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(profit?.totalRevenue || 0)}
          sub={`${profit?.billCount || 0} sales`}
          color="bg-primary-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Gross Profit"
          value={formatCurrency(profit?.grossProfit || 0)}
          sub={`Margin: ${profit?.grossMargin || 0}%`}
          color="bg-green-500"
        />
        <StatCard
          icon={TrendingDown}
          label="Total Expenses"
          value={formatCurrency(profit?.totalExpenses || 0)}
          color="bg-orange-500"
        />
        <StatCard
          icon={BarChart2}
          label="Net Profit"
          value={formatCurrency(profit?.netProfit || 0)}
          sub={`Net margin: ${profit?.netMargin || 0}%`}
          color="bg-blue-500"
        />
      </div>

      {/* Inventory Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Package}
          label="Inventory Purchase Value"
          value={formatCurrency(valuation?.summary?.totalPurchaseValue || 0)}
          sub="FIFO cost method"
          color="bg-purple-500"
        />
        <StatCard
          icon={ShoppingCart}
          label="Inventory Selling Value"
          value={formatCurrency(valuation?.summary?.totalSellingValue || 0)}
          sub={`${valuation?.summary?.totalItems || 0} SKUs`}
          color="bg-indigo-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Potential Inventory Profit"
          value={formatCurrency(valuation?.summary?.totalPotentialProfit || 0)}
          sub={`Margin: ${valuation?.summary?.overallMargin || 0}%`}
          color="bg-teal-500"
        />
      </div>

      {/* Revenue Periods */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Today', value: summary?.revenue?.daily },
            { label: 'This Week', value: summary?.revenue?.weekly },
            { label: 'This Month', value: summary?.revenue?.monthly },
            { label: 'This Year', value: summary?.revenue?.annual },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(value || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Best & Least Performers */}
      {medAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-800">Top 5 Medicines by Profit</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Medicine', 'Qty', 'Revenue', 'Profit', 'Margin'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-medium uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medAnalytics.bestPerformers.map((item, i) => (
                  <MedicineRow key={item.medicineId} item={item} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-800">5 Least Performing Medicines</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Medicine', 'Qty', 'Revenue', 'Profit', 'Margin'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-medium uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medAnalytics.leastPerformers.map((item, i) => (
                  <MedicineRow key={item.medicineId} item={item} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Breakdown */}
      {expenseSummary && expenseSummary.byType.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">
            Expense Breakdown — Total: {formatCurrency(expenseSummary.grandTotal)}
          </h2>
          <div className="space-y-2">
            {expenseSummary.byType.map((row) => {
              const pct = expenseSummary.grandTotal > 0
                ? Math.round((row.total / expenseSummary.grandTotal) * 100)
                : 0;
              return (
                <div key={row.type} className="flex items-center gap-3">
                  <span className="text-sm capitalize w-28 text-gray-600">{row.type}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium w-24 text-right">{formatCurrency(row.total)}</span>
                  <span className="text-xs text-gray-400 w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
