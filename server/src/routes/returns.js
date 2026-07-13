import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  customerReturns, supplierReturns, damagedMedicines, disposals,
  stockMedicines, medicines, suppliers, stockMovements,
} from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── Customer Returns ────────────────────────────────────────────────────────

const customerReturnSchema = z.object({
  billId: z.string().uuid().optional(),
  medicineId: z.string().uuid(),
  batchNumber: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(['expired', 'damaged', 'wrong_item', 'excess', 'quality_issue', 'other']),
  reasonDetail: z.string().optional(),
  returnedBy: z.string().optional(),
  refundAmount: z.string().optional(),
});

router.get('/customer', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(customerReturns)
      .where(eq(customerReturns.userId, req.user.id))
      .orderBy(customerReturns.createdAt);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/customer', requireAuth, async (req, res, next) => {
  try {
    const data = customerReturnSchema.parse(req.body);

    // Re-add to stock
    const [stock] = await db.select().from(stockMedicines).where(and(
      eq(stockMedicines.medicineId, data.medicineId),
      eq(stockMedicines.userId, req.user.id),
    ));

    if (stock) {
      await db.update(stockMedicines)
        .set({ quantity: stock.quantity + data.quantity, updatedAt: new Date() })
        .where(eq(stockMedicines.id, stock.id));
    }

    const [ret] = await db.insert(customerReturns).values({
      userId: req.user.id,
      ...data,
    }).returning();

    // Record movement
    await db.insert(stockMovements).values({
      userId: req.user.id,
      medicineId: data.medicineId,
      movementType: 'returned',
      quantity: data.quantity,
      batchNumber: data.batchNumber,
      referenceId: ret.id,
      notes: `Customer return: ${data.reason}`,
    });

    res.status(201).json(ret);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// ─── Supplier Returns ────────────────────────────────────────────────────────

const supplierReturnSchema = z.object({
  supplierId: z.string().uuid(),
  medicineId: z.string().uuid(),
  batchNumber: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(['expired', 'damaged', 'wrong_item', 'excess', 'quality_issue', 'other']),
  reasonDetail: z.string().optional(),
  approved: z.boolean().optional(),
});

router.get('/supplier', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(supplierReturns)
      .where(eq(supplierReturns.userId, req.user.id))
      .orderBy(supplierReturns.createdAt);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/supplier', requireAuth, async (req, res, next) => {
  try {
    const data = supplierReturnSchema.parse(req.body);

    // Deduct from stock
    const [stock] = await db.select().from(stockMedicines).where(and(
      eq(stockMedicines.medicineId, data.medicineId),
      eq(stockMedicines.userId, req.user.id),
    ));

    if (stock) {
      const newQty = Math.max(0, stock.quantity - data.quantity);
      await db.update(stockMedicines)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(stockMedicines.id, stock.id));
    }

    const [ret] = await db.insert(supplierReturns).values({
      userId: req.user.id,
      ...data,
    }).returning();

    await db.insert(stockMovements).values({
      userId: req.user.id,
      medicineId: data.medicineId,
      movementType: 'returned',
      quantity: -data.quantity,
      batchNumber: data.batchNumber,
      referenceId: ret.id,
      notes: `Supplier return: ${data.reason}`,
    });

    res.status(201).json(ret);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// ─── Damaged Medicines ───────────────────────────────────────────────────────

const damagedSchema = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(['broken', 'wet', 'expired', 'packaging_damage', 'contaminated', 'other']),
  reasonDetail: z.string().optional(),
});

router.get('/damaged', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(damagedMedicines)
      .where(eq(damagedMedicines.userId, req.user.id))
      .orderBy(damagedMedicines.createdAt);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/damaged', requireAuth, async (req, res, next) => {
  try {
    const data = damagedSchema.parse(req.body);

    // Deduct from usable stock
    const [stock] = await db.select().from(stockMedicines).where(and(
      eq(stockMedicines.medicineId, data.medicineId),
      eq(stockMedicines.userId, req.user.id),
    ));

    if (stock) {
      const newQty = Math.max(0, stock.quantity - data.quantity);
      await db.update(stockMedicines)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(stockMedicines.id, stock.id));
    }

    const [damaged] = await db.insert(damagedMedicines).values({
      userId: req.user.id,
      reportedBy: req.user.id,
      ...data,
    }).returning();

    await db.insert(stockMovements).values({
      userId: req.user.id,
      medicineId: data.medicineId,
      movementType: 'damaged',
      quantity: -data.quantity,
      batchNumber: data.batchNumber,
      referenceId: damaged.id,
      notes: `Damaged: ${data.reason}`,
    });

    res.status(201).json(damaged);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// ─── Disposals ───────────────────────────────────────────────────────────────

const disposalSchema = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(['expired', 'damaged', 'recalled', 'obsolete', 'contaminated', 'other']),
  reasonDetail: z.string().optional(),
  disposalMethod: z.string().optional(),
  witness: z.string().optional(),
  disposalDate: z.string(),
});

router.get('/disposal', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(disposals)
      .where(eq(disposals.userId, req.user.id))
      .orderBy(disposals.createdAt);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/disposal', requireAuth, async (req, res, next) => {
  try {
    const data = disposalSchema.parse(req.body);

    // Deduct from stock
    const [stock] = await db.select().from(stockMedicines).where(and(
      eq(stockMedicines.medicineId, data.medicineId),
      eq(stockMedicines.userId, req.user.id),
    ));

    if (stock) {
      const newQty = Math.max(0, stock.quantity - data.quantity);
      await db.update(stockMedicines)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(stockMedicines.id, stock.id));
    }

    const [disposal] = await db.insert(disposals).values({
      userId: req.user.id,
      approvedBy: req.user.id,
      ...data,
      disposalDate: new Date(data.disposalDate),
    }).returning();

    await db.insert(stockMovements).values({
      userId: req.user.id,
      medicineId: data.medicineId,
      movementType: 'disposed',
      quantity: -data.quantity,
      batchNumber: data.batchNumber,
      referenceId: disposal.id,
      notes: `Disposal: ${data.reason} via ${data.disposalMethod || 'unspecified'}`,
    });

    res.status(201).json(disposal);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

export default router;
