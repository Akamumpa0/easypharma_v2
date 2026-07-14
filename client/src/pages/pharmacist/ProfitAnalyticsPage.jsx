import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  BarChart2, RefreshCw, Award, ThumbsDown, Calendar,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../../lib/api.js';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils.js';

const PERIODS = [
  { value: 'today', label: 'Today'      },
  { value: 'week',  label: 'This Week'  },
  { value: 'month', label: 'This Month' },
  { value: 'year',  label: 'This Year'  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const round = (n) => Math.round(n * 100) / 100;

function MarginPill({ margin }) {
  const color = margin >= 30 ? 'badge-green' : margin >= 15 ? 'badge-yellow' : 'badge-red';
  return <span className={`badge ${color}`}>{margin}%</span>;
}

function KPICard({ icon: Icon, label, value, sub, color, trend, trendLabel }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-full ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" />
             : trend < 0 ? <ArrowDown className="w-3 h-3" />
             : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Revenue periods row ──────────────────────────────────────────────────────
function RevenuePeriods({ summary }) {
  if (!summary) return null;
  const { daily, weekly, monthly, annual } = summary.revenue;
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" /> Revenue by Period
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Daily',   value: daily   },
          { label: 'Weekly',  value: weekly  },
          { label: 'Monthly', value: monthly },
          { label: 'Annual',  value: annual  },
        ].map(({ label, value }) => (
          <div key={label} className="text-center bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-primary-700 mt-1">{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Performers table ─────────────────────────────────────────────────────────
function PerformersTable({ title, icon: Icon, iconColor, items }) {
  if (!items?.length) return null;
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['#', 'Medicine', 'Qty Sold', 'Revenue', 'Profit', 'Margin'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <tr key={item.medicineId} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-400 font-medium">#{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-gray-900">{item.medicineName}</td>
              <td className="px-4 py-2.5 text-gray-600">{item.quantitySold}</td>
              <td className="px-4 py-2.5 text-primary-700 font-medium">{formatCurrency(item.revenue)}</td>
              <td className="px-4 py-2.5">
                <span className={item.profit >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                  {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)}
                </span>
              </td>
              <td className="px-4 py-2.5"><MarginPill margin={item.margin} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Daily profit chart ───────────────────────────────────────────────────────
function DailyChart({ data }) {
  if (!data?.length) return null;

  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Revenue: round(Number(d.sales)),
    Profit:  round(Number(d.profit)),
    Cost:    round(Number(d.cost)),
  }));

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4" /> Daily Breakdown
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Legend />
          <Bar dataKey="Revenue" fill="#16a34a" radius={[3,3,0,0]} />
          <Bar dataKey="Profit"  fill="#22c55e" radius={[3,3,0,0]} />
          <Bar dataKey="Cost"    fill="#f97316" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Per-sale table ───────────────────────────────────────────────────────────
function SalesTable({ sales }) {
  if (!sales?.length) return null;
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-800">Profit per Sale</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Date', 'Customer', 'Items', 'Revenue', 'COGS', 'Profit', 'Margin'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map(sale => (
              <tr key={sale.billId} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                  {new Date(sale.date).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{sale.customerName}</td>
                <td className="px-4 py-2.5 text-gray-500">{sale.itemCount}</td>
                <td className="px-4 py-2.5 text-primary-700 font-medium">{formatCurrency(sale.revenue)}</td>
                <td className="px-4 py-2.5 text-orange-600">{formatCurrency(sale.cogs)}</td>
                <td className="px-4 py-2.5">
                  <span className={sale.profit >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                    {sale.profit >= 0 ? '+' : ''}{formatCurrency(sale.profit)}
                  </span>
                </td>
                <td className="px-4 py-2.5"><MarginPill margin={sale.margin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfitAnalyticsPage() {
  const [period, setPeriod]       = useState('month');
  const [profit, setProfit]       = useState(null);
  const [medicines, setMedicines] = useState(null);
  const [sales, setSales]         = useState(null);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, m, s, sum] = await Promise.all([
        api.get(`/analytics/profit?period=${period}`),
        api.get(`/analytics/medicines?period=${period}`),
        api.get(`/analytics/sales?period=${period}&limit=30`),
        api.get('/analytics/summary'),
      ]);
      setProfit(p.data);
      setMedicines(m.data);
      setSales(s.data.sales);
      setSummary(sum.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const TABS = [
    { id: 'overview',   label: 'Overview'          },
    { id: 'medicines',  label: 'By Medicine'        },
    { id: 'sales',      label: 'Per Sale'           },
    { id: 'performers', label: 'Top / Bottom'       },
  ];

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed profit breakdown by period, medicine and sale</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 transition-colors ${
                  period === p.value
                    ? 'bg-primary-600 text-white font-medium'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} disabled={loading} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              icon={DollarSign}
              label="Total Revenue"
              value={formatCurrency(profit?.totalRevenue || 0)}
              sub={`${profit?.billCount || 0} sales`}
              color="bg-primary-500"
            />
            <KPICard
              icon={TrendingUp}
              label="Gross Profit"
              value={formatCurrency(profit?.grossProfit || 0)}
              sub={`Margin: ${profit?.grossMargin || 0}%`}
              color="bg-green-500"
            />
            <KPICard
              icon={TrendingDown}
              label="Total Expenses"
              value={formatCurrency(profit?.totalExpenses || 0)}
              sub="Operating costs"
              color="bg-orange-500"
            />
            <KPICard
              icon={ShoppingBag}
              label="Net Profit"
              value={formatCurrency(profit?.netProfit || 0)}
              sub={`Net margin: ${profit?.netMargin || 0}%`}
              color={profit?.netProfit >= 0 ? 'bg-blue-500' : 'bg-red-500'}
            />
          </div>

          {/* ── Margin summary ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: 'Gross Margin',
                value: `${profit?.grossMargin || 0}%`,
                desc: 'Gross Profit ÷ Revenue',
                color: (profit?.grossMargin || 0) >= 30 ? 'text-green-700' : (profit?.grossMargin || 0) >= 15 ? 'text-yellow-700' : 'text-red-600',
              },
              {
                label: 'Net Margin',
                value: `${profit?.netMargin || 0}%`,
                desc: 'Net Profit ÷ Revenue',
                color: (profit?.netMargin || 0) >= 20 ? 'text-green-700' : (profit?.netMargin || 0) >= 10 ? 'text-yellow-700' : 'text-red-600',
              },
              {
                label: 'COGS',
                value: formatCurrency(profit?.totalCOGS || 0),
                desc: 'Cost of Goods Sold',
                color: 'text-gray-700',
              },
            ].map(({ label, value, desc, color }) => (
              <div key={label} className="card p-5 text-center">
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>

          {/* ── Revenue by period ─────────────────────────────────────────────── */}
          <div className="mb-6">
            <RevenuePeriods summary={summary} />
          </div>

          {/* ── Tab navigation ────────────────────────────────────────────────── */}
          <div className="flex border-b border-gray-200 mb-6">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview (daily chart) ─────────────────────────────────── */}
          {activeTab === 'overview' && (
            <DailyChart data={profit?.dailyBreakdown} />
          )}

          {/* ── Tab: By Medicine ───────────────────────────────────────────── */}
          {activeTab === 'medicines' && medicines && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-800">Profit per Medicine</h2>
                <p className="text-xs text-gray-500 mt-0.5">{medicines.medicines?.length || 0} medicines sold in this period</p>
              </div>
              {!medicines.medicines?.length ? (
                <div className="p-8 text-center text-gray-500">No sales in this period.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Medicine', 'Qty Sold', 'Revenue', 'COGS', 'Profit', 'Margin'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {medicines.medicines.map(item => (
                      <tr key={item.medicineId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.medicineName}</td>
                        <td className="px-4 py-3 text-gray-600">{item.quantitySold}</td>
                        <td className="px-4 py-3 text-primary-700 font-medium">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-orange-600">{formatCurrency(item.cogs)}</td>
                        <td className="px-4 py-3">
                          <span className={item.profit >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                            {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3"><MarginPill margin={item.margin} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Tab: Per Sale ───────────────────────────────────────────────── */}
          {activeTab === 'sales' && <SalesTable sales={sales} />}

          {/* ── Tab: Top / Bottom performers ───────────────────────────────── */}
          {activeTab === 'performers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformersTable
                title="Best Performing Medicines"
                icon={Award}
                iconColor="text-green-600"
                items={medicines?.bestPerformers}
              />
              <PerformersTable
                title="Least Performing Medicines"
                icon={ThumbsDown}
                iconColor="text-red-500"
                items={medicines?.leastPerformers}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
