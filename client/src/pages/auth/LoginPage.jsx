import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pill, Eye, EyeOff, Sparkles, Shield, UserCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getErrorMessage } from '../../lib/utils.js';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const handleQuickLogin = async (email, password) => {
    setValue('email', email);
    setValue('password', password);
    setServerError('');
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin/users');
      else navigate('/pharmacist/customer-service');
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'admin') navigate('/admin/users');
      else navigate('/pharmacist/customer-service');
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
          <p className="text-primary-200 mt-1">Pharmacy Management System</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 mb-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold tracking-wide uppercase text-primary-100">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Prebuilt Demo Credentials</span>
          </div>
          <p className="text-xs text-primary-200 mb-4 leading-relaxed">
            Experience full capabilities immediately. Click below to auto-populate credentials and sign in directly:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@easypharma.com', 'Admin@123')}
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/30 hover:border-emerald-400/60 rounded-lg p-3 text-left transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-sm">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Admin Portal</span>
                </div>
                <div className="text-[11px] text-emerald-200/80 mt-0.5 font-mono">admin@easypharma.com</div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-300 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('pharmacist@easypharma.com', 'Pharma@123')}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-400/30 hover:border-blue-400/60 rounded-lg p-3 text-left transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-blue-300 text-sm">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span>Pharmacist POS</span>
                </div>
                <div className="text-[11px] text-blue-200/80 mt-0.5 font-mono">pharmacist@easypharma.com</div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-300 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/reset-password" className="text-sm text-primary-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
