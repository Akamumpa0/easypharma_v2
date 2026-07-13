import React, { useState } from 'react';
import { Printer, X, Download } from 'lucide-react';

export default function LabelPrinter({ labels, onClose }) {
  const [copies, setCopies] = useState(1);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    const html = generatePrintHTML(labels, copies);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Labels
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b flex items-center gap-4">
          <label className="text-sm font-medium">Copies per label:</label>
          <input
            type="number"
            min="1"
            max="100"
            value={copies}
            onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
            className="input w-20"
          />
          <button onClick={handlePrint} className="btn-primary ml-auto">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button onClick={handleDownload} className="btn-secondary">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {labels.map((label, index) => (
              Array.from({ length: copies }).map((_, copyIndex) => (
                <LabelCard key={`${index}-${copyIndex}`} label={label} />
              ))
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelCard({ label }) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded p-3 print:border-black">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">{label.generalName}</h3>
        {label.brandName && (
          <p className="text-xs text-gray-600">{label.brandName}</p>
        )}
      </div>

      {/* Barcode */}
      {label.barcode && (
        <div className="flex justify-center mb-2">
          <img
            src={`/api/barcodes/image/${label.barcode}?width=2&height=40`}
            alt="Barcode"
            className="max-w-full h-auto"
          />
        </div>
      )}

      {/* QR Code */}
      {label.qrCode && (
        <div className="flex justify-center mb-2">
          <img src={label.qrCode} alt="QR Code" className="w-20 h-20" />
        </div>
      )}

      <div className="text-xs text-gray-700 space-y-1">
        <p><strong>Code:</strong> {label.medicineCode}</p>
        {label.manufacturer && <p><strong>Mfr:</strong> {label.manufacturer}</p>}
        {label.sellingPrice && <p><strong>Price:</strong> ${label.sellingPrice}</p>}
        {label.expiryDate && (
          <p><strong>Exp:</strong> {new Date(label.expiryDate).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}

function generatePrintHTML(labels, copies) {
  const labelHTML = labels.map((label) =>
    Array.from({ length: copies }).map(() => `
      <div style="border: 2px solid black; padding: 12px; page-break-inside: avoid; margin-bottom: 10px; width: 250px; float: left; margin-right: 10px;">
        <div style="text-align: center; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${label.generalName}</h3>
          ${label.brandName ? `<p style="margin: 4px 0; font-size: 11px; color: #666;">${label.brandName}</p>` : ''}
        </div>
        ${label.barcode ? `<div style="text-align: center; margin-bottom: 8px;"><img src="/api/barcodes/image/${label.barcode}?width=2&height=40" style="max-width: 100%;"/></div>` : ''}
        ${label.qrCode ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${label.qrCode}" style="width: 80px; height: 80px;"/></div>` : ''}
        <div style="font-size: 10px;">
          <p style="margin: 2px 0;"><strong>Code:</strong> ${label.medicineCode}</p>
          ${label.manufacturer ? `<p style="margin: 2px 0;"><strong>Mfr:</strong> ${label.manufacturer}</p>` : ''}
          ${label.sellingPrice ? `<p style="margin: 2px 0;"><strong>Price:</strong> $${label.sellingPrice}</p>` : ''}
          ${label.expiryDate ? `<p style="margin: 2px 0;"><strong>Exp:</strong> ${new Date(label.expiryDate).toLocaleDateString()}</p>` : ''}
        </div>
      </div>
    `).join('')
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Medicine Labels</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${labelHTML}
      </body>
    </html>
  `;
}
