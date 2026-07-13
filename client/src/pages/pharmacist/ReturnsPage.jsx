import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, RotateCcw } from 'lucide-react';
import api from '../../lib/api.js';
import { formatDate, getErrorMessage } from '../../lib/utils.js';

const returnSchema = z.object({
  medicineId: z.string().uuid('Select a medicine'),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1),
  reasonDetail: z.string().optional(),
  returnedBy: z.string().optional(),
});

const damagedSchema = z.object({
  medicineId: z.string().uuid('Select a medicine'),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1),
  reasonDetail: z.string().optional(),
});

function ReturnModal({ title, type, medicines, onClose, onSaved }) {
  const schema = type === 'damaged' ? damagedSchema : returnSchema;
  const reasons = type === 'damaged'
    ? ['broken','wet','expired','packaging_damage','contaminated','other']
    : ['expired','damaged','wrong_item','excess','quality_issue','other'];
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await api.post(`/returns/${type}`, data);
      onSaved();
    } catch (err) { setServerError(getErrorMessage(err)); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {serverError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{serverError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Medicine *</label>
            <select className="input" {...register('medicineId')}>
              <option value="">Select...</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.generalName}</option>)}
            </select>
            {errors.medicineId && <p className="text-red-500 text-xs mt-1">{errors.medicineId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity *</label>
              <input type="number" className="input" min="1" {...register('quantity')} />
            </div>
            <div>
              <label className="label">Reason *</label>
              <select className="input" {...register('reason')}>
                <option value="">Select...</option>
                {reasons.map(r => <option key={r} value={r} className="capitalize">{r.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Additional Details</label>
            <textarea className="input" rows={2} {...register('reasonDetail')} />
          </div>
          {type === 'customer' && (
            <div>
              <label className="label">Returned By</label>
              <input className="input" {...register('returnedBy')} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Recording...' : 'Record Return'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState('customer');
  const [records, setRecords] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ret, meds] = await Promise.all([
        api.get(`/returns/${activeTab}`),
        api.get('/medicines'),
      ]);
      setRecords(ret.data);
      setMedicines(meds.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TABS = [
    { id: 'customer', label: 'Customer Returns' },
    { id: 'supplier', label: 'Supplier Returns' },
    { id: 'damaged',  label: 'Damaged'           },
    { id: 'disposal', label: 'Disposals'          },
  ];

  const MODAL_CONFIG = {
    customer: { title: 'Record Customer Return', type: 'customer' },
    supplier: { title: 'Record Supplier Return', type: 'supplier' },
    damaged:  { title: 'Record Damaged Medicines', type: 'damaged' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns & Adjustments</h1>
          <p className="text-sm text-gray-500 mt-1">Customer returns, supplier returns, damaged medicines and disposals</p>
        </div>
        {activeTab !== 'disposal' && (
          <button className="btn-primary" onClick={() => setModal(activeTab)}>
            <Plus className="w-4 h-4" />Record
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <RotateCcw className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No records found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date', 'Medicine', 'Quantity', 'Reason', 'Details'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt || r.disposalDate)}</td>
                  <td className="px-4 py-3 font-medium">{r.medicineId}</td>
                  <td className="px-4 py-3">{r.quantity}</td>
                  <td className="px-4 py-3"><span className="badge-yellow capitalize">{r.reason?.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-gray-500">{r.reasonDetail || r.returnedBy || r.witness || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && MODAL_CONFIG[modal] && (
        <ReturnModal
          title={MODAL_CONFIG[modal].title}
          type={MODAL_CONFIG[modal].type}
          medicines={medicines}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}
