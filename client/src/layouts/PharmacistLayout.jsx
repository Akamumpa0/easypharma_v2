import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, BarChart2, LogOut, Menu, Pill,
  DollarSign, AlertTriangle, Receipt, Search, Bell, User, Sun, Moon,
  History, Truck, RotateCcw, Activity, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const navItems = [
  { to: '/pharmacist/customer-service',   icon: ShoppingCart, label: 'Customer Service'    },
  { to: '/pharmacist/billing-history',    icon: History,      label: 'Billing History'     },
  { to: '/pharmacist/update-stocks',      icon: Package,      label: 'Update Stocks'       },
  { to: '/pharmacist/stock-movements',    icon: Activity,     label: 'Stock Movements'     },
  { to: '/pharmacist/stock-valuation',    icon: BarChart2,    label: 'Stock Valuation'     },
  { to: '/pharmacist/reconciliation',     icon: BarChart2,    label: 'Reconciliation'      },
  { to: '/pharmacist/profit-analytics',   icon: TrendingUp,   label: 'Profit Analytics'    },
  { to: '/pharmacist/view-reports',       icon: BarChart2,    label: 'Reports'             },
  { to: '/pharmacist/financial-dashboard',icon: DollarSign,   label: 'Financial Dashboard' },
  { to: '/pharmacist/reorder',            icon: AlertTriangle,label: 'Reorder'             },
  { to: '/pharmacist/purchase-orders',    icon: Truck,        label: 'Purchase Orders'     },
  { to: '/pharmacist/returns',            icon: RotateCcw,    label: 'Returns'             },
  { to: '/pharmacist/expenses',           icon: Receipt,      label: 'Expenses'            },
  { to: '/pharmacist/search',             icon: Search,       label: 'Advanced Search'     },
  { to: '/pharmacist/notifications',      icon: Bell,         label: 'Notifications'       },
  { to: '/pharmacist/profile',            icon: User,         label: 'My Profile'          },
];

export default function PharmacistLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-primary-800 text-white transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 p-5 border-b border-primary-700 flex-shrink-0">
          <Pill className="w-7 h-7 text-primary-200" />
          <span className="text-xl font-bold">EasyPharma</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-primary-700 flex items-center gap-3">
          <NavLink to="/pharmacist/profile" className="relative flex-shrink-0 group" onClick={() => setSidebarOpen(false)}>
            {user?.profilePhoto ? (
              <img src={`/uploads${user.profilePhoto}`} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-primary-500 shadow-sm group-hover:opacity-90 transition-opacity" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center border border-primary-600 text-white font-bold text-sm shadow-sm group-hover:bg-primary-600 transition-colors">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
          </NavLink>
          <div className="min-w-0 flex-1">
            <NavLink to="/pharmacist/profile" onClick={() => setSidebarOpen(false)} className="text-xs font-semibold text-white hover:underline truncate block">
              {user?.firstName} {user?.lastName}
            </NavLink>
            {user?.pharmacyName && (
              <div className="text-xs text-primary-300 truncate mb-1">{user.pharmacyName}</div>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-primary-200 hover:text-white transition-colors mt-1">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1 rounded hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">Pharmacist Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Toggle theme">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <NavLink to="/pharmacist/profile" className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
              {user?.profilePhoto ? (
                <img src={`/uploads${user.profilePhoto}`} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 pr-2 hidden sm:inline">{user?.firstName} {user?.lastName}</span>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
