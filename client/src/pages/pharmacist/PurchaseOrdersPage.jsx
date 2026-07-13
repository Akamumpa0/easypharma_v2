import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, ChevronRight, Package } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils.js';

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      class: 'badge-yellow' },
  pending:    { label: 'Pending',    class: 'badge-blue'   },
  approved:   { label: 'Approved',   class: 'badge-green'  },
  ordered:    { label: 'Ordered',    class: 'badge-purple' },
  received:   { label: 'Received',   class: 'badge-green'  },
  cancelled:  { label: 'Cancelled',  class: 'badge-red'    },
};

const STATUS_FLOW = {
  draft:    'pending',
  pending:  'approved',
  approved: 'ordered',
  ordered:  'received',
};

const poSchema = z.object({
  supplierId: z.string().uuid('Select a supplier'),
  notes: z.string().optional(),
});

function CreatePOModal({ suppliers, medicines, onClose, onSaved }) {
  const [items, setItems] = useState([{ medicineId: '', quantity: 1, unitPrice: '' }]);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(poSchema) });

  const addItem   = () => setItems(prev => [...prev, { medicineId: '', quantity: 1, unitPrice: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const total = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseInt(i.quantity) || 0), 0);

  const onSubmit = async (data) => {
    setServerError('');
    const validItems = items.filter(i => i.medicineId && i.quantity > 0 && i.unitPrice);
    if (validItems.length === 0) { setServerError('Add at least one item'); return; }
    try {
      await api.post('/purchase-orders', { ...data, items: validItems });
      onSaved();
    } catch (err) { setServerError(getErrorMessage(err)); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Create Purchase Order</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {serverError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{serverError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier *</label>
              <select className="input" {...register('supplierId')}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" {...register('notes')} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Order Items</label>
              <button type="button" onClick={addItem} className="btn-secondary py-1 px-2 text-xs"><Plus className="w-3 h-3" />Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select className="input text-sm" value={item.medicineId}
                      onChange={e => updateItem(i, 'medicineId', e.target.value)}>
                      <option value="">Select medicine...</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.generalName}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" className="input text-sm" placeholder="Qty" min="1"
                      value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" className="input text-sm" placeholder="Unit price"
                      value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                  </div>
                  <div className="col-span-1 text-right text-xs text-gray-500">
                    {formatCurrency((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0))}
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-sm font-semibold">Total: {formatCurrency(total)}</div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [o, s, m] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/suppliers'),
        api.get('/medicines'),
      ]);
      setOrders(o.data);
      setSuppliers(s.data);
      setMedicines(m.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const advanceStatus = async (order) => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    const action = next === 'received' ? 'Mark as Received (this will update stock)' : `Move to ${next}`;
    if (!window.confirm(`${action}?`)) return;
    try {
      await api.patch(`/purchase-orders/${order.id}/status`, { status: next });
      fetchAll();
    } catch (err) { alert(getErrorMessage(err)); }
  };

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status: 'cancelled' });
      fetchAll();
    } catch (err) { alert(getErrorMessage(err)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier purchase orders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />New Order
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No purchase orders yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Order #', 'Supplier', 'Total', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => {
                const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.draft;
                const next = STATUS_FLOW[o.status];
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary-700">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {suppliers.find(s => s.id === o.supplierId)?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={sc.class}>{sc.label}</span></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {next && (
                          <button onClick={() => advanceStatus(o)}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800">
                            <ChevronRight className="w-3 h-3" />
                            {next === 'received' ? 'Receive' : next.charAt(0).toUpperCase() + next.slice(1)}
                          </button>
                        )}
                        {!['received', 'cancelled'].includes(o.status) && (
                          <button onClick={() => cancelOrder(o.id)} className="text-xs text-red-500 hover:text-red-700">
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreatePOModal
          suppliers={suppliers}
          medicines={medicines}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchAll(); }}
        />
      )}
    </div>
  );
}
