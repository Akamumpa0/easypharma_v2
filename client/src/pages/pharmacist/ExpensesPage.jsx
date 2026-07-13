import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils.js';

const EXPENSE_TYPES = ['rent','electricity','water','transport','internet',
  'repairs','salary','maintenance','supplies','marketing','insurance','miscellaneous'];

const schema = z.object({
  type: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1, 'Required'),
  expenseDate: z.string().min(1, 'Required'),
});

function ExpenseModal({ expense, onClose, onSaved }) {
  const isEdit = !!expense;
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: expense ? {
      ...expense,
      expenseDate: expense.expenseDate?.slice(0, 10),
    } : { expenseDate: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) await api.patch(`/expenses/${expense.id}`, data);
      else await api.post('/expenses', data);
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {serverError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{serverError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" {...register('type')}>
              {EXPENSE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" className="input" {...register('amount')} />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" {...register('expenseDate')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [exp, sum] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/summary'),
      ]);
      setExpenses(exp.data);
      setSummary(sum.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) { alert(getErrorMessage(err)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track all pharmacy operating expenses</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(null)}>
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {summary && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.grandTotal)}</p>
          </div>
          <div className="flex gap-3">
            {summary.byType.slice(0, 3).map(r => (
              <div key={r.type} className="text-center">
                <p className="text-xs text-gray-500 capitalize">{r.type}</p>
                <p className="text-sm font-semibold">{formatCurrency(r.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No expenses recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date', 'Type', 'Description', 'Amount', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3 capitalize"><span className="badge-blue">{e.type}</span></td>
                  <td className="px-4 py-3 text-gray-600">{e.description || '—'}</td>
                  <td className="px-4 py-3 font-medium text-red-600">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(e)} className="text-gray-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== undefined && (
        <ExpenseModal expense={modal} onClose={() => setModal(undefined)} onSaved={() => { setModal(undefined); fetchAll(); }} />
      )}
    </div>
  );
}
