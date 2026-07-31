import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Users, Key, LogOut, Menu, Pill, Sun, Moon,
  Database, Upload, Building2, Search, Activity, Bell, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getUploadUrl } from '../lib/utils.js';

const navItems = [
  { to: '/admin/users',          icon: Users,     label: 'User Management'  },
  { to: '/admin/medicines',      icon: Pill,      label: 'Medicines'        },
  { to: '/admin/suppliers',      icon: Building2, label: 'Suppliers'        },
  { to: '/admin/import-export',  icon: Upload,    label: 'Import / Export'  },
  { to: '/admin/api-management', icon: Key,       label: 'API Management'   },
  { to: '/admin/activity-logs',  icon: Activity,  label: 'Activity Logs'    },
  { to: '/admin/system-health',  icon: Database,  label: 'System Health'    },
  { to: '/admin/search',         icon: Search,    label: 'Advanced Search'  },
  { to: '/admin/notifications',  icon: Bell,      label: 'Notifications'    },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded">
        Skip to main content
      </a>

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        role="navigation"
        aria-label="Admin navigation"
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-primary-800 text-white transform transition-transform duration-200
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center gap-3 p-6 border-b border-primary-700">
          <Pill className="w-7 h-7 text-primary-200" />
          <span className="text-xl font-bold">EasyPharma</span>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700">
          <NavLink to="/admin/profile" className="flex items-center gap-3 text-sm text-primary-200 hover:text-white transition-colors mb-3">
            {user?.profilePhoto ? (
              <img src={getUploadUrl(user.profilePhoto)} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-primary-500 shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center border border-primary-600 text-white font-bold text-sm shadow-sm flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <div className="min-w-0 flex-1 truncate">
              <div className="font-semibold text-white truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-primary-400">Admin</div>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-primary-200 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Toggle theme">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <NavLink to="/admin/profile" className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
              {user?.profilePhoto ? (
                <img src={getUploadUrl(user.profilePhoto)} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 pr-2 hidden sm:inline">{user?.firstName} {user?.lastName}</span>
            </NavLink>
          </div>
        </header>
        <main id="main-content" role="main" className="flex-1 overflow-auto p-6" aria-label="Admin main content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
