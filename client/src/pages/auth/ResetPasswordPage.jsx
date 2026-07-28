import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pill, CheckCircle, ShieldAlert } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await api.post('/auth/reset-password', { email: data.email, newPassword: data.newPassword });
      setSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">EasyPharma</h1>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Password Updated</h2>
              <p className="text-gray-500 text-sm mb-6">Your password has been reset successfully.</p>
              <Link to="/login" className="btn-primary">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email and choose a new password.</p>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold block text-sm mb-0.5 text-amber-900">Security Policy Notice</span>
                  For compliance and system security, automated self-service password recovery is restricted. If you have lost access, please ask your <strong>System Administrator</strong> to update your credentials via the Admin Management Console.
                </div>
              </div>

              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@example.com" {...register('email')} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" className="input" placeholder="••••••••" {...register('newPassword')} />
                  {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" className="input" placeholder="••••••••" {...register('confirmPassword')} />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? 'Updating...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:underline">Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
