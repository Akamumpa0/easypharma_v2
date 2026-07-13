import React, { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import api from '../lib/api.js';
import { getErrorMessage } from '../lib/utils.js';

export default function UnitConverter({ isOpen, onClose, initialUnit }) {
  const [units, setUnits] = useState([]);
  const [fromUnit, setFromUnit] = useState(initialUnit || 'ml');
  const [toUnit, setToUnit] = useState('litre');
  const [quantity, setQuantity] = useState('');
  const [result, setResult] = useState(null);
  const [compatibleUnits, setCompatibleUnits] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUnits();
      if (fromUnit) {
        fetchCompatibleUnits(fromUnit);
      }
    }
  }, [isOpen, fromUnit]);

  const fetchUnits = async () => {
    try {
      const res = await api.get('/units');
      setUnits(res.data.units);
    } catch (err) {
      console.error('Failed to fetch units:', err);
    }
  };

  const fetchCompatibleUnits = async (unit) => {
    try {
      const res = await api.get(`/units/compatible/${unit}`);
      setCompatibleUnits(res.data.compatibleUnits);
      if (res.data.compatibleUnits.length > 0 && unit !== toUnit) {
        const firstCompatible = res.data.compatibleUnits.find(u => u.value !== unit);
        if (firstCompatible) {
          setToUnit(firstCompatible.value);
        }
      }
    } catch (err) {
      setCompatibleUnits([]);
    }
  };

  const handleConvert = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Enter a valid quantity');
      return;
    }

    setError('');
    try {
      const res = await api.post('/units/convert', {
        quantity: parseFloat(quantity),
        fromUnit,
        toUnit,
      });
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setResult(null);
    }
  };

  const handleFromUnitChange = (unit) => {
    setFromUnit(unit);
    setResult(null);
    fetchCompatibleUnits(unit);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Unit Converter</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setResult(null);
              }}
              className="input"
              placeholder="Enter quantity"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From Unit</label>
              <select
                value={fromUnit}
                onChange={(e) => handleFromUnitChange(e.target.value)}
                className="input"
              >
                {units.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">To Unit</label>
              <select
                value={toUnit}
                onChange={(e) => {
                  setToUnit(e.target.value);
                  setResult(null);
                }}
                className="input"
                disabled={compatibleUnits.length === 0}
              >
                {compatibleUnits.length === 0 ? (
                  <option>No conversions</option>
                ) : (
                  compatibleUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))
                )}
              </select>
              {compatibleUnits.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected unit cannot be converted
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={!quantity || compatibleUnits.length === 0}
            className="btn-primary w-full"
          >
            Convert
          </button>

          {result && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600">From</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.original.formatted}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-600" />
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600">To</p>
                  <p className="text-lg font-bold text-primary-700">
                    {result.converted.formatted}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
