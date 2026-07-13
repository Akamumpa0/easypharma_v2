import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, Barcode, Printer, QrCode, Scan, ArrowLeftRight } from 'lucide-react';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';
import BarcodeScanner from '../../components/BarcodeScanner.jsx';
import LabelPrinter from '../../components/LabelPrinter.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import UnitConverter from '../../components/UnitConverter.jsx';

const medicineSchema = z.object({
  generalName: z.string().min(1, 'Required'),
  scientificName: z.string().optional(),
  brandName: z.string().optional(),
  manufacturer: z.string().optional(),
  unitName: z.string().min(1, 'Required'),
  unitType: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  isControlled: z.boolean().optional(),
  requiresPrescription: z.boolean().optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  reorderQuantity: z.coerce.number().int().min(0).optional(),
});

function MedicineModal({ medicine, onClose, onSaved }) {
  const isEdit = !!medicine;
  const [serverError, setServerError] = useState('');
  const [imageUpdated, setImageUpdated] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(medicineSchema),
    defaultValues: medicine || { unitType: 'tablet', reorderLevel: 10, reorderQuantity: 50 },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await api.patch(`/medicines/${medicine.id}`, data);
      } else {
        await api.post('/medicines', data);
      }
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const handleImageUpload = () => {
    setImageUpdated(true);
  };

  const handleImageDelete = () => {
    setImageUpdated(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Medicine' : 'Add Medicine'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1">
            <label className="label">Medicine Image</label>
            {isEdit && (
              <ImageUpload
                currentImage={medicine.imageUrl}
                type="medicine"
                entityId={medicine.id}
                onUpload={handleImageUpload}
                onDelete={handleImageDelete}
              />
            )}
            {!isEdit && (
              <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded">
                Save the medicine first to upload an image
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">General Name *</label>
                <input className="input" {...register('generalName')} />
                {errors.generalName && <p className="text-red-500 text-xs mt-1">{errors.generalName.message}</p>}
              </div>
              <div>
                <label className="label">Brand Name</label>
                <input className="input" {...register('brandName')} />
              </div>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Scientific Name</label>
              <input className="input" {...register('scientificName')} />
            </div>
            <div>
              <label className="label">Manufacturer</label>
              <input className="input" {...register('manufacturer')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Unit Name *</label>
              <input className="input" {...register('unitName')} placeholder="e.g., Tablet" />
              {errors.unitName && <p className="text-red-500 text-xs mt-1">{errors.unitName.message}</p>}
            </div>
            <div>
              <label className="label">Unit Type</label>
              <select className="input" {...register('unitType')}>
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="bottle">Bottle</option>
                <option value="tube">Tube</option>
                <option value="injection">Injection</option>
                <option value="vial">Vial</option>
                <option value="ampoule">Ampoule</option>
                <option value="packet">Packet</option>
                <option value="box">Box</option>
                <option value="strip">Strip</option>
                <option value="carton">Carton</option>
                <option value="ml">Millilitre</option>
                <option value="litre">Litre</option>
                <option value="gram">Gram</option>
                <option value="kilogram">Kilogram</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" {...register('category')} placeholder="e.g., Antibiotic" />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Reorder Level</label>
              <input type="number" className="input" {...register('reorderLevel')} />
            </div>
            <div>
              <label className="label">Reorder Quantity</label>
              <input type="number" className="input" {...register('reorderQuantity')} />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('isControlled')} className="rounded" />
              <span className="text-sm">Controlled Drug</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('requiresPrescription')} className="rounded" />
              <span className="text-sm">Requires Prescription</span>
            </label>
          </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Medicine'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(undefined);
  const [scanner, setScanner] = useState(false);
  const [labelPrinter, setLabelPrinter] = useState(null);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [unitConverter, setUnitConverter] = useState(false);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await api.get('/medicines');
      setMedicines(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    try {
      await api.delete(`/medicines/${id}`);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleGenerateCode = async (medicineId) => {
    try {
      await api.post(`/barcodes/generate-codes/${medicineId}`);
      fetchMedicines();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleBulkGenerate = async () => {
    try {
      const res = await api.post('/barcodes/bulk-generate');
      alert(res.data.message);
      fetchMedicines();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleScan = async (code) => {
    try {
      const res = await api.get(`/barcodes/search/${code}`);
      if (Array.isArray(res.data)) {
        alert(`Found ${res.data.length} medicines matching "${code}"`);
      } else {
        alert(`Found: ${res.data.generalName}`);
        setScanner(false);
      }
    } catch (err) {
      alert('Medicine not found');
    }
  };

  const handlePrintLabels = async () => {
    if (selectedMedicines.length === 0) {
      alert('Select medicines to print labels');
      return;
    }
    try {
      const res = await api.post('/barcodes/generate-labels', {
        medicineIds: selectedMedicines,
      });
      setLabelPrinter(res.data.labels);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const toggleSelection = (id) => {
    setSelectedMedicines((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Manage medicine inventory and barcodes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setUnitConverter(true)}>
            <ArrowLeftRight className="w-4 h-4" />
            Unit Converter
          </button>
          <button className="btn-secondary" onClick={() => setScanner(true)}>
            <Scan className="w-4 h-4" />
            Scan
          </button>
          <button className="btn-secondary" onClick={handlePrintLabels}>
            <Printer className="w-4 h-4" />
            Print Labels ({selectedMedicines.length})
          </button>
          <button className="btn-secondary" onClick={handleBulkGenerate}>
            <Barcode className="w-4 h-4" />
            Generate All Codes
          </button>
          <button className="btn-primary" onClick={() => setModal(null)}>
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : medicines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No medicines yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left"><input type="checkbox" className="rounded" onChange={(e) => 
                  setSelectedMedicines(e.target.checked ? medicines.map(m => m.id) : [])
                } /></th>
                {['Image', 'Name', 'Brand', 'Manufacturer', 'Category', 'Unit', 'Barcode', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedMedicines.includes(m.id)}
                      onChange={() => toggleSelection(m.id)}
                      className="rounded" 
                    />
                  </td>
                  <td className="px-4 py-3">
                    {m.imageUrl ? (
                      <img 
                        src={`/uploads${m.imageUrl}`} 
                        alt={m.generalName}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.generalName}</td>
                  <td className="px-4 py-3 text-gray-600">{m.brandName || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.manufacturer || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.unitName}</td>
                  <td className="px-4 py-3">
                    {m.barcode ? (
                      <span className="badge-green">{m.barcode.slice(0, 8)}...</span>
                    ) : (
                      <button onClick={() => handleGenerateCode(m.id)} className="text-xs text-primary-600 hover:underline">
                        Generate
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(m)} className="text-gray-400 hover:text-primary-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== undefined && (
        <MedicineModal medicine={modal} onClose={() => setModal(undefined)} onSaved={() => { setModal(undefined); fetchMedicines(); }} />
      )}

      {scanner && <BarcodeScanner onScan={handleScan} onClose={() => setScanner(false)} />}
      {labelPrinter && <LabelPrinter labels={labelPrinter} onClose={() => setLabelPrinter(null)} />}
      {unitConverter && <UnitConverter isOpen={unitConverter} onClose={() => setUnitConverter(false)} />}
    </div>
  );
}
