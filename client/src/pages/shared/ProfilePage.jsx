import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Key, Clock, Camera } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage, getUploadUrl } from '../../lib/utils.js';
import ImageUpload from '../../components/ImageUpload.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().or(z.literal(''))
    .refine(val => {
      if (!val) return true;
      const clean = val.replace(/[^\d]/g, '');
      return /^(?:256|0)?[1-9]\d{8}$/.test(clean);
    }, {
      message: 'Must be a valid Ugandan number (e.g. 07XXXXXXXX or 256XXXXXXXX)',
    }),
  pharmacyName: z.string().optional(),
  address: z.string().optional(),
  tin: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/[0-9]/, 'Needs number')
    .regex(/[^A-Za-z0-9]/, 'Needs special character'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors, isSubmitting: profileSubmitting }, reset } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const { register: regPwd, handleSubmit: handlePwd, formState: { errors: pwdErrors, isSubmitting: pwdSubmitting }, reset: resetPwd } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    api.get('/profile').then(res => {
      setProfile(res.data);
      reset(res.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [reset]);

  const onProfileSubmit = async (data) => {
    setProfileError(''); setProfileSuccess('');
    try {
      const res = await api.patch('/profile', data);
      setProfile(prev => ({ ...prev, ...res.data }));
      updateUser(res.data);
      setProfileSuccess('Profile updated successfully');
    } catch (err) { setProfileError(getErrorMessage(err)); }
  };

  const onPasswordSubmit = async (data) => {
    setPasswordError(''); setPasswordSuccess('');
    try {
      await api.post('/profile/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess('Password changed successfully');
      resetPwd();
    } catch (err) { setPasswordError(getErrorMessage(err)); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* Profile header */}
      <div className="card p-6 mb-6 flex items-center gap-6">
        <div className="relative">
          {profile?.profilePhoto ? (
            <img src={getUploadUrl(profile.profilePhoto)} alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </span>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{profile?.firstName} {profile?.lastName}</h2>
          <p className="text-gray-500">{profile?.email}</p>
          <span className={`badge mt-1 ${profile?.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
            {profile?.role}
          </span>
        </div>
        <div className="ml-auto text-right text-sm text-gray-500">
          {profile?.lastLogin && <p>Last login: {new Date(profile.lastLogin).toLocaleString()}</p>}
          {profile?.passwordChangedAt && <p>Password changed: {new Date(profile.passwordChangedAt).toLocaleDateString()}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'profile', icon: User,   label: 'Profile Info'   },
          { id: 'password',icon: Key,    label: 'Change Password'},
          { id: 'photo',   icon: Camera, label: 'Profile Photo'  },
          { id: 'activity',icon: Clock,  label: 'Recent Activity'},
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Info Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          {profileSuccess && <div className="bg-green-50 text-green-700 text-sm p-3 rounded mb-4">{profileSuccess}</div>}
          {profileError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{profileError}</div>}
          <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input" {...regProfile('firstName')} />
                {profileErrors.firstName && <p className="text-red-500 text-xs mt-1">Required</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" {...regProfile('lastName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input className="input" {...regProfile('phone')} placeholder="e.g. 0772123456" />
                {profileErrors.phone && <p className="text-red-500 text-xs mt-1">{profileErrors.phone.message}</p>}
              </div>
              <div>
                <label className="label">TIN</label>
                <input className="input" {...regProfile('tin')} />
              </div>
            </div>
            <div>
              <label className="label">Pharmacy Name</label>
              <input className="input" {...regProfile('pharmacyName')} />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="input" rows={2} {...regProfile('address')} />
            </div>
            <button type="submit" disabled={profileSubmitting} className="btn-primary">
              {profileSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card p-6">
          {passwordSuccess && <div className="bg-green-50 text-green-700 text-sm p-3 rounded mb-4">{passwordSuccess}</div>}
          {passwordError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{passwordError}</div>}
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
            Password must be at least 8 characters with an uppercase letter, a number, and a special character.
          </div>
          <form onSubmit={handlePwd(onPasswordSubmit)} className="space-y-4">
            {[
              { name: 'currentPassword', label: 'Current Password' },
              { name: 'newPassword',     label: 'New Password'     },
              { name: 'confirmPassword', label: 'Confirm Password' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className="label">{label}</label>
                <input type="password" className="input" {...regPwd(name)} />
                {pwdErrors[name] && <p className="text-red-500 text-xs mt-1">{pwdErrors[name].message}</p>}
              </div>
            ))}
            <button type="submit" disabled={pwdSubmitting} className="btn-primary">
              {pwdSubmitting ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Photo Tab */}
      {activeTab === 'photo' && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Profile Photo</h3>
          <ImageUpload
            currentImage={profile?.profilePhoto}
            type="profile"
            onUpload={(data) => {
              setProfile(prev => ({ ...prev, profilePhoto: data.profilePhoto }));
              updateUser({ profilePhoto: data.profilePhoto });
            }}
            onDelete={() => {
              setProfile(prev => ({ ...prev, profilePhoto: null }));
              updateUser({ profilePhoto: null });
            }}
          />
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="card overflow-hidden">
          {!profile?.recentActivity?.length ? (
            <div className="p-8 text-center text-gray-500">No recent activity</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Action', 'Module', 'Description', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profile.recentActivity.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="badge-blue text-xs">{log.activityType}</span></td>
                    <td className="px-4 py-3 capitalize text-gray-600 text-xs">{log.module}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{log.description || log.action}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
