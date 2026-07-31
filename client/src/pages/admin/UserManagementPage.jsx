import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage, formatDate } from '../../lib/utils.js';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'pharmacist']),
  pharmacyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional().or(z.literal(''))
    .refine(val => {
      if (!val) return true;
      const clean = val.replace(/[^\d]/g, '');
      return /^(?:256|0)?[1-9]\d{8}$/.test(clean);
    }, {
      message: 'Must be a valid Ugandan number (e.g. 07XXXXXXXX or 256XXXXXXXX)',
    }),
  isActive: z.boolean().optional(),
});

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: user ? {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      pharmacyName: user.pharmacyName || '',
      address: user.address || '',
      phone: user.phone || '',
      isActive: user.isActive,
    } : { role: 'pharmacist', isActive: false },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        const payload = { ...data };
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${user.id}`, payload);
      } else {
        await api.post('/users', data);
      }
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input className="input" {...register('firstName')} />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" {...register('lastName')} />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email')} disabled={isEdit} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input type="password" className="input" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input" {...register('role')}>
                <option value="pharmacist">Pharmacist</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...register('phone')} placeholder="e.g. 0772123456" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Pharmacy Name</label>
            <input className="input" {...register('pharmacyName')} />
          </div>

          <div>
            <label className="label">Address</label>
            <input className="input" {...register('address')} />
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register('isActive')} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active account</label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalUser, setModalUser] = useState(undefined); // undefined = closed, null = create, obj = edit

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleSaved = () => {
    setModalUser(undefined);
    fetchUsers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage pharmacist and admin accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setModalUser(null)}>
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Role', 'Pharmacy', 'Status', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={u.role === 'admin' ? 'badge-blue' : 'badge-yellow'}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.pharmacyName || '—'}</td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Active</span>
                      : <span className="badge-red flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Inactive</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModalUser(u)} className="text-gray-400 hover:text-primary-600 transition-colors">
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

      {modalUser !== undefined && (
        <UserModal user={modalUser} onClose={() => setModalUser(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}
