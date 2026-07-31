import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Printer, Search } from 'lucide-react';
import api from '../../lib/api.js';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils.js';

export default function BillingHistoryPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetail, setBillDetail] = useState(null);

  const fetchBills = useCallback(async () => {
    try {
      const res = await api.get('/billing');
      setBills(res.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const viewBill = async (billId) => {
    setSelectedBill(billId);
    try {
      const res = await api.get(`/billing/${billId}`);
      setBillDetail(res.data);
    } catch (err) { alert(getErrorMessage(err)); }
  };

  const printReceipt = async (billId) => {
    try {
      const res = await api.get(`/receipts/${billId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to generate receipt PDF: ' + getErrorMessage(err));
    }
  };

  const filtered = bills.filter(b =>
    !search || b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    b.id.slice(0, 8).includes(search)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
        <p className="text-sm text-gray-500 mt-1">View all past sales and print receipts</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-4 rounded-md mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bills list */}
        <div className="lg:col-span-1 card overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9 text-sm" placeholder="Search customer or ID..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No bills found.</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
              {filtered.map(bill => (
                <button key={bill.id} onClick={() => viewBill(bill.id)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${selectedBill === bill.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{bill.customerName || 'Walk-in'}</p>
                      <p className="text-xs text-gray-400 font-mono">#{bill.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-700">{formatCurrency(bill.totalAmount)}</p>
                      <p className="text-xs text-gray-400">{formatDate(bill.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Receipt detail */}
        <div className="lg:col-span-2">
          {!billDetail ? (
            <div className="card p-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a bill to view the receipt</p>
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Receipt</h2>
                  <p className="text-sm text-gray-500 font-mono">
                    #{billDetail.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <button onClick={() => printReceipt(billDetail.id)} className="btn-primary">
                  <Printer className="w-4 h-4" />Print PDF
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium">{billDetail.customerName || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date & Time</p>
                  <p className="font-medium">{new Date(billDetail.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">Medicine</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Qty</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Unit Price</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {billDetail.items?.map(item => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2">{item.medicineName}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-3 text-right">
                <div className="text-xl font-bold">
                  Total: {formatCurrency(billDetail.totalAmount)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
