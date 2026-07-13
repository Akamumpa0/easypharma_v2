import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw, AlertTriangle, Package, Clock, ShieldAlert } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';

const TYPE_CONFIG = {
  low_stock:    { icon: Package,      color: 'text-orange-600', bg: 'bg-orange-50',  label: 'Low Stock'    },
  near_expiry:  { icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50',  label: 'Near Expiry'  },
  expired:      { icon: AlertTriangle,color: 'text-red-600',    bg: 'bg-red-50',     label: 'Expired'      },
  new_purchase: { icon: Package,      color: 'text-green-600',  bg: 'bg-green-50',   label: 'Purchase'     },
  large_sale:   { icon: Bell,         color: 'text-blue-600',   bg: 'bg-blue-50',    label: 'Large Sale'   },
  return:       { icon: RefreshCw,    color: 'text-purple-600', bg: 'bg-purple-50',  label: 'Return'       },
  login_alert:  { icon: ShieldAlert,  color: 'text-red-600',    bg: 'bg-red-50',     label: 'Login Alert'  },
  system:       { icon: Bell,         color: 'text-gray-600',   bg: 'bg-gray-50',    label: 'System'       },
};

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.system;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) { alert(getErrorMessage(err)); }
  };

  const checkStock = async () => {
    setChecking(true);
    try {
      const res = await api.post('/notifications/check-stock');
      alert(`Checked ${res.data.checked} items. ${res.data.alertsCreated} new alerts.`);
      fetchNotifications();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Low stock, expiry, and system alerts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkStock} disabled={checking} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Check Stock'}
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-primary">
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400 mt-1">Click "Check Stock" to scan for alerts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = getConfig(n.type);
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`card p-4 flex items-start gap-4 cursor-pointer transition-opacity ${n.isRead ? 'opacity-60' : 'border-l-4 border-l-primary-500'}`}
              >
                <div className={`p-2 rounded-full ${cfg.bg} flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium text-sm ${n.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge text-xs ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      {!n.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                    {!n.isRead && <span className="ml-2 text-primary-600">Click to mark as read</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
