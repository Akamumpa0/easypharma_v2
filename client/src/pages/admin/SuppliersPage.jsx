import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal(''))
    .refine(val => {
      if (!val) return true;
      const clean = val.replace(/[^\d]/g, '');
      return /^(?:256|0)?[1-9]\d{8}$/.test(clean);
    }, {
      message: 'Invalid Ugandan phone format',
    }),
  address: z.string().optional(),
  tin: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
});

function SupplierModal({ supplier, onClose, onSaved }) {
  const isEdit = !!supplier;
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: supplier || { leadTimeDays: 7 },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) await api.patch(`/suppliers/${supplier.id}`, data);
      else await api.post('/suppliers', data);
      onSaved();
    } catch (err) { setServerError(getErrorMessage(err)); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {serverError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{serverError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Company Name *</label>
            <input className="input" {...register('name')} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input type="email" className="input" {...register('email')} /></div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...register('phone')} placeholder="e.g. 0772123456" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>
          <div><label className="label">Address</label><input className="input" {...register('address')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">TIN</label><input className="input" {...register('tin')} /></div>
            <div><label className="label">Lead Time (days)</label>
              <input type="number" className="input" {...register('leadTimeDays')} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save' : 'Add Supplier'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(undefined);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) { alert(getErrorMessage(err)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage medicine suppliers and vendors</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(null)}>
          <Plus className="w-4 h-4" />Add Supplier
        </button>
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}
      <div className="card overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div>
          : suppliers.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No suppliers yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Name', 'Email', 'Phone', 'TIN', 'Lead Time', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.tin || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.leadTimeDays} days</td>
                    <td className="px-4 py-3">
                      <span className={s.isActive ? 'badge-green' : 'badge-red'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModal(s)} className="text-gray-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      {modal !== undefined && (
        <SupplierModal supplier={modal} onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchSuppliers(); }} />
      )}
    </div>
  );
}
