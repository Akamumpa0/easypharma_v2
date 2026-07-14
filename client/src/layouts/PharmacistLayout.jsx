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

        <div className="flex-shrink-0 p-4 border-t border-primary-700">
          <div className="text-xs text-primary-300 mb-1">
            {user?.firstName} {user?.lastName}
          </div>
          {user?.pharmacyName && (
            <div className="text-xs text-primary-400 mb-3">{user.pharmacyName}</div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-primary-200 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Pharmacist Panel</h1>
          <button onClick={toggleTheme} className="ml-auto p-2 rounded-full hover:bg-gray-100 text-gray-500" title="Toggle theme">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
