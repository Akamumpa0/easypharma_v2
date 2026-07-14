import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Package,
  RefreshCw, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage } from '../../lib/utils.js';

// ─── Summary Card ────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, color, tooltip }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-3 rounded-full flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm text-gray-500">{label}</p>
          {tooltip && (
            <div className="relative group">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="hidden group-hover:block absolute left-0 bottom-5 z-10 w-52 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Margin bar ──────────────────────────────────────────────────────────────
function MarginBar({ margin }) {
  const clamped = Math.min(Math.max(margin, 0), 100);
  const color = margin >= 30 ? 'bg-green-500' : margin >= 15 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-xs font-medium w-10 text-right ${
        margin >= 30 ? 'text-green-700' : margin >= 15 ? 'text-yellow-700' : 'text-red-600'
      }`}>{margin}%</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function StockValuationPage() {
  const [data, setData]       = useState(null);
  const [method, setMethod]   = useState('FIFO');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sortField, setSortField] = useState('purchaseValue');
  const [sortDir, setSortDir]     = useState('desc');
  const [search, setSearch]       = useState('');

  const fetchValuation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/valuation?method=${method}`);
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [method]);

  useEffect(() => { fetchValuation(); }, [fetchValuation]);

  // ── sorting ────────────────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-primary-600 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-primary-600 inline ml-1" />;
  };

  // ── filtered & sorted items ────────────────────────────────────────────────
  const items = (data?.items || [])
    .filter(i => !search || i.medicineName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const summary = data?.summary;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Valuation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Inventory value using {method === 'FIFO' ? 'First-In First-Out' : 'Weighted Average Cost'} method
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Method toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {['FIFO', 'WeightedAverage'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-4 py-2 transition-colors ${
                  method === m
                    ? 'bg-primary-600 text-white font-medium'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'FIFO' ? 'FIFO' : 'Weighted Avg'}
              </button>
            ))}
          </div>
          <button onClick={fetchValuation} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            icon={Package}
            label="Purchase Value"
            value={formatCurrency(summary.totalPurchaseValue)}
            sub={`${summary.totalItems} SKUs · ${summary.totalQuantity} units`}
            color="bg-blue-500"
            tooltip="Total cost of all stock on hand at buying price"
          />
          <SummaryCard
            icon={DollarSign}
            label="Selling Value"
            value={formatCurrency(summary.totalSellingValue)}
            sub="At current selling prices"
            color="bg-primary-500"
            tooltip="Total revenue if all current stock is sold"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Potential Profit"
            value={formatCurrency(summary.totalPotentialProfit)}
            sub={`${summary.overallMargin}% overall margin`}
            color="bg-green-500"
            tooltip="Selling value minus purchase value across all stock"
          />
          <SummaryCard
            icon={TrendingDown}
            label="Current Inventory Value"
            value={formatCurrency(summary.totalPurchaseValue)}
            sub={`${method} method`}
            color="bg-purple-500"
            tooltip={`Inventory cost calculated using the ${method} valuation method`}
          />
        </div>
      )}

      {/* ── Method explanation banner ───────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 text-sm text-blue-800 flex items-start gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          {method === 'FIFO'
            ? 'FIFO (First-In First-Out): Cost is calculated assuming oldest stock is sold first. Best for perishable medicines with expiry dates.'
            : 'Weighted Average Cost: Unit cost is the average of all purchase prices weighted by quantity. Smooths out price fluctuations.'
          }
        </span>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <input
          type="text"
          className="input w-64"
          placeholder="Search medicine…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Items Table ─────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            Calculating inventory value…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            {search ? 'No medicines match your search.' : 'No stock to value yet.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { label: 'Medicine',        field: null             },
                  { label: 'Qty',             field: 'quantity'       },
                  { label: 'Unit Cost',       field: 'unitCost'       },
                  { label: 'Purchase Value',  field: 'purchaseValue'  },
                  { label: 'Selling Price',   field: 'sellingPrice'   },
                  { label: 'Selling Value',   field: 'sellingValue'   },
                  { label: 'Potential Profit',field: 'potentialProfit'},
                  { label: 'Margin',          field: 'margin'         },
                ].map(({ label, field }) => (
                  <th
                    key={label}
                    onClick={field ? () => toggleSort(field) : undefined}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide ${
                      field ? 'cursor-pointer hover:text-gray-700 select-none' : ''
                    }`}
                  >
                    {label}
                    {field && <SortIcon field={field} />}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.medicineId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.medicineName}</div>
                    <div className="text-xs text-gray-400">{item.method}</div>
                  </td>

                  <td className="px-4 py-3 text-gray-700">{item.quantity}</td>

                  <td className="px-4 py-3 text-gray-700">
                    {formatCurrency(item.unitCost)}
                  </td>

                  {/* Purchase value — cost of current stock */}
                  <td className="px-4 py-3 font-medium text-blue-700">
                    {formatCurrency(item.purchaseValue)}
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {formatCurrency(item.sellingPrice)}
                  </td>

                  {/* Selling value — if all units sold today */}
                  <td className="px-4 py-3 font-medium text-primary-700">
                    {formatCurrency(item.sellingValue)}
                  </td>

                  {/* Potential profit */}
                  <td className="px-4 py-3">
                    <span className={`font-medium ${
                      item.potentialProfit >= 0 ? 'text-green-700' : 'text-red-600'
                    }`}>
                      {item.potentialProfit >= 0 ? '+' : ''}{formatCurrency(item.potentialProfit)}
                    </span>
                  </td>

                  {/* Margin bar */}
                  <td className="px-4 py-3 w-36">
                    <MarginBar margin={item.margin} />
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals footer */}
            {summary && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    Total ({summary.totalItems} items)
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    {summary.totalQuantity}
                  </td>
                  <td className="px-4 py-3 text-gray-400">—</td>
                  <td className="px-4 py-3 font-bold text-blue-700">
                    {formatCurrency(summary.totalPurchaseValue)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">—</td>
                  <td className="px-4 py-3 font-bold text-primary-700">
                    {formatCurrency(summary.totalSellingValue)}
                  </td>
                  <td className="px-4 py-3 font-bold text-green-700">
                    +{formatCurrency(summary.totalPotentialProfit)}
                  </td>
                  <td className="px-4 py-3">
                    <MarginBar margin={summary.overallMargin} />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
