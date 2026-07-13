import React, { useState, useEffect, useCallback } from 'react';
import { Server, Database, HardDrive, Users, Download, RefreshCw, Plus, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage, formatDate } from '../../lib/utils.js';

function StatusBadge({ status }) {
  return status === 'ok' || status === 'operational'
    ? <span className="flex items-center gap-1 text-green-700 text-sm"><CheckCircle className="w-4 h-4" />Operational</span>
    : <span className="flex items-center gap-1 text-red-700 text-sm"><XCircle className="w-4 h-4" />Error</span>;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [h, b] = await Promise.all([api.get('/system/health'), api.get('/system/backups')]);
      setHealth(h.data);
      setBackups(b.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await api.post('/system/backup');
      setBackups(prev => [res.data, ...prev]);
      alert('Backup created successfully!');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading system status...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor system status, backups and performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary"><RefreshCw className="w-4 h-4" />Refresh</button>
          <button onClick={createBackup} disabled={creating} className="btn-primary">
            <Plus className="w-4 h-4" />{creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Server,    label: 'API Server',  status: health?.services?.api?.status     || 'ok'    },
          { icon: Database,  label: 'Database',    status: health?.services?.database?.status || 'ok', sub: `${health?.services?.database?.latencyMs || 0}ms` },
          { icon: HardDrive, label: 'Storage',     status: health?.services?.storage?.status  || 'ok', sub: `${health?.services?.storage?.usedMB || 0} MB used` },
        ].map(({ icon: Icon, label, status, sub }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-full"><Icon className="w-5 h-5 text-gray-600" /></div>
              <span className="font-medium">{label}</span>
            </div>
            <StatusBadge status={status} />
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Users',   value: health?.metrics?.totalUsers  || 0 },
          { icon: Users, label: 'Active (24h)',   value: health?.metrics?.activeUsers || 0 },
          { icon: HardDrive, label: 'Backups',    value: backups.length },
          { icon: Server, label: 'Uptime',        value: 'Running' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Backups */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Backup History</h2>
        </div>
        {backups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No backups yet. Create your first backup above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Filename', 'Size', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.filename}</td>
                  <td className="px-4 py-3 text-gray-600">{b.fileSize ? `${(b.fileSize / 1024).toFixed(1)} KB` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={b.status === 'completed' ? 'badge-green' : 'badge-red'}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <a href={`/uploads/backups/${b.filename}`} download className="btn-secondary py-1 px-2 text-xs">
                      <Download className="w-3 h-3" />Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
