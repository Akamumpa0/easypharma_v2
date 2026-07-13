import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, Copy, Check } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage, formatDate } from '../../lib/utils.js';

const apiUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  subscription: z.enum(['free_subscription', 'paid_subscription']),
});

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-gray-400 hover:text-primary-600 transition-colors ml-1">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ApiUserModal({ apiUser, onClose, onSaved }) {
  const isEdit = !!apiUser;
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(apiUserSchema),
    defaultValues: apiUser ? {
      name: apiUser.name,
      email: apiUser.email,
      subscription: apiUser.subscription,
    } : { subscription: 'free_subscription' },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await api.patch(`/v1/api-users/${apiUser.id}`, data);
      } else {
        await api.post('/v1/api-users', data);
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
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit API User' : 'Create API User'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name / Organisation</label>
            <input className="input" {...register('name')} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email')} disabled={isEdit} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Subscription</label>
            <select className="input" {...register('subscription')}>
              <option value="free_subscription">Free Subscription</option>
              <option value="paid_subscription">Paid Subscription</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create API User'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ApiManagementPage() {
  const [apiUsers, setApiUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(undefined);

  const fetchApiUsers = useCallback(async () => {
    try {
      const res = await api.get('/v1/api-users');
      setApiUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApiUsers(); }, [fetchApiUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this API user? Their API key will stop working immediately.')) return;
    try {
      await api.delete(`/v1/api-users/${id}`);
      setApiUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage external API access and subscriptions</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(null)}>
          <Plus className="w-4 h-4" /> Add API User
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : apiUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No API users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'API Key', 'Subscription', 'Status', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apiUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {u.apiKey.slice(0, 8)}...
                      </span>
                      <CopyButton text={u.apiKey} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.subscription === 'paid_subscription' ? 'badge-green' : 'badge-yellow'}>
                      {u.subscription === 'paid_subscription' ? 'Paid' : 'Free'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(u)} className="text-gray-400 hover:text-primary-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== undefined && (
        <ApiUserModal apiUser={modal} onClose={() => setModal(undefined)} onSaved={() => { setModal(undefined); fetchApiUsers(); }} />
      )}
    </div>
  );
}
