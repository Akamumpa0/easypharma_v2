import React, { useState } from 'react';
import { Download, Upload, FileText, Table, CheckCircle } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';

function ExportCard({ title, description, icon: Icon, onCSV, onExcel, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary-50 rounded"><Icon className="w-5 h-5 text-primary-600" /></div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCSV} disabled={loading} className="btn-secondary flex-1 text-xs">
          <FileText className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={onExcel} disabled={loading} className="btn-primary flex-1 text-xs">
          <Table className="w-3.5 h-3.5" /> Excel
        </button>
      </div>
    </div>
  );
}

export default function ImportExportPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const exportData = async (endpoint, format, filename) => {
    setExportLoading(true);
    try {
      const res = await api.get(`/export/${endpoint}?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['text/csv', 'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setImportError('Only CSV and Excel files are supported');
      return;
    }

    setImporting(true); setImportError(''); setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/import/medicines', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
    } catch (err) {
      setImportError(getErrorMessage(err));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import & Export</h1>
        <p className="text-sm text-gray-500 mt-1">Bulk import medicines or export data to CSV/Excel</p>
      </div>

      {/* Export */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Export Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExportCard title="Medicines Catalog" description="Full medicine catalog with all details"
            icon={Table} loading={exportLoading}
            onCSV={() => exportData('medicines', 'csv', 'medicines')}
            onExcel={() => exportData('medicines', 'excel', 'medicines')} />
          <ExportCard title="Stock Inventory" description="Current stock levels and pricing"
            icon={Download} loading={exportLoading}
            onCSV={() => exportData('stock', 'csv', 'stock')}
            onExcel={() => exportData('stock', 'excel', 'stock')} />
          <ExportCard title="Sales Records" description="All sales transactions and line items"
            icon={FileText} loading={exportLoading}
            onCSV={() => exportData('sales', 'csv', 'sales')}
            onExcel={() => exportData('sales', 'excel', 'sales')} />
          <ExportCard title="Expenses" description="All expense records by type"
            icon={FileText} loading={exportLoading}
            onCSV={() => exportData('expenses', 'csv', 'expenses')}
            onExcel={() => exportData('expenses', 'excel', 'expenses')} />
        </div>
      </section>

      {/* Import */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Import Medicines</h2>
        <div className="card p-6">
          <div className="mb-4">
            <h3 className="font-medium mb-2">File Format Requirements</h3>
            <div className="bg-gray-50 rounded p-3 text-sm font-mono text-gray-700 space-y-1">
              <p>Required column: <strong>General Name</strong></p>
              <p>Optional columns: Brand Name, Scientific Name, Manufacturer, Category,</p>
              <p className="pl-18">Unit Name, Description, Reorder Level, Reorder Quantity</p>
            </div>
          </div>

          <div className="mb-4">
            <a href="/api/export/medicines?format=csv" className="btn-secondary text-sm" download>
              <Download className="w-4 h-4" /> Download Template CSV
            </a>
          </div>

          {importError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{importError}</div>}

          {importResult && (
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <CheckCircle className="w-4 h-4" /> Import Complete
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>Total rows processed: {importResult.total}</p>
                <p>Medicines created: {importResult.created}</p>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-700 font-medium">Errors ({importResult.errors.length}):</p>
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-red-600 text-xs">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${importing ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'}`}>
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{importing ? 'Importing...' : 'Click to upload or drag & drop'}</p>
            <p className="text-xs text-gray-400 mt-1">CSV or Excel (.xlsx)</p>
            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </section>
    </div>
  );
}
