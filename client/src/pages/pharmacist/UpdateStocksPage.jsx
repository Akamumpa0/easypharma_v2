import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, X, Package } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage, getUploadUrl } from '../../lib/utils.js';

const stockSchema = z.object({
  medicineId: z.string().uuid('Select a medicine'),
  quantity: z.coerce.number().int().min(0, 'Cannot be negative'),
  sellingPrice: z.string().min(1, 'Required'),
  buyingPrice: z.string().optional(),
  expiryDate: z.string().optional(),
});

function StockModal({ medicines, stockItem, onClose, onSaved }) {
  const isEdit = !!stockItem;
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: stockItem ? {
      medicineId: stockItem.medicineId,
      quantity: stockItem.quantity,
      sellingPrice: stockItem.sellingPrice,
      buyingPrice: stockItem.buyingPrice || '',
      expiryDate: stockItem.expiryDate ? stockItem.expiryDate.slice(0, 10) : '',
    } : {},
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await api.patch(`/stock/${stockItem.id}`, data);
      } else {
        await api.post('/stock', data);
      }
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Update Stock' : 'Add Stock'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Medicine</label>
            <select className="input" {...register('medicineId')} disabled={isEdit}>
              <option value="">Select medicine...</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>{m.generalName} ({m.unitName})</option>
              ))}
            </select>
            {errors.medicineId && <p className="text-red-500 text-xs mt-1">{errors.medicineId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" min="1" {...register('quantity')} />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Selling Price</label>
              <input type="number" step="0.01" className="input" placeholder="0.00" {...register('sellingPrice')} />
              {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Buying Price</label>
              <input type="number" step="0.01" className="input" placeholder="0.00" {...register('buyingPrice')} />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input type="date" className="input" {...register('expiryDate')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Stock' : 'Add to Stock'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UpdateStocksPage() {
  const [stock, setStock] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(undefined);

  const fetchData = useCallback(async () => {
    try {
      const [stockRes, medRes] = await Promise.all([
        api.get('/stock'),
        api.get('/medicines'),
      ]);
      setStock(stockRes.data);
      setMedicines(medRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = () => {
    setModal(undefined);
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Update Stocks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your pharmacy inventory</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(null)}>
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading stock...</div>
        ) : stock.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No stock items yet. Add your first medicine.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['', 'Medicine', 'Unit', 'Qty', 'Selling Price', 'Buying Price', 'Expiry', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {item.imageUrl ? (
                      <img
                        src={getUploadUrl(item.imageUrl)}
                        alt={item.generalName}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div>{item.generalName}</div>
                    {item.brandName && <div className="text-xs text-gray-400">{item.brandName}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.unitName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${item.quantity <= 10 ? 'badge-red' : item.quantity <= 30 ? 'badge-yellow' : 'badge-green'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(item.sellingPrice)}</td>
                  <td className="px-4 py-3 text-gray-500">{item.buyingPrice ? formatCurrency(item.buyingPrice) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal(item)} className="text-gray-400 hover:text-primary-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== undefined && (
        <StockModal medicines={medicines} stockItem={modal} onClose={() => setModal(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}
