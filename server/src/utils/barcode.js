import { customAlphabet } from 'nanoid';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

// Generate unique medicine code (e.g., MED-ABC123XYZ)
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 9);
export function generateMedicineCode() {
  return `MED-${nanoid()}`;
}

// Generate EAN-13 barcode (13 digits)
export function generateEAN13Barcode() {
  // First 12 digits: random
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i]);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return base + checkDigit;
}

// Generate barcode image as PNG buffer
export async function generateBarcodeImage(code, options = {}) {
  const {
    type = 'ean13',
    width = 2,
    height = 50,
    includeText = true,
  } = options;

  try {
    const buffer = await bwipjs.toBuffer({
      bcid: type,
      text: code,
      scale: width,
      height: height,
      includetext: includeText,
      textxalign: 'center',
    });
    return buffer;
  } catch (err) {
    throw new Error(`Barcode generation failed: ${err.message}`);
  }
}

// Generate QR code as data URL
export async function generateQRCode(data, options = {}) {
  const {
    width = 300,
    errorCorrectionLevel = 'M',
  } = options;

  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      width,
      errorCorrectionLevel,
      margin: 1,
    });
    return qrDataURL;
  } catch (err) {
    throw new Error(`QR code generation failed: ${err.message}`);
  }
}

// Generate QR code as buffer
export async function generateQRCodeBuffer(data, options = {}) {
  const {
    width = 300,
    errorCorrectionLevel = 'M',
  } = options;

  try {
    const buffer = await QRCode.toBuffer(data, {
      width,
      errorCorrectionLevel,
      margin: 1,
    });
    return buffer;
  } catch (err) {
    throw new Error(`QR code generation failed: ${err.message}`);
  }
}

// Create label data for printing
export function createLabelData(medicine, options = {}) {
  const {
    quantity = 1,
    includePrice = true,
    includeExpiry = true,
  } = options;

  return {
    medicineCode: medicine.medicineCode || generateMedicineCode(),
    barcode: medicine.barcode || generateEAN13Barcode(),
    generalName: medicine.generalName,
    brandName: medicine.brandName,
    manufacturer: medicine.manufacturer,
    unitName: medicine.unitName,
    sellingPrice: includePrice ? medicine.sellingPrice : null,
    expiryDate: includeExpiry ? medicine.expiryDate : null,
    quantity,
  };
}
