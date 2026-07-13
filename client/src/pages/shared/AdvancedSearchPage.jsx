import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage } from '../../lib/utils.js';

const UNIT_TYPES = ['tablet','capsule','bottle','tube','injection','vial','ampoule','packet','box','strip','carton','ml','litre','gram','kilogram'];
const STOCK_STATUSES = [
  { value: '', label: 'All'         },
  { value: 'in_stock',     label: 'In Stock'    },
  { value: 'low_stock',    label: 'Low Stock'   },
  { value: 'out_of_stock', label: 'Out of Stock'},
];

export default function AdvancedSearchPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    q: '', barcode: '', medicineCode: '', brandName: '',
    manufacturer: '', category: '', unitType: '',
    stockStatus: '', priceMin: '', priceMax: '',
    expiryBefore: '', expiryAfter: '',
    controlled: '', prescription: '',
  });

  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  const handleSearch = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const res = await api.get(`/search/medicines?${params}`);
      setResults(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ q:'',barcode:'',medicineCode:'',brandName:'',manufacturer:'',
      category:'',unitType:'',stockStatus:'',priceMin:'',priceMax:'',
      expiryBefore:'',expiryAfter:'',controlled:'',prescription:'' });
    setResults(null);
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Advanced Search</h1>
        <p className="text-sm text-gray-500 mt-1">Search and filter medicines by any attribute</p>
      </div>

      <form onSubmit={handleSearch} className="card p-4 mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name, brand, barcode, code, manufacturer..."
              value={filters.q} onChange={e => setFilter('q', e.target.value)} />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn-secondary relative">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Searching...' : 'Search'}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="btn-secondary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="label">Barcode</label>
              <input className="input" value={filters.barcode} onChange={e => setFilter('barcode', e.target.value)} /></div>
            <div><label className="label">Medicine Code</label>
              <input className="input" value={filters.medicineCode} onChange={e => setFilter('medicineCode', e.target.value)} /></div>
            <div><label className="label">Brand Name</label>
              <input className="input" value={filters.brandName} onChange={e => setFilter('brandName', e.target.value)} /></div>
            <div><label className="label">Manufacturer</label>
              <input className="input" value={filters.manufacturer} onChange={e => setFilter('manufacturer', e.target.value)} /></div>
            <div><label className="label">Category</label>
              <input className="input" value={filters.category} onChange={e => setFilter('category', e.target.value)} /></div>
            <div><label className="label">Unit Type</label>
              <select className="input" value={filters.unitType} onChange={e => setFilter('unitType', e.target.value)}>
                <option value="">Any</option>
                {UNIT_TYPES.map(u => <option key={u} value={u} className="capitalize">{u}</option>)}
              </select></div>
            <div><label className="label">Stock Status</label>
              <select className="input" value={filters.stockStatus} onChange={e => setFilter('stockStatus', e.target.value)}>
                {STOCK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div><label className="label">Price Min</label>
              <input type="number" className="input" value={filters.priceMin} onChange={e => setFilter('priceMin', e.target.value)} /></div>
            <div><label className="label">Price Max</label>
              <input type="number" className="input" value={filters.priceMax} onChange={e => setFilter('priceMax', e.target.value)} /></div>
            <div><label className="label">Expiry Before</label>
              <input type="date" className="input" value={filters.expiryBefore} onChange={e => setFilter('expiryBefore', e.target.value)} /></div>
            <div><label className="label">Expiry After</label>
              <input type="date" className="input" value={filters.expiryAfter} onChange={e => setFilter('expiryAfter', e.target.value)} /></div>
            <div className="flex gap-4 items-center pt-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={filters.controlled === 'true'}
                  onChange={e => setFilter('controlled', e.target.checked ? 'true' : '')} className="rounded" />
                Controlled
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={filters.prescription === 'true'}
                  onChange={e => setFilter('prescription', e.target.checked ? 'true' : '')} className="rounded" />
                Prescription
              </label>
            </div>
          </div>
        )}
      </form>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {results && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              Found <strong>{results.total}</strong> results
              {results.total > results.limit && ` — showing ${results.results.length} of ${results.total}`}
            </p>
          </div>
          <div className="card overflow-hidden">
            {results.results.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No medicines match your search criteria.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Name','Brand','Category','Unit','Code','Barcode','In Stock','Price'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.results.map(m => {
                    const qty = m.stock?.quantity ?? null;
                    const level = m.reorderLevel ?? 10;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium">{m.generalName}</td>
                        <td className="px-3 py-3 text-gray-500">{m.brandName || '—'}</td>
                        <td className="px-3 py-3 text-gray-500">{m.category || '—'}</td>
                        <td className="px-3 py-3 text-gray-500 capitalize">{m.unitType}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">{m.medicineCode || '—'}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">{m.barcode || '—'}</td>
                        <td className="px-3 py-3">
                          {qty === null ? <span className="text-gray-400 text-xs">N/A</span> :
                            <span className={`badge ${qty === 0 ? 'badge-red' : qty <= level ? 'badge-yellow' : 'badge-green'}`}>
                              {qty}
                            </span>
                          }
                        </td>
                        <td className="px-3 py-3">{m.stock ? formatCurrency(m.stock.sellingPrice) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
