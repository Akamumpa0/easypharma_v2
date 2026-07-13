import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { stockMedicines, medicines, stockBillRecords } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const addStockSchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.number().int().positive(),
  sellingPrice: z.string(),
  buyingPrice: z.string().optional(),
  expiryDate: z.string().optional(),
});

const updateStockSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  sellingPrice: z.string().optional(),
  buyingPrice: z.string().optional(),
  expiryDate: z.string().optional(),
});

// GET /api/stock — pharmacist sees their own stock
router.get('/', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const result = await db
      .select({
        id: stockMedicines.id,
        medicineId: stockMedicines.medicineId,
        generalName: medicines.generalName,
        scientificName: medicines.scientificName,
        brandName: medicines.brandName,
        manufacturer: medicines.manufacturer,
        unitName: medicines.unitName,
        imageUrl: medicines.imageUrl,
        barcode: medicines.barcode,
        medicineCode: medicines.medicineCode,
        quantity: stockMedicines.quantity,
        sellingPrice: stockMedicines.sellingPrice,
        buyingPrice: stockMedicines.buyingPrice,
        expiryDate: stockMedicines.expiryDate,
      })
      .from(stockMedicines)
      .innerJoin(medicines, eq(stockMedicines.medicineId, medicines.id))
      .where(eq(stockMedicines.userId, req.user.id));

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/stock — add medicine to stock
router.post('/', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const data = addStockSchema.parse(req.body);

    // Check if this pharmacist already has this medicine in stock
    const [existing] = await db.select().from(stockMedicines)
      .where(and(eq(stockMedicines.userId, req.user.id), eq(stockMedicines.medicineId, data.medicineId)));

    let stockEntry;
    if (existing) {
      // Update quantity
      [stockEntry] = await db.update(stockMedicines)
        .set({
          quantity: existing.quantity + data.quantity,
          sellingPrice: data.sellingPrice,
          buyingPrice: data.buyingPrice,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : existing.expiryDate,
          updatedAt: new Date(),
        })
        .where(eq(stockMedicines.id, existing.id))
        .returning();
    } else {
      [stockEntry] = await db.insert(stockMedicines).values({
        userId: req.user.id,
        medicineId: data.medicineId,
        quantity: data.quantity,
        sellingPrice: data.sellingPrice,
        buyingPrice: data.buyingPrice,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      }).returning();
    }

    // Log stock bill record
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, data.medicineId));
    await db.insert(stockBillRecords).values({
      userId: req.user.id,
      medicineId: data.medicineId,
      medicineName: medicine.generalName,
      quantity: data.quantity,
      buyingPrice: data.buyingPrice || '0',
      totalCost: (parseFloat(data.buyingPrice || '0') * data.quantity).toFixed(2),
    });

    res.status(201).json(stockEntry);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/stock/:id
router.patch('/:id', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const data = updateStockSchema.parse(req.body);
    const [updated] = await db.update(stockMedicines)
      .set({
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(stockMedicines.id, req.params.id), eq(stockMedicines.userId, req.user.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Stock item not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// DELETE /api/stock/:id
router.delete('/:id', requireAuth, requireRole('pharmacist'), async (req, res, next) => {
  try {
    const [deleted] = await db.delete(stockMedicines)
      .where(and(eq(stockMedicines.id, req.params.id), eq(stockMedicines.userId, req.user.id)))
      .returning({ id: stockMedicines.id });
    if (!deleted) return res.status(404).json({ error: 'Stock item not found' });
    res.json({ message: 'Stock item removed' });
  } catch (err) { next(err); }
});

export default router;
