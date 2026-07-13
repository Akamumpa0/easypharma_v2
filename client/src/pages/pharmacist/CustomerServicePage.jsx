import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Receipt, ShoppingCart } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage } from '../../lib/utils.js';

function BillItem({ item, onUpdate, onRemove }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 pr-4">
        <div className="font-medium text-sm">{item.medicineName}</div>
        <div className="text-xs text-gray-500">{item.unitName}</div>
      </td>
      <td className="py-3 pr-4 text-sm text-gray-600">{formatCurrency(item.unitPrice)}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <button onClick={() => onUpdate(item.medicineId, item.quantity - 1)} className="p-1 rounded hover:bg-gray-100">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm w-6 text-center">{item.quantity}</span>
          <button onClick={() => onUpdate(item.medicineId, item.quantity + 1)} className="p-1 rounded hover:bg-gray-100">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="py-3 pr-4 text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity)}</td>
      <td className="py-3">
        <button onClick={() => onRemove(item.medicineId)} className="text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default function CustomerServicePage() {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [billItems, setBillItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastBill, setLastBill] = useState(null);
  const [error, setError] = useState('');

  const fetchStock = useCallback(async () => {
    try {
      const res = await api.get('/stock');
      setStock(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const filtered = stock.filter((s) =>
    s.generalName.toLowerCase().includes(search.toLowerCase()) && s.quantity > 0
  );

  const addToBill = (item) => {
    setBillItems((prev) => {
      const existing = prev.find((b) => b.medicineId === item.medicineId);
      if (existing) {
        return prev.map((b) =>
          b.medicineId === item.medicineId ? { ...b, quantity: b.quantity + 1 } : b
        );
      }
      return [...prev, {
        medicineId: item.medicineId,
        medicineName: item.generalName,
        unitName: item.unitName,
        unitPrice: parseFloat(item.sellingPrice),
        quantity: 1,
      }];
    });
  };

  const updateQty = (medicineId, qty) => {
    if (qty <= 0) {
      setBillItems((prev) => prev.filter((b) => b.medicineId !== medicineId));
    } else {
      setBillItems((prev) =>
        prev.map((b) => b.medicineId === medicineId ? { ...b, quantity: qty } : b)
      );
    }
  };

  const removeItem = (medicineId) => {
    setBillItems((prev) => prev.filter((b) => b.medicineId !== medicineId));
  };

  const total = billItems.reduce((sum, b) => sum + b.unitPrice * b.quantity, 0);

  const handleCheckout = async () => {
    if (billItems.length === 0) return;
    setProcessing(true);
    setError('');
    try {
      const res = await api.post('/billing', {
        customerName: customerName || undefined,
        items: billItems.map((b) => ({
          medicineId: b.medicineId,
          medicineName: b.medicineName,
          quantity: b.quantity,
          unitPrice: String(b.unitPrice),
        })),
      });
      setLastBill(res.data);
      setBillItems([]);
      setCustomerName('');
      fetchStock();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Service</h1>
        <p className="text-sm text-gray-500 mt-1">Create a bill for a customer</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

      {lastBill && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start justify-between">
          <div>
            <p className="text-green-800 font-medium text-sm">Bill created successfully!</p>
            <p className="text-green-700 text-xs mt-1">Total: {formatCurrency(lastBill.totalAmount)} · {lastBill.items?.length} item(s)</p>
          </div>
          <button onClick={() => setLastBill(null)} className="text-green-600 hover:text-green-800 text-xs">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medicine search */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" /> Search Medicines
          </h2>
          <input
            className="input mb-3"
            placeholder="Search by medicine name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No medicines in stock match your search.</p>
            ) : filtered.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                {/* Medicine thumbnail */}
                {item.imageUrl ? (
                  <img
                    src={`/uploads${item.imageUrl}`}
                    alt={item.generalName}
                    className="w-10 h-10 rounded object-cover flex-shrink-0 mr-2"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-200 flex-shrink-0 mr-2 flex items-center justify-center text-gray-400 text-xs">
                    No img
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.generalName}</p>
                  <p className="text-xs text-gray-500">{item.unitName} · Qty: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-primary-700">{formatCurrency(item.sellingPrice)}</span>
                  <button onClick={() => addToBill(item)} className="btn-primary py-1 px-3 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current bill */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Current Bill
          </h2>

          <div className="mb-3">
            <label className="label">Customer Name (optional)</label>
            <input className="input" placeholder="Walk-in customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>

          {billItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Add medicines from the left panel</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2">Medicine</th>
                    <th className="text-left pb-2">Price</th>
                    <th className="text-left pb-2">Qty</th>
                    <th className="text-left pb-2">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item) => (
                    <BillItem key={item.medicineId} item={item} onUpdate={updateQty} onRemove={removeItem} />
                  ))}
                </tbody>
              </table>

              <div className="border-t border-gray-200 mt-4 pt-4 flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="btn-primary w-full mt-4"
              >
                <Receipt className="w-4 h-4" />
                {processing ? 'Processing...' : 'Complete Sale'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
