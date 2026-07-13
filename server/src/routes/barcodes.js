import { Router } from 'express';
import { eq, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { medicines } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  generateMedicineCode,
  generateEAN13Barcode,
  generateBarcodeImage,
  generateQRCode,
  generateQRCodeBuffer,
  createLabelData,
} from '../utils/barcode.js';

const router = Router();

// POST /api/barcodes/generate-codes/:medicineId - Generate barcode & QR for medicine
router.post('/generate-codes/:medicineId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, req.params.medicineId));
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

    // Generate codes if not already present
    const medicineCode = medicine.medicineCode || generateMedicineCode();
    const barcode = medicine.barcode || generateEAN13Barcode();
    
    // Generate QR code data URL
    const qrData = JSON.stringify({
      id: medicine.id,
      code: medicineCode,
      name: medicine.generalName,
      barcode: barcode,
    });
    const qrCode = await generateQRCode(qrData);

    // Update medicine with generated codes
    const [updated] = await db.update(medicines)
      .set({
        medicineCode,
        barcode,
        qrCode,
        updatedAt: new Date(),
      })
      .where(eq(medicines.id, medicine.id))
      .returning();

    res.json({
      id: updated.id,
      medicineCode: updated.medicineCode,
      barcode: updated.barcode,
      qrCode: updated.qrCode,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/barcodes/image/:code - Generate barcode image
router.get('/image/:code', async (req, res, next) => {
  try {
    const { width = 2, height = 50, format = 'png' } = req.query;
    
    const buffer = await generateBarcodeImage(req.params.code, {
      width: parseInt(width),
      height: parseInt(height),
      includeText: true,
    });

    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/barcodes/qr/:medicineId - Generate QR code for medicine
router.get('/qr/:medicineId', async (req, res, next) => {
  try {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, req.params.medicineId));
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

    const qrData = JSON.stringify({
      id: medicine.id,
      code: medicine.medicineCode,
      name: medicine.generalName,
      barcode: medicine.barcode,
    });

    const { format = 'dataurl' } = req.query;

    if (format === 'png') {
      const buffer = await generateQRCodeBuffer(qrData);
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } else {
      const dataURL = await generateQRCode(qrData);
      res.json({ dataURL });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/barcodes/search/:code - Search medicine by barcode, QR, or medicine code
router.get('/search/:code', requireAuth, async (req, res, next) => {
  try {
    const code = req.params.code;
    
    // Search by barcode, medicine code, or parse QR data
    let medicine;
    
    // Try direct barcode/code match first
    [medicine] = await db.select().from(medicines)
      .where(or(
        eq(medicines.barcode, code),
        eq(medicines.medicineCode, code)
      ));

    // If not found, try parsing as QR JSON
    if (!medicine) {
      try {
        const qrData = JSON.parse(code);
        if (qrData.id) {
          [medicine] = await db.select().from(medicines).where(eq(medicines.id, qrData.id));
        }
      } catch {
        // Not valid JSON, search as partial match
        const results = await db.select().from(medicines)
          .where(or(
            ilike(medicines.barcode, `%${code}%`),
            ilike(medicines.medicineCode, `%${code}%`)
          ))
          .limit(10);
        
        return res.json(results);
      }
    }

    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    res.json(medicine);
  } catch (err) {
    next(err);
  }
});

// POST /api/barcodes/generate-labels - Generate printable labels for batch
router.post('/generate-labels', requireAuth, async (req, res, next) => {
  try {
    const { medicineIds, quantity = 1, includePrice = true, includeExpiry = true } = req.body;

    if (!medicineIds || !Array.isArray(medicineIds)) {
      return res.status(400).json({ error: 'medicineIds array is required' });
    }

    const labels = [];

    for (const medicineId of medicineIds) {
      const [medicine] = await db.select().from(medicines).where(eq(medicines.id, medicineId));
      if (!medicine) continue;

      // Ensure codes exist
      if (!medicine.barcode || !medicine.medicineCode) {
        const medicineCode = medicine.medicineCode || generateMedicineCode();
        const barcode = medicine.barcode || generateEAN13Barcode();
        const qrData = JSON.stringify({
          id: medicine.id,
          code: medicineCode,
          name: medicine.generalName,
          barcode: barcode,
        });
        const qrCode = await generateQRCode(qrData);

        await db.update(medicines)
          .set({ medicineCode, barcode, qrCode, updatedAt: new Date() })
          .where(eq(medicines.id, medicine.id));

        medicine.medicineCode = medicineCode;
        medicine.barcode = barcode;
        medicine.qrCode = qrCode;
      }

      const labelData = createLabelData(medicine, {
        quantity,
        includePrice,
        includeExpiry,
      });

      labels.push({
        ...labelData,
        qrCode: medicine.qrCode,
      });
    }

    res.json({ labels });
  } catch (err) {
    next(err);
  }
});

// POST /api/barcodes/bulk-generate - Generate codes for all medicines missing them
router.post('/bulk-generate', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const missingCodes = await db.select()
      .from(medicines)
      .where(or(
        eq(medicines.barcode, null),
        eq(medicines.medicineCode, null)
      ));

    let updated = 0;

    for (const medicine of missingCodes) {
      const medicineCode = medicine.medicineCode || generateMedicineCode();
      const barcode = medicine.barcode || generateEAN13Barcode();
      const qrData = JSON.stringify({
        id: medicine.id,
        code: medicineCode,
        name: medicine.generalName,
        barcode: barcode,
      });
      const qrCode = await generateQRCode(qrData);

      await db.update(medicines)
        .set({ medicineCode, barcode, qrCode, updatedAt: new Date() })
        .where(eq(medicines.id, medicine.id));

      updated++;
    }

    res.json({ message: `Generated codes for ${updated} medicines` });
  } catch (err) {
    next(err);
  }
});

export default router;
